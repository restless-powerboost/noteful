// Shared helpers for Noteful — loaded by popup, options, content via <script>.
(function (global) {
  const STORAGE_KEY = 'notes';
  const SETTINGS_KEY = 'settings';

  const DEFAULT_SETTINGS = {
    confirmDelete: true,
    syncEnabled: false,
    snapToGrid: false,
    gridSize: 20,
    markdownEnabled: false,
    defaultColor: 'yellow',
    fontSize: 13,
  };

  const COLOR_VALUES = {
    yellow: '#fde873',
    pink: '#fda4af',
    green: '#86efac',
    blue: '#7dd3fc',
    orange: '#fdba74',
    purple: '#c4b5fd',
  };
  const COLOR_KEYS = Object.keys(COLOR_VALUES);

  async function getSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
  }

  async function setSettings(patch) {
    const current = await getSettings();
    const next = { ...current, ...patch };
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    return next;
  }

  function notesArea(settings) {
    return settings.syncEnabled ? chrome.storage.sync : chrome.storage.local;
  }

  async function getAllNotes(settings) {
    settings = settings || (await getSettings());
    const area = notesArea(settings);
    const data = await area.get(STORAGE_KEY);
    return data[STORAGE_KEY] || {};
  }

  async function setAllNotes(all, settings) {
    settings = settings || (await getSettings());
    const area = notesArea(settings);
    await area.set({ [STORAGE_KEY]: all });
  }

  function matchKey(currentOrigin, currentPathname, storedKey, note) {
    try {
      const k = new URL(storedKey);
      if (note && note.domainWide) return k.origin === currentOrigin;
      return k.origin === currentOrigin && k.pathname === currentPathname;
    } catch {
      return false;
    }
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderMarkdown(src) {
    if (!src) return '';
    const lines = src.split(/\r?\n/);
    const out = [];
    let inList = false;
    let inCode = false;
    for (let raw of lines) {
      if (/^```/.test(raw)) {
        if (inCode) { out.push('</pre>'); inCode = false; }
        else { if (inList) { out.push('</ul>'); inList = false; } out.push('<pre>'); inCode = true; }
        continue;
      }
      if (inCode) { out.push(escapeHtml(raw)); continue; }
      const liMatch = raw.match(/^\s*[-*]\s+(.*)$/);
      if (liMatch) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(liMatch[1]) + '</li>');
        continue;
      } else if (inList) {
        out.push('</ul>');
        inList = false;
      }
      const h = raw.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        out.push('<h' + level + '>' + inline(h[2]) + '</h' + level + '>');
        continue;
      }
      if (raw.trim() === '') { out.push('<br>'); continue; }
      out.push('<div>' + inline(raw) + '</div>');
    }
    if (inList) out.push('</ul>');
    if (inCode) out.push('</pre>');
    return out.join('');
  }

  function inline(text) {
    let t = escapeHtml(text);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t;
  }

  global.NotefulShared = {
    STORAGE_KEY,
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    COLOR_VALUES,
    COLOR_KEYS,
    getSettings,
    setSettings,
    notesArea,
    getAllNotes,
    setAllNotes,
    matchKey,
    formatDate,
    escapeHtml,
    renderMarkdown,
  };
})(typeof window !== 'undefined' ? window : self);
