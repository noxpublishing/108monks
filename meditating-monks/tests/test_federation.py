import copy
import socket
import pytest
from cryptography.exceptions import InvalidSignature
from app.federation import Identity, Peer, verify, public_addresses, parse_origin

@pytest.fixture
def signed(tmp_path):
    identity=Identity(tmp_path/'key')
    peer=Peer(origin='https://monastery.example',public_key=identity.public_key)
    payload={'protocol':'meditating-monks/1','node_id':identity.node_id,'name':'Test','origin':peer.origin,'sequence':1,'issued_at':1000,'expires_at':1090,'monks':108,'profile_id':'public-compassion','active_ms':123,'virtual_counters':{'mantra':0,'prostration':0,'offering':0},'claim':'self-reported-digital-events-not-human-practice'}
    return identity,peer,payload

def test_signature_roundtrip(signed):
    identity,peer,payload=signed
    assert verify(identity.sign(payload),[peer],now=1000)==payload

def test_tampered_beacon(signed):
    identity,peer,payload=signed
    envelope=identity.sign(payload)
    envelope['payload']['monks']=500
    with pytest.raises(InvalidSignature):verify(envelope,[peer],now=1000)

def test_unknown_key(signed):
    identity,peer,payload=signed
    with pytest.raises(PermissionError):verify(identity.sign(payload),[],now=1000)

@pytest.mark.parametrize('now',[900,1091])
def test_time_rejected(signed,now):
    identity,peer,payload=signed
    with pytest.raises(ValueError):verify(identity.sign(payload),[peer],now=now)

def test_origin_bound_to_key(signed):
    identity,peer,payload=signed;payload['origin']='https://impostor.example'
    with pytest.raises(ValueError,match='origin'):verify(identity.sign(payload),[peer],now=1000)

@pytest.mark.parametrize('url',['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com/?query=1','file:///etc/passwd','https://example.com/#x'])
def test_unsafe_origins_rejected(url):
    with pytest.raises(ValueError):parse_origin(url)

@pytest.mark.parametrize('ip',['127.0.0.1','10.0.0.3','169.254.169.254','192.168.1.1','::1','fc00::1','::ffff:127.0.0.1'])
def test_private_peer_ip_rejected(monkeypatch,ip):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**k:[(socket.AF_INET,socket.SOCK_STREAM,6,'',(ip,443))])
    with pytest.raises(ValueError): public_addresses('example.com',443)

def test_mixed_dns_answers_rejected(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**k:[(socket.AF_INET,socket.SOCK_STREAM,6,'',(ip,443)) for ip in ['1.1.1.1','127.0.0.1']])
    with pytest.raises(ValueError): public_addresses('example.com',443)

def test_public_dns_is_pinned(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *a,**k:[(socket.AF_INET,socket.SOCK_STREAM,6,'',('1.1.1.1',443))])
    assert public_addresses('example.com',443)==['1.1.1.1']

def test_identity_survives_restart(tmp_path):
    a=Identity(tmp_path/'key');b=Identity(tmp_path/'key')
    assert a.public_key==b.public_key and a.node_id==b.node_id
    assert (tmp_path/'key').stat().st_mode & 0o077 == 0

def test_pinned_transport_uses_checked_ip_and_original_tls_host(monkeypatch):
    from app.federation import PinnedHTTPSConnection
    events=[]
    class FakeSocket:
        def close(self):events.append(('closed',))
    class FakeTLS:
        def wrap_socket(self,sock,server_hostname):
            events.append(('tls',server_hostname));return sock
    def connect(address,timeout):events.append(('connect',address,timeout));return FakeSocket()
    monkeypatch.setattr(socket,'create_connection',connect)
    connection=PinnedHTTPSConnection('monastery.example',443,'1.1.1.1')
    connection._context=FakeTLS()
    connection.connect()
    assert events[0]==('connect',('1.1.1.1',443),5)
    assert events[1]==('tls','monastery.example')
    connection.close()
