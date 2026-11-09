import json
import random
import pytest
from app.engine import Engine, Timeline, stable_start_offset
from app.config import Profile, ROOT, Ensemble

def test_zero_run_has_zero_counters(profile):
    engine = Engine(profile, 500)
    assert engine.summary()['virtual_counters'] == {'mantra':0,'prostration':0,'offering':0}
    assert sum(engine.summary()['phase_counts'].values()) == 500

def test_every_phase_boundary(profile):
    tl = Timeline.build(profile)
    for i, start in enumerate(tl.starts):
        assert tl.locate(start) == (i, 0)
        assert tl.locate(start + profile.phases[i].duration_ms - 1)[0] == i
    assert tl.locate(tl.total_ms) == (0,0)

def test_cohort_default_keeps_ensemble_together(profile):
    """v0.2.0-Standard: ein gemeinsamer Abschnitt plus schmaler Übergangskorridor."""
    engine = Engine(profile, 108)
    ids = {engine.monk(i)['phase_id'] for i in range(108)}
    assert len(ids) <= 2
    offsets = [engine.monk(i)['offset_ms'] for i in range(108)]
    assert offsets[0] == 0
    assert max(offsets) <= 1200
    assert 0 < len(set(offsets))  # stabile individuelle Versätze, nicht alle gleich

def test_cohort_offsets_are_stable_and_seeded(profile):
    a = Engine(profile, 10, ensemble=Ensemble(seed=7, spread_ms=900))
    b = Engine(profile, 10, ensemble=Ensemble(seed=7, spread_ms=900))
    c = Engine(profile, 10, ensemble=Ensemble(seed=8, spread_ms=900))
    assert a.offsets == b.offsets
    assert a.offsets != c.offsets
    assert max(a.offsets) <= 900 and a.offsets[0] == 0

def test_cohort_matches_javascript_reference_values():
    """Byte-parity with the 32-bit mirror in web/engine.js (seed 108, spread 1200)."""
    expected = [225, 233, 801, 981, 175, 1035, 1044, 1167, 808, 371, 1134, 429]
    assert [stable_start_offset(i, 108, 1200) for i in range(1, 13)] == expected

def test_distributed_mode_spreads_across_profile(profile):
    engine = Engine(profile, 108, ensemble=Ensemble(mode="distributed"))
    assert len({engine.monk(i)['phase_id'] for i in range(108)}) > 8

def test_zero_spread_marches_in_lockstep(profile):
    engine = Engine(profile, 64, ensemble=Ensemble(spread_ms=0))
    assert set(engine.offsets) == {0}

def test_negative_advance_rejected(profile):
    with pytest.raises(ValueError): Engine(profile,1).advance(-1)

@pytest.mark.parametrize('monks', [0,-1,5001])
def test_invalid_population(profile, monks):
    with pytest.raises(ValueError): Engine(profile, monks)

def test_out_of_range(profile):
    engine = Engine(profile,108)
    for i in [-1,108,999]:
        with pytest.raises(IndexError): engine.monk(i)

def test_single_agent_complete_cycle(profile):
    engine=Engine(profile,1)
    engine.advance(engine.timeline.total_ms)
    assert engine.summary()['virtual_counters'] == {'mantra':108,'prostration':15,'offering':8}
    assert engine.monk(0)['completed_cycles'] == 1

def test_partial_first_mantra_not_counted(profile):
    tl=Timeline.build(profile)
    index=next(i for i,p in enumerate(profile.phases) if p.id=='mani')
    unit=profile.phases[index].unit_ms
    offset=tl.starts[index]+123
    assert tl.observed_count(offset,unit-113,index)==0
    assert tl.observed_count(offset,2*unit-113,index)==1

def test_random_intervals_against_brute_force(profile):
    tl=Timeline.build(profile); rng=random.Random(731)
    for _ in range(250):
        i=rng.choice([j for j,p in enumerate(profile.phases) if p.counter])
        phase=profile.phases[i]; offset=rng.randrange(tl.total_ms); active=rng.randrange(tl.total_ms*3)
        expected=0
        for cycle in range(5):
            for start in range(cycle*tl.total_ms+tl.starts[i],cycle*tl.total_ms+tl.starts[i]+phase.duration_ms,phase.unit_ms):
                if start >= offset and start+phase.unit_ms <= offset+active: expected+=1
        assert tl.observed_count(offset,active,i)==expected

def test_monotonic_summaries(profile):
    e=Engine(profile,108); old=e.summary()['virtual_counters']
    for _ in range(25):
        e.advance(17237); new=e.summary()['virtual_counters']
        assert all(new[k]>=old[k] for k in old); old=new

def test_profile_integrity(profile):
    raw=profile.model_dump(); raw['phases'][0]['unit_ms']=7000
    with pytest.raises(ValueError): Profile.model_validate(raw)
    raw=profile.model_dump(); raw['phases'][1]['id']=raw['phases'][0]['id']
    with pytest.raises(ValueError): Profile.model_validate(raw)

def test_outline_is_not_ready():
    profile=Profile.model_validate_json((ROOT/'profiles/longchen-nyingtik-outline.json').read_text())
    assert profile.status=='outline-only'
