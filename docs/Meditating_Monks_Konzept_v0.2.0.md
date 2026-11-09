# Meditating Monks · A Continuous Offering
## Produkt- und Umsetzungskonzept 0.2.0

**Stand: 8. November 2026.** Dieses Dokument unterscheidet Entscheidungen, tatsächlich implementierte Funktionen und offene Abnahmen. Es ersetzt den Konzeptstand 0.1.0. Keine öffentliche Instanz oder GitHub-Veröffentlichung wird behauptet.

## 1. Das Projekt in einem Absatz

Meditating Monks ist ein selbst hostbarer, offener digitaler Meditationsraum. Stilisiert dargestellte Mönche durchlaufen kontinuierlich einen strukturierten Zyklus mit Ausrichtung, Niederwerfungen, symbolischen Darbringungen, Mantra-Rezitation, Stille und Widmung. Menschen können den Raum betrachten, geprüfte Aufnahmen anhören, selbst mitrezitieren oder auf ihrem eigenen Server einen weiteren Raum betreiben. Unabhängige Räume können sich freiwillig verbinden. Das Projekt ist dem Wohl und der Befreiung aller fühlenden Wesen gewidmet.

**Leitsatz:** Ein kontinuierlicher digitaler Raum des Mitgefühls, von Menschen geschaffen und gewidmet.

Die Bezeichnung „Monks“ ist eine künstlerische Darstellung, kein Ordinationsnachweis. Die Software beansprucht kein Bewusstsein oder eigene spirituelle Verwirklichung. Die Widmung ist die Intention der beteiligten Menschen, kein technisch verifiziertes Ergebnis. Die Analogie einer digitalen Gebetsmühle darf als moderne Metapher erklärt, aber nicht als autorisierte traditionelle Gleichsetzung ausgegeben werden.

## 2. Was Menschen hier tun können

**Besucher:** Ohne Anmeldung ankommen, einen Mönch auswählen, den aktuellen Abschnitt verstehen und bewusst Audio starten. Der Raum funktioniert auch stumm. Niemand muss einen Account anlegen, eine Mailadresse angeben oder einem öffentlichen Gruppenprofil beitreten.

**Mitrezitierende:** Eine persönliche Mala öffnen und selbst bestätigte Wiederholungen lokal zählen. Das ist eine Bedienhilfe, kein verifizierter Praxisnachweis. Digitale Ereignisse und menschliche Einträge bleiben getrennt. Der öffentliche Server erhält diese Einträge nicht.

**Betreiber:** Die Anwendung mit eigenem Namen und eigener Widmung auf einer Domain betreiben. Zunächst eigenständig. Nach explizitem Schlüsselaustausch können andere Räume verbunden werden. Eine private Installation muss nicht entdeckt oder registriert werden.

**Mitwirkende:** Code, Barrierefreiheit, Übersetzungen, Ausspracheprüfungen oder berechtigt veröffentlichbare Aufnahmen beitragen. Eine technische Pull-Request-Freigabe ersetzt keine inhaltliche oder rechtliche Abnahme.

## 3. Drei Ebenen, drei verschiedene Aussagen

| Ebene | Was tatsächlich passiert | Was nicht behauptet wird |
|---|---|---|
| Serverablauf | Ein Scheduler führt logische Zustände und beobachtete aktive Zeit fort | Hunderte bewusste Praktizierende oder eigenständige KI-Meditation |
| Darstellung und Klang | Figuren animieren Abschnitte; freigegebene Dateien werden auf Zuhören abgespielt | Dass ohne Zuhörer fortlaufend Audio produziert wird |
| Menschliche Beteiligung | Menschen widmen den Raum, hören zu und können selbst praktizieren | Ein automatischer Ersatz für Praxis, Unterweisung oder Übertragung |

Ein Audioclip ist kein menschliches Lebewesen; eine gültige Serversignatur ist kein Nachweis der Wahrheit seiner Zähler. Ein technischer Freigabestatus ist keine religiöse Autorisierung.

## 4. Die Praxisstruktur

### 4.1 Ausführbarer öffentlicher Zyklus

Phasen und Zeiten bleiben erhalten. Das neue englische Standardprofil ist eine eigene Datei; beim Wechsel wird ein neuer Lauf angelegt, statt die alte Zählgeschichte umzuschreiben:

Ankommen → vier Gedanken → Zuflucht mit stilisierten Niederwerfungen → Bodhicitta → sieben Glieder → Mani-Rezitation → stilles Verweilen → abschließende Widmung.

