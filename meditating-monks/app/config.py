"""Strict, local-only configuration. No executable code inside practice packs."""
from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

ROOT = Path(__file__).resolve().parents[1]

class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

class Source(Strict):
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(pattern=r"^https://", max_length=1000)
    note: str = Field(default="", max_length=1000)

class Phase(Strict):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    label: str = Field(min_length=1, max_length=120)
    kind: Literal["settle", "contemplation", "refuge", "bodhicitta", "prostration", "offering", "reflection", "mantra", "rest", "dedication", "guru-yoga", "purification"]
    duration_ms: int = Field(ge=1000, le=86_400_000)
    unit_ms: int | None = Field(default=None, ge=1000, le=3_600_000)
    counter: Literal["mantra", "prostration", "offering"] | None = None
    text: str = Field(min_length=1, max_length=4000)
    tibetan: str = Field(default="", max_length=4000)
    speech_text: str = Field(default="", max_length=4000)
    audio_id: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9-]{0,63}$")
    notes: str = Field(default="", max_length=2000)
    reflections: list[str] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def coherent_units(self):
        if self.counter and not self.unit_ms:
            raise ValueError("A counted phase requires unit_ms")
        if self.unit_ms and (self.duration_ms % self.unit_ms != 0):
            raise ValueError("duration_ms must be an integer multiple of unit_ms")
        return self

class Profile(Strict):
    schema_version: Literal[1] = 1
    id: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    revision: int = Field(ge=1, le=100000)
    title: str = Field(min_length=1, max_length=150)
    status: Literal["ready", "outline-only", "requires-review"]
    tradition: str = Field(max_length=200)
    classification: str = Field(max_length=1000)
    content_license: str = Field(max_length=300)
    reviewed_by: str = Field(default="", max_length=200)
    access_note: str = Field(max_length=2000)
    sources: list[Source] = Field(default_factory=list, max_length=20)
    phases: list[Phase] = Field(min_length=1, max_length=64)

    @model_validator(mode="after")
    def unique_phases(self):
        if len({p.id for p in self.phases}) != len(self.phases):
            raise ValueError("Phase ids must be unique")
        return self

class Ensemble(Strict):
    """Gemeinsamer Takt aller Figuren. Gemäß Ritualraum-Konzept v0.2.0 ist der
    Kohorten-Modus Standard: ein Profil für alle, stabile Startversätze je
    Figur innerhalb von spread_ms (die erste Figur genau 0). Der frühere
    verteilte Modus (gleichmäßig über den gesamten Zyklus) bleibt ausdrückliche
    Option."""
    mode: Literal["cohort", "distributed"] = "cohort"
    spread_ms: int = Field(default=1200, ge=0, le=3000)
    seed: int = Field(default=108, ge=0, le=1_000_000)

class NodeConfig(Strict):
    name: str = Field(default="The Quiet Monastery", min_length=1, max_length=100)
    dedication: str = Field(default="Möge dieser Raum Mitgefühl stärken und dem Wohl und der Befreiung aller fühlenden Wesen dienen.", max_length=1000)
    monks: int = Field(default=108, ge=1, le=5000)
    profile: str = Field(default="public-compassion.json", pattern=r"^[a-zA-Z0-9_.-]+\.json$")
    federation_enabled: bool = False
    public_origin: str = Field(default="", max_length=500)
    audio_manifest: str = Field(default="manifest.json", pattern=r"^[a-zA-Z0-9_.-]+\.json$")
    ensemble: Ensemble = Ensemble()

class Settings:
    def __init__(self, data_dir: Path | None = None, config_path: Path | None = None):
        self.data_dir = data_dir or Path(os.environ.get("MM_DATA_DIR", str(ROOT / "data")))
        self.config_path = config_path or Path(os.environ.get("MM_CONFIG", str(ROOT / "config" / "node.json")))
        self.profiles_dir = Path(os.environ.get("MM_PROFILES_DIR", str(ROOT / "profiles")))
        self.media_dir = Path(os.environ.get("MM_MEDIA_DIR", str(ROOT / "media")))
        self.peers_path = Path(os.environ.get("MM_PEERS", str(ROOT / "config" / "peers.json")))
        self.config = NodeConfig.model_validate_json(self.config_path.read_text("utf-8")) if self.config_path.exists() else NodeConfig()
        self.profile = Profile.model_validate_json((self.profiles_dir / self.config.profile).read_text("utf-8"))
        if self.profile.status != "ready":
            raise ValueError("This practice pack is an outline, not an executable/approved liturgy. See docs/TRADITION.de.md.")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.media_dir.mkdir(parents=True, exist_ok=True)

    def audio_catalog(self) -> list[dict]:
        """Only publish files that have an explicit rights declaration; never expose paths."""
        path = self.media_dir / self.config.audio_manifest
        if not path.exists():
            return []
        raw = json.loads(path.read_text("utf-8"))
        if not isinstance(raw, list) or len(raw) > 100:
            raise ValueError("Audio manifest must be an array of at most 100 records")
        result = []
        seen = set()
        import re
        for item in raw:
            if not isinstance(item, dict):
                raise ValueError("Invalid audio record")
            required = {"id", "file", "title", "performer", "license", "permission_note", "language", "loop_start_seconds", "loop_end_seconds"}
            if not required.issubset(item):
                raise ValueError(f"Audio record missing fields: {required - set(item)}")
            if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", item["id"]) or item["id"] in seen:
                raise ValueError("Invalid/duplicate audio id")
            seen.add(item["id"])
            name = item["file"]
            if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+\.(wav|mp3|ogg|m4a|flac)", name):
                raise ValueError("Audio filenames must be plain filenames")
            media = (self.media_dir / name).resolve()
            if media.parent != self.media_dir.resolve() or not media.is_file():
                raise ValueError(f"Missing audio file: {name}")
            if media.stat().st_size > 50 * 1024 * 1024:
                raise ValueError("Audio file exceeds the 50 MiB decoded-player input limit")
            if not all(isinstance(item[k], str) and 0 < len(item[k]) <= 1000 for k in ["title", "performer", "license", "permission_note", "language"]):
                raise ValueError("Audio attribution and rights fields are required")
            a, b = item["loop_start_seconds"], item["loop_end_seconds"]
            if not isinstance(a, (int, float)) or not isinstance(b, (int, float)) or not 0 <= a < b <= 600:
                raise ValueError("Invalid audio loop points")
            result.append({**item, "url": f"/media/{name}"})
        return result
