# Changelog

All notable changes to **Noteful** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-15

Initial public release. Submitted to the Chrome Web Store.

### Added

**Notes on the page**
- Sticky-note overlay on any `http(s)` page
- Drag, resize, and choose from 6 colors (yellow, pink, green, blue, orange, purple)
- Minimize, hide, or delete a note with 5-second undo
- Snap-to-grid positioning (optional)
- Smart anchoring: notes follow the selected text even when the page layout changes
- Domain-wide notes that appear on every page of the same origin

**Editing**
- Inline plain-text editor with debounced auto-save
- Optional Markdown rendering: bold, italic, inline code, code blocks, lists, headings, links
- Click to edit, click outside to render

**Reminders**
- Set a future date/time on any note
- Native Chrome notifications fired by `chrome.alarms`
- Reminders survive browser restarts

**Popup (toolbar)**
- List of notes for the current page with eye-toggle, delete with undo
- Show all / Hide all buttons
- Full-text search across all notes from any page
- "Open page" button to jump to the source URL of a search hit
- Quick access to settings

**Settings page**
- Confirm-before-delete toggle
- Sync via Google account toggle (`chrome.storage.sync`)
- Snap-to-grid toggle
- Markdown rendering toggle
- Default color picker for new notes
- Font-size slider for notes
- JSON export and import (backup and migration)
- Delete-all-notes button

**Storage and sync**
- All data stored locally by default (`chrome.storage.local`)
- Optional cross-device sync via `chrome.storage.sync` with merge on enable
- Migration of legacy storage keys at install/update

**Keyboard shortcuts**
- `Ctrl+Shift+E` (`Cmd+Shift+E` on macOS) — create a new note
- `Ctrl+Shift+S` (`Cmd+Shift+S` on macOS) — show or hide all notes on the current page

**Project**
- MIT license
- Privacy policy hosted on GitHub Pages
- English UI, English documentation, German chat support
- README with embedded screenshots
- `tools/build-zip.sh` build script that produces a Chrome Web Store-compatible ZIP using Python's `zipfile` (forward-slash paths)

### Security

- No remote code: no `eval`, no `new Function`, no remote `<script src>`, no dynamic `import()`
- Content script runs locally only — does not contact any server

[1.0.0]: https://github.com/restless-powerboost/noteful/releases/tag/v1.0.0
