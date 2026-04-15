# Noteful

Sticky notes on any website — draggable, resizable, Markdown, reminders, sync.

A Chrome extension (Manifest V3) that overlays Post-it-style notes on any http(s) page. No account, no tracking, fully usable offline.

## Features

- Place notes at any position on any website
- Drag & drop, freely resizable, 6 colors
- Markdown rendering (bold, italic, code, lists, headings, links)
- Reminders with native Chrome notifications
- Domain-wide notes (visible on every page of the same domain)
- Auto-anchor: notes follow the selected text even when the layout changes
- Minimize, hide, or delete with 5-second undo
- Snap-to-grid (optional)
- JSON export / import (backup or migration)
- Optional sync between devices via `chrome.storage.sync`
- Full-text search across all notes from the popup
- Keyboard shortcuts: `Ctrl+Shift+E` (new note), `Ctrl+Shift+S` (show/hide all)

## Installation (development)

1. Clone or download this repo as a ZIP
2. Open Chrome → `chrome://extensions`
3. Enable Developer mode (top right)
4. Click "Load unpacked" and select this folder

The extension appears in the toolbar. Open any http/https page and click the icon to create your first note.

## Project structure

```
manifest.json          Manifest V3 configuration
background.js          Service worker (commands, alarms, notifications)
shared.js              Shared helpers (storage, Markdown, colors)
content.js             Overlay logic on target pages
content.css            Styles for notes on the page
popup.html/.js/.css    Toolbar popup (new, search, list)
options.html/.js/.css  Settings page (export/import, sync, colors)
icons/                 PNG icons in 16/32/48/128
tools/gen_icons.py     Python script to rebuild icons (optional)
```

## Rebuilding icons

If you want to tweak the icons:

```bash
cd tools
python gen_icons.py
```

Requires Python 3 with `Pillow` (`pip install Pillow`).

## Privacy

No servers, no tracking, no analytics. All data lives locally in your browser (`chrome.storage.local`) or optionally in your own Google account (`chrome.storage.sync`, only when you enable it). See [PRIVACY.md](PRIVACY.md) for details.

## License

[MIT](LICENSE)
