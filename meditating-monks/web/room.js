/** Der Ritualraum · Kerzenlicht-Abend (Ritualraum-Konzept v0.2.0).
 *
 * Ein stilisierter Klosterraum in erhöhter Vogelperspektive: Altarbereich oben,
 * Seitenpfeiler, Butterlampen, Mittelgang. Jede Figur hat einen festen Platz;
 * Aktivitätsfilter dimmen, statt die Sitzordnung umzubauen.
 * Gesten sind visuelle Kennzeichnungen, keine Unterweisung. */

const NS = 'http://www.w3.org/2000/svg';
const COLS = 12;
const AISLE = 24;
const MAX_SEATS = 108; /* sichtbarer Raum; weitere Figuren bleiben in der Liste */

/* ---------- deterministische Streuung pro Platz (kein Neuwürfeln je Frame) ---------- */
function hash01(n) {
  let h = (Math.imul(n + 1, 2654435761) ^ 0x9E3779B9) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h >>> 0) / 4294967296;
}

/* ---------- Geometrie: 9 Reihen à 12 Sitze, Mittelgang, Perspektive ---------- */
function rowY(r) { return 700 - 52 * r + 1.3 * r * r; }
function colW(r) { return 78 - 1.9 * r; }
function colX(r, c) {
  const w = colW(r);
  const d = (c < COLS / 2 ? (COLS / 2 - c - 0.5) : (c - COLS / 2 + 0.5)) * w;
  const side = c < COLS / 2 ? -1 : 1;
  return 550 + side * (d + AISLE / 2);
}
function scaleOf(r) { return 1 - 0.028 * r; }

/* ---------- Gesten je Abschnittsart ---------- */
const POSTURE = {
  settle: 'p-sit', contemplation: 'p-sit', bodhicitta: 'p-sit',
  refuge: 'p-prost', prostration: 'p-bow', offering: 'p-off',
  mantra: 'p-sit', rest: 'p-still', dedication: 'p-sit',
  reflection: 'p-sit', 'guru-yoga': 'p-bow', purification: 'p-bow',
};
const CHIP = {
  settle: 'Ankommen', contemplation: 'Betrachtung', bodhicitta: 'Bodhicitta',
  refuge: 'Zuflucht', prostration: 'Ehrerbietung', offering: 'Darbringung',
  reflection: 'Betrachtung', mantra: 'Om mani padme hum', rest: 'Stille',
  dedication: 'Widmung', 'guru-yoga': 'Guru-Yoga', purification: 'Reinigung',
};
function postureOf(phase) {
  if (phase.id === 'acknowledgement') return 'p-low';
  return POSTURE[phase.kind] || 'p-sit';
}
function chipTextOf(phase) {
  if (phase.id === 'acknowledgement') return 'Bekennen';
  return CHIP[phase.kind] || 'Betrachtung';
}

/* ---------- Sprechblase mit Zeiger: Rahmen als ein Pfad ---------- */
function bubblePath(w, tf) {
  const x0 = -w / 2, x1 = w / 2, r = 7, top = -9, bot = 7;
  return 'M ' + (x0 + r).toFixed(1) + ' ' + top +
    ' H ' + (x1 - r).toFixed(1) + ' Q ' + x1.toFixed(1) + ' ' + top + ' ' + x1.toFixed(1) + ' ' + (top + r) +
    ' V ' + (bot - r) + ' Q ' + x1.toFixed(1) + ' ' + bot + ' ' + (x1 - r).toFixed(1) + ' ' + bot +
    ' H ' + (tf + 4).toFixed(1) + ' L ' + tf.toFixed(1) + ' 13.5 L ' + (tf - 4).toFixed(1) + ' ' + bot +
    ' H ' + (x0 + r).toFixed(1) + ' Q ' + x0.toFixed(1) + ' ' + bot + ' ' + x0.toFixed(1) + ' ' + (bot - r) +
    ' V ' + (top + r) + ' Q ' + x0.toFixed(1) + ' ' + top + ' ' + (x0 + r).toFixed(1) + ' ' + top + ' Z';
}
function chipWidth(text) { return Math.max(46, text.length * 5.4 + 16); }

