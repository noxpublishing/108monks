# Freiwillige Föderation

## Status

Implementiert: Schlüsselgenerierung, signierte Eigenmeldung, begrenzte Ingress-API, lokale Vertrauensliste, Ablauf-/Replay-Prüfung, Persistenz, regelmäßiges Pushen und Anzeige empfangener Meldungen. Die eingehende Protokollstrecke wurde lokal automatisiert getestet. Zwei öffentliche VPS inklusive DNS, TLS und ausgehender Zustellung wurden hier nicht live verbunden.

## Einrichtung

Beide Betreiber benötigen einen HTTPS-Origin. Schlüssel abrufen:

```bash
python -m app.cli identity
# Oder im laufenden Container:
docker compose exec monastery python -m app.cli identity
```

Nur `public_key` austauschen, niemals `identity.ed25519`. Öffentliche Schlüssel über einen unabhängigen Kanal bestätigen. In beiden `config/node.json`:

```json
{
  "name": "Mein Raum",
  "dedication": "Dem Wohl aller Wesen gewidmet.",
  "monks": 108,
  "profile": "public-compassion.json",
  "federation_enabled": true,
  "public_origin": "https://meine-echte-domain.example",
  "audio_manifest": "manifest.json"
}
```

`config/peers.json` enthält die jeweils andere Seite:

```json
[
  {
    "origin": "https://echte-domain-des-anderen-raums.example",
    "public_key": "HIER_DEN_TATSAECHLICHEN_BASE64_SCHLUESSEL_EINTRAGEN",
    "label": "Name des anderen Raums"
  }
]
```

Die Platzhalter sind absichtlich keine funktionierenden Gegenstellen. Der tatsächliche Base64-Schlüssel ist 44 Zeichen lang. Danach beide Dienste neu starten. Änderungen an den Peer-Einstellungen benötigen keinen neuen Praxislauf.

## Protokoll

Alle 30 Sekunden wird eine neue Eigenmeldung an maximal 32 lokal konfigurierte Gegenstellen geschickt. Vier ausgehende Übertragungen dürfen gleichzeitig stattfinden. Die signierte Meldung gilt höchstens 90 Sekunden. Keine Weiterleitung von Meldungen Dritter, kein automatischer transitiver Vertrauensaufbau.

Signatur: Ed25519 über `meditating-monks.beacon.v1\0` plus UTF-8-JSON mit sortierten Schlüsseln, ohne zusätzliche Leerzeichen und ohne ASCII-Escaping. Das ist ein projektspezifisches Format, keine behauptete RFC-8785-Implementierung. Das feste Schema verwendet für die numerischen Felder Ganzzahlen.

Sequenzen steigen persistent. Die Empfangsseite speichert pro Schlüssel den höchsten Wert und lehnt Wiederholungen sowie ältere Sequenzen ab. Schlüssel, Knoten-ID und konfigurierter Origin müssen zusammenpassen. Zukünftige Zeitstempel über der Toleranz und abgelaufene Meldungen werden verworfen. Beide Hosts sollten korrekte Systemzeit haben.

Ein Datenbank-Rollback kann die ausgehende Sequenz zurücksetzen. Gegenstellen lehnen dann ältere Werte ab. Für v0.1 gibt es keinen automatischen Recovery-/Key-Rotation-Handshake; dieses Ereignis muss der Betreiber bewusst beheben. Nicht blind die Replay-Daten löschen.

## Netzwerksicherheit

Eingehende Meldungen enthalten keine auszuführenden Texte, Skripte oder nachzuladenden URLs. Der Empfang löst keinen HTTP-Fetch aus. Die Nachricht ist auf 16 KiB begrenzt, es gibt ein globales Ingress-Budget.

Ausgehende Origins sind lokale Administratorkonfiguration. Nur HTTPS ohne Anmeldedaten, Pfad, Query oder Fragment. DNS-Adressen werden vor der Verbindung auf öffentlich routbare Ziele geprüft; gemischte private/öffentliche Antworten werden abgelehnt. Der Transport verbindet mit der geprüften numerischen Adresse und validiert TLS gegen den ursprünglichen Hostnamen. Keine Redirects und keine automatisch übernommenen Proxy-Umgebungsvariablen.

Das reduziert typische SSRF- und Rebinding-Risiken. Es ist keine unabhängige Sicherheitszertifizierung. DDoS-Abwehr, Infrastrukturhärtung, Schlüsselverlust und missbräuchliche aber korrekt signierte Selbstauskünfte bleiben eigene Betriebsfragen.

## Interpretation

„Online“ bedeutet: Es liegt eine noch frische akzeptierte Meldung vor. Es bedeutet nicht: Ein Server hat nachweisbar jeden Schritt korrekt ausgeführt. Zahlen bleiben Selbstauskünfte. Persönliche Mala-Zähler werden nicht übertragen. Kein weltweiter Gesamtzähler und keine zentrale Registrierung sind enthalten.
