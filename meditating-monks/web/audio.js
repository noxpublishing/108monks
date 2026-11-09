/** On-demand audio only. No autoplay; no external TTS provider or voice cloning. */
export class AudioRoom {
  constructor(status) {
    this.status = status; this.context = null; this.bufferCache = new Map();
    this.layers = []; this.enabled = false; this.mode = 'recording';
    this.volume = 0.45; this.voice = null; this.generation = 0;
    this.activeKey = ''; this.lastSpokenKey = '';
    /* Raumchor (Ritualraum-Konzept §4): bis zu 108 virtuelle Wiedergabepositionen
       derselben Aufnahmen, stabil je Sitz versetzt, Hintergrund tiefpassgefiltert. */
    this.choirMode = 'off'; this.choirMap = []; this.choirLayers = [];
    this.choirKey = ''; this.choirGraph = null; this.bgLevel = 0.056;
  }
  localVoices() {
    return ('speechSynthesis' in window) ? speechSynthesis.getVoices().filter(v => v.localService) : [];
  }
  setVolume(value) {
    this.volume = value;
    if (this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }
  async start(mode, voice) {
    this.stop(); this.enabled = true; this.mode = mode; this.voice = voice;
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
    this.stopFocus(); this.stopChoir();
  }
  stopFocus() {
    for (const { source, gain } of this.layers) {
      try { gain.gain.setTargetAtTime(0, this.context.currentTime, .04); source.stop(this.context.currentTime + .2); } catch (_) {}
    }
    this.layers = []; this.activeKey = '';
  }
  stopChoir() {
    for (const { source, gain } of this.choirLayers) {
      try { gain.gain.setTargetAtTime(0, this.context.currentTime, .04); source.stop(this.context.currentTime + .2); } catch (_) {}
    }
    this.choirLayers = []; this.choirKey = '';
    if (this.choirGraph) {
      try { this.choirGraph.bgGain.gain.setTargetAtTime(0, this.context.currentTime, .08); } catch (_) {}
      this.choirGraph = null;
    }
  }
  /* Regler und Modi: Hintergrund live änderbar, Choraufbau im nächsten Takt. */
  setBgLevel(value) {
    this.bgLevel = value;
    if (this.choirGraph && this.context) this.choirGraph.bgGain.gain.setTargetAtTime(value, this.context.currentTime, .08);
  }
  setChoirMode(mode) { this.choirMode = mode; this.choirKey = ''; }
  setChoirMap(map) { this.choirMap = map; this.choirKey = ''; }
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
       beendetes Gebet startet nicht erneut. Der Raumchor bleibt dem Loop vorbehalten. */
    const p = first.phase;
    if ((p.audio_mode || 'loop') === 'once') {
      const record = catalog.find(r => r.id === p.audio_id);
      const key = `${first.monkId}:${p.id}:${first.cycle}:${record ? record.id : 'none'}`;
      if (key === this.activeKey) return;
      this.stopLayers(); this.activeKey = key;
      if (!record) {
        this.status('Für diesen Abschnitt ist keine freigegebene Aufnahme hinterlegt. Die Textdarstellung läuft weiter.'); return;
      }
      try {
        const buffer = await this.load(record);
        if (!this.enabled) return;
        const start = record.loop_start_seconds, end = record.loop_end_seconds, length = end - start;
        if (start < 0 || end > buffer.duration + .02)
          throw new Error('Audio-Abschnitt passt nicht zur Datei. Prüfe die Grenzen im Manifest; kein automatischer Schnitt.');
        const offset = first.elapsed / 1000;
        if (offset >= length) {
          this.status(`${record.title} · in diesem Durchgang bereits beendet; bis zum nächsten Abschnitt bleibt der Kanal still.`);
          return;
        }
        const source = this.context.createBufferSource(), gain = this.context.createGain();
        source.buffer = buffer;
        gain.gain.value = 0; gain.gain.setTargetAtTime(.9, this.context.currentTime, .15);
        source.connect(gain); gain.connect(this.master);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start(0, start + offset);
        this.layers.push({ source, gain });
        this.status(`${record.title} · ${record.performer} · ${record.license}`);
      } catch (error) { this.status(error.message); }
      return;
    }

    /* Loop-Phasen: gewählte Stimme vorn (Gain 0,9, mittig); dahinter der Raumchor
       aus derselben Aufnahme plus geprüften Chorvarianten (keine Tonhöhenänderung). */
    const record = catalog.find(r => r.id === p.audio_id);
    if (!record) {
      if (this.activeKey !== 'silence' || this.choirLayers.length) {
        this.stopLayers(); this.activeKey = 'silence';
        this.status('Für diesen Abschnitt ist keine freigegebene Aufnahme hinterlegt. Die Textdarstellung läuft weiter.');
      }
      return;
    }
    const focusKey = `${first.monkId}:${p.id}:${record.id}`;
    if (focusKey !== this.activeKey) {
      try {
        const buffer = await this.load(record);
        if (!this.enabled) return;
        this.stopFocus(); this.activeKey = focusKey;
        const start = record.loop_start_seconds, end = record.loop_end_seconds, length = end - start;
        const expected = (p.unit_ms || p.duration_ms) / 1000;
        if (end > buffer.duration + .02 || Math.abs(length - expected) > .05)
          throw new Error('Audio-Loop und Phasentakt passen nicht zusammen. Passe unit_ms und loop_start/end an; es erfolgt kein automatisches Time-Stretching.');
        this.startFocusLayer(record, buffer, first);
        this.status(`${record.title} · ${record.performer} · ${record.license}`);
      } catch (error) {
        this.stopFocus(); this.activeKey = focusKey;
        this.status(error.message);
        return;
      }
    }
    if (this.choirMode === 'off' || !this.choirMap.length) {
      if (this.choirLayers.length) this.stopChoir();
      return;
    }
    await this.updateChoir(first, record, catalog);
  }