Die sieben Glieder sind in sieben einzelne technische Phasen gegliedert. Insgesamt sind es 14 Phasen. Die Grundfassung dauert 28:13 Minuten. Die Mani-Phase umfasst 108 digitale Einheiten à acht Sekunden. Die Zeiten und Wiederholungen sind technische Gestaltungsentscheidungen, keine vorgeschriebenen traditionellen Übungsdauern.

Der öffentliche Ablauf ist eine moderne, tibetisch-buddhistisch inspirierte Komposition. Er ist nicht als vollständiges Ngöndro oder als überlieferte Sādhana zu bezeichnen. Die englischen Begleittexte sind eigene redaktionelle Texte, nicht wörtliche Übersetzungen des gerade hörbaren tibetischen Gebets.

### 4.2 Konkrete Unstimmigkeiten im Vertonungsplan sind aufgelöst

Die Aufnahme „Zuflucht und Bodhicitta“ enthält einen zusammengehörigen Vierzeiler. Sie wird nicht in zwei unvollständige Gebete zerlegt. Sie kann als vollständige Aufnahme im Zufluchtsabschnitt verwendet werden; der anschließende Bodhicitta-Abschnitt bleibt eine eigenständige Reflexion.

**Vier Gedanken und vier Unermessliche werden nicht verwechselt.** Die vier Gedanken bleiben vier Reflexionen mit jeweils eigener englischer Aufnahme. Die vier Unermesslichen werden im Import vorerst ohne Phasenbindung geführt. Für sie braucht es eine eigens benannte, geprüfte Erweiterung des Profils; sie ersetzen nicht automatisch die Gedanken oder einen anders beschrifteten Bodhicitta-Text.

Die optionale Mandala-Aufnahme bleibt ebenfalls ohne automatische Phasenbindung. Sie darf nicht als zufällig eingefügter Zusatz einer angeblich vollständigen Linienliturgie erscheinen. Das Darbringungsglied des vorhandenen öffentlichen Profils bleibt davon getrennt.

Die Widmung aus den sieben Gliedern kann im modernen Projektablauf als eine Datei an zwei Stellen verwendet werden. Das ist eine redaktionelle Projektentscheidung, keine Behauptung über jede traditionelle Praxisfassung.

### 4.3 Linienbezogene Erweiterung

Die Longchen-Nyingtik-Datei bleibt `outline-only`. Als Strukturreferenz dient Jamyang Khyentse Wangpos *Illuminating the Excellent Path to Omniscience: Notes on the Longchen Nyingtik Ngöndro* [S1]. Eine konkrete vollständige Fassung, deren Zugangsbedingungen, Texte, Aussprache, Darstellungen und Rechte müssen gemeinsam geprüft werden. Insbesondere werden Vajrasattva, Kusāli/Chöd und Guru-Yoga nicht durch improvisierte Mantra-Listen ersetzt.

Ein `reviewed_by`-Eintrag im Code ist nur eine dokumentierte Angabe. Er beweist keine Qualifikation, Übertragung oder Zustimmung einer Linie. Ein nichtöffentliches Praxisprofil darf nicht über eine öffentlich erreichbare Bootstrap-API oder `/source` ausgeliefert werden. Der gegenwärtige Server ist kein Zugangssystem für geschützte Inhalte.

### 4.4 Sprache und Vertonung

Alle gesprochenen redaktionellen Texte sind Englisch. Die 15 Aufnahmetexte, das Standardprofil und der WAV-Import sind aufeinander abgestimmt. Tibetische Gebete und Sanskrit-Mantras werden nicht ins Englische umgedeutet. Die Bedienoberfläche bleibt vorerst überwiegend Deutsch. Das bisherige deutsche Profil dient nur der Bestandserhaltung; der bewusste Wechsel zum englischen Profil archiviert den alten Lauf.

## 5. Das Nutzungserlebnis

Der Einstieg bleibt ruhig: Raumname, Widmung, aktuelle Szene. Kein Autoplay, keine Pop-ups mit Nutzerkonto und kein überdimensionaler Gesamtzähler. Das erste sinnvolle Handeln ist „Zuhören“ oder „Meine Mala öffnen“.

Die Einzelansicht zeigt Abschnitt, verbleibende Zeit, eine stilisierte Körperhaltung und den redaktionellen Begleittext. Der Text wird nicht als wortgetreues Transkript einer importierten Aufnahme ausgegeben. Ein späteres genehmigtes Textpaket kann diese Ebene ersetzen; bis dahin ist die Unterscheidung sichtbar zu halten.

