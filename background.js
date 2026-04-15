const STORAGE_KEY = 'notes';
const SETTINGS_KEY = 'settings';
const ALARM_PREFIX = 'qn-reminder-';

function notesArea(syncEnabled) {
  return syncEnabled ? chrome.storage.sync : chrome.storage.local;
}

async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return data[SETTINGS_KEY] || {};
}

async function getAllNotes() {
  const settings = await getSettings();
  const area = notesArea(!!settings.syncEnabled);
  const data = await area.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {};
}

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  try {
    const url = new URL(tab.url || '');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  } catch {
    return;
  }
  const msg =
    command === 'create-note' ? { type: 'createNote' } :
    command === 'toggle-all' ? { type: 'toggleAll' } :
    null;
  if (!msg) return;
  try {
    await chrome.tabs.sendMessage(tab.id, msg);
  } catch (e) {
    console.warn('Noteful command failed:', e);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const noteId = alarm.name.slice(ALARM_PREFIX.length);

  const all = await getAllNotes();
  let foundNote = null;
  let foundKey = null;
  for (const key of Object.keys(all)) {
    const arr = all[key] || [];
    const n = arr.find(x => x.id === noteId);
    if (n) {
      foundNote = n;
      foundKey = key;
      break;
    }
  }
  if (!foundNote) return;

  const title = 'Noteful reminder';
  const body = (foundNote.text || '(empty note)').slice(0, 200);
  try {
    await chrome.notifications.create('qn-' + noteId + '-' + Date.now(), {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title,
      message: body,
      contextMessage: foundKey || '',
      priority: 2,
    });
  } catch (e) {
    console.error('Noteful notification error:', e);
  }

  try {
    const settings = await getSettings();
    const area = notesArea(!!settings.syncEnabled);
    const data = await area.get(STORAGE_KEY);
    const allNow = data[STORAGE_KEY] || {};
    const arr = allNow[foundKey] || [];
    const idx = arr.findIndex(x => x.id === noteId);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], reminderAt: null };
      allNow[foundKey] = arr;
      await area.set({ [STORAGE_KEY]: allNow });
    }
  } catch (e) {
    console.warn('Noteful reminder clear failed:', e);
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  chrome.notifications.clear(notifId);
});

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      const all = await getAllNotes();
      const now = Date.now();
      for (const key of Object.keys(all)) {
        for (const note of all[key] || []) {
          if (note.reminderAt && note.reminderAt > now) {
            chrome.alarms.create(ALARM_PREFIX + note.id, { when: note.reminderAt });
          }
        }
      }
    } catch (e) {
      console.warn('Noteful alarm restore failed:', e);
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg && msg.type === 'setAlarm') {
        if (msg.when) {
          chrome.alarms.create(ALARM_PREFIX + msg.id, { when: msg.when });
        } else {
          chrome.alarms.clear(ALARM_PREFIX + msg.id);
        }
        sendResponse({ ok: true });
      } else if (msg && msg.type === 'clearAlarm') {
        chrome.alarms.clear(ALARM_PREFIX + msg.id);
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true;
});
