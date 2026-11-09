import json
from pathlib import Path
import pytest
from app.config import Settings, ROOT, Profile

@pytest.fixture
def profile():
    return Profile.model_validate_json((ROOT / 'profiles/public-compassion.json').read_text())

@pytest.fixture
def settings(tmp_path):
    config = tmp_path / 'node.json'
    config.write_text(json.dumps({'name':'Test Monastery','monks':108}))
    result = Settings(data_dir=tmp_path / 'data', config_path=config)
    result.media_dir = tmp_path / 'media'
    result.media_dir.mkdir()
    return result