**Zuhören:** Die Wiedergabe steigt an der aktuellen Position des gewählten Mönchs ein. Ein bereits beendetes einmaliges Gebet wird nicht für jeden Besucher neu gestartet. Danach ist es bis zum nächsten Abschnitt still. Das ist Teil des laufenden Raums, kein Fehler. Ein separater Modus „Gebet von Anfang an anhören“ ist eine spätere Funktion, keine versteckte Änderung der Serverzeit.

**Audiokanal:** Rezitation oder englische Begleitung. Kein gleichzeitiger Erzähler über dem Mantra. Im Begleitkanal gibt es keinen Chor. Für einen Abschnitt ohne passende Aufnahme bleibt der Kanal still; ein fehlender tibetischer Track wird nicht automatisch durch Computer-TTS ersetzt.

**Ritualraum und Chor:** 108 feste Sitzplätze in neun Reihen, von schräg oben betrachtet, mit Mittelgang, Altarbereich und zuschaltbaren Sprechblasen. Der ausgewählte Mönch ist die klare Hauptstimme; die bis zu 107 übrigen Quellen werden gemeinsam sehr leise unterlegt und räumlich nach Sitzposition verteilt. Ein separater Regler steuert den Hintergrund. Eine ausdrücklich wählbare Sparstufe verwendet zwölf reale Figuren; die Erzählerstimme bleibt immer einzeln. Aufnahmevarianten werden deterministisch zugeordnet, nicht durch heimliche Tonhöhenänderung erzeugt. 108 Quellen bedeuten keine 108 unterschiedlichen Aufnahmen. Siehe `RITUAL_ROOM.de.md`.

**Mobil und barrierearm:** Bestehende responsive Darstellung, Tastaturbedienung, Dialogschließen mit Escape und reduzierte Bewegung bleiben erhalten. Hörbare Audioausgabe ist nie Voraussetzung, um den Ablauf zu verstehen. Echte Screenreader- und iOS/Android-Prüfungen sind noch ausstehend.

## 6. Individueller Raum und gemeinsamer Gesang

### Implementierter Modus: gemeinsamer Ablauf mit kleinen Versätzen

Alle Figuren folgen demselben Profil mit stabilen Startversätzen zwischen null und standardmäßig 1.200 Millisekunden. Sie rezitieren gemeinsam; nur im schmalen Übergangskorridor können benachbarte Phasen zugleich sichtbar werden. Unterschiedliche Tempi würden über viele Zyklen auseinanderlaufen und werden deshalb nicht benutzt. Die natürliche Wirkung entsteht durch feste individuelle Versätze und kleine visuelle Bewegungsunterschiede. Der ursprüngliche verteilte Modus bleibt ausdrücklich konfigurierbar, ist aber nicht mehr Standard.

Instanzen laufen weiterhin unabhängig. Ein gemeinsamer Ablauf innerhalb eines Raums ist nicht dasselbe wie eine weltweit zeitgleiche Session. Mehr als 108 Figuren werden auf weitere Räume aufgeteilt; nur der sichtbare, gewählte Raum wird gemischt.

### Spezifizierter späterer Modus: gemeinsame Session

Für wirklich gleichzeitige Praxis wird eine gesonderte Session benötigt: unveränderliche Session-ID, Profil-Hash, Aufnahme-/Tempo-Hash, UTC-Startzeit, Endzeit und explizite Teilnahme. Alle Beteiligten müssen dieselbe kompatible Fassung verwenden. Netzwerklatenz darf nicht als zusätzliche Rezitation gezählt werden. Ein spät beigetretener Knoten erhält keine Vorgeschichte gutgeschrieben.

Dabei sind Synchronisationszeit und beobachtete aktive Ausführungszeit getrennt. Eine globale Uhr kann die momentane Position vorgeben, aber keinen Serverausfall rückwirkend in Praxis verwandeln. Bei Ausfall des Veranstalters können bereits bestätigte Sessions lokal weiterlaufen; ein späterer Neustart beginnt mit dokumentierter Lücke. Noch nicht implementiert.

Der bestehende Austausch von Statusmeldungen ist ausdrücklich **kein weltweiter Live-Audiochor**. Er verrät nicht die individuelle Position aller entfernten Mönche und lädt keine fremden Aufnahmen nach.

## 7. Audio als unabhängig prüfbares Paket

