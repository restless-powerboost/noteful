const S = window.NotefulShared;

const els = {
  confirmDelete: document.getElementById('confirmDelete'),
  syncEnabled: document.getElementById('syncEnabled'),
  snapToGrid: document.getElementById('snapToGrid'),
  markdownEnabled: document.getElementById('markdownEnabled'),
  fontSize: document.getElementById('fontSize'),
  fontSizeLabel: document.getElementById('fontSizeLabel'),
  colorPicker: document.getElementById('colorPicker'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  clearBtn: document.getElementById('clearBtn'),
  status: document.getElementById('status'),
};

let settings = null;

function showStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.classList.toggle('error', isError);
  els.status.classList.add('show');
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => els.status.classList.remove('show'), 2500);
}

function buildColorPicker() {
  els.colorPicker.innerHTML = '';
  for (const key of S.COLOR_KEYS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch' + (settings.defaultColor === key ? ' active' : '');
    btn.style.background = S.COLOR_VALUES[key];
    btn.title = key;
    btn.addEventListener('click', async () => {
      settings = await S.setSettings({ defaultColor: key });
      buildColorPicker();
      showStatus('Saved');
    });
    els.colorPicker.appendChild(btn);
  }
}

async function load() {
  settings = await S.getSettings();
  els.confirmDelete.checked = settings.confirmDelete;
  els.syncEnabled.checked = settings.syncEnabled;
  els.snapToGrid.checked = settings.snapToGrid;
  els.markdownEnabled.checked = settings.markdownEnabled;
  els.fontSize.value = settings.fontSize;
  els.fontSizeLabel.textContent = settings.fontSize;
  buildColorPicker();
}

function wireToggle(el, key) {
  el.addEventListener('change', async () => {
    settings = await S.setSettings({ [key]: el.checked });
    showStatus('Saved');
  });
}

wireToggle(els.confirmDelete, 'confirmDelete');
wireToggle(els.snapToGrid, 'snapToGrid');
wireToggle(els.markdownEnabled, 'markdownEnabled');

els.syncEnabled.addEventListener('change', async () => {
  const enabling = els.syncEnabled.checked;
  try {
    if (enabling) {
      const localData = await chrome.storage.local.get(S.STORAGE_KEY);
      const localNotes = localData[S.STORAGE_KEY] || {};
      const syncData = await chrome.storage.sync.get(S.STORAGE_KEY);
      const syncNotes = syncData[S.STORAGE_KEY] || {};
      const merged = mergeAll(syncNotes, localNotes);
      const size = new Blob([JSON.stringify(merged)]).size;
      if (size > 90000) {
        els.syncEnabled.checked = false;
        showStatus('Too many notes (> 90 KB) for sync', true);
        return;
      }
      await chrome.storage.sync.set({ [S.STORAGE_KEY]: merged });
    }
    settings = await S.setSettings({ syncEnabled: enabling });
    showStatus(enabling ? 'Sync enabled' : 'Sync disabled');
  } catch (e) {
    els.syncEnabled.checked = !enabling;
    showStatus('Error: ' + e.message, true);
  }
});

els.fontSize.addEventListener('input', () => {
  els.fontSizeLabel.textContent = els.fontSize.value;
});
els.fontSize.addEventListener('change', async () => {
  settings = await S.setSettings({ fontSize: Number(els.fontSize.value) });
  showStatus('Saved');
});

function mergeAll(a, b) {
  const result = { ...a };
  for (const key of Object.keys(b)) {
    const arrA = result[key] || [];
    const arrB = b[key] || [];
    const byId = new Map();
    for (const n of arrA) byId.set(n.id, n);
    for (const n of arrB) {
      const existing = byId.get(n.id);
      if (!existing || (n.created || 0) > (existing.created || 0)) byId.set(n.id, n);
    }
    result[key] = [...byId.values()];
  }
  return result;
}

els.exportBtn.addEventListener('click', async () => {
  try {
    const allNotes = await S.getAllNotes(settings);
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      settings,
      notes: allNotes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `noteful-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('Exported');
  } catch (e) {
    showStatus('Export failed: ' + e.message, true);
  }
});

els.importBtn.addEventListener('click', () => els.importFile.click());

els.importFile.addEventListener('change', async () => {
  const file = els.importFile.files && els.importFile.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.notes) {
      throw new Error('Invalid format');
    }
    const current = await S.getAllNotes(settings);
    const merged = mergeAll(current, data.notes);
    await S.setAllNotes(merged, settings);
    if (data.settings && typeof data.settings === 'object') {
      const allowed = Object.keys(S.DEFAULT_SETTINGS);
      const patch = {};
      for (const k of allowed) {
        if (k in data.settings) patch[k] = data.settings[k];
      }
      settings = await S.setSettings(patch);
      await load();
    }
    showStatus('Imported');
  } catch (e) {
    showStatus('Import failed: ' + e.message, true);
  } finally {
    els.importFile.value = '';
  }
});

els.clearBtn.addEventListener('click', async () => {
  if (!confirm('Really delete ALL notes? This action cannot be undone.')) return;
  try {
    await chrome.storage.local.remove(S.STORAGE_KEY);
    await chrome.storage.sync.remove(S.STORAGE_KEY);
    showStatus('All notes deleted');
  } catch (e) {
    showStatus('Error: ' + e.message, true);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[S.SETTINGS_KEY]) load();
});

load();
