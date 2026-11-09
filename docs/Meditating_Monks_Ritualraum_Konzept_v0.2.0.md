# Der Ritualraum · Umsetzungsspezifikation 0.2.0

Stand: 8. November 2026. **Implementierter Entwicklungsstand**, kein visueller Entwurf ohne Code. Die Vorschaubilder stammen aus der echten HTML/CSS/SVG-Oberfläche mit expliziten Browser-Testdaten. Echte Rezitationsaufnahmen sind noch nicht enthalten.

## 1. Raum statt Agenten-Dashboard

Die zentrale Ansicht ist ein Klosterraum aus erhöhter, leicht schräger Vogelperspektive. Alle Figuren sind zum oberen Altarbereich orientiert. Neun Reihen mit zwölf Sitzen ergeben 108 Plätze; zwischen je sechs Sitzen bleibt ein Mittelgang. Die Architektur wird durch Holzboden, warme Wandflächen, seitliche Pfeiler, Altarstufe und kleine Lampen lesbar. Diese Szene ist eine eigene stilisierte 2D-Komposition, kein dokumentarischer Nachbau eines bestimmten Klosters.

Die Figuren haben feste Plätze und bleiben beim Phasenwechsel erkennbar. Aktivitätsfilter dimmen nicht passende Figuren, statt die Sitzordnung ständig umzubauen. Über jeder Figur liegt eine kurze englische Sprechblase, beispielsweise „Om mani peme hung“, „Taking refuge“ oder „Offering“. Die Blasen beschreiben Aktivität bzw. wiederkehrendes Mantra; sie sind kein silbengenaues Live-Transkript der Audiodatei. Über einen Schalter lassen sich alle ausblenden.

Ein Klick selektiert einen Mönch, markiert Sitz und Sprechblase und öffnet dessen Abschnitt im Detailpanel. Wenn eine freigegebene Datei vorhanden ist, startet Audio durch diese Nutzerinteraktion. Die Seite bleibt sonst lautlos. Fehlende Aufnahmen werden angezeigt, nicht mit unerwarteter Computerstimme ersetzt.

„Raum vergrößern“ blendet den Raum in einer vergrößerten Ansicht ein. Escape kehrt zurück. Auf schmalen Geräten bleibt die Sitzordnung in einem internen Scrollbereich erhalten; eine kompakte Übersicht bietet eine Alternative ohne seitliches Raumscrollen.

## 2. Gemeinsam, aber nicht mechanisch gleichzeitig

**Gemeinsamer Takt, kleine konstante Versätze.** Das Ensemble nutzt ein Profil und dieselbe Geschwindigkeit. Ein aus Figurenindex und Seed berechneter Offset liegt im Standard zwischen 0 und 1.200 ms. Der erste Mönch hat Offset 0. Das ist keine zufällige neue Verzögerung in jedem Frame und kein abweichendes Tempo pro Figur.

Dadurch bleibt das gemeinsame Ritual erkennbar. An Übergängen darf eine Figur schon beginnen, während eine andere die vorherige Aktion beendet. Außerhalb dieses maximal 1,2 Sekunden breiten Korridors befinden sich alle im gleichen Abschnitt. Figuren laufen auch nach Stunden nicht über verschiedene Mantras auseinander. Kleine Unterschiede in der Animation schaffen zusätzlich Bewegung, ohne Gebetstexte zu verändern.

```json
"ensemble": {"mode": "cohort", "spread_ms": 1200, "seed": 108}
```

`spread_ms` lässt 0 bis 3.000 ms zu. Der frühere, über den gesamten Zyklus verteilte Modus ist als `distributed` verfügbar, aber nicht der Standard für diesen Raum. Timingänderungen brauchen einen neuen archivierten Lauf. Zusätzliche Server folgen ihrer eigenen aktiven Zeit: weltweite samplegenaue Synchronität ist kein implementiertes Feature.

## 3. Gesten und Bewegungen

| Abschnitt | Implementierte Darstellung |
|---|---|
| Ankommen, vier Gedanken | Ruhiges Sitzen und kleine Atembewegung |
| Zuflucht, Ehrerbietung | Aufrichten, Verneigen, stilisiert ausgestreckte Niederwerfung, Zurückkehren |
| Bodhicitta | Hände nahe am Brustraum, zurückhaltende Hinwendung |
| Darbringung | Schale wird angehoben und wieder gesenkt |
| Bekennen | Gesenkter Kopf und veränderte Oberkörperhaltung |
| Mitfreude | Leicht geöffnete bzw. angehobene Arme |
| Bitte um Lehre / Verbleiben | Bittende Gebetshaltung |
| Widmung | Gesammelte Haltung und kleine Verneigung |
| Mani-Rezitation | Sitzende Figur mit sanfter Rhythmusbewegung |
| Stille | Ruhigstes Bewegungsbild ohne Rezitation |

Diese Gesten sind visuelle Kennzeichnungen, **keine Unterweisung in korrekten körperlichen Ritualabläufen oder Mudrās**. Die beiden Bitten dürfen dieselbe symbolische Gebetshaltung verwenden. Reduzierte Bewegung ersetzt dauernde Animation durch eine passende statische Haltung. Flackernde Lichteffekte und ständig wandernde Kamerafahrten sind nicht eingebaut.

## 4. Fokus-Audio und Raumchor

Der Standardraum kann 108 tatsächliche Web-Audio-Quellen enthalten: den gewählten Mönch vorne, bis zu 107 weitere im Hintergrund. Das sind 108 virtuelle Wiedergabepositionen, nicht 108 verschiedene Aufnahmen und keine Server-TTS-Aufrufe. Gemeinsame Dateien teilen sich einen geladenen, dekodierten Puffer.