/* ---------- statische Szene (einmalig, keine externen Quellen) ---------- */
const SCENE = `
<defs>
  <radialGradient id="rrWallGlow" cx="50%" cy="22%" r="85%">
    <stop offset="0%" stop-color="oklch(31% 0.05 62)"/><stop offset="55%" stop-color="oklch(23% 0.03 58)"/>
    <stop offset="100%" stop-color="oklch(17% 0.018 55)"/>
  </radialGradient>
  <linearGradient id="rrWallTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="oklch(12% 0.015 55)" stop-opacity="0.85"/><stop offset="100%" stop-color="oklch(12% 0.015 55)" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="rrFloor" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="oklch(26% 0.035 55)"/><stop offset="60%" stop-color="oklch(21% 0.03 54)"/><stop offset="100%" stop-color="oklch(17.5% 0.024 54)"/>
  </linearGradient>
  <radialGradient id="rrWash" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="oklch(72% 0.13 75)" stop-opacity="0.5"/><stop offset="55%" stop-color="oklch(60% 0.11 68)" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="oklch(50% 0.08 60)" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rrHalo" cx="50%" cy="55%" r="50%">
    <stop offset="0%" stop-color="oklch(85% 0.12 85)" stop-opacity="0.9"/><stop offset="40%" stop-color="oklch(78% 0.13 78)" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="oklch(70% 0.12 72)" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rrRing" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="oklch(85% 0.12 88)" stop-opacity="0"/>
    <stop offset="70%" stop-color="oklch(85% 0.12 88)" stop-opacity="0.1"/><stop offset="100%" stop-color="oklch(85% 0.12 88)" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="rrCloth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="oklch(38% 0.07 30)"/><stop offset="100%" stop-color="oklch(24% 0.05 28)"/>
  </linearGradient>
  <linearGradient id="rrAisle" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="oklch(30% 0.06 32)"/><stop offset="100%" stop-color="oklch(20% 0.045 30)"/>
  </linearGradient>
  <radialGradient id="rrVignette" cx="50%" cy="42%" r="72%">
    <stop offset="0%" stop-color="oklch(10% 0.02 50)" stop-opacity="0"/><stop offset="72%" stop-color="oklch(10% 0.02 50)" stop-opacity="0"/>
    <stop offset="100%" stop-color="oklch(8% 0.015 50)" stop-opacity="0.5"/>
  </radialGradient>
  <filter id="rrSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>
<rect x="0" y="0" width="1100" height="312" fill="url(#rrWallGlow)"/>
<rect x="0" y="0" width="1100" height="120" fill="url(#rrWallTop)"/>
<g stroke="oklch(12% 0.02 52)" stroke-opacity="0.28" stroke-width="1">
  <path d="M132 24 V 268"/><path d="M264 24 V 268"/><path d="M396 24 V 268"/><path d="M528 24 V 268"/>
  <path d="M660 24 V 268"/><path d="M792 24 V 268"/><path d="M924 24 V 268"/>
</g>
<rect x="0" y="0" width="1100" height="26" fill="oklch(14% 0.02 52)"/>
<rect x="0" y="26" width="1100" height="3" fill="oklch(30% 0.04 62)" opacity="0.5"/>
<path d="M232 28 h 42 v 96 l -21 14 l -21 -14 z" fill="oklch(26% 0.06 30)" stroke="oklch(45% 0.07 55)" stroke-width="0.8"/>
<path d="M253 40 v 74" stroke="oklch(66% 0.09 72)" stroke-width="1" opacity="0.5"/>
<path d="M826 28 h 42 v 96 l -21 14 l -21 -14 z" fill="oklch(26% 0.06 30)" stroke="oklch(45% 0.07 55)" stroke-width="0.8"/>
<path d="M847 40 v 74" stroke="oklch(66% 0.09 72)" stroke-width="1" opacity="0.5"/>
<rect x="36" y="20" width="46" height="288" rx="6" fill="oklch(15% 0.02 52)"/>
<rect x="44" y="20" width="10" height="288" fill="oklch(34% 0.045 62)" opacity="0.55"/>
<rect x="1018" y="20" width="46" height="288" rx="6" fill="oklch(15% 0.02 52)"/>
<rect x="1046" y="20" width="10" height="288" fill="oklch(34% 0.045 62)" opacity="0.55"/>
<rect x="150" y="24" width="26" height="282" rx="5" fill="oklch(16% 0.024 54)"/>
<rect x="156" y="24" width="6" height="282" fill="oklch(36% 0.05 64)" opacity="0.5"/>
<rect x="924" y="24" width="26" height="282" rx="5" fill="oklch(16% 0.024 54)"/>
<rect x="938" y="24" width="6" height="282" fill="oklch(36% 0.05 64)" opacity="0.5"/>
<ellipse class="rrGlowPulse" cx="550" cy="120" rx="330" ry="150" fill="url(#rrWash)"/>
<path d="M252 258 L 848 258 L 862 292 L 238 292 Z" fill="oklch(30% 0.04 58)" stroke="oklch(20% 0.03 52)" stroke-width="1"/>
<path d="M282 214 L 818 214 L 836 258 L 164 258 Z" fill="oklch(34% 0.045 60)" stroke="oklch(22% 0.032 52)" stroke-width="1"/>
<path d="M282 214 L 818 214 L 824 228 L 276 228 Z" fill="oklch(40% 0.055 64)" opacity="0.8"/>
<rect x="352" y="128" width="396" height="90" rx="5" fill="oklch(26% 0.03 48)"/>
<rect x="352" y="128" width="396" height="10" fill="oklch(46% 0.06 62)" opacity="0.7"/>
<path d="M360 150 h 380 v 62 h -380 z" fill="url(#rrCloth)"/>
<path d="M360 150 h 380" stroke="oklch(66% 0.09 72)" stroke-width="1.2" opacity="0.55"/>
<path d="M360 202 q 40 10 80 0 t 80 0 t 80 0 t 80 0 t 60 0" fill="none" stroke="oklch(30% 0.06 32)" stroke-width="2"/>
<ellipse cx="548" cy="112" rx="118" ry="86" fill="url(#rrHalo)" opacity="0.5"/>
<rect x="488" y="22" width="120" height="108" rx="4" fill="oklch(22% 0.03 55)" stroke="oklch(46% 0.06 62)" stroke-width="2"/>
<image href="/assets/padmasambhava.webp" x="506" y="30" width="84" height="92" preserveAspectRatio="xMidYMid meet"/>
<g fill="oklch(42% 0.055 62)">
  <ellipse cx="420" cy="168" rx="6" ry="2.6"/><ellipse cx="460" cy="168" rx="6" ry="2.6"/>
  <ellipse cx="640" cy="168" rx="6" ry="2.6"/><ellipse cx="680" cy="168" rx="6" ry="2.6"/>
  <ellipse cx="560" cy="170" rx="4.5" ry="2.4" fill="oklch(50% 0.07 62)"/>
</g>
<g id="rrLamps"></g>
<rect x="0" y="292" width="1100" height="488" fill="url(#rrFloor)"/>
<ellipse cx="550" cy="316" rx="360" ry="72" fill="url(#rrWash)" opacity="0.55"/>
<g stroke="oklch(13% 0.02 52)" stroke-opacity="0.22" stroke-width="1">
  <path d="M0 336 H 1100"/><path d="M0 372 H 1100"/><path d="M0 410 H 1100"/><path d="M0 452 H 1100"/>
  <path d="M0 498 H 1100"/><path d="M0 548 H 1100"/><path d="M0 602 H 1100"/><path d="M0 660 H 1100"/><path d="M0 722 H 1100"/>
</g>
<rect x="533" y="300" width="34" height="480" rx="4" fill="url(#rrAisle)"/>
<path d="M539 300 V 780" stroke="oklch(60% 0.08 70)" stroke-width="0.8" opacity="0.4"/>
<path d="M561 300 V 780" stroke="oklch(60% 0.08 70)" stroke-width="0.8" opacity="0.4"/>
<g fill="oklch(70% 0.09 72)" opacity="0.35">
  <path d="M550 372 l 5 7 l -5 7 l -5 -7 z"/><path d="M550 500 l 5 7 l -5 7 l -5 -7 z"/>
  <path d="M550 628 l 5 7 l -5 7 l -5 -7 z"/><path d="M550 756 l 5 7 l -5 7 l -5 -7 z"/>
</g>`;

