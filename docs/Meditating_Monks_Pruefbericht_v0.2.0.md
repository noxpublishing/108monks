# Prüfbericht · Meditating Monks 0.2.0

**Stand: 8. November 2026.** Native lokale Entwicklungsumgebung, Python 3.13.5, Node.js 22 und Chromium. Keine echte Rezitationsdatei ist im Paket. Keine öffentliche Domain, kein veröffentlichtes GitHub-Repository und kein Docker-Build werden behauptet.

## Ausgeführte Prüfungen

| Bereich | Ergebnis | Aussagegrenze |
|---|---|---|
| Python `python -m pytest -q` | 85 bestanden | Unit-/API-Tests und Python/JS-Parität, keine externe Sicherheitsprüfung |
| JavaScript `npm test` | 22 bestanden | Timeline, Sitzordnung, Quellenplanung und Mixregeln |
| Chromium-Komponenten `scripts/browser_smoke.py` | 14 Prüfblöcke bestanden, keine ungefangenen JS-Fehler | Explizite API-, Speicher- und TTS-Testdoubles, kein Live-Browser-Server-End-to-End-Test |
| Lokale unabhängige Server `scripts/two_node_smoke.py` | 5 Prüfblöcke bestanden | Reales Loopback-HTTP mit Test-Relay, kein automatisches öffentliches HTTPS-Push |
| Frisch entpacktes Release-ZIP | 4 Prüfblöcke bestanden | Tatsächlicher lokaler HTTP-Start, neues Raum-Modul, englisches Profil und Source-Angebot; kein Docker |
| Konfigurationsdiagnose `python -m app.cli doctor` | Konfiguration valide, 0 freigegebene Aufnahmen | Textbetrieb möglich; Warnungen sind keine Audiofreigabe |

## Was die Browserprüfung konkret abdeckt

108 auswählbare Figuren und Sprechblasen im Ritualraum; Desktopbreite 1.600 px und mobile Breite 390 px ohne äußeren Seitenüberlauf. Interner Raumscroll und kompakte Liste. Auswahl und Pfeiltasten. Sprechblasen-Schalter, vergrößerter Raum, Escape. Neun nicht zum Mantra gehörende Aktionszustände. Reduzierte Bewegung mit statischer Niederwerfung. Persönliche Mala mit lokalem Test-Speicher. Englischer TTS-Kontrollfluss mit gemockter lokaler Stimme. Veralteter Serverstatus friert die Anzeige ein und stoppt Audio.

**Audio:** Ein real dekodierter stiller WAV-Puffer wird von 108 echten Web-Audio-Quellen gemeinsam verwendet. Eine Quelle ist vorn, 107 sind im Hintergrund. Auswahlwechsel startet die Quellen nicht neu. Die 12-Quellen-Sparstufe, Solo-Wiedergabe und der separate Hintergrundregler sind geprüft. Eine einmalige englische Ansage wird weder geloopt noch als Chor vervielfacht.

Der stille Puffer bestätigt Scheduling und Graph, **nicht hörbare Natürlichkeit, Verständlichkeit, Klangqualität oder tibetische Aussprache**. Kein Safari/iOS-/Android-Test und keine vollständige Screenreader-Prüfung. Das Altarbild ist in diesen Tests ein klar gekennzeichneter Platzhalter.

## Zwei-Prozess- und Recovery-Test

Zwei unabhängige Uvicorn-Prozesse wurden lokal gestartet. Signierte Meldungen wurden in beide Richtungen über echtes Loopback-HTTP transportiert und Peerlisten überprüft. Doppelte Meldungen wurden mit 409, manipulierte Signaturen mit 400 abgewiesen. Ein Live-SQLite-Backup bestand die Integritätsprüfung. Ein dritter isolierter Prozess startete dieses Backup mit derselben Lauf-ID, ohne fiktive Ausfallzeit und mit neuer Identität bei deaktivierter Föderation.

Das testet nicht die Wiederverwendung eines alten privaten Föderationsschlüssels nach Rückspielen älterer Sequenzzähler. Dieser Sonderfall und automatische Schlüsselrotation bleiben offen.

## Prüfung des ausgelieferten Archivs

Das Repository-ZIP wurde in einen neuen temporären Ordner entpackt. Der native Server startete dort erfolgreich. Englisch als Profil, `cohort` mit 1.200 ms Streuung, Textbetrieb ohne freigegebene Aufnahme und Altarplatzhalter wurden aus der echten Bootstrap-API geprüft. HTML, `/assets/room.js` und die API der 108. Figur waren per HTTP erreichbar. Das generierte `/source`-ZIP enthielt neue Raum-, Audio- und englische Textdateien, aber keine Laufzeit-Schlüssel oder private Konfiguration. Ergebnis: `release-smoke.json`.

## Lokaler Engine-Mikrobenchmark

100 Durchläufe je Größe, ausschließlich `Engine.summary`, ohne HTTP, Datenbank, Audio und Besucherlast. Die Rohwerte stehen in `benchmark.json`. Der Median für 500 Figuren liegt in diesem Durchlauf bei etwa 1,8 ms; für 5.000 bei etwa 18,2 ms. Das ist keine Kapazitätszusage für einen bestimmten VPS oder für 108 Audioquellen auf einem Telefon.

## Reproduzieren

```bash
pip install -r requirements-dev.txt
python -m pytest -q
npm test
python scripts/benchmark.py
python scripts/two_node_smoke.py
playwright install chromium
python scripts/browser_smoke.py
python -m app.cli doctor
```

Node.js wird auch vom Python/JavaScript-Paritätstest benötigt. Chromium und die zusätzlichen Entwicklungsabhängigkeiten sind nicht Voraussetzung für den normalen Serverbetrieb.

## Ausstehend vor öffentlichem Pilot

Echte Aufnahme samt Aussprache und hörbarem Mix; reale Text-/Stimm-/Audiofreigaben; vollständige inhaltliche und kulturelle Prüfung; Museum-JPEG-Import; Docker-Build und Compose auf Zielsystem; echte Domain mit HTTPS; tatsächliche Mobilgeräte und Screenreader; automatische Föderation zwischen zwei öffentlichen Hosts; externer Sicherheits-/Abhängigkeitenaudit. Ein erfolgreiches lokales Testergebnis erledigt diese Abnahmen nicht.

Historische v0.1-Berichte bleiben unter `history/`; sie sind keine aktuellen Testergebnisse.
