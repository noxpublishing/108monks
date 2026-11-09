"""Deterministic, integer-based virtual practice engine, with no wall-clock backfill.

Counters count whole displayed units whose entire interval was observed after the
run started. Starting a monk in the middle of a mantra never credits that partial
mantra. These are software events, not human practice or spiritual attainments.
"""
from __future__ import annotations
from bisect import bisect_right
from dataclasses import dataclass
from .config import Ensemble, Profile

def stable_start_offset(index: int, seed: int, spread_ms: int) -> int:
    """Deterministic cohort offset in 0..spread_ms; index 0 starts exactly at 0.
    Intentionally implemented with the same wrapping 32-bit operations as the
    JavaScript mirror in web/engine.js, byte-exact, seeded, no per-frame randomness."""
    if index <= 0:
        return 0
    h = ((index * 2654435761) ^ ((seed & 0xFFFF) * 40503)) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 1274126177) & 0xFFFFFFFF
    h ^= h >> 16
    return h % (spread_ms + 1)

@dataclass(frozen=True)
class Timeline:
    profile: Profile
    starts: tuple[int, ...]
    total_ms: int

    @classmethod
    def build(cls, profile: Profile) -> "Timeline":
        starts, cursor = [], 0
        for phase in profile.phases:
            starts.append(cursor)
            cursor += phase.duration_ms
        return cls(profile, tuple(starts), cursor)

    def locate(self, position_ms: int) -> tuple[int, int]:
        position = position_ms % self.total_ms
        index = bisect_right(self.starts, position) - 1
        return index, position - self.starts[index]

    def cumulative(self, absolute_ms: int, phase_index: int) -> int:
        phase = self.profile.phases[phase_index]
        if not phase.counter or not phase.unit_ms:
            return 0
        cycles, position = divmod(absolute_ms, self.total_ms)
        count = phase.duration_ms // phase.unit_ms
        within = min(count, max(0, (position - self.starts[phase_index]) // phase.unit_ms))
        return cycles * count + within

    def observed_count(self, offset_ms: int, active_ms: int, phase_index: int) -> int:
        """Whole units completed within [offset, offset + active]; no invented history."""
        phase = self.profile.phases[phase_index]
        if not phase.counter or not phase.unit_ms:
            return 0
        end = offset_ms + active_ms
        count = self.cumulative(end, phase_index) - self.cumulative(offset_ms, phase_index)
        local = offset_ms % self.total_ms - self.starts[phase_index]
        if 0 <= local < phase.duration_ms:
            partial = local % phase.unit_ms
            if partial and active_ms >= phase.unit_ms - partial:
                count -= 1
        return max(0, count)

class Engine:
    def __init__(self, profile: Profile, monks: int, active_ms: int = 0, ensemble: Ensemble | None = None):
        if not 1 <= monks <= 5000:
            raise ValueError("monks must be in 1..5000")
        self.timeline = Timeline.build(profile)
        self.monks = monks
        self.active_ms = active_ms
        self.ensemble = ensemble or Ensemble()
        if self.ensemble.mode == "distributed":
            self.offsets = tuple(i * self.timeline.total_ms // monks for i in range(monks))
        else:
            self.offsets = tuple(stable_start_offset(i, self.ensemble.seed, self.ensemble.spread_ms) for i in range(monks))

    def advance(self, milliseconds: int) -> None:
        if milliseconds < 0:
            raise ValueError("Time may not move backwards")
        self.active_ms += milliseconds

    def monk(self, index: int) -> dict:
        if not 0 <= index < self.monks:
            raise IndexError(index)
        offset = self.offsets[index]
        phase_index, elapsed = self.timeline.locate(offset + self.active_ms)
        phase = self.timeline.profile.phases[phase_index]
        counters = {"mantra": 0, "prostration": 0, "offering": 0}
        for j, p in enumerate(self.timeline.profile.phases):
            if p.counter:
                counters[p.counter] += self.timeline.observed_count(offset, self.active_ms, j)
        return {
            "id": index, "label": f"Monk {index + 1:03d}", "offset_ms": offset,
            "phase_index": phase_index, "phase_id": phase.id, "phase_elapsed_ms": elapsed,
            "counters": counters, "completed_cycles": self.active_ms // self.timeline.total_ms,
        }

    def summary(self) -> dict:
        counts = {p.id: 0 for p in self.timeline.profile.phases}
        totals = {"mantra": 0, "prostration": 0, "offering": 0}
        for i, offset in enumerate(self.offsets):
            j, _ = self.timeline.locate(offset + self.active_ms)
            counts[self.timeline.profile.phases[j].id] += 1
            for k, p in enumerate(self.timeline.profile.phases):
                if p.counter:
                    totals[p.counter] += self.timeline.observed_count(offset, self.active_ms, k)
        return {"active_ms": self.active_ms, "monks": self.monks,
                "phase_counts": counts, "virtual_counters": totals,
                "cycle_duration_ms": self.timeline.total_ms}
