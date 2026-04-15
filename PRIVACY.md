# Noteful — Privacy Policy

**Last updated:** 2026-04-15

## Summary

Noteful stores your notes locally in your browser. No data is sent to any external server. There is no tracking, no analytics, and no telemetry.

## What data is processed?

Noteful only stores content that you create yourself:

- Note text
- Position, size, and color of each note
- URL of the page where a note was placed (used as the key so the note reappears on your next visit)
- Optional reminder timestamps
- Your settings (default color, font size, toggles)

## Where is data stored?

**By default:** locally in your browser via the `chrome.storage.local` API. The data never leaves your device.

**Optional (sync):** If you enable "Sync via Google account" in the settings, your notes are synchronized between your Chrome installations via the `chrome.storage.sync` API. This transfer and storage is handled directly by Google through your own Google account. The developer of Noteful has no access to this data at any point. See also the Google Privacy Policy: https://policies.google.com/privacy

## Is data shared with third parties?

**No.** Noteful does not send any data to external servers. There are no analytics, no tracking, no telemetry, and no advertising. The only optional external storage location is your own Google account via the sync feature mentioned above.

## Permissions and their purpose

| Permission | Purpose |
|---|---|
| `storage` | Save notes and settings in the browser |
| `activeTab` | Place notes on the URL of the current tab |
| `notifications` | Show reminders as Chrome notifications |
| `alarms` | Trigger reminders at the scheduled time |
| `host_permissions` (`http://*/*`, `https://*/*`) | Render notes as an overlay on any website |

## Your rights and control

- **Export:** Settings → "Export" downloads all your notes as a JSON file.
- **Import:** Settings → "Import" merges a JSON file with your existing notes.
- **Delete:** Settings → "Delete all notes" permanently removes every stored note.
- **Uninstall:** When you remove the extension, Chrome automatically deletes all locally stored data.

## Contact

For questions, bug reports, or feedback, please open a GitHub issue on the project repository.
