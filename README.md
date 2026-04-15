# Noteful

Sticky Notes auf jeder Website — verschiebbar, skalierbar, Markdown, Reminder, Sync.

Eine Chrome-Extension (Manifest V3), die Post-it-artige Notizen direkt als Overlay auf beliebige http(s)-Seiten legt. Ohne Account, ohne Tracking, komplett offline nutzbar.

## Features

- Notizen an beliebiger Position auf jeder Website platzieren
- Drag & Drop, frei skalierbar, 6 Farben
- Markdown-Rendering (fett, kursiv, Code, Listen, Überschriften, Links)
- Reminder mit echten Chrome-Benachrichtigungen
- Domain-weite Notizen (auf allen Seiten derselben Domain sichtbar)
- Auto-Anchor: Notiz folgt dem ausgewählten Text auch bei Layout-Änderungen
- Minimieren, Verstecken, Löschen mit 5-Sekunden-Undo
- Snap-to-Grid (optional)
- Export / Import als JSON (Backup oder Migration)
- Optionaler Sync zwischen Geräten via `chrome.storage.sync`
- Volltextsuche über alle Notizen im Popup
- Tastenkürzel: `Ctrl+Shift+E` (neue Notiz), `Ctrl+Shift+S` (alle ein/ausblenden)

## Installation (Entwicklung)

1. Repo klonen oder als ZIP laden
2. Chrome öffnen → `chrome://extensions`
3. Entwicklermodus oben rechts aktivieren
4. „Entpackte Erweiterung laden" → diesen Ordner auswählen

Die Extension erscheint in der Toolbar. Öffne eine beliebige http/https-Seite und klicke auf das Icon, um deine erste Notiz zu erstellen.

## Projektstruktur

```
manifest.json     Manifest V3 Konfiguration
background.js     Service Worker (Commands, Alarms, Notifications)
shared.js         Gemeinsame Helpers (Storage, Markdown, Farben)
content.js        Overlay-Logik auf der Zielseite
content.css       Styles für Notizen auf der Seite
popup.html/.js/.css    Toolbar-Popup (Neu, Suche, Alle-Liste)
options.html/.js/.css  Einstellungsseite (Export/Import, Sync, Farben)
icons/            PNG-Icons in 16/32/48/128
tools/gen_icons.py     Python-Skript zum Neubauen der Icons (optional)
```

## Icons neu bauen

Falls du die Icons anpassen willst:

```bash
cd tools
python gen_icons.py
```

Benötigt Python 3 mit `Pillow` (`pip install Pillow`).

## Datenschutz

Keine Server, kein Tracking, keine Analytics. Alle Daten liegen lokal im Browser (`chrome.storage.local`) oder optional in deinem Google-Konto (`chrome.storage.sync`, nur wenn du es aktivierst). Details in [PRIVACY.md](PRIVACY.md).

## Lizenz

[MIT](LICENSE)
