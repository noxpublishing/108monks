import { timeline, monkPosition, monkOffset, cohortOffset, displayKind, duration } from './engine.js';
import { AudioRoom } from './audio.js';
import { Room } from './room.js';

const $ = id => document.getElementById(id);
const fmt = new Intl.NumberFormat('de-DE');
const monkShape = $('monk-shape').innerHTML;
const audio = new AudioRoom(message => $('audio-status').textContent = message);
let bootstrap, tl, state, receivedAt = 0, selected = 0, filter = 'all', page = 0, tiles = new Map();
let gridIds = '', selectedPhaseKey = '', eventSource, pollTimer, lastRender = 0, networkTimer;
let localMala = 0;
let ensemble = null, room = null, viewMode = 'room';
const PAGE_SIZE = 72;
const ROOM_PREFS_KEY = 'meditating-monks.room-prefs.v2';
let roomPrefs = { bubbles: false, calm: matchMedia('(prefers-reduced-motion: reduce)').matches };
try { const saved = JSON.parse(localStorage.getItem(ROOM_PREFS_KEY) || 'null'); if (saved) roomPrefs = { ...roomPrefs, ...saved }; } catch (_) {}
function saveRoomPrefs() { try { localStorage.setItem(ROOM_PREFS_KEY, JSON.stringify(roomPrefs)); } catch (_) {} }

function fail(message) { $('error-banner').textContent = message; $('error-banner').hidden = false; }
async function getJSON(url) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Serverantwort ${response.status}`);
  return response.json();
}
function stale() { return !state || performance.now() - receivedAt > 6000; }
function activeMs() {
  if (!state) return 0;
  // Interpolation is UI-only and bounded. Never invent continued activity offline.
  return state.active_ms + Math.min(2000, Math.max(0, performance.now() - receivedAt));
}
function acceptState(next) {
  if (state && state.run_id !== next.run_id) { location.reload(); return; }
  const isNewHeartbeat = !state || next.updated_at_ms !== state.updated_at_ms;
  state = next; if (isNewHeartbeat) receivedAt = performance.now();
  $('stat-chant').textContent = fmt.format(state.virtual_counters.mantra);
  $('stat-bow').textContent = fmt.format(state.virtual_counters.prostration);
  const mins = Math.floor(state.active_ms / 60000);
  $('stat-uptime').textContent = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  $('error-banner').hidden = true;
}
function position(index) {
  const active = activeMs();
  const ens = ensemble || { mode: 'distributed' };
  const offset = monkOffset(tl, state.monks, index, ens);
  const p = monkPosition(tl, state.monks, index, active, ens);
  return { ...p, monkId: index, cycle: Math.floor((offset + active) / tl.total) };
}
function makeMonkButton(index) {
  const button = document.createElement('button'); button.className = 'monk-tile';
  button.type = 'button'; button.dataset.monkId = index;
  // Only the validated integer enters this constant markup; remote text uses textContent.
  button.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${monkShape}</svg><span>${String(index + 1).padStart(3, '0')}</span>`;
  button.addEventListener('click', () => { selected = index; selectedPhaseKey = ''; render(true); });
  return button;
}
/* Versammlung hinter dem ausgewählten Mönch: sieben Frontansichten,
   deterministisch versetzt (kein Zufall je Renderdurchlauf). */