  startFocusLayer(record, buffer, first) {
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    const length = record.loop_end_seconds - record.loop_start_seconds;
    source.buffer = buffer; source.loop = true;
    source.loopStart = record.loop_start_seconds; source.loopEnd = record.loop_end_seconds;
    gain.gain.value = 0; gain.gain.setTargetAtTime(.9, this.context.currentTime, .15);
    source.connect(gain); gain.connect(this.master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(0, record.loop_start_seconds + (first.elapsed / 1000) % length);
    this.layers.push({ source, gain });
  }

  /** Raumchor: bis zu 108 virtuelle Wiedergabepositionen derselben Aufnahme(n).
      Jede Quelle sitzt fest, startet stable versetzt (Cohort-Versatz des Platzes
      im Loop), wird nach Sitzspalte panoriert und über den gemeinsamen
      Hintergrund-Tiefpass (1,8 kHz) gelegt; hinten bleibt es leiser. */
  async updateChoir(first, record, catalog) {
    const p = first.phase;
    const expected = (p.unit_ms || p.duration_ms) / 1000;
    const candidates = [record, ...catalog.filter(r => r.variant_of === p.audio_id)];
    const usable = [];
    for (const v of candidates) {
      try {
        const buffer = await this.load(v);
        const length = v.loop_end_seconds - v.loop_start_seconds;
        if (v.loop_end_seconds > buffer.duration + .02 || Math.abs(length - expected) > .05) {
          if (v !== record) this.status(`Chorvariante ${v.id} übersprungen: Takt passt nicht (kein Time-Stretching).`);
          continue;
        }
        usable.push({ record: v, buffer });
      } catch (_) { if (v === record) return; }
    }
    if (!usable.length || this.choirMode === 'off' || !this.choirMap.length || !this.enabled) return;
    const total = Math.min(this.choirMode === 'full' ? 108 : 12, this.choirMap.length);
    const step = Math.max(1, Math.round(this.choirMap.length / total));
    const key = `${p.id}:${this.choirMode}:${total}:${step}:${usable.map(u => u.record.id).join('+')}`;
    if (key === this.choirKey) return;
    this.stopChoir(); this.choirKey = key;
    const ctx = this.context;
    const bgGain = ctx.createGain();
    bgGain.gain.value = 0; bgGain.gain.setTargetAtTime(this.bgLevel, ctx.currentTime, .3);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.value = 1800; lowpass.Q.value = .4;
    lowpass.connect(bgGain); bgGain.connect(this.master);
    this.choirGraph = { bgGain, lowpass };
    /* Zeilenfaktor gleicht aus: Gesamtpegel des Hintergrunds bleibt begrenzt. */
    const rowSum = this.choirMap.reduce((a, s) => a + s.row, 0) || 1;
    for (let k = 0; k < total; k++) {
      const seat = this.choirMap[k * step];
      if (!seat) break;
      const u = usable[(k * 7 + 3) % usable.length];
      const source = ctx.createBufferSource(), gain = ctx.createGain(), pan = ctx.createStereoPanner();
      source.buffer = u.buffer; source.loop = true;
      source.loopStart = u.record.loop_start_seconds; source.loopEnd = u.record.loop_end_seconds;
      pan.pan.value = seat.pan;
      const perSource = this.bgLevel * (seat.row / rowSum);
      gain.gain.value = 0; gain.gain.setTargetAtTime(perSource, ctx.currentTime, .5);
      source.connect(gain); gain.connect(pan); pan.connect(lowpass);
      const length = u.record.loop_end_seconds - u.record.loop_start_seconds;
      const stagger = (first.elapsed / 1000 + seat.off) % length;
      source.start(0, u.record.loop_start_seconds + stagger);
      this.choirLayers.push({ source, gain });
    }
    this.status(`Raumchor: ${this.choirLayers.length} Quellen · Spaltenpanorama · Tiefpass 1,8 kHz · ${usable.length > 1 ? `${usable.length} Aufnahmevarianten, deterministisch verteilt` : 'eine Aufnahme, zeitversetzt geschichtet'}.`);
  }
}
