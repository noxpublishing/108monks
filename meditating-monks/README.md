# Meditating Monks

**A continuous offering. An open-source digital space dedicated to the benefit and liberation of all sentient beings.**

Ein selbst hostbarer digitaler Meditationsraum: Viele stilisierte Mönche durchlaufen zeitversetzt einen strukturierten Zyklus mit Ausrichtung, Niederwerfungen, Darbringungen, Mani-Rezitation und Widmung. Ohne LLM, Konten, Tracking oder laufende Tokenkosten.

**Version 0.2.1.** Die Figuren sind digitale Darstellungen. Die Software beansprucht weder Bewusstsein noch Ordination, Meditationserfahrung oder messbares spirituelles Verdienst. Menschliche Praxis bleibt eigenständig.

## Was funktioniert

- Standardmäßig 108 digitale Mönche in einem gemeinsamen Takt mit stabilen Startversätzen bis 1.200 ms. Die Instanz unterstützt 1 bis 5.000 Figuren mit einem gemeinsamen Scheduler.
- Öffentliches Praxisprofil mit 14 Phasen und 108 Mani-Wiederholungen je vollständiger Mani-Phase.
- Bildschirmfüllender Ritualraum mit bis zu 108 Plätzen. Im Hochformat ordnen sich die Figuren in schmaleren Reihen an. Die Szene berücksichtigt die Systemeinstellung für reduzierte Bewegung.
- SQLite-Persistenz, konservative Heartbeat-Zeit, keine Nachzählung von Server-Ausfallzeiten; keine fiktive Vorgeschichte bei zeitversetztem Start.
- Live-Status per Server-Sent Events; Polling-Fallback; veraltete Anzeige friert ein und Audio stoppt.
- Freigegebene Aufnahmen lassen sich durch Antippen der Szene oder per Tastatur ein- und ausschalten. Der Raumchor nutzt bis zu 108 Quellen und im schmalen Hochformat bis zu 12. Das Repository liefert keine Rezitationsaufnahmen mit.
- Opt-in-Föderation mit bekannten öffentlichen Schlüsseln, signierten Meldungen, Ablaufzeit und Replay-Abwehr. Kein ungeprüftes weltweites Verzeichnis.
- Download des tatsächlich gebündelten Quellcodes über `/source`; private Konfiguration und Schlüssel sind ausgeschlossen.

Die Longchen-Nyingtik-Datei ist **eine nicht ausführbare Strukturvorlage**, kein fertiges Ngöndro. Siehe `docs/TRADITION.de.md`.

## Lokal starten: Python

Voraussetzung: Python 3.13 unter Linux/macOS. Unter Windows den Docker-Weg verwenden; die Laufzeitsperre nutzt POSIX `flock`.

```bash
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-lock.txt
test -f config/node.json || cp config/node.example.json config/node.json
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --no-access-log --timeout-graceful-shutdown 5
```

Dann `http://localhost:8000` öffnen. Die Szene startet still. Sobald Aufnahmen hinterlegt sind, lässt sich der Ton direkt im Raum aktivieren. Mit der Tastatur führt Tab zum Raum und Enter oder Leertaste schalten den Ton um.

**Immer genau einen Worker starten.** Der Scheduler ist absichtlich ein Single Writer. Mehrere Worker auf demselben Datenordner werden blockiert, statt Zähler doppelt fortzuschreiben.

Beim Stoppen begrenzt Uvicorn das Warten auf offene Live-Verbindungen auf fünf Sekunden. Danach schreibt der Scheduler seinen letzten Stand in SQLite.

## Lokal starten: Docker Compose

```bash
test -f config/node.json || cp config/node.example.json config/node.json
test -f config/peers.json || cp config/peers.example.json config/peers.json
docker compose up -d --build
```

Die Anwendung ist unter `http://localhost:8000` erreichbar. Docker verwendet ein benanntes Datenvolume, einen unprivilegierten App-Benutzer und ein schreibgeschütztes Root-Dateisystem. Konfigurations- und Medienordner werden read-only eingebunden. Die angegebenen Containerlimits sind Konfigurationswerte, keine gemessene Hosting-Kapazität.

## Eigene Domain

```bash
test -f .env || cp .env.example .env
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

Name und Widmung lassen sich nach einem Neustart ändern. Änderungen an Mönchszahl, Praxisprofil oder Ensemble erfordern einen neuen Lauf. Der vorherige Lauf behält seine Zähler:

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
python -m pip install -r requirements-lock.txt -r requirements-dev.txt
python -m pytest -q
npm test
python scripts/benchmark.py
# Browser-Smoke-Test gegen die lokale Anwendung mit isolierten Testdaten.
python -m playwright install chromium
python scripts/browser_smoke.py
```

Node.js ≥20 ist für die JavaScript-Tests und den Python/JavaScript-Paritätstest erforderlich. Für den Betrieb genügt die Python-Umgebung. Frühere Testergebnisse stehen in `docs/TEST_REPORT.de.md`.

## Dokumentation

`docs/CONCEPT.de.md` enthält das Produktkonzept. Weitere Dokumente: `TRADITION.de.md`, `ARCHITECTURE.de.md`, `FEDERATION.de.md`, `DEPLOYMENT.de.md`, `ROADMAP.de.md`, `TEST_REPORT.de.md` sowie `SECURITY.md` und `LICENSES.md`.

## Veröffentlichung

Der [Quellcode liegt auf GitHub](https://github.com/noxpublishing/108monks). Der aktuelle Betrieb einer eigenen Instanz und ein öffentlicher Pilot haben eigene Abnahmeschritte in `docs/DEPLOYMENT.de.md` und `docs/ROADMAP.de.md`. Schlüssel, Datenbanken, `.env` und private Konfiguration gehören auf das Betreibersystem. Für Code und eigene redaktionelle Texte gilt AGPL-3.0-only, siehe `LICENSE` und `LICENSES.md`.
