"""Local operator tools. No unauthenticated browser administration."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import sqlite3
import time
import wave
from .config import Settings, Profile, ROOT
from .federation import Identity

def _probe_wav(path: Path) -> dict:
    with wave.open(str(path), "rb") as w:
        frames, rate = w.getnframes(), w.getframerate()
        return {"file": path.name, "channels": w.getnchannels(), "sample_rate_hz": rate,
                "bit_depth": w.getsampwidth() * 8, "duration_seconds": round(frames / rate, 3)}

def _cbr_mp3_duration(path: Path) -> float:
    """Rough CBR estimate for draft notes only, never for loop points."""
    with path.open("rb") as f:
        head = f.read(10)
        if len(head) < 10 or head[:3] != b"ID3":
            return 0.0
        size = ((head[6] & 127) << 21) | ((head[7] & 127) << 14) | ((head[8] & 127) << 7) | (head[9] & 127)
        audio = max(0, path.stat().st_size - size - 10)
        return round(audio * 8 / 128000, 3)

def _draft_record(path: Path) -> dict:
    if path.suffix.lower() == ".mp3":
        info = {"file": path.name, "format": "mp3", "bitrate_kbps_estimate": 128,
                "duration_seconds": _cbr_mp3_duration(path), "accuracy": "CBR-Schätzung, keine Loop-Grundlage"}
    else:
        info = _probe_wav(path)
    stem = re.sub(r"\.(wav|mp3)$", "", path.name, flags=re.IGNORECASE)
    record = {
        "id": re.sub(r"[^a-z0-9-]+", "-", stem.lower()).strip("-")[:64] or "aufnahme",
        "file": path.name,
        "title": stem.replace("_", " "),
        "performer": "UNBEKANNT · EINZUTRAGEN",
        "license": "UNGEKLÄRT · RECHTE PRÜFEN",
        "permission_note": "Kein Rechtebeleg geprüft; keine Veröffentlichung ohne positive Rechteentscheidung.",
        "language": "",
        "loop_start_seconds": None,
        "loop_end_seconds": None,
        "review_status": "draft",
        "probe": info,
        "note": "Entwurf aus audio-prepare. Loop-Grenzen sind bewusst leer: Sie müssen genau eine vollständige, geprüfte Rezitation umfassen und innerhalb 50 ms zu unit_ms/1000 der Zielphase passen.",
    }
    if re.search(r"mani", path.name, re.IGNORECASE):
        record["phase_hint"] = "mani"
        record["note"] += " Vorschlag für dieses Profil: unit_ms=8000, also Loop-Länge 8,000 s ± 0,05 s."
    return record

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("identity", help="Print public node identity; never prints the private key")
    validate = commands.add_parser("validate", help="Validate a practice pack and report its execution status")
    validate.add_argument("path", type=Path)
    probe = commands.add_parser("audio-probe", help="Read WAV parameters without publishing anything")
    probe.add_argument("path", type=Path)
    prepare = commands.add_parser("audio-prepare", help="Create a DRAFT audio manifest from WAV takes; drafts never auto-publish")
    prepare.add_argument("folder", type=Path)
    prepare.add_argument("--output", type=Path, required=True)
    reset = commands.add_parser("new-run", help="Archive the current run; server must be stopped")
    reset.add_argument("--reason", required=True)
    backup = commands.add_parser("backup", help="Create a consistent SQLite backup, even while the server runs")
    backup.add_argument("destination", type=Path)
    args = parser.parse_args()
    if args.command == "validate":
        profile = Profile.model_validate_json(args.path.read_text("utf-8"))
        print(json.dumps({"id": profile.id, "status": profile.status, "phases": len(profile.phases), "executable": profile.status == "ready"}, ensure_ascii=False, indent=2))
        return
    if args.command == "audio-probe":
        print(json.dumps(_probe_wav(args.path), ensure_ascii=False, indent=2))
        return
    if args.command == "audio-prepare":
        wavs = sorted(list(args.folder.glob("*.wav")) + list(args.folder.glob("*.WAV")) + list(args.folder.glob("*.mp3")) + list(args.folder.glob("*.MP3")))
        drafts = []
        for path in wavs:
            try:
                drafts.append(_draft_record(path))
            except Exception as exc:
                drafts.append({"file": path.name, "review_status": "unreadable", "error": str(exc)})
        result = {
            "schema": "meditating-monks-audio-draft",
            "generated_note": "Entwürfe, keine Freigabe. Rechte, Aussprache, Loop-Grenzen und Phasenzuordnung sind von Menschen zu prüfen. media/manifest.json wird von dieser Ausgabe nicht verändert.",
            "count": len(drafts),
            "records": drafts,
        }
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
        print(f"{len(drafts)} Entwurf/Entwürfe geschrieben: {args.output}. Es erfolgte keine Rechteprüfung und keine Veröffentlichung.")
        return
    data = Path(os.environ.get("MM_DATA_DIR", str(ROOT / "data")))
    data.mkdir(parents=True, exist_ok=True)
    if args.command == "identity":
        identity = Identity(data / "identity.ed25519")
        print(json.dumps({"node_id": identity.node_id, "public_key": identity.public_key}, indent=2))
        return
    db_path = data / "monastery.sqlite3"
    if not db_path.exists():
        parser.error("Database does not exist; start the server once")
    if args.command == "backup":
        if args.destination.exists():
            parser.error("Destination already exists; choose a new backup filename")
        source = sqlite3.connect(db_path)
        target = sqlite3.connect(args.destination)
        try:
            source.backup(target)
        finally:
            target.close()
            source.close()
        print(f"Database backed up to {args.destination}. Back up identity.ed25519 separately and securely.")
    if args.command == "new-run":
        with (data / "runtime.lock").open("a") as lock:
            try:
                fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                parser.error("Stop the server before archiving the active run")
            with sqlite3.connect(db_path) as db:
                db.execute("UPDATE runs SET archived_at=? WHERE archived_at IS NULL", (int(time.time()),))
                db.execute("CREATE TABLE IF NOT EXISTS operator_notes(at INTEGER, note TEXT)")
                db.execute("INSERT INTO operator_notes VALUES(?,?)", (int(time.time()), args.reason[:2000]))
        print("Archived. The next start creates a new run; previous digital counts remain in the database.")

if __name__ == "__main__":
    main()
