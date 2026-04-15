const S = window.NotefulShared;

let currentTab = null;
let currentOrigin = null;
let currentPathname = null;
let currentKey = null;
let settings = null;
let allNotesCache = {};
let pendingUndo = null;

const domainEl = document.getElementById('domain');
const newBtn = document.getElementById('newBtn');
const showAllBtn = document.getElementById('showAllBtn');
const hideAllBtn = document.getElementById('hideAllBtn');
const searchInput = document.getElementById('searchInput');
const notesList = document.getElementById('notesList');
const emptyState = document.getElementById('emptyState');
const noResults = document.getElementById('noResults');
const errorState = document.getElementById('errorState');
const optionsBtn = document.getElementById('optionsBtn');
const undoToast = document.getElementById('undoToast');
const undoText = document.getElementById('undoText');
const undoBtn = document.getElementById('undoBtn');

async function init() {
  settings = await S.getSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  try {
    const url = new URL(tab.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      currentOrigin = url.origin;
      currentPathname = url.pathname;
      currentKey = url.origin + url.pathname;
    }
  } catch {}

  if (!currentKey) {
    domainEl.textContent = 'Noteful';
    newBtn.disabled = true;
    showAllBtn.disabled = true;
    hideAllBtn.disabled = true;
    notesList.classList.add('hidden');
    errorState.classList.remove('hidden');
    errorState.textContent = 'Notes only work on http/https pages. Search is still available.';
  } else {
    const u = new URL(currentKey);
    const display = u.hostname + (u.pathname === '/' ? '' : u.pathname);
    domainEl.textContent = display;
    domainEl.title = currentKey;
  }

  await renderList();
}

async function loadAllNotes() {
  settings = await S.getSettings();
  allNotesCache = await S.getAllNotes(settings);
}

function currentPageNotes() {
  if (!currentKey) return [];
  const direct = (allNotesCache[currentKey] || []).map(n => ({ ...n }));
  const directIds = new Set(direct.map(n => n.id));
  const domainWide = [];
  if (currentOrigin) {
    for (const key of Object.keys(allNotesCache)) {
      if (key === currentKey) continue;
      try {
        const u = new URL(key);
        if (u.origin !== currentOrigin) continue;
      } catch { continue; }
      for (const n of allNotesCache[key] || []) {
        if (n.domainWide && !directIds.has(n.id)) domainWide.push({ ...n });
      }
    }
  }
  return [...direct, ...domainWide];
}

function searchNotes(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const key of Object.keys(allNotesCache)) {
    for (const note of allNotesCache[key] || []) {
      const text = (note.text || '').toLowerCase();
      if (text.includes(q)) {
        results.push({ note, key });
      }
    }
  }
  results.sort((a, b) => (b.note.created || 0) - (a.note.created || 0));
  return results;
}

async function renderList() {
  await loadAllNotes();
  notesList.innerHTML = '';
  emptyState.classList.add('hidden');
  noResults.classList.add('hidden');
  notesList.classList.remove('hidden');

  const query = searchInput.value;
  if (query.trim()) {
    const results = searchNotes(query);
    showAllBtn.disabled = true;
    hideAllBtn.disabled = true;
    if (results.length === 0) {
      notesList.classList.add('hidden');
      noResults.classList.remove('hidden');
      return;
    }
    for (const r of results) notesList.appendChild(renderSearchItem(r.note, r.key));
    return;
  }

  const notes = currentPageNotes();
  if (notes.length === 0) {
    notesList.classList.add('hidden');
    if (currentKey) emptyState.classList.remove('hidden');
    showAllBtn.disabled = true;
    hideAllBtn.disabled = true;
    return;
  }

  const anyHidden = notes.some(n => !n.visible);
  const anyVisible = notes.some(n => n.visible);
  showAllBtn.disabled = !anyHidden;
  hideAllBtn.disabled = !anyVisible;

  const sorted = [...notes].sort((a, b) => (b.created || 0) - (a.created || 0));
  for (const note of sorted) {
    notesList.appendChild(renderItem(note));
  }
}

function makeNoteItemBase(note) {
  const li = document.createElement('li');
  li.className = 'note-item' + (note.visible ? '' : ' is-hidden');
  li.style.borderLeftColor = S.COLOR_VALUES[note.color] || S.COLOR_VALUES[S.DEFAULT_SETTINGS.defaultColor || 'yellow'];
  return li;
}

