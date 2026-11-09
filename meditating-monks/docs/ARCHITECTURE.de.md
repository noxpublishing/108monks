# Architektur und Datenfluss

## Komponenten

`app/config.py` validiert lokale Knoten- und Praxisdateien mit striktem Schema. Unbekannte Felder, doppelte Phasen, nicht passende Zählintervalle und nicht ausführbare Profile führen zum Fehler statt stillen Fallbacks.

`app/engine.py` enthält eine reine Integer-Timeline. `Timeline.locate()` bestimmt die Phase, `observed_count()` zählt ausschließlich ganze Intervalle innerhalb der beobachteten Laufzeit. `Engine.summary()` aggregiert den Raum. Kein Netzwerk, kein LLM, kein Audio im Kern.

`app/main.py` betreibt FastAPI und einen Heartbeat pro Sekunde. Die Anwendung startet absichtlich mit genau einem Worker. `app/storage.py` speichert in SQLite/WAL. Eine Dateisperre verhindert zwei Scheduler im selben Datenordner.

`web/app.js`, `engine.js`, `room.js`, `audio.js` und `style.css` bilden eine native Browseroberfläche ohne Buildsystem. Der SVG-Raum zeigt bis zu 108 Figuren und verwendet im schmalen Hochformat eine schmalere Sitzordnung.

`app/federation.py` signiert und verifiziert Nachrichten und sendet nur an explizit lokal konfigurierte Gegenstellen. `app/source.py` erstellt das öffentliche Quellcodeangebot aus `SOURCE_MANIFEST.json`.

## Zeitmodell

Die persistierte `active_ms` ist keine Differenz zur Kalender-Startzeit. Ein monotones Prozesszeitintervall treibt sie fort. Ein normaler Heartbeat bestätigt ungefähr eine Sekunde Laufzeit. Bei starken Verzögerungen werden höchstens zwei Sekunden des Intervalls angerechnet; der übrige Teil wird als `uncredited_gap_ms` geführt.

Nach Neustart wird die zuletzt gespeicherte Laufzeit geladen. Die vergangene Abschaltzeit wird nicht hinzugefügt. Bei abruptem Verlust kann seit dem letzten erfolgreichen Checkpoint ein kleiner noch ungesicherter Teil fehlen. Das System ist konservativ, kein revisionssicherer Nachweis kontinuierlicher Ausführung.

Startversatz für Figur i: `floor(i * Gesamtdauer / Anzahl)`. So verteilt sich der Raum über den Zyklus. Zähler beginnen trotzdem bei null. Eine beim Start angeschnittene Einheit wird nicht als vollständige Wiederholung gewertet.

Die Browserdarstellung interpoliert höchstens zwei Sekunden zwischen Serverständen. Ohne neue Heartbeats gilt sie nach sechs Sekunden als veraltet. Sie friert ein und stoppt Audio. Antworten mit unverändertem Heartbeat-Zeitstempel gelten nicht als neue Aktivität.

## Zähler und Speicherung

Getrennte Größen: digitale Mantra-Ereignisse, digitale Verbeugungsbewegungen, digitale Darstellungszyklen von Gaben und vollständig durchlaufene Zyklusdauer. Keine spirituellen Attribute oder Verdiensteinheiten.

Ein Konfigurationsdigest umfasst Profil und Figurenzahl. Ändern sie sich, verweigert der bestehende Lauf die automatische Fortsetzung. Der Betreiber archiviert ihn lokal und startet bewusst einen neuen. Alte Läufe bleiben in SQLite erhalten. In v0.1 gibt es noch keine Archiv-Browseroberfläche.

## APIs

| Route | Zweck |
|---|---|
| `GET /healthz` | Heartbeat-Gesundheit |
| `GET /api/bootstrap` | Profil, öffentlicher Knoten, Medienkatalog, aktueller Zustand |
| `GET /api/state` | Gecachter Raumzustand |
| `GET /api/monks/{id}` | Zustand und digitale Zähler einer Figur |
| `GET /api/events` | SSE, ein gemeinsamer Zustand alle zwei Sekunden |
| `GET /api/network` | Akzeptierte, explizit vertraute Peer-Meldungen |
| `GET /.well-known/meditating-monks.json` | Signierte Eigenmeldung, nur bei aktivierter Föderation |
| `POST /api/federation/beacon` | Begrenzter Eingang signierter Peer-Meldungen |
| `GET /media/{filename}` | Ausschließlich freigegebene Katalogdateien |
| `GET /source` | Quellcode-ZIP aus dem expliziten Manifest |

Es gibt kein anonymes Administrations-, Datei-Upload- oder Fremd-URL-Fetch-API. Konfiguration erfolgt lokal. SSE ist auf 64 Verbindungen begrenzt; zusätzliche Oberflächen können pollen. Das ist eine bewusst konservative Prototypgrenze, kein allgemeines Besucherlimit.

## Audio

Der Server liefert Profiltexte und berechtigt verfügbare Dateien. Tippen oder Tastaturaktivierung der Szene schalten den Ton um. Erst dann lädt und dekodiert der Browser eine Aufnahme. Die Loop-Dauer muss zum Profilintervall passen. Ein Kompressor und normalisierte Pegel begrenzen den Mix. Latenz, Audio-Ladevorgang, Geräte und Timer unterscheiden sich zwischen Computern.

## Grenzen

Keine horizontale Skalierung des Single Writers. Keine integrierte Authentifizierung für private Praxisgruppen. Kein SSRF-fähiger öffentlicher URL-Importer. Kein Cloud-TTS-Fallback. Kein globales Peer-Crawling. Keine geklonte Stimme. Kein 24/7-Server-Audiostream. Keine LLM-Agenten im Hintergrund.

## Technische Primärquellen

FastAPI Lifespan: https://fastapi.tiangolo.com/advanced/events/

Web Audio Loops: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop

Browser-Autoplay: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

Ed25519: https://cryptography.io/en/latest/hazmat/primitives/asymmetric/ed25519/
