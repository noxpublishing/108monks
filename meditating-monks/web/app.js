import { AudioRoom } from './audio.js';
import { cohortOffset, monkPosition, timeline } from './engine.js';
import { Room } from './room.js';

const stage = document.getElementById('room');
const listen = document.getElementById('listen');
const notice = document.getElementById('room-notice');
const audioStatus = document.getElementById('audio-status');
const portrait = matchMedia('(max-aspect-ratio: 4/5)');
const room = new Room(stage);
const audio = new AudioRoom(message => { audioStatus.textContent = message; });

let state, ritual, ensemble, recordings, receivedAt;
let events, pollTimer, renderTimer, syncing = false, active = false;

async function getJSON(url) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function stopAudio(message = 'Ton ausgeschaltet.') {
  audio.stop();
  listen.setAttribute('aria-pressed', 'false');
  stage.classList.remove('is-listening');
  audioStatus.textContent = message;
}

function render() {
  if (!state || document.hidden) return;
  const age = performance.now() - receivedAt;
  const stale = age > 6000;
  stage.classList.toggle('is-paused', stale);
  if (stale) {
    if (audio.enabled) stopAudio('Der Ton pausiert, bis der Raum wieder verbunden ist.');
    startPolling();
  }

  const elapsed = state.active_ms + Math.min(2000, age);
  const position = index => monkPosition(ritual, state.monks, index, elapsed, ensemble);
  room.tick(index => position(index).phase);
  if (audio.enabled && !stale) {
    const first = position(0);
    audio.update({ ...first, monkId: 0, cycle: Math.floor(elapsed / ritual.total) }, recordings, state.run_id);
  }
}

function buildRoom() {
  room.build(state.monks, portrait.matches);
  if (!listen.hidden) {
    audio.setChoirMode(portrait.matches ? 'sparse' : 'full');
    audio.setChoirMap(room.seats.map(({ pan, row }, index) => ({
      pan, row, off: ensemble.mode === 'cohort' ? cohortOffset(index, ensemble) / 1000 : 0,
    })));
  }
  render();
}

function acceptState(next) {
  if (state && state.run_id !== next.run_id) {
    location.reload();
    return false;
  }
  if (state && (next.active_ms < state.active_ms ||
      (next.active_ms === state.active_ms && next.updated_at_ms === state.updated_at_ms))) return false;
  state = next;
  receivedAt = performance.now();
  render();
  return true;
}

function startPolling() {
  if (active && !pollTimer) pollTimer = setInterval(sync, 4000);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

function connect() {
  if (!('EventSource' in window)) {
    startPolling();
    return;
  }
  events = new EventSource('/api/events');
  events.addEventListener('state', event => {
    if (!active) return;
    try {
      if (acceptState(JSON.parse(event.data))) stopPolling();
    } catch {
      startPolling();
    }
  });
  events.onerror = startPolling;
}

async function sync() {
  if (!active || syncing) return;
  syncing = true;
  try {
    if (state) {
      const next = await getJSON('/api/state');
      if (active) acceptState(next);
    } else {
      const data = await getJSON('/api/bootstrap');
      if (!active) return;
      ritual = timeline(data.profile.phases);
      ensemble = data.ensemble || { mode: 'distributed' };
      recordings = data.audio;
      const audioIds = new Set(ritual.phases.map(phase => phase.audio_id));
      listen.hidden = !recordings.some(record => audioIds.has(record.id));
      acceptState(data.state);
      buildRoom();
      notice.hidden = true;
      connect();
    }
  } catch {
    if (!state) notice.textContent = 'Der Raum ist gerade nicht erreichbar.';
    startPolling();
  } finally {
    syncing = false;
  }
}

listen.addEventListener('click', async () => {
  if (audio.enabled) {
    stopAudio();
    return;
  }
  if (performance.now() - receivedAt > 6000) {
    audioStatus.textContent = 'Der Raum ist gerade nicht verbunden.';
    return;
  }
  try {
    if (await audio.start()) {
      listen.setAttribute('aria-pressed', 'true');
      stage.classList.add('is-listening');
      render();
    }
  } catch (error) {
    stopAudio(error.message);
  }
});

portrait.addEventListener('change', () => { if (state) buildRoom(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (audio.enabled) stopAudio();
  } else {
    sync();
    render();
  }
});

function start() {
  active = true;
  renderTimer = setInterval(render, 250);
  if (state) connect();
  else notice.hidden = false;
  sync();
}

window.addEventListener('pagehide', () => {
  active = false;
  stopAudio();
  events?.close();
  stopPolling();
  clearInterval(renderTimer);
});
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
start();
