# Meditating Monks · 108 Monks

Ein selbst hostbarer, offener digitaler Meditationsraum. Stilisierte Figuren durchlaufen kontinuierlich einen strukturierten Zyklus: Ausrichtung, Zuflucht mit symbolischen Niederwerfungen, Darbringungen, Mani-Rezitation, Stille und Widmung. Menschen können den Raum betrachten, geprüfte Aufnahmen anhören, selbst mitrezitieren oder auf ihrem eigenen Server einen weiteren Raum betreiben.

**Leitsatz:** Ein kontinuierlicher digitaler Raum des Mitgefühls, von Menschen geschaffen und gewidmet.

> Die Bezeichnung „Monks" ist eine künstlerische Darstellung, kein Ordinationsnachweis. Die Software beansprucht kein Bewusstsein und keine spirituelle Verwirklichung. Gesten und Bewegungen sind visuelle Kennzeichnungen, keine Unterweisung.

## Inhalt dieses Repositorys

| Pfad | Inhalt |
|---|---|
| `meditating-monks/` | Die Anwendung (FastAPI + Web-Frontend, AGPL-3.0-only): Engine, Ritualraum, Tests, Docker-Setup, Betriebsdokumentation. Siehe dortiges `README.md` für den Start. |
| `demo/ritualraum.html` | Standalone-Referenzdemo des Ritualraums (eine Datei, ohne Server lauffähig). |
| `docs/` | Produktkonzept v0.2.0, Ritualraum-Spezifikation, Prüfbericht, englisches Aufnahmeskript. |
| `docs/preview/` | Screenshots des aktuellen Demostands. |
| `artwork/` | Illustrationsquellen (PNG/SVG): Mönch vorn/hinten, Padmasambhava, Buddha. Die eingebetteten Assets liegen in `meditating-monks/web/assets/`. |

## Status

- **0.2.1** — Kerzenlicht-Ritualraum (Vogelperspektive, 108 Plätze, Mittelgang), Kohorten-Ensemble als Standard (gemeinsamer Takt, Versätze 0–1200 ms), Audio-Entwurfsworkflow. Das Changelog liegt in `meditating-monks/CHANGELOG.md`.
- Zustand lokal verifiziert (Tests, Browserprüfung); **keine öffentliche Instanz** betrieben und kein HTTPS-Deployment beansprucht.

## Bewusst nicht enthalten

- **Rezitationsaufnahmen.** Die Rechte- und Ausspracheprüfung einer echten Mani-Rezitation ist ein menschlicher Abnahmeschritt und noch nicht abgeschlossen; daher enthält dieses Repository keine fertigen Aufnahmen. Der Workflow dazu: `docs/Meditating_Monks_Recording_Script_EN.md` und `meditating-monks/media/README.md`.
- **Betriebsdaten und private Schlüssel.** Laufzeit-Datenbank, Knotenidentität und Konfiguration bleiben ausschließlich auf dem Betreibersystem.
- Keine Mikrotransaktionen, keine Ranglisten, kein KI-Chat (siehe Konzept, Abschnitt 14).

## Schnellstart (lokal)

```bash
cd meditating-monks
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-lock.txt
cp config/node.example.json config/node.json
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Dann `http://localhost:8000` öffnen. Der Textbetrieb funktioniert ohne Audio; kein Konto, kein Tracking.

## Lizenz

Der Anwendungscode steht unter **AGPL-3.0-only** (`meditating-monks/LICENSE`); Abschnitt 13 betrifft bei netzwerkfähiger Software das Quellcodeangebot an interagierende Nutzer — jede Instanz bietet ihren Quellcode über `/source` an. Illustrationen sind Projekt-Assets dieses Repositorys. Das öffentliche Praxisprofil ist eine eigene moderne Komposition, keine überlieferte Liturgie und kein vollständiges Ngöndro; die Longchen-Nyingtik-Strukturdatei ist ausdrücklich nicht ausführbar (`meditating-monks/docs/TRADITION.de.md`).
