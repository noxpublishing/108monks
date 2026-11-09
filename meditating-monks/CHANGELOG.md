# Changelog

## 0.2.1 — 2026-11-09

Ritualraum und gemeinsamer Takt, aufbauend auf 0.1.0:

- Ritualansicht als Kerzenlicht-Halle (erhöhte Vogelperspektive): 108 feste Plätze in neun Reihen mit Mittelgang, Altarstufe, Seitenpfeilern und Butterlampen; die kompakte Kachel-Liste bleibt Alternative. Aktivitätsfilter dämmen Figuren, statt die Sitzordnung umzubauen.
- Kohorten-Modus als Standard (Ritualraum-Konzept v0.2.0): alle Figuren folgen einem gemeinsamen Profil mit stabilen Startversätzen von 0–1200 ms; der frühere verteilte Modus bleibt ausdrückliche Option (`ensemble` in der Knotenkonfiguration). Die Versätze sind byte-genau zwischen Python-Engine und Browser gespiegelt und per Test verriegelt.
- Aktivitäts-Sprechblasen über den Figuren: Zeiger, seed-stabile Streuung und wellenförmiger Textwechsel im Übergangskorridor; standardmäßig aus.
- Ruhige Darstellung, Raum vergrößern mit Escape und Pfeiltasten-Auswahl im Sitzraster.
- Audio-Workflow: `audio-probe` und `audio-prepare` erzeugen unveröffentlichte Entwürfe; eine geprüfte Mani-Rezitation wird von Hand in `media/manifest.json` verbunden. Kein Time-Stretching, keine Tonhöhenänderung.
- Figuren-Illustrationen (Mönch vorn/hinten, Padmasambhava, Buddha) als Projekt-Assets in `web/`, integriert in Ritualraum und Einzelansicht.
- Lokale Mani-Rezitation im Testbetrieb: Loop 3,332 s, `unit_ms` entsprechend angepasst; Rechte- und Ausspracheprüfung bleibt offen.
- `new-run` archiviert bei Profil- oder Timingänderungen den alten Lauf; der Lauf-Digest umfasst jetzt auch das Ensemble.

## 0.1.0 — 2026-11-08

Initial local development prototype: deterministic timeline, public compassion profile, non-executable lineage outline, persistent runtime, animated responsive room, manual local mala, audio player/local TTS demo, explicit-peer signed federation, source offer, container configuration, documentation and automated tests.

Not published to GitHub and not deployed to a public domain as part of that delivery.
