"""Opt-in, explicitly trusted federation. No discovery crawler, no remote content.

A signature authenticates a node's self-report, NOT its truth or any spiritual
benefit. Operators exchange public keys out of band. Incoming beacons never cause
outgoing requests. Outgoing destinations come only from local configuration.
"""
from __future__ import annotations
import base64
import hashlib
import http.client
import ipaddress
import json
import os
import socket
import ssl
import time
from pathlib import Path
from urllib.parse import urlsplit
from typing import Literal
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, PublicFormat, NoEncryption
from pydantic import Field, model_validator
from .config import Strict

DOMAIN = b"meditating-monks.beacon.v1\x00"
MAX_BODY = 16_384

def canonical(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")

def b64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")

def unb64(value: str) -> bytes:
    return base64.b64decode(value, validate=True)

def node_id(public_key: str) -> str:
    raw = unb64(public_key)
    if len(raw) != 32:
        raise ValueError("Expected a 32-byte Ed25519 public key")
    return hashlib.sha256(raw).hexdigest()[:32]

class Identity:
    def __init__(self, path: Path):
        if path.exists():
            self.private = Ed25519PrivateKey.from_private_bytes(path.read_bytes())
        else:
            self.private = Ed25519PrivateKey.generate()
            raw = self.private.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as stream:
                stream.write(raw)
                stream.flush()
                os.fsync(stream.fileno())
        self.public_key = b64(self.private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw))
        self.node_id = node_id(self.public_key)

    def sign(self, payload: dict) -> dict:
        return {"public_key": self.public_key, "payload": payload,
                "signature": b64(self.private.sign(DOMAIN + canonical(payload)))}

class Counters(Strict):
    mantra: int = Field(ge=0, le=9_007_199_254_740_991)
    prostration: int = Field(ge=0, le=9_007_199_254_740_991)
    offering: int = Field(ge=0, le=9_007_199_254_740_991)

class Beacon(Strict):
    protocol: Literal["meditating-monks/1"]
    node_id: str = Field(pattern=r"^[a-f0-9]{32}$")
    name: str = Field(min_length=1, max_length=100)
    origin: str = Field(max_length=500)
    sequence: int = Field(ge=1, le=9_007_199_254_740_991)
    issued_at: int = Field(ge=0)
    expires_at: int = Field(ge=0)
    monks: int = Field(ge=1, le=5000)
    profile_id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    active_ms: int = Field(ge=0, le=9_007_199_254_740_991)
    virtual_counters: Counters
    claim: Literal["self-reported-digital-events-not-human-practice"]

    @model_validator(mode="after")
    def valid_window(self):
        if not 0 < self.expires_at - self.issued_at <= 90:
            raise ValueError("Beacon TTL must be within 90 seconds")
        return self

class Envelope(Strict):
    public_key: str = Field(min_length=44, max_length=44)
    payload: Beacon
    signature: str = Field(min_length=88, max_length=88)

class Peer(Strict):
    origin: str = Field(min_length=1, max_length=500)
    public_key: str = Field(min_length=44, max_length=44)
    label: str = Field(default="", max_length=100)

    @model_validator(mode="after")
    def valid(self):
        parse_origin(self.origin)
        node_id(self.public_key)
        return self

def parse_origin(origin: str):
    p = urlsplit(origin)
    if (p.scheme != "https" or not p.hostname or p.username or p.password
        or p.path not in ("", "/") or p.query or p.fragment):
        raise ValueError("Peer origin must be an HTTPS origin, without path or credentials")
    _ = p.port  # validates malformed ports
    return p

def load_peers(path: Path) -> list[Peer]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text("utf-8"))
    if not isinstance(raw, list) or len(raw) > 32:
        raise ValueError("At most 32 explicitly configured peers are allowed")
    peers = [Peer.model_validate(x) for x in raw]
    if len({p.public_key for p in peers}) != len(peers):
        raise ValueError("Duplicate peer public keys")
    return peers

def verify(envelope_raw: dict, peers: list[Peer], now: int | None = None) -> dict:
    envelope = Envelope.model_validate(envelope_raw)
    peer = next((p for p in peers if p.public_key == envelope.public_key), None)
    if not peer:
        raise PermissionError("Unknown peer key")
    payload = envelope.payload.model_dump()
    if payload["node_id"] != node_id(envelope.public_key):
        raise ValueError("Node id mismatch")
    if payload["origin"].rstrip("/") != peer.origin.rstrip("/"):
        raise ValueError("Peer origin mismatch")
    now = int(time.time()) if now is None else now
    if payload["issued_at"] > now + 15 or payload["expires_at"] <= now:
        raise ValueError("Expired or future-dated beacon")
    Ed25519PublicKey.from_public_bytes(unb64(envelope.public_key)).verify(unb64(envelope.signature), DOMAIN + canonical(payload))
    return payload

def public_addresses(host: str, port: int) -> list[str]:
    """Resolve once, reject mixed/private answers; the transport uses these exact IPs."""
    infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    ips = sorted({i[4][0] for i in infos}, key=lambda s: (":" in s, s))
    if not ips:
        raise ValueError("Peer has no addresses")
    for raw in ips:
        ip = ipaddress.ip_address(raw)
        mapped = getattr(ip, "ipv4_mapped", None)
        if not ip.is_global or (mapped and not mapped.is_global):
            raise ValueError("Private, loopback, link-local and reserved peer addresses are forbidden")
    return ips

class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, port: int, ip: str):
        super().__init__(host, port=port, timeout=5, context=ssl.create_default_context())
        self.pinned_ip = ip

    def connect(self):
        raw = socket.create_connection((self.pinned_ip, self.port), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except BaseException:
            raw.close()
            raise

def push(peer: Peer, envelope: dict) -> int:
    p = parse_origin(peer.origin)
    host = p.hostname.encode("idna").decode("ascii")
    port = p.port or 443
    ips = public_addresses(host, port)
    body = canonical(envelope)
    if len(body) > MAX_BODY:
        raise ValueError("Beacon too large")
    connection = PinnedHTTPSConnection(host, port, ips[0])
    try:
        connection.request("POST", "/api/federation/beacon", body=body,
                           headers={"Content-Type": "application/json", "User-Agent": "MeditatingMonks/0.1"})
        response = connection.getresponse()
        response.read(MAX_BODY + 1)
        if response.status not in (200, 202, 409):
            raise ValueError(f"Peer HTTP status {response.status}; redirects are not followed")
        return response.status
    finally:
        connection.close()
