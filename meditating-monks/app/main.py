from __future__ import annotations
import asyncio
from collections import deque
from contextlib import asynccontextmanager, suppress
import fcntl
import json
import logging
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from cryptography.exceptions import InvalidSignature
from . import __version__
from .config import Settings, ROOT
from .engine import Engine
from .storage import Store
from .source import build_source_archive
from .federation import Identity, load_peers, verify, push, MAX_BODY, parse_origin, node_id

log = logging.getLogger("meditating-monks")

class Runtime:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.lock = (settings.data_dir / "runtime.lock").open("a")
        try:
            fcntl.flock(self.lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.lock.close()
            raise RuntimeError("One worker only. This data directory already has an active scheduler.") from None
        self.store = Store(settings.data_dir)
        try:
            self.run = self.store.load_run(settings.profile.model_dump(), settings.config.monks, settings.config.ensemble.model_dump())
            self.identity = Identity(settings.data_dir / "identity.ed25519")
            self.peers = load_peers(settings.peers_path) if settings.config.federation_enabled else []
            if settings.config.federation_enabled:
                parse_origin(settings.config.public_origin)
            self.audio = settings.audio_catalog()
            self.source_path = build_source_archive(ROOT, settings.data_dir / "source.zip")
        except BaseException:
            self.store.close()
            self.lock.close()
            raise
        self.engine = Engine(settings.profile, settings.config.monks, self.run["active_ms"], settings.config.ensemble)
        self.gap_ms = self.run["uncredited_gap_ms"]
        self.streams = 0
        self.incoming = deque(maxlen=100)
        self.cached_beacon = None
        self.cached_at = 0
        self.snapshot = self.make_snapshot()

    def make_snapshot(self):
        return {**self.engine.summary(), "run_id": self.run["id"], "updated_at_ms": int(time.time() * 1000),
                "uncredited_gap_ms": self.gap_ms, "status": "running", "counter_kind": "digital-events"}

    async def heartbeat(self):
        last = time.monotonic_ns()
        while True:
            await asyncio.sleep(1)
            now = time.monotonic_ns()
            delta = (now - last) // 1_000_000
            last += delta * 1_000_000
            # A stalled event loop is not treated as proof of continuous execution.
            credited = min(delta, 2000)
            self.gap_ms += delta - credited
            self.engine.advance(credited)
            self.store.checkpoint(self.run["id"], self.engine.active_ms, self.gap_ms)
            self.snapshot = self.make_snapshot()

    def beacon(self):
        now = int(time.time())
        if self.cached_beacon and now - self.cached_at < 25:
            return self.cached_beacon
        payload = {"protocol": "meditating-monks/1", "node_id": self.identity.node_id,
                   "name": self.settings.config.name, "origin": self.settings.config.public_origin,
                   "sequence": self.store.sequence(), "issued_at": now, "expires_at": now + 90,
                   "monks": self.engine.monks, "profile_id": self.settings.profile.id,
                   "active_ms": self.engine.active_ms, "virtual_counters": self.snapshot["virtual_counters"],
                   "claim": "self-reported-digital-events-not-human-practice"}
        self.cached_beacon = self.identity.sign(payload)
        self.cached_at = now
        return self.cached_beacon

    async def federate(self):
        semaphore = asyncio.Semaphore(4)
        async def send(peer, envelope):
            async with semaphore:
                try:
                    await asyncio.to_thread(push, peer, envelope)
                except Exception as exc:
                    log.warning("Peer push failed (%s): %s", peer.label or peer.origin, type(exc).__name__)
        while True:
            envelope = self.beacon()
            await asyncio.gather(*(send(peer, envelope) for peer in self.peers))
            await asyncio.sleep(30)

    def close(self):
        self.store.checkpoint(self.run["id"], self.engine.active_ms, self.gap_ms)
        self.store.close()
        self.lock.close()

def create_app(settings: Settings | None = None):
    @asynccontextmanager
    async def lifespan(app):
        rt = Runtime(settings or Settings())
        app.state.rt = rt
        tasks = [asyncio.create_task(rt.heartbeat(), name="heartbeat")]
        if rt.settings.config.federation_enabled:
            tasks.append(asyncio.create_task(rt.federate(), name="federation"))
        app.state.background_tasks = tasks
        try:
            yield
        finally:
            for task in tasks:
                task.cancel()
            for task in tasks:
                with suppress(asyncio.CancelledError):
                    await task
            rt.close()

    app = FastAPI(title="Meditating Monks", version=__version__, lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        })
        if request.url.path.startswith(("/api/", "/.well-known/")):
            response.headers["Cache-Control"] = "no-store"
        return response

    def rt(request: Request) -> Runtime:
        return request.app.state.rt

    @app.get("/source")
    async def source_offer(request: Request):
        return FileResponse(rt(request).source_path, media_type="application/zip", filename="meditating-monks-source.zip")

    @app.get("/healthz")
    async def health(request: Request):
        runtime = rt(request)
        age = int(time.time() * 1000) - runtime.snapshot["updated_at_ms"]
        ok = age < 5000 and not request.app.state.background_tasks[0].done()
        return JSONResponse({"ok": ok, "version": __version__}, status_code=200 if ok else 503)

    @app.get("/api/bootstrap")
    async def bootstrap(request: Request):
        r = rt(request)
        return {"version": __version__, "node": {"name": r.settings.config.name,
                "dedication": r.settings.config.dedication, "id": r.identity.node_id,
                "public_key": r.identity.public_key, "federation_enabled": r.settings.config.federation_enabled},
                "profile": r.settings.profile.model_dump(), "audio": r.audio,
                "ensemble": r.settings.config.ensemble.model_dump(), "state": r.snapshot}

    @app.get("/api/state")
    async def state(request: Request):
        return rt(request).snapshot

    @app.get("/api/monks/{index}")
    async def monk(index: int, request: Request):
        try:
            return rt(request).engine.monk(index)
        except IndexError:
            raise HTTPException(404, "Unknown digital monk") from None

    @app.get("/api/events")
    async def events(request: Request):
        r = rt(request)
        if r.streams >= 64:
            raise HTTPException(503, "Live stream capacity reached; use /api/state polling")
        r.streams += 1
        async def stream():
            try:
                while not await request.is_disconnected():
                    data = json.dumps(r.snapshot, separators=(",", ":"))
                    yield f"event: state\ndata: {data}\n\n"
                    await asyncio.sleep(2)
            finally:
                r.streams -= 1
        return StreamingResponse(stream(), media_type="text/event-stream",
                                 headers={"X-Accel-Buffering": "no", "Cache-Control": "no-store"})

    @app.get("/api/network")
    async def network(request: Request):
        r = rt(request)
        if not r.settings.config.federation_enabled:
            return {"enabled": False, "peers": []}
        allowed = {node_id(p.public_key) for p in r.peers}
        return {"enabled": True, "peers": [p for p in r.store.peers() if p["node_id"] in allowed]}

    @app.get("/.well-known/meditating-monks.json")
    async def beacon(request: Request):
        r = rt(request)
        if not r.settings.config.federation_enabled:
            raise HTTPException(404, "Federation disabled")
        return r.beacon()

    @app.post("/api/federation/beacon")
    async def receive(request: Request):
        r = rt(request)
        if not r.settings.config.federation_enabled:
            raise HTTPException(404, "Federation disabled")
        now = time.monotonic()
        while r.incoming and now - r.incoming[0] > 60:
            r.incoming.popleft()
        if len(r.incoming) >= 90:
            raise HTTPException(429, "Federation ingress budget exhausted")
        r.incoming.append(now)
        if request.headers.get("content-type", "").split(";")[0] != "application/json":
            raise HTTPException(415, "Expected application/json")
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > MAX_BODY:
                raise HTTPException(413, "Beacon too large")
        try:
            payload = verify(json.loads(body), r.peers)
        except PermissionError:
            raise HTTPException(403, "Unknown peer") from None
        except (ValueError, InvalidSignature, TypeError):
            raise HTTPException(400, "Invalid beacon") from None
        if not r.store.accept_peer(payload["node_id"], payload["sequence"], payload["expires_at"], payload):
            raise HTTPException(409, "Stale or duplicate sequence")
        return JSONResponse({"accepted": True}, status_code=202)

    @app.get("/media/{name}")
    async def media(name: str, request: Request):
        r = rt(request)
        allowed = {record["file"] for record in r.audio}
        if name not in allowed:
            raise HTTPException(404, "Unknown audio asset")
        path = (r.settings.media_dir / name).resolve()
        if path.parent != r.settings.media_dir.resolve():
            raise HTTPException(404)
        return FileResponse(path)

    @app.get("/")
    async def index():
        return FileResponse(ROOT / "web" / "index.html", headers={"Cache-Control": "no-cache"})

    app.mount("/assets", StaticFiles(directory=ROOT / "web"), name="assets")
    return app

app = create_app()
