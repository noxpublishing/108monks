# Changelog

## 0.2.1 — 2026-11-09

Ritualraum und gemeinsamer Takt, aufbauend auf 0.1.0:

- Ritualansicht als Kerzenlicht-Halle (erhöhte Vogelperspektive): 108 feste Plätze in neun Reihen mit Mittelgang, Altarstufe, Seitenpfeilern und Butterlampen; die kompakte Kachel-Liste bleibt Alternative. Aktivitätsfilter dämmen Figuren, statt die Sitzordnung umzubauen.
- Kohorten-Modus als Standard (Ritualraum-Konzept v0.2.0): alle Figuren folgen einem gemeinsamen Profil mit stabilen Startversätzen von 0–1200 ms; der frühere verteilte Modus bleibt ausdrückliche Option (`ensemble` in der Knotenkonfiguration). Die Versätze sind byte-genau zwischen Python-Engine und Browser gespiegelt und per Test verriegelt.
- Aktivitäts-Sprechblasen über den Figuren: Zeiger, seed-stabile Streuung und wellenförmiger Textwechsel im Übergangskorridor; standardmäßig aus.
- Ruhige Darstellung, Raum vergrößern mit Escape und Pfeiltasten-Auswahl im Sitzraster.
- Audio-Workflow: `audio-probe` und `audio-prepare` erzeugen unveröffentlichte Entwürfe; eine geprüfte Mani-Rezitation wird von Hand in `media/manifest.json` verbunden. Kein Time-Stretching, keine Tonhöhenänderung.
- Figuren-Illustrationen (Mönch vorn/hinten, Padmasambhava, Buddha) als Projekt-Assets in `web/`, integriert in Ritualraum und Einzelansicht.
- Einmal-Audio (`audio_mode: "once"`) neben dem Loop: Gebete laufen einmal je Abschnittsdurchgang pro Zyklus, ein späterer Einstieg hört ab der aktuellen Stelle, ein beendetes Gebet startet nicht erneut. Gebunden: Zuflucht-Vierzeiler (vollständig als eine Aufnahme), die sieben Glieder sowie die Widmung dieselbe Datei an zwei Stellen (Konzept §4.2). Vier Unermessliche und optionales Mandala bleiben bewusst ungebunden.
- Raumchor (Ritualraum-Konzept §4): bis zu 108 virtuelle Wiedergabepositionen im Loop — stabiler Sitzversatz (Cohort-Offset im Loop-Takt), Spaltenpanorama, gemeinsamer Hintergrund-Tiefpass 1,8 kHz, hinten leiser; getrennter Hintergrundregler, Sparstufe mit 12 Quellen, Auswahlwechsel startet den Chor nicht neu. Aufnahmevarianten (z. B. Mani-Take 1) werden deterministisch verteilt — keine Tonhöhenänderung, kein Time-Stretching.
- Profil-Schema: `audio_mode` nur zusammen mit `audio_id` (Validierung); Byte-Parität der Kohorten-Versätze Python/JavaScript per Test verriegelt.
- Lokale Mani-Rezitation im Testbetrieb: Loop 3,332 s, `unit_ms` entsprechend angepasst; Rechte- und Ausspracheprüfung bleibt offen.
- `new-run` archiviert bei Profil- oder Timingänderungen den alten Lauf; der Lauf-Digest umfasst jetzt auch das Ensemble.

## 0.1.0 — 2026-11-08

Initial local development prototype: deterministic timeline, public compassion profile, non-executable lineage outline, persistent runtime, animated responsive room, manual local mala, audio player/local TTS demo, explicit-peer signed federation, source offer, container configuration, documentation and automated tests.

Not published to GitHub and not deployed to a public domain as part of that delivery.
