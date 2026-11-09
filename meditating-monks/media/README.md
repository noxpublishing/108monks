# Audio

Es ist bewusst keine fremde Aufnahme enthalten. Ein zugängliches Video oder MP3 ist keine automatische Weiterveröffentlichungsfreigabe.

1. Lege eine berechtigt verwendbare WAV-, MP3-, OGG-, M4A- oder FLAC-Datei hier ab. WAV ist für den ersten Test am unkompliziertesten; Browser-Codecs variieren.
2. Kopiere `manifest.example.json` nach `manifest.json`.
3. Ersetze Dateiname, Titel, Interpret, Lizenz, Erlaubnisnotiz und Loop-Grenzen durch echte Angaben.
4. Der Loop umfasst genau eine vollständige Rezitation. Seine Länge muss innerhalb 50 ms mit `unit_ms / 1000` der passenden Phase übereinstimmen. Der Standard verwendet 8 Sekunden; das ist keine vorgeschriebene traditionelle Geschwindigkeit.
5. Hat die Aufnahme einen anderen Takt, passe `unit_ms` und `duration_ms = unit_ms × Wiederholungen` im Praxisprofil an und archiviere den alten Lauf. Nicht den Gesang künstlich beschleunigen.
6. Server neu starten. Eine fehlende Datei oder unvollständige Rechteangabe führt bewusst zu einem Konfigurationsfehler.

Der Browser mischt auf Wunsch bis zu drei zeitversetzte Abspielungen derselben Aufnahme. Das ist kein echter Chor verschiedener Sänger. Der Player verändert keine Tonhöhe. Saubere Loop-Schnittpunkte musst du im Audio selbst vorbereiten; es gibt keinen automatischen nahtlosen Schnitt.

Dateien werden erst auf Benutzeraktion geladen und abgespielt. Keine serverseitige Dauersynthese. TTS ist nur eine separat beschriftete Sprech-Demo mit vom Browser als lokal markierten Stimmen. Keine Garantie für tibetische Aussprache; keine tatsächliche Stimme wird geklont.

7. Einmalige Gebete (`audio_mode: "once"` im Praxisprofil): Die Aufnahme läuft einmal je Abschnittsdurchgang, pro Zyklus. Wer mitten im Abschnitt einsteigt, hört ab der aktuellen Stelle; ein bereits beendetes Gebet startet nicht erneut und der Kanal bleibt bis zum nächsten Abschnitt still. Für once-Aufnahmen beschreiben `loop_start_seconds`/`loop_end_seconds` den hörbaren Bereich (in der Regel die gesamte getrimmte Datei). Loops bleiben an `unit_ms` gebunden; once hat keinen Taktzwang.
