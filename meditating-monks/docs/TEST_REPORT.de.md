# Prüfbericht · Version 0.1.0

Datum: 8. November 2026. Dieser Bericht unterscheidet ausgeführte Prüfungen von vorbereiteten Dateien und noch offenen Betriebsprüfungen.

## Ausgeführt

**51 Python-Tests bestanden.** Ablaufgrenzen, Nullstart, versetzte Figuren, vollständige und angeschnittene Einheiten, 250 randomisierte Intervallvergleiche mit einer unabhängigen Brute-Force-Zählung, Eingabevalidierung, SQLite-Wiederaufnahme, Konfigurationswechsel, Single-Writer-Sperre, Signaturen, Manipulation, unbekannte Schlüssel, Zeitfenster, Replay, Originbindung, IP-Filter, DNS-Mischantworten, gepinnter Transport mit TLS-Hostname, API, Audio-Range-Response, Gesundheitsstatus und Ausschluss privater Dateien aus dem Quellcodeangebot.

**4 JavaScript-Tests bestanden.** Phasengrenzen, angeschnittene erste Wiederholung, ganzzahliger Startversatz und Nullstart. Ausgeführt mit Node.js 22.16.0.

**12 Browser-Komponentenprüfungen bestanden.** Tatsächlicher Chromium-DOM, echte CSS-/SVG-Darstellung und reale Web-Audio-Decodierung. Desktop 1440 px und Mobilansicht 390 px ohne horizontalen Overflow. Aktivitätsfilter, Einzelansicht, Pagination, Mala-Dialog, fehlende Aufnahme, TTS-Bedienfluss, Offline-Stopp und Reduced Motion geprüft. Keine unbehandelten JavaScript-Fehler.

Wichtige Grenze: Der Chromium-Browser konnte in dieser Umgebung wegen einer Administrationsrichtlinie nicht zu localhost navigieren. Diese Richtlinie wurde nicht verändert. Die Oberfläche wurde deshalb in einem netzwerkfreien Dokument mit ausdrücklich implementierten API-, localStorage- und TTS-Testdoubles ausgeführt. Das ist kein Live-Browser-zu-Server-End-to-End-Nachweis. Für die Web-Audio-Prüfung wurde eine achtsekündige stille WAV-Testdatei erzeugt und tatsächlich decodiert; es wurde kein echter Mantra-Gesang beurteilt.

**Lokaler Serverstart ausgeführt.** Uvicorn wurde als eigener Prozess gestartet; `/healthz` wurde per lokalem HTTP erfolgreich abgefragt. Weitere HTTP-/SSE-Prüfergebnisse stehen in `http-smoke.json`, sofern im Paket enthalten. Die API-Tests nutzen zusätzlich FastAPI TestClient.

## Mikrobenchmark

Python 3.13.5 auf Linux; jeweils 100 Wiederholungen. Ausschließlich `Engine.summary()`, nicht HTTP, SQLite, Audio, TLS oder Besucherlast.

| Digitale Figuren | Median | 95. Perzentil |
|---:|---:|---:|
| 108 | 0,324 ms | 0,426 ms |
| 500 | 1,573 ms | 2,361 ms |
| 1000 | 3,201 ms | 4,201 ms |
| 5000 | 16,459 ms | 18,495 ms |

Das sind Messwerte dieser Umgebung, keine Kapazitätsgarantie für eine bestimmte VPS. Die Werte stehen maschinenlesbar in `benchmark.json`.

## Nicht ausgeführt oder nicht belegt

Kein Dockerimage gebaut und kein Compose-Stack gestartet: In dieser Umgebung stand kein Docker-CLI zur Verfügung. Kein öffentliches Deployment, keine ACME-Zertifikatsausstellung, kein realer Zwei-VPS-Föderationstest, kein Langzeit-/Stresstest. Kein externer Sicherheitstest und kein vollständiger Abhängigkeits-/Lizenzaudit.

Keine tatsächliche lokale TTS-Stimme angehört; keine tibetische Aussprache oder Melodie geprüft. Keine externe Aufnahme oder Audio-Lizenz geliefert. Keine fachliche Freigabe einer Ngöndro-Liturgie. Kein GitHub-Repository erstellt und kein CI-Workflow auf GitHub ausgeführt. Die Workflow-Datei ist nur vorbereitet.

Keine Behauptung, dass eine digitale Wiederholung menschliche Praxis, Bewusstsein, Ordination oder spirituelles Verdienst beweise.

## Reproduktion

```bash
pip install -r requirements-dev.txt
python -m pytest -q
npm test
python scripts/benchmark.py
playwright install chromium
python scripts/browser_smoke.py
```

Für ein vorhandenes Chromium-Binary: `python scripts/browser_smoke.py --chromium /pfad/zu/chromium`. Testbilder werden mit einem expliziten, synthetischen Raumzustand erzeugt und sind keine Belege für ein bereits betriebenes öffentliches Netzwerk.