function buildShrineCrowd() {
  const crowd = $('dw-crowd');
  const offsets = [-34, -24, -15, -8, 15, 24, 34];
  offsets.forEach((x, i) => {
    const img = document.createElement('img');
    img.src = '/assets/monkfront.webp';
    img.alt = '';
    img.style.setProperty('--x', x + '%');
    img.style.setProperty('--k', (0.8 + ((i * 37) % 20) / 50).toFixed(2));
    img.style.setProperty('--o', (0.82 + ((i * 53) % 10) / 45).toFixed(2));
    crowd.appendChild(img);
  });
}
function paintPose(element, pos) {
  const kind = displayKind(pos.phase);
  if (element.dataset.phase !== pos.phase.id) {
    element.dataset.phase = pos.phase.id; element.dataset.kind = kind;
    element.style.setProperty('--bow-duration', `${(pos.phase.unit_ms || 9000) / 1000}s`);
    element.style.setProperty('--bow-delay', `${-((pos.elapsed % (pos.phase.unit_ms || 9000)) / 1000)}s`);
  }
}
function renderGrid() {
  const matching = [];
  for (let i = 0; i < state.monks; i++) {
    const kind = displayKind(position(i).phase);
    if (filter === 'all' || kind === filter || (filter === 'rest' && ['rest', 'settle', 'contemplation'].includes(kind))) matching.push(i);
  }
  const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE)); page = Math.min(page, pages - 1);
  const ids = matching.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const signature = ids.join(',');
  if (signature !== gridIds) {
    gridIds = signature; const fragment = document.createDocumentFragment(); const newTiles = new Map();
    ids.forEach(i => { const tile = tiles.get(i) || makeMonkButton(i); newTiles.set(i, tile); fragment.append(tile); });
    $('monks-grid').replaceChildren(fragment); tiles = newTiles;
  }
  tiles.forEach((tile, i) => {
    const pos = position(i); paintPose(tile, pos);
    tile.setAttribute('aria-pressed', String(i === selected));
    const label = `Monk ${String(i + 1).padStart(3, '0')} · ${pos.phase.label}`;
    tile.setAttribute('aria-label', label); tile.title = label;
  });
  $('empty-filter').hidden = matching.length !== 0;
  $('page-label').textContent = `${matching.length ? page * PAGE_SIZE + 1 : 0}–${Math.min((page + 1) * PAGE_SIZE, matching.length)} von ${matching.length} · zum Öffnen auswählen`;
  $('page-prev').disabled = page === 0; $('page-next').disabled = page >= pages - 1;
}
function renderSelected() {
  const pos = position(selected), p = pos.phase;
  const key = `${selected}:${p.id}`;
  if (key !== selectedPhaseKey) {
    selectedPhaseKey = key;
    $('selected-number').textContent = `MONK ${String(selected + 1).padStart(3, '0')}`;
    $('selected-phase').textContent = p.label;
    $('selected-tibetan').textContent = p.tibetan || ''; $('selected-tibetan').hidden = !p.tibetan;
    $('phase-kicker').textContent = `ABSCHNITT ${pos.index + 1} VON ${tl.phases.length}`;
    $('shrine').setAttribute('aria-label', `Einzelansicht · Mönch ${String(selected + 1).padStart(3, '0')} · Abschnitt: ${p.label}. Buddha über Padmasambhava, dahinter die Versammlung, vorn der ausgewählte digitale Mönch.`);
    document.querySelectorAll('.phase-list li').forEach((li, i) => { li.classList.toggle('current', i === pos.index); if (i === pos.index) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  }
  const text = p.reflections?.length ? p.reflections[Math.min(p.reflections.length - 1, Math.floor(pos.elapsed / p.duration_ms * p.reflections.length))] : p.text;
  if ($('selected-text').textContent !== text) $('selected-text').textContent = text;
  $('phase-progress-bar').style.width = `${pos.elapsed / p.duration_ms * 100}%`;
  $('phase-progress-label').textContent = p.unit_ms ? `Einheit ${Math.floor(pos.elapsed / p.unit_ms) + 1} / ${p.duration_ms / p.unit_ms}` : 'Im aktuellen Abschnitt';
  $('phase-remaining').textContent = `${duration(p.duration_ms - pos.elapsed)} verbleibend`;
  if (audio.enabled && !stale()) audio.update([pos], bootstrap.audio, state.run_id);
}
function render(force = false) {
  if (!state || !tl) return;
  const isStale = stale();
  $('status-dot').classList.toggle('offline', isStale);
  $('connection-label').textContent = isStale ? 'Verbindung unterbrochen · Anzeige eingefroren' : 'Der Raum ist geöffnet';
  document.body.classList.toggle('disconnected', isStale);
  if (isStale && audio.enabled) stopAudio('Verbindung unterbrochen. Audio wurde gestoppt.');
  if (viewMode === 'room' && room) room.tick(i => position(i), selected, filter, pos => displayKind(pos.phase));
  else renderGrid();
  renderSelected();
}
function loop(now) {
  if (!document.hidden && now - lastRender >= 250) { lastRender = now; render(); }
  requestAnimationFrame(loop);
}
function populatePhases() {
  const fragment = document.createDocumentFragment();
  tl.phases.forEach((p, i) => {
    const li = document.createElement('li');
    const number = document.createElement('span'); number.className = 'step-number'; number.textContent = String(i + 1).padStart(2, '0');
    const name = document.createElement('span'); name.textContent = p.label;
    const time = document.createElement('time'); time.textContent = duration(p.duration_ms);
    li.append(number, name, time); fragment.append(li);
  });
  $('phase-list').replaceChildren(fragment);
  $('classification').textContent = bootstrap.profile.classification;
  for (const source of bootstrap.profile.sources) {
    const link = document.createElement('a'); link.href = source.url; link.textContent = source.title;
    link.target = '_blank'; link.rel = 'noopener noreferrer'; $('sources').append(link);
  }
}
function updateVoices() {
  const select = $('tts-voice'), previous = select.value; select.replaceChildren();
  const voices = audio.localVoices();
  voices.forEach((v, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = `${v.name} · ${v.lang}`; select.append(option); });
  if (!voices.length) { const option = document.createElement('option'); option.textContent = 'Keine lokale Stimme verfügbar'; select.append(option); }
  else if (previous && Number(previous) < voices.length) select.value = previous;
  else { const index = voices.findIndex(v => v.lang.startsWith('de')); if (index >= 0) select.value = String(index); }
}
function stopAudio(message = 'Audio ist ausgeschaltet.') {
  audio.stop(); $('audio-toggle').textContent = '▶ Zuhören'; $('audio-toggle').setAttribute('aria-pressed', 'false'); $('audio-status').textContent = message;
  $('volume-bg').disabled = true;
}
$('audio-toggle').addEventListener('click', async () => {
  if (audio.enabled) { stopAudio(); return; }
  if (stale()) { $('audio-status').textContent = 'Ohne aktuelle Serververbindung wird kein fortlaufender Audiostrom simuliert.'; return; }
  const mode = $('audio-mode').value;
  if (mode === 'recording' && !bootstrap.audio.length) { $('audio-status').textContent = 'Noch keine Aufnahme hinterlegt. Wähle für einen Funktionstest die lokale TTS-Demo.'; return; }
  try {
    await audio.start(mode, audio.localVoices()[Number($('tts-voice').value)]);
    $('audio-toggle').textContent = '■ Audio stoppen'; $('audio-toggle').setAttribute('aria-pressed', 'true');
    $('volume-bg').disabled = mode === 'tts';
    renderSelected();
  } catch (error) { stopAudio(error.message); }
});
$('audio-mode').addEventListener('change', () => { stopAudio(); $('tts-controls').hidden = $('audio-mode').value !== 'tts'; $('chorus-mode').disabled = $('audio-mode').value === 'tts'; updateVoices(); });
$('tts-voice').addEventListener('change', () => stopAudio('Stimme geändert. Starte die Wiedergabe erneut.'));
$('chorus-mode').addEventListener('change', () => { audio.setChoirMode($('chorus-mode').value); renderSelected(); });
$('volume-bg').addEventListener('input', event => audio.setBgLevel(Number(event.target.value) * 0.16));
audio.setBgLevel(Number($('volume-bg').value) * 0.16);
$('volume').addEventListener('input', event => audio.setVolume(Number(event.target.value)));
if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', updateVoices);
updateVoices();

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter; page = 0; gridIds = '__refresh__';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); render(true);
}));
$('page-prev').addEventListener('click', () => { page--; render(true); });
$('page-next').addEventListener('click', () => { page++; render(true); });

