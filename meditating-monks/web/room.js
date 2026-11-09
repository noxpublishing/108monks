/** Candlelit ritual room with one continuous aisle and a portrait seating plan. */
const NS = 'http://www.w3.org/2000/svg';
const MAX_SEATS = 108;
const AISLE = 24;
const FLOOR_TOP = 292;
const WIDE = { columns: 12, left: 0, width: 1100, height: 780 };
const PORTRAIT = { columns: 6, left: 240, width: 620, height: 1130 };

function hash01(n) {
  let h = (Math.imul(n + 1, 2654435761) ^ 0x9E3779B9) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h >>> 0) / 4294967296;
}

const POSTURE = {
  settle: 'p-sit', contemplation: 'p-sit', bodhicitta: 'p-sit',
  refuge: 'p-prost', prostration: 'p-bow', offering: 'p-off',
  mantra: 'p-sit', rest: 'p-still', dedication: 'p-sit',
  reflection: 'p-sit', 'guru-yoga': 'p-bow', purification: 'p-bow',
};

function postureOf(phase) {
  if (phase.id === 'acknowledgement') return 'p-low';
  return POSTURE[phase.kind] || 'p-sit';
}

function seatGeometry(index, portrait) {
  const { columns } = portrait ? PORTRAIT : WIDE;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const distance = column - (columns - 1) / 2;
  const spacing = portrait ? 98 - 2.2 * row : 78 - 1.9 * row;
  const x = 550 + distance * spacing + Math.sign(distance) * AISLE / 2;
  const y = portrait ? 1080 - 48 * row + .4 * row * row : 700 - 52 * row + 1.3 * row * row;
  const scale = (portrait ? 1.2 : 1) - .028 * row;
  return { x, y, scale };
}

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
  <linearGradient id="rrEdgeX">
    <stop stop-color="#17100b"/><stop offset="5%" stop-color="#17100b" stop-opacity="0"/>
    <stop offset="95%" stop-color="#17100b" stop-opacity="0"/><stop offset="100%" stop-color="#17100b"/>
  </linearGradient>
  <linearGradient id="rrEdgeY" x2="0" y2="1">
    <stop stop-color="#17100b"/><stop offset="5%" stop-color="#17100b" stop-opacity="0"/>
    <stop offset="96%" stop-color="#17100b" stop-opacity="0"/><stop offset="100%" stop-color="#17100b"/>
  </linearGradient>
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
`;

const FLOOR = `
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
  constructor(container) {
    this.container = container;
    this.seats = [];
  }

  build(monks, portrait) {
    const count = Math.min(monks, MAX_SEATS);
    const { columns, left, width: stageWidth, height } = portrait ? PORTRAIT : WIDE;
    const rows = Math.ceil(count / columns);
    const floorScale = (height - FLOOR_TOP) / (WIDE.height - FLOOR_TOP);
    const lamps = [428, 472, 516, 584, 628, 672].map(x => lamp(x, 152)).join('');
    this.container.innerHTML = `<svg class="rr-svg" viewBox="${left} 0 ${stageWidth} ${height}"
      role="img" aria-label="Digitaler Ritualraum mit ${count} meditierenden Mönchen">
      ${SCENE}${lamps}
      <g transform="translate(0 ${FLOOR_TOP}) scale(1 ${floorScale}) translate(0 -${FLOOR_TOP})">${FLOOR}</g>
      <g class="rr-seats"></g>
      <rect x="${left}" y="0" width="${stageWidth}" height="${height}" fill="url(#rrVignette)"/>
      <rect x="${left}" y="0" width="${stageWidth}" height="${height}" fill="url(#${portrait ? 'rrEdgeY' : 'rrEdgeX'})"/>
    </svg>`;
    const seats = this.container.querySelector('.rr-seats');
    this.seats = [];
    for (let row = rows - 1; row >= 0; row--) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        if (index >= count) break;
        const { x, y, scale } = seatGeometry(index, portrait);
        const group = document.createElementNS(NS, 'g');
        group.setAttribute('class', 'rr-seat');
        const figureHeight = 44 * scale;
        const figureWidth = figureHeight * (1127 / 1395);
        group.innerHTML = `<ellipse cx="${x}" cy="${y + 5 * scale}" rx="${20 * scale}" ry="${7 * scale}"
          fill="oklch(28% .055 32)" stroke="oklch(18% .04 30)" stroke-width=".8"/>
          <g class="rr-monk">
            <image href="/assets/monkback.webp" x="${x - figureWidth / 2}" y="${y - 33 * scale}"
              width="${figureWidth}" height="${figureHeight}"/>
            <ellipse class="rr-bowl" cx="${x}" cy="${y - 2 * scale}" rx="${4.6 * scale}" ry="${2.4 * scale}"
              fill="oklch(66% .1 72)" stroke="oklch(40% .07 60)" stroke-width=".7"/>
          </g>`;
        group.style.setProperty('--breath-duration', `${(7.2 + hash01(index + 100) * 1.9).toFixed(2)}s`);
        group.style.setProperty('--breath-delay', `${(-hash01(index + 140) * 3).toFixed(2)}s`);
        seats.append(group);
        this.seats[index] = {
          group, posture: '', pan: (x - 550) / (stageWidth / 2) * .9,
          row: 1 - row / rows * .46,
        };
      }
    }
  }

  tick(phaseAt) {
    this.seats.forEach((seat, index) => {
      const posture = postureOf(phaseAt(index));
      if (seat.posture !== posture) {
        seat.group.dataset.posture = posture;
        seat.posture = posture;
      }
    });
  }
}
