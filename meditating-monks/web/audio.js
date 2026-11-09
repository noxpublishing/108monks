/** On-demand audio only. No autoplay; no external TTS provider or voice cloning. */
export class AudioRoom {
  constructor(status) {
    this.status = status; this.context = null; this.bufferCache = new Map();
    this.layers = []; this.enabled = false; this.mode = 'recording';
    this.volume = 0.45; this.voice = null; this.generation = 0;
    this.activeKey = ''; this.lastSpokenKey = ''; this.chorus = false;
  }
  localVoices() {
    return ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => v.localService) : [];
  }
  setVolume(value) {
    this.volume = value;
    if (this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }
  async start(mode, voice, chorus) {
    this.stop(); this.enabled = true; this.mode = mode; this.voice = voice; this.chorus = chorus;
    if (mode === 'tts') {
      if (!('speechSynthesis' in window) || !voice?.localService) {
        this.enabled = false; throw new Error('Keine vom Browser als lokal markierte TTS-Stimme verfügbar. Hinterlege eine freigegebene Aufnahme.');
      }
      this.status('Lokale Sprech-Demo. Keine authentifizierte tibetische Aussprache; nicht exakt mit dem Serverrhythmus synchron.');
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { this.enabled = false; throw new Error('Web Audio wird in diesem Browser nicht unterstützt.'); }
    if (!this.context) {
      this.context = new AudioContext(); this.master = this.context.createGain();
      this.limiter = this.context.createDynamicsCompressor(); this.master.connect(this.limiter); this.limiter.connect(this.context.destination);
    }
    this.master.gain.value = this.volume;
    await this.context.resume();
    this.status('Aufnahme wird beim passenden Abschnitt zugeschaltet.');
  }
  stopLayers() {
    for (const { source, gain } of this.layers) {
      try { gain.gain.setTargetAtTime(0, this.context.currentTime, .04); source.stop(this.context.currentTime + .2); } catch (_) {}
    }
    this.layers = []; this.activeKey = '';
  }
  stop() {
    this.enabled = false; this.generation++; this.stopLayers(); this.lastSpokenKey = '';
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  async load(record) {
    if (this.bufferCache.has(record.url)) return this.bufferCache.get(record.url);
    const response = await fetch(record.url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Die Audiodatei konnte nicht geladen werden.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('Die Aufnahme ist für diesen Player zu groß.');
    const buffer = await this.context.decodeAudioData(bytes);
    this.bufferCache.set(record.url, buffer); return buffer;
  }
  async update(positions, catalog, runKey) {
    if (!this.enabled) return;
    const first = positions[0];
    if (!first) return;
    if (this.mode === 'tts') {
      const p = first.phase;
      if (p.kind === 'rest') { if ('speechSynthesis' in window) speechSynthesis.cancel(); return; }
      const unit = p.unit_ms ? Math.floor(first.elapsed / p.unit_ms) : 0;
      const key = `${runKey}:${first.monkId}:${p.id}:${first.cycle}:${unit}`;
      if (key === this.lastSpokenKey) return;
      this.lastSpokenKey = key;
      // Avoid overlapping utterances. Timed display counters are not audio counters.
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(p.speech_text || p.text);
      utterance.voice = this.voice; utterance.lang = this.voice.lang;
      utterance.rate = .75; utterance.volume = this.volume;
      utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) this.status(`TTS nicht verfügbar: ${event.error}`); };
      speechSynthesis.speak(utterance); return;
    }
    /* Einmalige Gebete (once): eine einzige Stimme, einmal je Abschnittsdurchgang
       pro Zyklus. Wer später einsteigt, hört ab der aktuellen Stelle; ein bereits
       beendetes Gebet startet nicht erneut. Chorschichtung bleibt dem Loop vorbehalten. */
    const mode = first.phase.audio_mode || 'loop';
    const used = mode === 'once' ? [first] : (this.chorus ? positions.slice(0, 3) : positions.slice(0, 1));
    const candidates = used
      .map(position => ({ position, record: catalog.find(r => r.id === position.phase.audio_id) }))
      .filter(item => item.record);
    const key = candidates.map(c => `${c.position.monkId}:${c.position.phase.id}:${mode === 'once' ? c.position.cycle + ':' : ''}${c.record.id}`).join('|') || 'silence';
    if (key === this.activeKey) return;
    this.stopLayers(); this.activeKey = key;
    const generation = ++this.generation;
    if (!candidates.length) {
      this.status('Für diesen Abschnitt ist keine freigegebene Aufnahme hinterlegt. Die Textdarstellung läuft weiter.'); return;
    }
    try {
      const loaded = await Promise.all(candidates.map(async c => ({ ...c, buffer: await this.load(c.record) })));
      if (!this.enabled || generation !== this.generation) return;
      for (const { record, position, buffer } of loaded) {
        const start = record.loop_start_seconds, end = record.loop_end_seconds, length = end - start;
        const source = this.context.createBufferSource(), gain = this.context.createGain();
        source.buffer = buffer;
        gain.gain.value = 0; gain.gain.setTargetAtTime(1 / loaded.length, this.context.currentTime, .15);
        source.connect(gain); gain.connect(this.master);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        if (mode === 'once') {
          if (start < 0 || end > buffer.duration + .02)
            throw new Error('Audio-Abschnitt passt nicht zur Datei. Prüfe die Grenzen im Manifest; kein automatischer Schnitt.');
          const offset = position.elapsed / 1000;
          if (offset >= length) {
            this.status(`${record.title} · in diesem Durchgang bereits beendet; bis zum nächsten Abschnitt bleibt der Kanal still.`);
            continue;
          }
          source.start(0, start + offset);
          this.layers.push({ source, gain });
        } else {
          const expected = (position.phase.unit_ms || position.phase.duration_ms) / 1000;
          if (end > buffer.duration + .02 || Math.abs(length - expected) > .05)
            throw new Error('Audio-Loop und Phasentakt passen nicht zusammen. Passe unit_ms und loop_start/end an; es erfolgt kein automatisches Time-Stretching.');
          source.loop = true; source.loopStart = start; source.loopEnd = end;
          source.start(0, start + (position.elapsed / 1000) % length);
          this.layers.push({ source, gain });
        }
      }
      const record = loaded[0].record;
      this.status(`${loaded.length > 1 ? `${loaded.length} virtuelle Stimmen · gleiche Aufnahme geschichtet. ` : ''}${record.title} · ${record.performer} · ${record.license}`);
    } catch (error) {
      this.stopLayers(); this.activeKey = key; this.status(error.message);
    }
  }
}
