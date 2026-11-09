"""Single-writer SQLite store; checkpoint each heartbeat, archive changed schedules."""
from __future__ import annotations
import hashlib
import json
import sqlite3
import time
import uuid
from pathlib import Path

class Store:
    def __init__(self, directory: Path):
        self.path = directory / "monastery.sqlite3"
        self.db = sqlite3.connect(self.path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.executescript("""
          CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY, digest TEXT NOT NULL, profile_json TEXT NOT NULL,
            monks INTEGER NOT NULL, active_ms INTEGER NOT NULL DEFAULT 0,
            uncredited_gap_ms INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL, archived_at INTEGER
          );
          CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
          INSERT OR IGNORE INTO meta VALUES ('beacon_sequence', 0);
          CREATE TABLE IF NOT EXISTS peers (
            node_id TEXT PRIMARY KEY, sequence INTEGER NOT NULL,
            received_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, payload TEXT NOT NULL
          );
        """)
        self.db.commit()

    def load_run(self, profile: dict, monks: int, ensemble: dict | None = None) -> dict:
        raw = json.dumps({"profile": profile, "monks": monks, "ensemble": ensemble}, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        digest = hashlib.sha256(raw.encode()).hexdigest()
        row = self.db.execute("SELECT id,digest,active_ms,uncredited_gap_ms,created_at FROM runs WHERE archived_at IS NULL").fetchone()
        if row and row[1] != digest:
            raise ValueError("Practice profile, monk count or ensemble timing changed. Stop the server and run: python -m app.cli new-run --reason 'configuration changed'. Existing counts remain in the archive.")
        if row:
            return {"id": row[0], "active_ms": row[2], "uncredited_gap_ms": row[3], "created_at": row[4]}
        identity, now = str(uuid.uuid4()), int(time.time())
        self.db.execute("INSERT INTO runs(id,digest,profile_json,monks,created_at) VALUES(?,?,?,?,?)", (identity, digest, json.dumps(profile, ensure_ascii=False), monks, now))
        self.db.commit()
        return {"id": identity, "active_ms": 0, "uncredited_gap_ms": 0, "created_at": now}

    def checkpoint(self, run_id: str, active_ms: int, gap_ms: int):
        self.db.execute("UPDATE runs SET active_ms=?,uncredited_gap_ms=? WHERE id=?", (active_ms, gap_ms, run_id))
        self.db.commit()

    def sequence(self) -> int:
        self.db.execute("UPDATE meta SET value=value+1 WHERE key='beacon_sequence'")
        value = self.db.execute("SELECT value FROM meta WHERE key='beacon_sequence'").fetchone()[0]
        self.db.commit()
        return value

    def accept_peer(self, node_id: str, sequence: int, expires: int, payload: dict) -> bool:
        old = self.db.execute("SELECT sequence FROM peers WHERE node_id=?", (node_id,)).fetchone()
        if old and sequence <= old[0]:
            return False
        self.db.execute("INSERT INTO peers VALUES(?,?,?,?,?) ON CONFLICT(node_id) DO UPDATE SET sequence=excluded.sequence,received_at=excluded.received_at,expires_at=excluded.expires_at,payload=excluded.payload", (node_id, sequence, int(time.time()), expires, json.dumps(payload, ensure_ascii=False)))
        self.db.commit()
        return True

    def peers(self) -> list[dict]:
        now = int(time.time())
        return [{**json.loads(row[0]), "online": row[1] >= now, "received_at": row[2]} for row in self.db.execute("SELECT payload,expires_at,received_at FROM peers ORDER BY received_at DESC")]

    def close(self):
        self.db.close()