/* ---------- Raumansicht, Sprechblasen, ruhige Darstellung ---------- */
function setView(mode) {
  viewMode = mode;
  $('view-room').setAttribute('aria-pressed', String(mode === 'room'));
  $('view-list').setAttribute('aria-pressed', String(mode === 'list'));
  $('room-viewport').hidden = mode !== 'room';
  $('monks-grid').hidden = mode !== 'list';
  $('list-footer').hidden = mode !== 'list';
  gridIds = '__refresh__';
  render(true);
}
$('view-room').addEventListener('click', () => setView('room'));
$('view-list').addEventListener('click', () => setView('list'));
$('room-bubbles').addEventListener('change', event => {
  roomPrefs.bubbles = event.target.checked; saveRoomPrefs();
  room.setBubbles(event.target.checked); render(true);
});
$('room-calm').addEventListener('change', event => {
  roomPrefs.calm = event.target.checked; saveRoomPrefs();
  room.setCalm(event.target.checked);
});
window.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  if (viewMode !== 'room' || !room) return;
  room.arrows(event, selected, index => { selected = index; selectedPhaseKey = ''; render(true); });
});

function malaRender() {
  $('mala-count').textContent = fmt.format(localMala); $('mala-rounds').textContent = fmt.format(Math.floor(localMala / 108));
  const within = localMala % 108;
  [...$('mala-beads').children].forEach((bead, i) => bead.classList.toggle('filled', i < within));
  try { localStorage.setItem('meditating-monks.personal-mala.v1', String(localMala)); }
  catch (_) { $('mala-storage').textContent = 'Dieser Browser erlaubt keine lokale Speicherung. Dein Zähler bleibt nur bis zum Schließen dieser Seite erhalten.'; }
}
try { const saved = Number(localStorage.getItem('meditating-monks.personal-mala.v1') || 0); if (Number.isSafeInteger(saved) && saved >= 0) localMala = saved; } catch (_) {}
for (let i = 0; i < 108; i++) $('mala-beads').append(document.createElement('span'));
$('mala-open').addEventListener('click', () => { malaRender(); $('mala-dialog').showModal(); $('mala-add').focus(); });
$('mala-close').addEventListener('click', () => $('mala-dialog').close());
$('mala-add').addEventListener('click', () => { if (localMala < Number.MAX_SAFE_INTEGER) localMala++; malaRender(); });
$('mala-undo').addEventListener('click', () => { localMala = Math.max(0, localMala - 1); malaRender(); });
$('mala-reset').addEventListener('click', () => { if (confirm('Deinen persönlichen, lokal gespeicherten Zähler wirklich zurücksetzen?')) { localMala = 0; malaRender(); } });