function lamp(cx, cy, scale = 1) {
  return `<g>
    <ellipse cx="${cx}" cy="${(cy - 9 * scale).toFixed(1)}" rx="${17 * scale}" ry="${20 * scale}" fill="url(#rrHalo)" opacity="0.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${8 * scale}" ry="${3 * scale}" fill="oklch(38% 0.06 60)"/>
    <ellipse cx="${cx}" cy="${(cy - 3 * scale).toFixed(1)}" rx="${5 * scale}" ry="${2.4 * scale}" fill="oklch(30% 0.05 55)"/>
    <circle cx="${cx}" cy="${(cy - 8 * scale).toFixed(1)}" r="${2.6 * scale}" fill="oklch(90% 0.11 88)"/>
  </g>`;
}

export class Room {
  constructor(container, options) {
    this.container = container;
    this.options = options; /* { onSelect(i), pageCount } */
    this.seats = [];
    this.selected = 0;
    this.filter = 'all';
    this.bubbles = false;
    this.calm = false;
    this.enlarged = false;
    this.enlargedKeydown = null;
    this.inertSiblings = [];
  }

  build(monks) {
    this.monks = Math.min(monks, MAX_SEATS);
    this.rows = Math.ceil(this.monks / COLS);
    const lamps = [428, 472, 516, 584, 628, 672].map(x => lamp(x, 152)).join('');
    this.container.innerHTML = `<div class="rr-scroll"><svg class="rr-svg" viewBox="0 0 1100 780" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Klosterraum mit ${this.monks} Sitzplätzen, zum Altar hin ausgerichtet">${SCENE}<g id="rrLamps">${lamps}</g><g class="rrSitze"></g><rect x="0" y="0" width="1100" height="780" fill="url(#rrVignette)" pointer-events="none"></rect></svg></div><button type="button" class="rr-enlarge" aria-pressed="false">Raum vergrößern</button>`;
    this.svg = this.container.querySelector('.rr-svg');
    this.sitze = this.container.querySelector('.rrSitze');
    this.seats = [];
    for (let rr = 0; rr < this.rows; rr++) {
      const r = this.rows - 1 - rr; /* hinten zuerst zeichnen: korrekte Tiefenstaffelung */
      for (let c = 0; c < COLS; c++) {
        const id = r * COLS + c;
        if (id >= this.monks) continue;
        this.sitze.appendChild(this._seat(id, r, c));
      }
    }
    this.seats.sort((a, b) => a.index - b.index);
    const enlarge = this.container.querySelector('.rr-enlarge');
    enlarge.addEventListener('click', () => this.setEnlarged(!this.enlarged));
    this.enlargedKeydown = (event) => {
      if (!this.enlarged || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.setEnlarged(false);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        // The roving seat and the close button are the two tab stops.
        const seat = this.seats.find(({ g }) => g.tabIndex === 0);
        const next = document.activeElement === enlarge ? seat?.g : enlarge;
        (next ?? enlarge).focus();
      }
    };
    window.addEventListener('keydown', this.enlargedKeydown);
  }

