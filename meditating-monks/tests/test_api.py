import json
import time
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.federation import Identity, Peer

@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as c: yield c

def test_home_bootstrap_and_security_headers(client):
    home=client.get('/')
    assert home.status_code==200 and 'Meditating Monks' in home.text
    assert "script-src 'self'" in home.headers['content-security-policy']
    assert home.headers['x-content-type-options']=='nosniff'
    b=client.get('/api/bootstrap').json()
    assert b['state']['monks']==108 and b['audio']==[]
    assert b['profile']['status']=='ready'
    assert client.get('/healthz').json()['ok']

def test_monk_detail_and_bounds(client):
    assert client.get('/api/monks/0').json()['label']=='Monk 001'
    assert client.get('/api/monks/108').status_code==404
    assert client.get('/api/monks/-1').status_code==404

def test_private_files_not_exposed(client):
    for path in ['/data/identity.ed25519','/config/node.json','/media/../identity.ed25519','/media/manifest.json','/assets/../app/config.py']:
        assert client.get(path).status_code==404

def test_federation_off_by_default(client):
    assert client.get('/api/network').json()=={'enabled':False,'peers':[]}
    assert client.get('/.well-known/meditating-monks.json').status_code==404
    assert client.post('/api/federation/beacon',json={}).status_code==404

def test_no_public_admin_writes(client):
    assert client.post('/api/state',json={'monks':900}).status_code==405
    assert client.post('/api/admin/reset').status_code==404

def test_end_to_end_signed_ingress_and_replay(settings,tmp_path):
    sender=Identity(tmp_path/'sender-key')
    settings.config.federation_enabled=True
    settings.config.public_origin='https://receiver.example'
    settings.peers_path=tmp_path/'peers.json'
    settings.peers_path.write_text(json.dumps([{'origin':'https://sender.example','public_key':sender.public_key}]))
    now=int(time.time())
    payload={'protocol':'meditating-monks/1','node_id':sender.node_id,'name':'Sender','origin':'https://sender.example','sequence':7,'issued_at':now,'expires_at':now+90,'monks':216,'profile_id':'public-compassion','active_ms':1234,'virtual_counters':{'mantra':5,'prostration':2,'offering':1},'claim':'self-reported-digital-events-not-human-practice'}
    # Test receive protocol independently of external network/TLS.
    settings.config.federation_enabled=True
    with TestClient(create_app(settings)) as c:
        envelope=sender.sign(payload)
        assert c.post('/api/federation/beacon',json=envelope).status_code==202
        assert c.post('/api/federation/beacon',json=envelope).status_code==409
        network=c.get('/api/network').json()
        assert network['peers'][0]['online'] and network['peers'][0]['monks']==216
        assert c.get('/.well-known/meditating-monks.json').json()['payload']['protocol']=='meditating-monks/1'
        assert c.post('/api/federation/beacon',content='{}').status_code==415
        assert c.post('/api/federation/beacon',content='x'*17000,headers={'Content-Type':'application/json'}).status_code==413

def test_unlicensed_audio_rejected(settings):
    (settings.media_dir/'manifest.json').write_text(json.dumps([{'id':'mani','file':'voice.mp3'}]))
    with pytest.raises(ValueError,match='missing'):settings.audio_catalog()

def test_source_offer_excludes_runtime_secrets(client):
    import io
    import zipfile
    response=client.get('/source')
    assert response.status_code==200
    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        names=archive.namelist()
        assert 'meditating-monks/app/engine.py' in names
        assert 'meditating-monks/SOURCE_MANIFEST.json' in names
        assert not any(name.endswith(('identity.ed25519','node.json','peers.json','.env')) or '/data/' in name for name in names)

def test_health_fails_for_stale_heartbeat(client):
    client.app.state.rt.snapshot['updated_at_ms']=0
    assert client.get('/healthz').status_code==503

def test_real_audio_manifest_and_byte_range(settings):
    import wave
    path=settings.media_dir/'test.wav'
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(8000)
        wav.writeframes(b'\0\0'*64000)
    item={'id':'mani','file':'test.wav','title':'Silent test only','performer':'Test fixture','license':'Test-generated','permission_note':'Synthetic silent fixture, not a chant','language':'None','loop_start_seconds':0,'loop_end_seconds':8}
    (settings.media_dir/'manifest.json').write_text(json.dumps([item]))
    with TestClient(create_app(settings)) as c:
        assert c.get('/api/bootstrap').json()['audio'][0]['id']=='mani'
        response=c.get('/media/test.wav',headers={'Range':'bytes=0-43'})
        assert response.status_code==206 and len(response.content)==44
        assert response.content.startswith(b'RIFF')
