/** On-demand room recordings. */
export class AudioRoom {
  constructor(status) {
    this.status = status;
    this.context = null;
    this.bufferCache = new Map();
    this.enabled = false;
    this.ready = false;
    this.generation = 0;
    this.focus = null;
    this.choir = null;
    this.choirMode = 'off';
    this.choirMap = [];
    this.choirLayers = new Map();
    this.choirGraph = null;
  }

  async start() {
    this.stop();
    const generation = this.generation;
    this.enabled = true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio wird in diesem Browser nicht unterstützt.');
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = .45;
        const limiter = this.context.createDynamicsCompressor();
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
      }
      await this.context.resume();
    } catch (error) {
      if (generation !== this.generation) return false;
      this.stop();
      throw error;
    }
    if (generation !== this.generation) return false;
    this.ready = true;
    this.status('Der Ton setzt ein, sobald eine Aufnahme zum Abschnitt verfügbar ist.');
    return true;
  }

  stopLayer({ source, gain, ended }) {
    if (ended) return;
    const now = this.context.currentTime;
    gain.gain.setTargetAtTime(0, now, .04);
    source.stop(now + .2);
  }

  stopFocus() {
    const layer = this.focus?.layer;
    this.focus = null;
    if (layer) this.stopLayer(layer);
  }

  stopChoir() {
    this.choir = null;
    for (const layer of this.choirLayers.values()) this.stopLayer(layer);
    this.choirLayers.clear();
  }

  setChoirMode(mode) {
    if (this.choirMode === mode) return;
    this.choirMode = mode;
    this.stopChoir();
    if (mode === 'off' && this.focus?.layer && !this.focus.once) this.recordingStatus(this.focus.record);
  }

  setChoirMap(map) {
    this.choirMap = map;
    this.stopChoir();
  }

  stop() {
    this.enabled = false;
    this.ready = false;
    this.generation++;
    this.stopFocus();
    this.stopChoir();
  }

  load(record) {
    if (!this.bufferCache.has(record.url)) {
      const pending = this.fetchBuffer(record).catch(error => {
        this.bufferCache.delete(record.url);
        throw error;
      });
      this.bufferCache.set(record.url, pending);
    }
    return this.bufferCache.get(record.url);
  }

  async fetchBuffer(record) {
    const response = await fetch(record.url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Die Audiodatei konnte nicht geladen werden.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('Die Aufnahme ist für diesen Player zu groß.');
    return this.context.decodeAudioData(bytes);
  }

  async update(first, catalog, runKey) {
    if (!this.ready) return;
    const p = first.phase;
    const once = p.audio_mode === 'once';
    const record = catalog.find(r => r.id === p.audio_id);
    const phaseKey = `${runKey}:${p.id}:${record?.id ?? ''}`;
    const key = record ? `${phaseKey}:${first.monkId}:${once ? first.cycle : ''}` : 'silence';
    let focus = this.focus;

    if (focus?.key !== key) {
      this.stopFocus();
      if (once || !record || (this.choir && this.choir.phaseKey !== phaseKey)) this.stopChoir();
      focus = this.focus = { key, first, record, once, layer: null };
      if (!record) {
        this.status('Für diesen Abschnitt ist keine freigegebene Aufnahme hinterlegt. Die Textdarstellung läuft weiter.');
        return;
      }
      try {
        const buffer = await this.load(record);
        if (this.focus !== focus) return;
        this.startFocus(focus, buffer);
      } catch (error) {
        if (this.focus === focus) {
          this.stopChoir();
          this.status(error.message);
        }
        return;
      }
    } else {
      focus.first = first;
    }

    if (focus.loop) await this.updateChoir(focus, phaseKey, catalog);
  }

  loopLength(record, buffer, phase) {
    const length = record.loop_end_seconds - record.loop_start_seconds;
    const expected = (phase.unit_ms || phase.duration_ms) / 1000;
    if (record.loop_end_seconds > buffer.duration + .02 || Math.abs(length - expected) > .05)
      throw new Error('Audio-Loop und Phasentakt passen nicht zusammen. Passe unit_ms und loop_start/end an; es erfolgt kein automatisches Time-Stretching.');
    return length;
  }

  recordingStatus(record) {
    this.status(`${record.title} · ${record.performer} · ${record.license}`);
  }

  startFocus(focus, buffer) {
    const { first, record, once } = focus;
    const elapsed = first.elapsed / 1000;
    let offset, duration, length;
    if (once) {
      const end = Math.min(record.loop_end_seconds, buffer.duration);
      if (record.loop_end_seconds > buffer.duration + .02 || record.loop_start_seconds >= end)
        throw new Error('Audio-Abschnitt passt nicht zur Datei. Prüfe die Grenzen im Manifest; kein automatischer Schnitt.');
      offset = record.loop_start_seconds + elapsed;
      duration = Math.min(end - offset, first.phase.duration_ms / 1000 - elapsed);
      if (duration <= 0) {
        this.status(`${record.title} · in diesem Durchgang bereits beendet; bis zum nächsten Abschnitt bleibt der Kanal still.`);
        return;
      }
    } else {
      length = this.loopLength(record, buffer, first.phase);
      offset = record.loop_start_seconds + elapsed % length;
    }
    focus.layer = this.startLayer(record, buffer, { offset, output: this.master, level: .9, attack: .15, duration });
    if (!once) focus.loop = { record, buffer, length };
    if (!this.choirLayers.size) this.recordingStatus(record);
  }

  startLayer(record, buffer, { offset, output, level, attack, panValue, duration }) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const pan = panValue == null ? null : ctx.createStereoPanner();
    source.buffer = buffer;
    source.loop = duration === undefined;
    if (source.loop) {
      source.loopStart = record.loop_start_seconds;
      source.loopEnd = record.loop_end_seconds;
    }
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(level, ctx.currentTime, attack);
    source.connect(gain);
    if (pan) {
      pan.pan.value = panValue;
      gain.connect(pan);
      pan.connect(output);
    } else {
      gain.connect(output);
    }
    const layer = { source, gain, ended: false };
    const disconnect = () => {
      layer.ended = true;
      source.disconnect();
      gain.disconnect();
      pan?.disconnect();
    };
    source.onended = disconnect;
    try {
      if (source.loop) source.start(0, offset);
      else source.start(0, offset, duration);
    } catch (error) {
      disconnect();
      throw error;
    }
    return layer;
  }

  async updateChoir(focus, phaseKey, catalog) {
    const maxSources = this.choirMode === 'full' ? 108 : 12;
    const total = Math.min(maxSources, this.choirMap.length);
    if (this.choirMode === 'off' || total < 2) return;

    let choir = this.choir;
    if (!choir) {
      const { record, first } = focus;
      choir = this.choir = { phaseKey, selected: null, variants: null };
      const variants = [focus.loop];
      for (const variant of catalog.filter(r => r.variant_of === record.id)) {
        try {
          const audio = await this.load(variant);
          if (this.choir !== choir) return;
          variants.push({ record: variant, buffer: audio, length: this.loopLength(variant, audio, first.phase) });
        } catch (_) {
          if (this.choir !== choir) return;
        }
      }
      choir.variants = variants;
    }
    if (!choir.variants || !this.focus?.loop) return;

    try {
      this.syncChoir(choir, this.focus.first, total);
    } catch (error) {
      this.stopChoir();
      this.status(error.message);
    }
  }

  syncChoir(choir, first, total) {
    if (choir.selected === first.monkId) return;
    choir.selected = first.monkId;
    const seats = Array.from({ length: total }, (_, index) => Math.floor(index * this.choirMap.length / total));
    const wanted = seats.filter(id => id !== first.monkId).slice(0, total - 1);
    const wantedIds = new Set(wanted);
    const rowSum = wanted.reduce((sum, id) => sum + this.choirMap[id].row, 0);
    const now = this.context.currentTime;
    if (!this.choirGraph) {
      const gain = this.context.createGain();
      const lowpass = this.context.createBiquadFilter();
      gain.gain.value = .056;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1800;
      lowpass.Q.value = .4;
      lowpass.connect(gain);
      gain.connect(this.master);
      this.choirGraph = { gain, lowpass };
    }
    // Anchor new choir layers to the running background rather than to a newly selected monk.
    choir.anchor ??= now - first.elapsed / 1000 + (first.choirOffset ?? 0);
    for (const [id, layer] of this.choirLayers) {
      if (!wantedIds.has(id)) {
        this.stopLayer(layer);
        this.choirLayers.delete(id);
      }
    }
    for (const id of wanted) {
      const seat = this.choirMap[id];
      const level = seat.row / rowSum;
      const layer = this.choirLayers.get(id);
      if (layer) {
        layer.gain.gain.setTargetAtTime(level, now, .5);
      } else {
        const { record, buffer, length } = choir.variants[(id * 7 + 3) % choir.variants.length];
        const elapsed = now - choir.anchor + seat.off;
        const offset = record.loop_start_seconds + ((elapsed % length) + length) % length;
        this.choirLayers.set(id, this.startLayer(record, buffer, {
          offset, output: this.choirGraph.lowpass, level, attack: .5, panValue: seat.pan,
        }));
      }
    }
    const takes = choir.variants.length > 1
      ? `${choir.variants.length} Aufnahmevarianten, deterministisch verteilt` : 'eine Aufnahme, zeitversetzt geschichtet';
    this.status(`Raumchor: ${this.choirLayers.size + 1} Quellen · Spaltenpanorama · Tiefpass 1,8 kHz · ${takes}.`);
  }
}