Die Vordergrundquelle ist mittig und erhält zunächst Gain 0,9. Der gemeinsame Hintergrundpegel liegt zunächst bei 0,055. Jede Hintergrundquelle erhält diesen Wert geteilt durch die Zahl der Hintergrundquellen. Die lineare Normalisierung hält besonders bei gleichen, korrelierten Aufnahmen die Summenamplitude zurück. Sie ist kein kalibrierter Lautheits- oder Schalldruckwert.

Der Hintergrund wird mit einem Tiefpass bei 1.800 Hz abgerundet und nach Sitzspalte links/rechts verteilt. Die Hauptstimme bleibt weitgehend ungefiltert. Pegeländerungen erfolgen weich; beim Wechsel des ausgewählten Mönchs bleiben vorhandene passende Quellen zeitlich bestehen. Es werden nicht alle Stimmen neu gestartet. Ein eigener Hintergrundregler erlaubt bis hinunter zu null eine sehr dezente Umgebung. Der Regler für Gesamtlautstärke bleibt getrennt.

Der sparsame Modus verwendet zwölf tatsächliche Figuren aus dem selben Raum. Er ist sichtbar auswählbar, keine heimliche Behauptung von 108 laufenden Spuren. Mehr als 108 Serverfiguren werden auf weitere Räume verteilt; nicht alle Räume werden gleichzeitig gemischt.

**Aufnahmequalität ist entscheidend:** Eine einzelne Datei, 108-mal zeitversetzt abgespielt, kann trotz Technik künstlich klingen. Mehrere passend aufgenommene Stimmen verbessern die Vielfalt. Alle Loopvarianten müssen gleich lange vollständige Rezitationen enthalten; kein heimliches Time-Stretching oder Pitch-Shifting. Ein professionell abgenommener Klang ist erst mit echten Dateien prüfbar.

Einmalige Gebete laufen einmal im zugehörigen Abschnitt. Wer später klickt, hört die aktuelle Stelle; ein bereits beendetes Gebet startet nicht erneut. Die englische Erzählspur bleibt immer eine einzelne Stimme. Ohne passende Aufnahme bleibt der jeweilige Kanal still. Bei veraltetem Status oder verborgenem Browserdokument stoppt Audio; Lockscreen-Wiedergabe ist nicht zugesagt.

## 5. Altar und Quellen

Für den ersten Raum ist ein einzelner, klar benannter Padmasambhava-Bildplatz vorgesehen, keine ungeprüfte Kombination von drei Gestalten. Die gewählte Referenz ist *The Spiritual Master Padmasambhava*, 14. Jahrhundert, Western Tibet or Ladakh, The Met, Objekt 78192 / Inventarnummer 2012.459. Die offizielle Objektseite nennt Public Domain, die Museumspolicy CC0 [R1–R2].

**Aktueller Lieferstand:** gekennzeichneter Platzhalter. Der Download der originalen Bilddatei war in der Arbeitsumgebung nicht möglich. Die Datei wurde nicht durch eine erfundene Ikonografie ersetzt. Ein ausdrücklich gestarteter Import ist vorbereitet:

```bash
python scripts/fetch_altar_art.py --accept-cc0-source
# Alternativ dieselbe offizielle Originaldatei manuell laden und importieren:
python scripts/fetch_altar_art.py --accept-cc0-source --from-file /pfad/zum/original.jpg
```

Das Skript schreibt JPEG und Quellenmetadaten lokal. Keine externe Bildanfrage wird beim Besuch der Website ausgelöst. Ein Bildimport ist keine Segnung, Museumsunterstützung oder Anerkennung durch eine Linie. Eine spätere Drei-Wurzeln-Anordnung benötigt eine ausdrücklich ausgewählte und geprüfte Traditionsfassung.

## 6. Leistung und Barrierefreiheit

Die Room-Engine erzeugt keine 108 VMs. Serverseitig bleibt es ein Scheduler; Animation und Mischung laufen im Browser. Die 108-Quellen-Demonstration wurde mit einem stillen Testpuffer in Chromium geprüft, nicht auf iPhone oder mit vollständigen realen Gebeten. Es gibt keine Zusage, dass jedes ältere Telefon die volle Mischung gleich gut bewältigt.

Tastaturauswahl, sichtbare Selektion, Ein-/Ausblenden der Sprechblasen, reduzierte Bewegung und die kompakte Liste sind eingebaut. Die Szene darf nicht ausschließlich über Farbe oder Ton verständlich sein. Eine tatsächliche Screenreader- und Geräteprüfung steht aus. Es gibt keine Behauptung einer abgeschlossenen Barrierefreiheitszertifizierung.

## 7. Noch nicht implementiert

Kein echter 3D-Raum, keine frei fliegende Kamera, keine individuell modellierten 108 Personen, kein Mund-/Silben-Lipsync, keine live aufgenommenen 108 Sänger, kein serverseitiger 24/7-Audiostream und keine weltweite Live-Audioverbindung. Diese Funktionen sind für das jetzt gewünschte Raumerlebnis nicht Voraussetzung.

## Quellen

[R1] The Met, Objektseite: https://www.metmuseum.org/art/collection/search/78192

[R2] The Met, Open Access: https://www.metmuseum.org/hubs/open-access

[R3] MDN, StereoPannerNode: https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode

[R4] MDN, weiche Parameteränderungen: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime

[R5] W3C, Web Audio API: https://www.w3.org/TR/webaudio/
