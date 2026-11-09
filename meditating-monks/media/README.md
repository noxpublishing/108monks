# Audio

Es ist bewusst keine fremde Aufnahme enthalten. Ein zugängliches Video oder MP3 ist keine automatische Weiterveröffentlichungsfreigabe.

1. Lege eine berechtigt verwendbare WAV-, MP3-, OGG-, M4A- oder FLAC-Datei hier ab. WAV ist für den ersten Test am unkompliziertesten; Browser-Codecs variieren.
2. Kopiere `manifest.example.json` nach `manifest.json`.
3. Ersetze Dateiname, Titel, Interpret, Lizenz, Erlaubnisnotiz und Loop-Grenzen durch echte Angaben.
4. Der Loop umfasst genau eine vollständige Rezitation. Seine Länge darf höchstens 50 ms von `unit_ms / 1000` der passenden Phase abweichen. Im mitgelieferten Profil dauert ein Mani-Loop 3,332 Sekunden.
5. Hat die Aufnahme einen anderen Takt, passe `unit_ms` und `duration_ms = unit_ms × Wiederholungen` im Praxisprofil an und archiviere den alten Lauf. Nicht den Gesang künstlich beschleunigen.
6. Server neu starten. Eine fehlende Datei oder unvollständige Rechteangabe führt bewusst zu einem Konfigurationsfehler.

Im schmalen Hochformat nutzt der Raumchor bis zu zwölf Wiedergabepositionen, sonst bis zu 108. Diese Zahlen schließen die Vordergrundstimme ein. Der Raumchor mischt zeitversetzte Abspielungen der Aufnahme und gegebenenfalls ihrer freigegebenen Varianten. Bereite die Loop-Schnittpunkte in der Audiodatei vor. Der Player übernimmt die Aufnahme in Originaltempo und Tonhöhe.

Der Browser lädt und spielt Dateien erst, wenn jemand den Ton durch Antippen der Szene oder per Tastatur einschaltet.

7. Einmalige Gebete (`audio_mode: "once"` im Praxisprofil): Die Aufnahme läuft einmal je Abschnittsdurchgang, pro Zyklus. Wer mitten im Abschnitt einsteigt, hört ab der aktuellen Stelle; ein bereits beendetes Gebet startet nicht erneut und der Kanal bleibt bis zum nächsten Abschnitt still. Für once-Aufnahmen beschreiben `loop_start_seconds`/`loop_end_seconds` den hörbaren Bereich (in der Regel die gesamte getrimmte Datei). Loops bleiben an `unit_ms` gebunden; once hat keinen Taktzwang.