  _seat(index, r, c) {
    const cx = colX(r, c), cy = rowY(r), s = scaleOf(r);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'rrSitz');
    g.setAttribute('data-i', index);
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '-1');
    const halo = document.createElementNS(NS, 'ellipse');
    halo.setAttribute('class', 'rrHalo');
    halo.setAttribute('cx', cx); halo.setAttribute('cy', cy - 14 * s);
    halo.setAttribute('rx', 26 * s + 12); halo.setAttribute('ry', 32 * s + 14);
    halo.setAttribute('fill', 'url(#rrRing)'); halo.setAttribute('stroke', 'oklch(84% 0.11 85)');
    halo.setAttribute('stroke-width', '1.2'); halo.setAttribute('stroke-dasharray', '5 4');
    g.appendChild(halo);
    const cushion = document.createElementNS(NS, 'ellipse');
    cushion.setAttribute('cx', cx); cushion.setAttribute('cy', cy + 5 * s);
    cushion.setAttribute('rx', 20 * s); cushion.setAttribute('ry', 7 * s);
    cushion.setAttribute('fill', 'oklch(28% 0.055 32)'); cushion.setAttribute('stroke', 'oklch(18% 0.04 30)');
    cushion.setAttribute('stroke-width', '0.8');
    g.appendChild(cushion);
    const m = document.createElementNS(NS, 'g');
    m.setAttribute('class', 'm');
    m.style.setProperty('--dur', (7.2 + hash01(index + 100) * 1.9).toFixed(2) + 's');
    m.style.setProperty('--del', (hash01(index + 140) * 3).toFixed(2) + 's');
    m.style.setProperty('--amp', (1.15 + 0.5 * hash01(index + 180)).toFixed(2));
    m.style.setProperty('--enter', (hash01(index + 500) * 420).toFixed(0) + 'ms');
    /* Figur: Projekt-Illustration (monkback.webp), gemeinsame Datei für alle Plätze */
    const img = document.createElementNS(NS, 'image');
    img.setAttribute('href', '/assets/monkback.webp');
    img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const ih = 44 * s, iw = ih * (1127 / 1395);
    img.setAttribute('x', (cx - iw / 2).toFixed(1));
    img.setAttribute('y', (cy - 33 * s).toFixed(1));
    img.setAttribute('width', iw.toFixed(1));
    img.setAttribute('height', ih.toFixed(1));
    m.appendChild(img);
    const bowl = document.createElementNS(NS, 'g');
    bowl.setAttribute('class', 'bowl');
    const be = document.createElementNS(NS, 'ellipse');
    be.setAttribute('cx', cx); be.setAttribute('cy', cy - 2 * s);
    be.setAttribute('rx', 4.6 * s); be.setAttribute('ry', 2.4 * s);
    be.setAttribute('fill', 'oklch(66% 0.1 72)'); be.setAttribute('stroke', 'oklch(40% 0.07 60)');
    be.setAttribute('stroke-width', '0.7');
    bowl.appendChild(be);
    m.appendChild(bowl);
    g.appendChild(m);
    /* Sprechblase mit Zeiger, natürlich versetzt */
    const jx = (hash01(index + 220) - 0.5) * 12, jy = (hash01(index + 240) - 0.5) * 8;
    const jrot = (hash01(index + 280) - 0.5) * 7, tf = (hash01(index + 260) - 0.5) * 24;
    const chip = document.createElementNS(NS, 'g');
    chip.setAttribute('class', 'rrChip');
    chip.setAttribute('transform', `translate(${(cx + jx).toFixed(1)} ${(cy - 26 * s - 16 + jy).toFixed(1)}) rotate(${jrot.toFixed(2)})`);
    const inner = document.createElementNS(NS, 'g');
    inner.setAttribute('class', 'rrChipInner');
    inner.style.setProperty('--d', (hash01(index + 320) * 240).toFixed(0) + 'ms');
    const bg = document.createElementNS(NS, 'path');
    bg.setAttribute('class', 'rrChipBg');
    const tx = document.createElementNS(NS, 'text');
    tx.setAttribute('y', '0.5'); tx.setAttribute('dominant-baseline', 'central');
    inner.appendChild(bg); inner.appendChild(tx);
    chip.appendChild(inner);
    g.appendChild(chip);
    g.addEventListener('click', () => this.options.onSelect(index));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.options.onSelect(index); }
    });
    const seat = { index, r, c, g, m, chipBg: bg, chipTx: tx, tf, phaseId: '', posture: '', dim: false, aria: '' };
    this.seats.push(seat);
    return g;
  }

  /** Regelmäßiger Aktualisierungslauf: Haltung, Blase, Dämmung, Auswahl. */
  tick(getPosition, selected, filter, kindsOf) {
    this.filter = filter;
    const tabStop = this.seats[selected]?.index ?? 0;
    for (const seat of this.seats) {
      const pos = getPosition(seat.index);
      if (!pos) continue;
      const kind = kindsOf(pos);
      const posture = postureOf(pos.phase);
      if (seat.phaseId !== pos.phase.id) {
        seat.phaseId = pos.phase.id;
        seat.g.classList.remove('p-sit', 'p-bow', 'p-prost', 'p-off', 'p-low', 'p-still');
        seat.g.classList.add(posture);
        if (this.bubbles) {
          const label = chipTextOf(pos.phase);
          seat.chipTx.textContent = label;
          seat.chipBg.setAttribute('d', bubblePath(chipWidth(label), seat.tf));
        }
      }
      const dim = filter !== 'all' && !(kind === filter || (filter === 'rest' && ['rest', 'settle', 'contemplation'].includes(kind)));
      if (dim !== seat.dim) { seat.dim = dim; seat.g.classList.toggle('dim', dim); }
      const on = seat.index === selected;
      if (on !== seat.selected) {
        seat.selected = on;
        seat.g.classList.toggle('selected', on);
      }
      const tabIndex = seat.index === tabStop ? 0 : -1;
      if (seat.g.tabIndex !== tabIndex) seat.g.tabIndex = tabIndex;
      const label = `Mönch ${String(seat.index + 1).padStart(3, '0')} · ${pos.phase.label}${on ? ' · ausgewählt' : ''}`;
      if (label !== seat.aria) { seat.aria = label; seat.g.setAttribute('aria-label', label); seat.g.setAttribute('aria-pressed', String(on)); }
    }
  }

  arrows(event, onSelect) {
    if (!(event.target instanceof Element)) return false;
    const seat = this.seats[Number(event.target.getAttribute('data-i'))];
    if (seat?.g !== event.target) return false;
    const row = seat.r, col = seat.c;
    let r = row, c = col;
    if (event.key === 'ArrowLeft') c = Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') c = Math.min(COLS - 1, col + 1);
    else if (event.key === 'ArrowUp') r = Math.max(0, row - 1);
    else if (event.key === 'ArrowDown') r = Math.min(this.rows - 1, row + 1);
    else return false;
    event.preventDefault();
    const index = Math.min(this.monks - 1, r * COLS + c);
    onSelect(index);
    this.seats[index].g.focus();
    return true;
  }

  setBubbles(on) {
    this.bubbles = on;
    this.container.classList.toggle('show-chips', on);
    if (!on) return;
    for (const seat of this.seats) { seat.phaseId = ''; } /* Text beim nächsten tick neu setzen */
  }
  setCalm(on) { this.calm = on; this.container.classList.toggle('calm', on); }
  setEnlarged(on) {
    if (on === this.enlarged) return;
    this.enlarged = on;
    this.container.classList.toggle('enlarged', on);
    if (on) {
      this.container.setAttribute('role', 'dialog');
      this.container.setAttribute('aria-label', 'Vergrößerter Ritualraum');
      this.container.setAttribute('aria-modal', 'true');
      for (let branch = this.container; branch !== document.body; branch = branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert) {
            sibling.inert = true;
            this.inertSiblings.push(sibling);
          }
        }
      }
    } else {
      this.container.removeAttribute('role');
      this.container.removeAttribute('aria-label');
      this.container.removeAttribute('aria-modal');
      for (const sibling of this.inertSiblings) sibling.inert = false;
      this.inertSiblings = [];
    }
    const btn = this.container.querySelector('.rr-enlarge');
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Raum verkleinern' : 'Raum vergrößern';
    btn.focus({ preventScroll: true });
  }
  destroy() {
    if (this.enlarged) this.setEnlarged(false);
    if (this.enlargedKeydown) window.removeEventListener('keydown', this.enlargedKeydown);
    this.container.replaceChildren();
  }
}