Neue Manifeste benutzen Schema 2. Pro Aufnahme werden Datei, Hash, Stimmkennung, Sprache, Titel, Attribution, Lizenzangabe, Herkunft, synthetischer Status, Clip-Grenzen, Abspielmodus und Phasenbindung festgehalten.

Private Prüferangaben und Rechtebelege bleiben lokal. Öffentlich werden nur die für Darstellung und Attribution vorgesehenen Felder ausgeliefert. Entwürfe können unvollständig sein und ohne vorhandene Datei existieren; sie sind nicht über `/media` erreichbar.

Vor einer Veröffentlichung verlangt Schema 2 eine positive Rechteentscheidung, eine Ausspracheentscheidung, Prüferangabe, Belegreferenz, SHA-256 und gültige Phasenbindungen. Für Mantra-Loops muss zusätzlich bestätigt werden, dass der markierte Bereich genau **eine vollständige Rezitation** enthält. Das System prüft die Angaben und Dateiidentität, nicht deren inhaltliche Wahrheit.

Die Grundtrennung `once` und `loop` verhindert, dass ein Gebet zur Dauerschleife oder eine ganze Aufnahme mit drei Mantras zu einer einzigen gezählten Einheit wird. Gültige Clip-Grenzen müssen zur tatsächlichen WAV-Dauer passen. Ein zu langer einmaliger Clip wird nicht automatisch abgeschnitten. Ein schnellerer oder langsamerer Mantra-Track wird nicht ohne ausdrückliche Profiländerung übernommen.

Version-1-Manifeste bleiben aus Kompatibilitätsgründen lesbar. Sie umgehen die neuen inhaltlichen Prüffelder nicht unbemerkt: `doctor` kennzeichnet sie als alte, nur deklarativ abgesicherte Kataloge. Für neue öffentliche Audioinstallationen ist Schema 2 vorgesehen.

## 8. Aufnahmeproduktion ohne unnötige Credits

Die erste freizugebende Einheit ist eine sauber geprüfte Mani-Rezitation mit einer Stimme. Danach folgen die kurzen Gebete, danach längere Darbringungen. Englische Begleitung und zusätzliche Stimmen sind optional. Niemand muss 108 Wiederholungen produzieren.

ElevenLabs ist ein Produktionswerkzeug, keine notwendige Laufzeitabhängigkeit. Der Betreiber benötigt für den fertigen Raum keinen ElevenLabs-API-Key. Eine andere berechtigt nutzbare Aufnahme funktioniert ebenso.

Ein kommerzieller Nutzungsrahmen des Anbieters bedeutet nicht automatisch, dass Quelltexte, Stimmen, unveränderte WAV-Dateien und alle Weiterverwendungsrechte frei unter einer neuen Lizenz verteilt werden dürfen. Die aktuellen Anbieterbedingungen und die konkrete Stimme müssen getrennt geprüft werden [S3, S4]. Synthetische Herkunft wird nicht als echte Klosteraufnahme ausgegeben.

Der technische Import prüft WAV-Dateien und erzeugt nur Entwürfe. Keine Stimme wird automatisch fachlich oder rechtlich freigegeben. Rohmaterial und genehmigte Loop-Schnittpunkte bleiben getrennt dokumentiert.

## 9. Zähler, Geschichte und Nachhaltigkeit

Drei Dinge werden nicht vermengt: digitale Mantra-Ereignisse, digitale Körperanimationen und vom Menschen bestätigte Mala-Eingaben. Die Software berechnet kein spirituelles Verdienst und keine Zahl „befreiter Wesen“.

Die bestehenden Zähler berücksichtigen aktive Schedulerzeit, keine Server-Ausfallzeiten. Der konservative Heartbeat begrenzt Anrechnung bei blockierter Eventloop. Ein Stromausfall kann den zuletzt noch nicht gespeicherten Bruchteil verlieren; er erzeugt keine Nachzählung. Große Upgrades an Profil oder Figurenzahl beginnen einen neuen Lauf und archivieren den alten.

Die wesentliche Skalierungsentscheidung ist nicht „mehr Rechner für mehr Verdienst“, sondern ein gemeinsamer effizienter Scheduler. Kein LLM pro Mönch, keine VM pro Mönch und keine serverseitige Dauersynthese. Ein neuer Server ist sinnvoll für unabhängige Betreiber, nicht als Leistungswettbewerb.

## 10. Föderation ohne überzogene Vertrauensbehauptungen

