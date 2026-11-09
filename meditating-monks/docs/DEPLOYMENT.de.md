# Installation und Betrieb

## Vorab

Docker-/Compose-Dateien sind vorbereitet. In der Erstellungsumgebung war kein Docker-CLI verfügbar; Image-Build, Compose-Start, öffentliche TLS-Ausstellung und ein VPS-Dauertest wurden deshalb nicht ausgeführt. Die Python-Anwendung selbst wurde lokal gestartet und ihre HTTP-API geprüft. Die CI-Konfiguration enthält zukünftige Dockerprüfungen, aber ein GitHub-CI-Lauf wurde noch nicht ausgeführt.

## Lokaler Test

Anleitung in `README.md`. Kein Modell, keine GPU und kein API-Key erforderlich. Python 3.13 und ein einzelner Uvicorn-Worker. Das Projekt enthält alle statischen Browserdateien; keine npm-Installation für den Betrieb.

Die Python-Abhängigkeiten müssen vor dem ersten Start vorhanden sein. Der laufende eigenständige Raum benötigt anschließend keine Internetverbindung, solange keine Föderation oder externe Infrastrukturleistung hinzukommt. Eine Browser-TTS-Stimme muss lokal vorhanden sein.

## VPS mit Domain

1. Repository auf den Server kopieren und Docker/Compose nach offizieller Anleitung installieren.
2. `config/node.example.json` nach `config/node.json`, `config/peers.example.json` nach `config/peers.json` kopieren.
3. `.env.example` nach `.env` kopieren, `MM_DOMAIN` auf die echte Domain setzen.
4. Domain-DNS auf den Server zeigen lassen. Nur zutreffende IPv6-Records veröffentlichen.
5. Eingehend TCP 80/443 für den Webbetrieb und den benötigten administrativen Zugang erlauben; UDP 443 ist für HTTP/3 optional. Administrationszugang gesondert absichern.
6. `docker compose -f compose.yaml -f compose.production.yaml up -d --build` ausführen.
7. Gesundheitszustand, tatsächliche Domain, Player, Quellcodeangebot und persistente Laufzeit nach Neustart prüfen.

Caddys automatische Zertifikatsverwaltung setzt passende DNS-Einträge, erreichbare Ports und persistente beschreibbare Zertifikatsdaten voraus. Quelle: https://caddyserver.com/docs/automatic-https

`depends_on: condition: service_healthy` wartet auf den App-Healthcheck. Quelle: https://docs.docker.com/compose/how-tos/startup-order/

Das Beispiel bindet Port 8000 nur auf Host-Loopback, nicht öffentlich. Kein ungeschütztes Adminpanel ist enthalten. Caddy erhält die Domain aus `.env`. Die Container-Image-Tags sind keine unveränderlichen Digests; vor einem reproduzierbaren öffentlichen Release aktuelle Images prüfen und auf geprüfte Digests fixieren.

## Daten und Backups

Das Docker-Volume `monastery-data` enthält SQLite, privaten Ed25519-Schlüssel, Lockdatei und das generierte öffentliche Quellcode-ZIP. Ein Backup darf nicht öffentlich bereitgestellt werden.

Für eine konsistente laufende SQLite-Sicherung:

```bash
python -m app.cli backup /sicherer/pfad/monastery-backup.sqlite3
```

Privaten Schlüssel, echte Konfiguration und berechtigte Medien separat sichern. Eine bloße Kopie einer offenen SQLite-Datei ohne passende WAL-Behandlung ist nicht der vorgesehene Backupweg. Ein vollständiges kaltes Backup nach ordentlichem Stoppen ist ebenfalls möglich.

Achtung bei Wiederherstellung: Die persistierte Föderationssequenz kann nach einem alten Backup hinter bereits gesendeten Werten liegen. Siehe `FEDERATION.de.md`.

## Profil-/Mönchszahl ändern

Dienst stoppen, Konfiguration bearbeiten und mit `python -m app.cli new-run --reason "..."` den aktuellen Lauf archivieren. Danach starten. Das gilt auch, wenn neue Audio-Taktung die Phasendauer ändert. Private Widmung oder Name allein ändern die Laufstruktur nicht.

## Audio

Siehe `media/README.md`. Der Medienordner ist read-only gemountet und muss vom unprivilegierten Containerbenutzer lesbar sein. Es gibt keine Upload-Oberfläche. Aufnahmen werden nicht mit dem Dockerimage gebündelt, sondern lokal eingebunden.

## Kapazität

Die 512-MiB-/1-CPU-App-Limits im Compose-Beispiel sind ein Startpunkt, kein gemessener Mindestbedarf. Der beigefügte Benchmark misst nur den Schedulerkern in der Testumgebung. Browserbesucher, SSE-Verbindungen, Audiodownloads, TLS und Datenbank-I/O sind weitere Lasten.

Für einen kleinen Pilotversuch erscheint eine CPU-VPS ohne GPU konzeptionell angemessen. Eine konkrete Auslegung erst nach Messung des tatsächlich eingesetzten Hosts und der erwarteten Besucherlast vornehmen. Hunderte logische Figuren sind nicht Hunderte parallele Sprachmodelle.

## Veröffentlichung

Die öffentliche Route `/source` enthält nur Dateien aus `SOURCE_MANIFEST.json`. Prüfe dieses Manifest bei Codeänderungen; neue notwendige Quelldateien müssen aufgenommen werden. Niemals private Konfiguration, Schlüssel oder Kunden-/Besucherdaten hinzufügen.

Impressums-, Datenschutz-, Anbieter- und Audiofragen hängen vom tatsächlichen Betrieb ab und sind nicht durch dieses technische Beispiel pauschal gelöst. Die Anwendung selbst enthält kein Analytics-Skript und keine Konten. Server, Proxy oder Hostinganbieter können unabhängig davon Metadaten verarbeiten.
