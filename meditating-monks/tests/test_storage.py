import time
import pytest
from app.storage import Store
from app.main import Runtime

def test_persist_restart_without_wallclock_backfill(settings):
    runtime=Runtime(settings)
    runtime.engine.advance(12345)
    runtime.close()
    time.sleep(.02)
    resumed=Runtime(settings)
    assert resumed.engine.active_ms==12345
    resumed.close()

def test_second_worker_rejected(settings):
    one=Runtime(settings)
    try:
        with pytest.raises(RuntimeError,match='One worker'): Runtime(settings)
    finally: one.close()

def test_config_change_requires_archival(settings):
    runtime=Runtime(settings);runtime.close()
    settings.config.monks=216
    with pytest.raises(ValueError,match='changed'): Runtime(settings)

def test_replay_high_water_persisted(tmp_path):
    store=Store(tmp_path)
    assert store.accept_peer('a',3,100,{'node':'a'})
    assert not store.accept_peer('a',3,100,{'node':'a'})
    assert not store.accept_peer('a',2,100,{'node':'a'})
    store.close(); store=Store(tmp_path)
    assert not store.accept_peer('a',2,100,{'node':'a'})
    assert store.accept_peer('a',4,100,{'node':'a'})
    store.close()