Der Kern funktioniert ohne Netzwerkverzeichnis. Die Föderation bleibt ausgeschaltet, bis ein Betreiber sie aktiviert und öffentliche Schlüssel bekannter Gegenstellen einträgt. Eingehende Meldungen lösen keine beliebigen ausgehenden Anfragen aus. Entfernte Angaben werden als Text, nicht als ausführbares HTML behandelt.

Es gibt signierte, kurzlebige Statusmeldungen, monoton steigende Sequenzen und Replay-Abwehr. Eine Signatur bestätigt die Herkunft der Selbstauskunft. Sie beweist weder reale CPU-Arbeit noch korrektes Verhalten des Gegenservers. Auch ein ehrlicher Server kann eine falsche Konfiguration haben.

Die aktuelle Ansicht zeigt nur die lokal vertrauten Räume, keine globale Netzwerkgröße. Das Limit liegt bei 32 konfigurierten Peers pro Instanz. Eine spätere öffentliche Liste wäre ein separat moderiertes Verzeichnis, kein Voraussetzungsknoten des Protokolls. Schlüsselrotation und eine öffentliche Directory-Verwaltung sind noch nicht implementiert.

## 11. Datenschutz und öffentliche Beteiligung

Keine Konten, keine Kontaktlisten, keine öffentliche Bitte-um-Gebet-Wand und keine automatisch gespeicherten freien Widmungstexte von Besuchern im Pilot. Damit vermeidet das Produkt unnötige öffentliche Personen- und Gesundheitsangaben. Der persönliche Mala-Zähler bleibt im lokalen Browser-Speicher.

Daraus folgt kein pauschales Compliance-Siegel. Ein Domainbetreiber muss tatsächliches Hosting, IP-Verarbeitung, Logs, Kontaktangaben und gegebenenfalls rechtliche Pflichtinformationen dokumentieren. Die vorbereitete Betriebscheckliste enthält keine erfundene Anbieteradresse und keine behauptete Rechtsberatung.

Ein Besucher lädt im Standardbetrieb keine TTS-API von ElevenLabs; Audios kommen aus dem lokalen Medienkatalog. Externe Quellen werden erst beim bewussten Öffnen ihrer Links besucht. Der tatsächliche Betreiber muss eigene Ergänzungen und Reverse-Proxy-Einstellungen mitprüfen.

## 12. Lizenzierung und Projektführung

Der vorhandene Code bleibt unter AGPL-3.0-only. Die Projektabsicht kann nichtkommerziell sein; die Code-Lizenz wird dadurch nicht zu einer Noncommercial-Lizenz. Abschnitt 13 betrifft bei modifizierter netzwerkfähiger Software das Quellcodeangebot für interagierende Nutzer [S6]. Der vorhandene `/source`-Download basiert auf einer expliziten Dateiliste; bei eigenen Codeänderungen muss diese mitgepflegt werden.

Texte und Audio werden gesondert behandelt. Lotsawa House weist CC BY-NC 4.0 aus [S5]. Solche Inhalte werden nicht pauschal als eigene AGPL-Texte ausgegeben. Der bereitgestellte Quellcode enthält keine neu heruntergeladenen vollständigen Liturgien oder ElevenLabs-Audios. Das frühere Vertonungspaket ist ein Arbeitsmaterial mit eigenem Quellen-/Rechtehinweis, kein automatisch freigegebenes Public-Release-Paket.

Geplante Rollen: technische Maintainer, benannte Inhaltsprüfer, Ausspracheprüfer und eigenverantwortliche Node-Betreiber. Es wird keine nicht vorhandene Lehrpersonenpartnerschaft erfunden. Fehler in Text oder Aussprache müssen genauso meldbar und korrigierbar sein wie Programmfehler. Die Vorlagen für Meldungen und Abnahmen liegen im Repository.

## 13. Betrieb und Wiederherstellung

Der Prozess bleibt ein Single Writer mit SQLite. Genau ein Worker darf denselben Datenordner fortschreiben. Audiofiles werden als private Entwürfe vorbereitet und erst nach Prüfung im Medienordner freigegeben. Betriebsdaten, private Schlüssel, Belege und unveröffentlichte Rohdateien gehören nicht in Git.

Ein konsistentes Datenbankbackup wird über die SQLite-Backupfunktion erstellt; eine unkoordinierte Kopie einer laufenden WAL-Datenbank ist nicht der vorgesehene Weg [S7]. Die Wiederherstellung wird zunächst mit neuer Identität und deaktivierter Föderation geprobt. Ein alter Datenbankstand kann ältere Sequenzstände enthalten; die Wiederverwendung derselben Netzwerkidentität erfordert gesonderte Abstimmung, nicht blindes Klonen.

