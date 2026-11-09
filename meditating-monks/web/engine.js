/** Integer timeline mirrored from app/engine.py; always anchored to server state. */
export function timeline(phases) {
  let cursor = 0;
  const starts = phases.map(p => { const start = cursor; cursor += p.duration_ms; return start; });
  return { phases, starts, total: cursor };
}
export function locate(tl, position) {
  const p = ((Math.floor(position) % tl.total) + tl.total) % tl.total;
  let i = tl.starts.length - 1;
  while (i > 0 && tl.starts[i] > p) i--;
  return { index: i, phase: tl.phases[i], elapsed: p - tl.starts[i] };
}
/** Kohorten-Versatz: byte-identische 32-Bit-Mischung wie app/engine.py:stable_start_offset.
    Ohne ensemble-Objekt gilt der frühere verteilte Modus (Legacy-Bibliotheksverhalten). */
export function cohortOffset(index, ensemble) {
  if (index <= 0) return 0;
  const spread = Math.max(0, Math.floor(ensemble.spread_ms ?? 1200));
  let h = (Math.imul(index, 2654435761) ^ Math.imul(ensemble.seed ?? 108, 40503)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h % (spread + 1);
}
export function monkOffset(tl, monks, index, ensemble) {
  if (ensemble && ensemble.mode === 'cohort') return cohortOffset(index, ensemble);
  return Math.floor(index * tl.total / monks);
}
export function monkPosition(tl, monks, index, activeMs, ensemble) {
  return locate(tl, monkOffset(tl, monks, index, ensemble) + activeMs);
}
export function cumulative(tl, absoluteMs, i) {
  const p = tl.phases[i];
  if (!p.counter || !p.unit_ms) return 0;
  const cycles = Math.floor(absoluteMs / tl.total), position = absoluteMs % tl.total;
  const per = p.duration_ms / p.unit_ms;
  return cycles * per + Math.min(per, Math.max(0, Math.floor((position - tl.starts[i]) / p.unit_ms)));
}
export function observedCount(tl, offset, activeMs, i) {
  const p = tl.phases[i];
  if (!p.counter || !p.unit_ms) return 0;
  let n = cumulative(tl, offset + activeMs, i) - cumulative(tl, offset, i);
  const local = offset % tl.total - tl.starts[i];
  if (local >= 0 && local < p.duration_ms) {
    const partial = local % p.unit_ms;
    if (partial && activeMs >= p.unit_ms - partial) n--;
  }
  return Math.max(0, n);
}
