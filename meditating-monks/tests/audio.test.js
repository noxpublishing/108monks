import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioRoom } from '../web/audio.js';

const once = { id: 'prayer', audio_id: 'clip', audio_mode: 'once', duration_ms: 5000 };
const loop = { id: 'mantra', audio_id: 'clip', unit_ms: 2000, duration_ms: 10000 };
const silence = { id: 'silence', kind: 'rest', duration_ms: 1000 };
const clip = {
  id: 'clip', url: '/clip', title: 'Synthetic clip', performer: 'Fixture', license: 'CC0',
  loop_start_seconds: 1, loop_end_seconds: 3,
};
const position = (phase, elapsed = 0, monkId = 0) => ({ phase, elapsed, monkId, cycle: 0 });

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function audioFixture(t, decode = async () => ({ duration: 5 })) {
  const sources = [], gains = [], statuses = [];
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({
    connect() {},
    disconnect() { this.disconnected = true; },
  });
  const context = {
    currentTime: 0,
    resume: async () => {},
    decodeAudioData: decode,
    createDynamicsCompressor: node,
    createGain() {
      const gain = { ...node(), gain: param() };
      gains.push(gain);
      return gain;
    },
    createBiquadFilter: () => ({ ...node(), frequency: param(), Q: param() }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createBufferSource() {
      const source = {
        ...node(),
        start(...args) { this.startArgs = args; },
        stop() { this.stopped = true; this.onended?.(); },
      };
      sources.push(source);
      return source;
    },
  };
  globalThis.window = { AudioContext: function () { return context; } };
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(new Uint8Array(1)));
  t.after(() => { delete globalThis.window; });
  const audio = new AudioRoom(message => statuses.push(message));
  return {
    audio, context, fetch, sources, gains, statuses,
    update: (phase, elapsed, monkId, catalog = [clip]) => audio.update([position(phase, elapsed, monkId)], catalog, 'run'),
  };
}

test('a deferred recording cannot start after its phase has passed', async t => {
  const decode = deferred();
  const { audio, sources, update } = audioFixture(t, () => decode.promise);
  await audio.start('recording');
  const loading = update(once);
  await update(silence);
  decode.resolve({ duration: 5 });
  await loading;
  assert.equal(sources.length, 0);
});

test('a once recording starts at the latest elapsed position and ends at its clip boundary', async t => {
  const decode = deferred();
  const { audio, sources, update } = audioFixture(t, () => decode.promise);
  await audio.start('recording');
  const loading = update(once, 250);
  await update(once, 1250);
  decode.resolve({ duration: 5 });
  await loading;
  await update(once, 1750);
  assert.equal(sources.length, 1);
  assert.deepEqual(sources[0].startArgs, [0, 2.25, 0.75]);
});

test('pending decodes are shared and old playback does not win after stop and restart', async t => {
  const decode = deferred();
  const { audio, fetch, sources, update } = audioFixture(t, () => decode.promise);
  await audio.start('recording');
  const previous = update(loop, 250, 1);
  const repeat = update(loop, 500, 1);
  audio.stop();
  await audio.start('recording');
  const next = update(loop, 750, 2);
  decode.resolve({ duration: 5 });
  await Promise.all([previous, repeat, next]);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(sources.length, 1);
  assert.deepEqual(sources[0].startArgs, [0, 1.75]);
});

test('a canceled context resume cannot report or re-enable the old start', async t => {
  const resume = deferred();
  const { audio, context, statuses } = audioFixture(t);
  context.resume = () => resume.promise;
  const starting = audio.start('recording');
  audio.stop();
  resume.resolve();
  assert.equal(await starting, false);
  assert.equal(audio.enabled, false);
  assert.deepEqual(statuses, []);
});

test('choir counts include focus and retain unaffected voices across seat changes', async t => {
  const { audio, sources, gains, update } = audioFixture(t);
  audio.setChoirMap(Array.from({ length: 108 }, (_, id) => ({ off: id / 1000, row: 1, pan: 0 })));
  audio.setChoirMode('full');
  await audio.start('recording');
  await update(loop);
  assert.equal(sources.length, 108);
  const live = () => sources.filter(source => !source.stopped);
  assert.ok(Math.abs(gains.slice(-107).reduce((sum, gain) => sum + gain.gain.value, 0) - 1) < 1e-10);

  await update(loop, 1000, 1);
  assert.equal(live().length, 108);
  assert.equal(sources.length, 110);
  assert.ok(sources.filter(source => source.stopped).every(source => source.disconnected));
  await update(loop, 1100, 109);
  assert.equal(live().length, 108);

  audio.setChoirMode('sparse');
  await update(loop, 1200, 109);
  assert.equal(live().length, 12);
  audio.stop();
  assert.ok(sources.every(source => source.stopped && source.disconnected));
});

test('a choir variant resolving after the mode was turned off cannot start or change status', async t => {
  const pending = deferred(), variantStarted = deferred();
  const { audio, fetch, statuses, sources, update } = audioFixture(t);
  const variant = { ...clip, id: 'alt', variant_of: 'clip', url: '/alt' };
  fetch.mock.mockImplementation(async url => {
    if (url === '/alt') {
      variantStarted.resolve();
      return pending.promise;
    }
    return new Response(new Uint8Array(1));
  });
  audio.setChoirMap([{ off: 0, row: 1, pan: 0 }, { off: .1, row: 1, pan: 0 }]);
  audio.setChoirMode('full');
  await audio.start('recording');
  const loading = update(loop, 0, 0, [clip, variant]);
  await variantStarted.promise;
  audio.setChoirMode('off');
  await update(loop, 250, 0, [clip, variant]);
  const statusCount = statuses.length;
  pending.resolve(new Response(new Uint8Array(1)));
  await loading;
  assert.equal(sources.length, 1);
  assert.equal(statuses.length, statusCount);
});
