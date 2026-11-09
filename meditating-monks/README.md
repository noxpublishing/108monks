# Meditating Monks

**A continuous offering. An open-source digital space dedicated to the benefit and liberation of all sentient beings.**

Ein selbst hostbarer digitaler Meditationsraum: Viele stilisierte Mönche durchlaufen zeitversetzt einen strukturierten Zyklus mit Ausrichtung, Niederwerfungen, Darbringungen, Mani-Rezitation und Widmung. Ohne LLM, Konten, Tracking oder laufende Tokenkosten.

**Version 0.1.0 · Entwicklungsprototyp, kein extern auditiertes Produktionsrelease.** Die Figuren sind digitale Darstellungen. Die Software beansprucht weder Bewusstsein noch Ordination, Meditationserfahrung oder messbares spirituelles Verdienst. Menschliche Praxis bleibt eigenständig.

## Was funktioniert

- 108 digitale Mönche standardmäßig; konfigurierbar von 1 bis 5.000. Ein gemeinsamer Scheduler, keine VM pro Figur.
- Ausführbares öffentliches Profil mit 14 Phasen, 28:13 Minuten Gesamtdauer und 108 Mani-Wiederholungen je vollständiger Mani-Phase. Diese Zeiten sind Designentscheidungen.
- Responsive Oberfläche, Einzelansicht, Aktivitätsfilter, Seitenwechsel, animierte Verbeugungen und symbolische Darbringungen.
- SQLite-Persistenz, konservative Heartbeat-Zeit, keine Nachzählung von Server-Ausfallzeiten; keine fiktive Vorgeschichte bei zeitversetztem Start.
- Live-Status per Server-Sent Events; Polling-Fallback; veraltete Anzeige friert ein und Audio stoppt.
- Audio auf Knopfdruck aus eigenen freigegebenen Aufnahmen; optional drei geschichtete virtuelle Stimmen. Keine Aufnahme mitgeliefert.
- Separat beschriftete lokale Browser-TTS-Demo. Aussprache nicht authentifiziert.
- Persönliche, manuell bediente Mala im Browser, getrennt von allen Server-Zählern.
- Opt-in-Föderation mit bekannten öffentlichen Schlüsseln, signierten Meldungen, Ablaufzeit und Replay-Abwehr. Kein ungeprüftes weltweites Verzeichnis.
- Download des tatsächlich gebündelten Quellcodes über `/source`; private Konfiguration und Schlüssel sind ausgeschlossen.

Die Longchen-Nyingtik-Datei ist **eine nicht ausführbare Strukturvorlage**, kein fertiges Ngöndro. Siehe `docs/TRADITION.de.md`.

## Lokal starten: Python

Voraussetzung: Python 3.13 unter Linux/macOS. Unter Windows den Docker-Weg verwenden; die Laufzeitsperre nutzt POSIX `flock`.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-lock.txt
cp config/node.example.json config/node.json
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log
```

Dann `http://localhost:8000` öffnen. Kein API-Key nötig. Die Textdarstellung funktioniert ohne Audio. Für die Sprech-Demo im Player „Lokale TTS“ auswählen; die verfügbaren Stimmen hängen vom Betriebssystem und Browser ab.

**Immer genau einen Worker starten.** Der Scheduler ist absichtlich ein Single Writer. Mehrere Worker auf demselben Datenordner werden blockiert, statt Zähler doppelt fortzuschreiben.

## Lokal starten: Docker Compose

```bash
cp config/node.example.json config/node.json
cp config/peers.example.json config/peers.json
docker compose up -d --build
```

Die Anwendung ist unter `http://localhost:8000` erreichbar. Docker verwendet ein benanntes Datenvolume, einen unprivilegierten App-Benutzer und ein schreibgeschütztes Root-Dateisystem. Konfigurations- und Medienordner werden read-only eingebunden. Die angegebenen Containerlimits sind Konfigurationswerte, keine gemessene Hosting-Kapazität.

## Eigene Domain

```bash
cp .env.example .env
# In .env MM_DOMAIN auf deinen echten Hostnamen ändern.
# DNS A/AAAA und eingehende Ports 80/443 passend konfigurieren.
docker compose -f compose.yaml -f compose.production.yaml up -d --build
```

Caddy übernimmt HTTPS. Vollständige Anleitung und Einschränkungen: `docs/DEPLOYMENT.de.md`.

## Konfiguration

`config/node.json`:

```json
{
  "name": "Mein digitaler Meditationsraum",
  "dedication": "Möge dieser Raum dem Wohl und der Befreiung aller fühlenden Wesen dienen.",
  "monks": 500,
  "profile": "public-compassion.json",
  "federation_enabled": false,
  "public_origin": "",
  "audio_manifest": "manifest.json"
}
```

Name und Widmung lassen sich nach einem Neustart ändern. Änderungen an Mönchszahl oder Praxisprofil erfordern einen neuen Lauf. Bestehende Zahlen werden nicht stillschweigend auf eine andere Konfiguration umgerechnet:

```bash
# Dienst zuerst stoppen.
python -m app.cli new-run --reason "Neue Mönchszahl oder neuer Praxisablauf"
# Danach mit der geänderten Konfiguration starten.
```

Für Docker: `docker compose stop monastery`, dann `docker compose run --rm --no-deps monastery python -m app.cli new-run --reason "..."`, anschließend `docker compose up -d monastery`.

## Aufnahmen und Föderation

`media/README.md` erläutert Audioformat, Metadaten, Rechteangaben und Loop-Takt. `docs/FEDERATION.de.md` erklärt den Austausch öffentlicher Schlüssel und die gegenseitige Peer-Konfiguration. Eine Signatur ist ein Herkunftsnachweis, keine Wahrheitsgarantie für eine Selbstauskunft.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q
npm test
python scripts/benchmark.py
# Optional: tatsächliche Oberfläche in Chromium mit expliziten API-/TTS-Fixtures prüfen.
playwright install chromium
python scripts/browser_smoke.py
```

Node.js ≥20 ist nur für die vier Browser-Logiktests nötig, nicht für den Betrieb. Die ausführlichen Ergebnisse und Grenzen stehen in `docs/TEST_REPORT.de.md`.

## Dokumentation

`docs/CONCEPT.de.md` enthält das Produktkonzept. Weitere Dokumente: `TRADITION.de.md`, `ARCHITECTURE.de.md`, `FEDERATION.de.md`, `DEPLOYMENT.de.md`, `ROADMAP.de.md`, `TEST_REPORT.de.md` sowie `SECURITY.md` und `LICENSES.md`.

## Veröffentlichung

Dieses Verzeichnis ist ein vorbereitetes Repository, noch kein veröffentlichtes GitHub-Projekt. Prüfe Lizenzwahl, Texte, Sicherheit und tatsächliche Rechte an später ergänzten Medien vor dem öffentlichen Betrieb. Keine Schlüssel, Datenbanken, `.env` oder private Konfiguration committen. Code und eigene redaktionelle Texte: AGPL-3.0-only; siehe `LICENSE`. Fremde Texte und Aufnahmen werden dadurch nicht automatisch mitlizenziert.
