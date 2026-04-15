# Noteful — Datenschutzerklärung

**Letzte Aktualisierung:** 2026-04-15

## Kurzfassung

Noteful speichert deine Notizen lokal in deinem Browser. Es werden keine Daten an externe Server gesendet. Es gibt kein Tracking, keine Analytics, keine Telemetrie.

## Welche Daten werden verarbeitet?

Noteful speichert ausschließlich die Inhalte, die du selbst erstellst:

- Notiz-Text
- Position, Größe und Farbe der Notizen
- URL der Seite, auf der eine Notiz platziert wurde (als Schlüssel, damit sie beim nächsten Besuch wieder erscheint)
- Optional gesetzte Reminder-Zeitpunkte
- Deine Einstellungen (Standardfarbe, Schriftgröße, Toggles)

## Wo werden Daten gespeichert?

**Standardmäßig:** lokal in deinem Browser über die `chrome.storage.local` API. Die Daten verlassen deinen Rechner nicht.

**Optional (Sync):** Wenn du in den Einstellungen „Sync über Google-Konto" aktivierst, werden deine Notizen über die `chrome.storage.sync` API zwischen deinen Chrome-Installationen synchronisiert. Die Übertragung und Speicherung erfolgt dabei direkt durch Google über dein eigenes Google-Konto. Der Entwickler von Noteful hat zu keinem Zeitpunkt Zugriff auf diese Daten. Siehe auch die Google-Datenschutzerklärung: https://policies.google.com/privacy

## Werden Daten an Dritte weitergegeben?

**Nein.** Noteful sendet keine Daten an externe Server. Es gibt keine Analytics, kein Tracking, keine Telemetrie, keine Werbung. Der einzige optionale externe Speicherort ist dein eigenes Google-Konto über die oben genannte Sync-Funktion.

## Berechtigungen und ihr Zweck

| Berechtigung | Zweck |
|---|---|
| `storage` | Notizen und Einstellungen im Browser speichern |
| `activeTab` | Notizen auf der aktuellen Tab-URL platzieren |
| `notifications` | Reminder als Chrome-Benachrichtigung anzeigen |
| `alarms` | Reminder zur geplanten Zeit auslösen |
| `host_permissions` (`http://*/*`, `https://*/*`) | Notizen als Overlay auf beliebigen Websites einblenden |

## Deine Rechte und Kontrolle

- **Export:** Einstellungen → „Exportieren" lädt alle Notizen als JSON-Datei.
- **Import:** Einstellungen → „Importieren" führt eine JSON-Datei mit bestehenden Notizen zusammen.
- **Löschen:** Einstellungen → „Alle Notizen löschen" entfernt sämtliche gespeicherten Notizen unwiderruflich.
- **Deinstallation:** Beim Entfernen der Erweiterung werden alle lokal gespeicherten Daten automatisch durch Chrome gelöscht.

## Kontakt

Fragen, Bug-Reports oder Feedback bitte als GitHub Issue im Projekt-Repository eröffnen.