function renderItem(note) {
  const li = makeNoteItemBase(note);

  const eyeBtn = document.createElement('button');
  eyeBtn.className = 'eye-btn';
  eyeBtn.textContent = note.visible ? '\u{1F441}' : '\u2715';
  eyeBtn.title = note.visible ? 'Hide on page' : 'Show on page';
  eyeBtn.addEventListener('click', () => {
    sendMessage({ type: 'toggleNote', id: note.id });
  });

  const content = document.createElement('div');
  content.className = 'note-item-content';

  const textEl = document.createElement('div');
  const hasText = note.text && note.text.trim().length > 0;
  textEl.className = 'note-item-text' + (hasText ? '' : ' empty');
  textEl.textContent = hasText ? note.text : '(empty note)';
  textEl.title = hasText ? note.text : '';

  const meta = document.createElement('div');
  meta.className = 'note-item-meta';

  const dateEl = document.createElement('span');
  dateEl.textContent = S.formatDate(note.created);
  meta.appendChild(dateEl);

  if (!note.visible) {
    const label = document.createElement('span');
    label.className = 'hidden-label';
    label.textContent = 'hidden';
    meta.appendChild(label);
  }
  if (note.domainWide) {
    const label = document.createElement('span');
    label.className = 'domain-label';
    label.textContent = 'domain';
    meta.appendChild(label);
  }
  if (note.reminderAt && note.reminderAt > Date.now()) {
    const label = document.createElement('span');
    label.className = 'reminder-label';
    label.textContent = 'reminder';
    meta.appendChild(label);
  }

  content.appendChild(textEl);
  content.appendChild(meta);

  const delBtn = document.createElement('button');
  delBtn.className = 'del-btn';
  delBtn.textContent = '\u00d7';
  delBtn.title = 'Delete';
  delBtn.addEventListener('click', () => {
    if (settings.confirmDelete && !confirm('Really delete this note?')) return;
    stashUndo(note, currentKey);
    sendMessage({ type: 'deleteNote', id: note.id, fromPopup: true });
  });

  li.appendChild(eyeBtn);
  li.appendChild(content);
  li.appendChild(delBtn);
  return li;
}

function renderSearchItem(note, key) {
  const li = makeNoteItemBase(note);
  li.classList.add('is-search');

  const content = document.createElement('div');
  content.className = 'note-item-content';

  const textEl = document.createElement('div');
  const hasText = note.text && note.text.trim().length > 0;
  textEl.className = 'note-item-text' + (hasText ? '' : ' empty');
  textEl.textContent = hasText ? note.text : '(empty note)';
  textEl.title = hasText ? note.text : '';

  const urlEl = document.createElement('div');
  urlEl.className = 'note-item-url';
  try {
    const u = new URL(key);
    urlEl.textContent = u.hostname + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    urlEl.textContent = key;
  }
  urlEl.title = key;

  content.appendChild(textEl);
  content.appendChild(urlEl);

  const openBtn = document.createElement('button');
  openBtn.className = 'open-btn';
  openBtn.textContent = '\u2197';
  openBtn.title = 'Open page';
  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.tabs.create({ url: key });
  });

  li.addEventListener('click', () => chrome.tabs.update(currentTab.id, { url: key }));

  li.appendChild(content);
  li.appendChild(openBtn);
  return li;
}

function stashUndo(note, key) {
  pendingUndo = { note: { ...note }, key };
  undoText.textContent = 'Note deleted';
  undoToast.classList.remove('hidden');
  clearTimeout(stashUndo._t);
  stashUndo._t = setTimeout(hideUndo, 5000);
}

function hideUndo() {
  undoToast.classList.add('hidden');
  pendingUndo = null;
  clearTimeout(stashUndo._t);
}

undoBtn.addEventListener('click', async () => {
  if (!pendingUndo) return;
  const { note, key } = pendingUndo;
  pendingUndo = null;
  undoToast.classList.add('hidden');
  try {
    const all = await S.getAllNotes(settings);
    const arr = all[key] || [];
    if (!arr.find(n => n.id === note.id)) arr.push(note);
    all[key] = arr;
    await S.setAllNotes(all, settings);
    if (currentTab && currentKey === key) {
      try { await chrome.tabs.sendMessage(currentTab.id, { type: 'reloadNotes' }); } catch {}
    }
  } catch (e) {
    errorState.classList.remove('hidden');
    errorState.textContent = 'Restore failed.';
  }
});

async function sendMessage(msg) {
  try {
    await chrome.tabs.sendMessage(currentTab.id, msg);
  } catch (e) {
    errorState.classList.remove('hidden');
    errorState.textContent = 'Reload the page to activate Noteful.';
    console.error('Noteful:', e);
  }
}

newBtn.addEventListener('click', () => sendMessage({ type: 'createNote' }));
showAllBtn.addEventListener('click', () => sendMessage({ type: 'showAll' }));
hideAllBtn.addEventListener('click', () => sendMessage({ type: 'hideAll' }));
optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderList, 120);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[S.SETTINGS_KEY]) {
    S.getSettings().then(s => { settings = s; });
  }
  if (changes[S.STORAGE_KEY]) renderList();
});

init();