async function updateNetwork() {
  try {
    const network = await getJSON('/api/network'); $('peer-list').replaceChildren();
    if (!network.enabled) { $('network-summary').textContent = 'Eigenständige Instanz. Föderation ist ausgeschaltet. Du brauchst kein Netzwerk, um diesen Raum zu betreiben.'; return; }
    $('network-summary').textContent = `${network.peers.filter(p => p.online).length} verbundene Räume mit frischen Meldungen. Explizit vertraute Schlüssel, keine offene Serverliste.`;
    network.peers.forEach(peer => {
      const div = document.createElement('div'); div.className = 'peer';
      const name = document.createElement('strong'); name.textContent = peer.name;
      const info = document.createElement('small'); info.textContent = `${peer.online ? 'Frische Meldung' : 'Meldung abgelaufen'} · ${peer.monks} digitale Mönche · Selbstauskunft`;
      div.append(name, info); $('peer-list').append(div);
    });
  } catch (_) { $('network-summary').textContent = 'Netzwerkstatus derzeit nicht erreichbar.'; }
}
function connectEvents() {
  if (!('EventSource' in window)) { startPolling(); return; }
  eventSource = new EventSource('/api/events');
  eventSource.addEventListener('state', event => { try { acceptState(JSON.parse(event.data)); if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } } catch (_) {} });
  eventSource.onerror = () => startPolling();
}
function startPolling() {
  if (!pollTimer) pollTimer = setInterval(async () => { try { acceptState(await getJSON('/api/state')); } catch (_) {} }, 4000);
}
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) { stopAudio('Audio pausiert, weil die Seite nicht sichtbar ist.'); return; }
  try { acceptState(await getJSON('/api/state')); render(true); } catch (_) {}
});
window.addEventListener('pagehide', () => { audio.stop(); eventSource?.close(); clearInterval(pollTimer); clearInterval(networkTimer); });