Docker, Caddy, Domainbetrieb und GitHub-CI sind vorbereitet, aber in dieser Umgebung nicht als öffentliche Installation verifiziert. Das aktuelle lokale Zwei-Server-Szenario testet echte HTTP-Prozesse mit durch das Testskript weitergereichten signierten Meldungen. Es testet nicht die automatische HTTPS-Verbindung über das Internet.

## 14. Was bewusst nicht in den Pilot kommt

Keine Mikrotransaktionen für „mehr Verdienst“, keine bezahlte Befreiungszusage, keine Rangliste, keine NFTs, kein Blockchain-Nachweis, kein KI-Lama-Chat, kein ungeprüfter Upload öffentlicher Praxisprofile und keine automatische Aufnahme fremder Server in ein Vertrauensnetz.

Später sinnvoll: geprüfte alternative Praxispakete, ausdrücklich gestartete gemeinsame Sessions, barrierearme Textansicht, persönliche Sitzungen von Anfang an, nachvollziehbare Schlüsselrotation und optional ein echter serverseitiger Audiostream. Das sind separate Features mit eigenen Abnahmekriterien, keine Voraussetzung für die erste Mani-Instanz.

## 15. Reihenfolge bis zum Pilot

**Jetzt möglich:** Quellcode ausführen, Oberfläche nutzen, Abläufe beobachten, manuelle Mala verwenden, Audioentwürfe vorbereiten und Timingvorschläge prüfen.

**Nächste inhaltliche Freigabe:** Eine Mani-Aufnahme mit korrekten Silben, nachvollziehbarer Herkunft, dokumentierten Verwendungsrechten und vollständigem Loop.

**Nächste technische Freigabe:** Ziel-VPS/Dockerimage, HTTPS, Backup/Restore dort, reale Mobilgeräte und Inhaltsprüfung der veröffentlichten Seite. Erst dann sollte eine öffentliche Pilotdomain verlinkt werden.

**Danach:** Zweite reale HTTPS-Instanz, gegenseitiger Schlüsselaustausch, Ausfälle und Wiederanlauf. Erst danach ein öffentliches Instanzverzeichnis oder gemeinsame synchronisierte Sessions angehen.

Das Produktziel für den ersten Pilot lautet: Ein ruhiger, nachvollziehbarer Raum mit einem tatsächlich brauchbaren Mantra-Loop. Nicht möglichst viele Features oder möglichst große automatische Zahlen.

## Quellen

[S1] Jamyang Khyentse Wangpo: *Illuminating the Excellent Path to Omniscience: Notes on the Longchen Nyingtik Ngöndro*, besonders die außerordentlichen Vorübungen und das siebengliedrige Gebet im Guru-Yoga. https://www.lotsawahouse.org/tibetan-masters/jamyang-khyentse-wangpo/illuminating-excellent-path

[S2] Office of the Dalai Lama: *Joining the Mani Dhungdrub*, 11. Mai 2024. Öffentliche Mani-Rezitation; ausdrückliche Betonung von Bodhicitta und Leerheit statt bloßer mechanischer Wiederholung. https://www.dalailama.com/news/2024/joining-the-mani-dhungdrub-the-recitation-of-om-mani-padme-hung

[S3] ElevenLabs, *Terms of Service (EEA)*, angegebener Stand 9. Oktober 2026. https://elevenlabs.io/terms-of-use-eu

[S4] ElevenLabs, *Kann ich die Inhalte, die ich auf der Plattform generiere, veröffentlichen?* https://elevenlabs.io/docs/de/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform

[S5] Lotsawa House, *Terms of Service*, Abschnitt Electronic Distribution Rights. https://www.lotsawahouse.org/about/terms

[S6] Free Software Foundation, *Frequently Asked Questions about the GNU Licenses*, AGPL-Fragen. https://www.gnu.org/licenses/gpl-faq.html

[S7] SQLite, *Using the SQLite Online Backup API*. https://www.sqlite.org/backup.html

[S8] MDN, *AudioBufferSourceNode: start()*, Loop-Parameter und zeitgesteuerte Wiedergabe. https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start

Webquellen am 8. November 2026 geprüft. Quellen belegen ihre jeweiligen Aussagen, nicht eine Zustimmung zum Projekt oder die Qualität seiner Aufnahmen.