window.addEventListener('pageshow', event => { if (event.persisted && state) { connectEvents(); updateNetwork(); networkTimer = setInterval(updateNetwork, 30000); } });

async function init() {
  try {
    bootstrap = await getJSON('/api/bootstrap'); tl = timeline(bootstrap.profile.phases); acceptState(bootstrap.state);
    ensemble = bootstrap.ensemble || { mode: 'distributed', spread_ms: 0, seed: 0 };
    $('node-name').textContent = bootstrap.node.name; $('monk-count').textContent = `${fmt.format(state.monks)} digitale Mönche`;
    $('dedication-text').textContent = bootstrap.node.dedication; $('version').textContent = bootstrap.version;
    $('node-id').textContent = bootstrap.node.id; $('cycle-length').textContent = `${duration(tl.total)} pro Zyklus`;
    populatePhases();
    room = new Room($('room-viewport'), { onSelect: index => { selected = index; selectedPhaseKey = ''; render(true); } });
    room.build(state.monks);
    buildShrineCrowd();
    /* Raumchor-Karte: bis zu 108 feste Wiedergabepositionen mit Cohort-Versatz,
       Spaltenpanorama und Zeilen-Distanzfaktor (hinten leiser, Ritualraum-Konzept §4). */
    const choirSeats = Math.min(state.monks, 108);
    const choirMap = [];
    for (let i = 0; i < choirSeats; i++) {
      const col = i % 12, row = Math.floor(i / 12);
      choirMap.push({
        off: cohortOffset(i, ensemble) / 1000,
        pan: (col / 11) * 1.5 - 0.75,
        row: 1 - row * 0.056,
      });
    }
    audio.setChoirMap(choirMap);
    audio.setChoirMode($('chorus-mode').value);
    room.setBubbles(roomPrefs.bubbles); room.setCalm(roomPrefs.calm);
    $('room-bubbles').checked = roomPrefs.bubbles; $('room-calm').checked = roomPrefs.calm;
    $('room-note').textContent = state.monks > 108
      ? `Sichtbar: 108 Plätze; alle ${fmt.format(state.monks)} Figuren in der Liste.`
      : (ensemble.mode === 'cohort' ? `Gemeinsamer Takt · Versätze bis ${ensemble.spread_ms} ms.` : 'Verteilte Zeiten (Legacy-Modus).');
    for (let i = 0; i < state.monks; i++) if (position(i).phase.kind === 'mantra') { selected = i; break; }
    render(true); connectEvents(); await updateNetwork(); networkTimer = setInterval(updateNetwork, 30000);
    requestAnimationFrame(loop);
  } catch (error) { fail(`Der Raum konnte nicht geladen werden: ${error.message}. Prüfe, ob der Server läuft, und lade die Seite neu.`); $('connection-label').textContent = 'Nicht verbunden'; $('status-dot').classList.add('offline'); }
}
init();
