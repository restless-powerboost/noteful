(function () {
  'use strict';

  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  const S = window.NotefulShared;
  if (!S) { console.error('Noteful: shared.js not loaded'); return; }

  const STORAGE_KEY = S.STORAGE_KEY;
  const SETTINGS_KEY = S.SETTINGS_KEY;
  const COLOR_VALUES = S.COLOR_VALUES;
  const COLOR_KEYS = S.COLOR_KEYS;

  let settings = { ...S.DEFAULT_SETTINGS };
  let currentKey = getKey();
  let loadedKeys = new Set();
  let notes = [];
  const noteElements = new Map();
  let savePromise = Promise.resolve();
  let saveTimer = null;
  let lastHref = location.href;
  let lastSelection = null;

  function getKey() {
    return location.origin + location.pathname;
  }

  function areaFor() {
    return settings.syncEnabled ? chrome.storage.sync : chrome.storage.local;
  }

  async function getAllNotes() {
    const data = await areaFor().get(STORAGE_KEY);
    return data[STORAGE_KEY] || {};
  }

  async function setAllNotes(all) {
    await areaFor().set({ [STORAGE_KEY]: all });
  }

  async function migrateOldKeys() {
    const area = areaFor();
    const data = await area.get(STORAGE_KEY);
    const all = data[STORAGE_KEY] || {};
    let changed = false;
    for (const key of Object.keys(all)) {
      if (!key.startsWith('http://') && !key.startsWith('https://')) {
        const newKey = `https://${key}/`;
        all[newKey] = [...(all[newKey] || []), ...all[key]];
        delete all[key];
        changed = true;
      }
    }
    if (changed) await area.set({ [STORAGE_KEY]: all });
  }

  async function loadSettings() {
    settings = await S.getSettings();
  }

  async function loadNotes() {
    currentKey = getKey();
    const all = await getAllNotes();
    notes = [];
    loadedKeys = new Set();

    loadedKeys.add(currentKey);
    for (const n of all[currentKey] || []) {
      notes.push(hydrateNote(n, currentKey));
    }

    for (const key of Object.keys(all)) {
      if (key === currentKey) continue;
      let u;
      try { u = new URL(key); } catch { continue; }
      if (u.origin !== location.origin) continue;
      loadedKeys.add(key);
      for (const n of all[key] || []) {
        notes.push(hydrateNote(n, key));
      }
    }

    renderAll();
  }

  function hydrateNote(n, key) {
    return {
      ...n,
      color: n.color || settings.defaultColor || 'yellow',
      collapsed: !!n.collapsed,
      domainWide: !!n.domainWide,
      reminderAt: n.reminderAt || null,
      anchorSelector: n.anchorSelector || null,
      anchorOffset: n.anchorOffset || null,
      _key: key,
    };
  }

  function sanitizeNote(n) {
    const { _key, ...clean } = n;
    return clean;
  }

  function saveNotes() {
    savePromise = savePromise.then(async () => {
      const all = await getAllNotes();
      const byKey = {};
      for (const note of notes) {
        const k = note._key || currentKey;
        if (!byKey[k]) byKey[k] = [];
        byKey[k].push(sanitizeNote(note));
      }
      const touched = new Set(loadedKeys);
      for (const k of Object.keys(byKey)) touched.add(k);
      for (const key of touched) {
        const arr = byKey[key] || [];
        if (arr.length > 0) all[key] = arr;
        else delete all[key];
      }
      try {
        await setAllNotes(all);
      } catch (e) {
        console.error('Noteful save error:', e);
        if (settings.syncEnabled && /QUOTA/i.test(String(e))) {
          showInPageToast('Sync storage full. Please disable sync in settings.', 8000);
        }
      }
    }).catch(err => console.error('Noteful save chain error:', err));
    return savePromise;
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveNotes();
    }, 300);
  }

  function shouldShowHere(note) {
    if (note._key === currentKey) return true;
    return !!note.domainWide;
  }

  function removeNoteEl(id) {
    const el = noteElements.get(id);
    if (!el) return;
    if (el._qnPopover) el._qnPopover.remove();
    if (el._qnReminderPop) el._qnReminderPop.remove();
    el.remove();
    noteElements.delete(id);
  }

  function removeAllNoteEls() {
    for (const id of [...noteElements.keys()]) removeNoteEl(id);
  }

  function renderAll() {
    removeAllNoteEls();
    for (const note of notes) {
      if (note.visible && shouldShowHere(note)) renderNote(note);
    }
  }

  function applyColor(el, color) {
    for (const c of COLOR_KEYS) el.classList.remove('qn-color-' + c);
    el.classList.add('qn-color-' + color);
    const dot = el.querySelector('.qn-color-dot');
    if (dot) dot.style.backgroundColor = COLOR_VALUES[color];
  }

  function positionFromAnchor(note) {
    if (!note.anchorSelector) return null;
    let anchor;
    try { anchor = document.querySelector(note.anchorSelector); } catch { return null; }
    if (!anchor) return null;
    const rect = anchor.getBoundingClientRect();
    const dx = (note.anchorOffset && note.anchorOffset.dx) || 0;
    const dy = (note.anchorOffset && note.anchorOffset.dy) || 6;
    return {
      x: rect.left + window.scrollX + dx,
      y: rect.bottom + window.scrollY + dy,
    };
  }

  function renderNote(note) {
    const color = note.color || 'yellow';
    const el = document.createElement('div');
    el.className = 'qn-note qn-color-' + color;
    if (note.collapsed) el.classList.add('qn-minimized');
    if (note.anchorSelector) el.classList.add('qn-anchored');
    el.dataset.noteId = note.id;

    let pos = positionFromAnchor(note);
    if (!pos) pos = { x: note.x, y: note.y };
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.width = note.width + 'px';
    el.style.height = note.collapsed ? 'auto' : (note.height + 'px');

    const header = document.createElement('div');
    header.className = 'qn-note-header';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'qn-note-date';
    dateSpan.textContent = S.formatDate(note.created);
    header.appendChild(dateSpan);

    const actions = document.createElement('div');
    actions.className = 'qn-note-actions';

    const colorPopover = buildColorPopover(note);
    document.body.appendChild(colorPopover);
    el._qnPopover = colorPopover;

    const colorBtn = document.createElement('button');
    colorBtn.className = 'qn-btn qn-color-btn';
    colorBtn.title = 'Change color';
    const colorDot = document.createElement('span');
    colorDot.className = 'qn-color-dot';
    colorDot.style.backgroundColor = COLOR_VALUES[color];
    colorBtn.appendChild(colorDot);
    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleColorPopover(colorBtn, colorPopover);
    });
    actions.appendChild(colorBtn);

    const reminderBtn = document.createElement('button');
    reminderBtn.className = 'qn-btn qn-reminder-btn';
    if (note.reminderAt && note.reminderAt > Date.now()) reminderBtn.classList.add('qn-active');
    reminderBtn.textContent = '\u23F0';
    reminderBtn.title = note.reminderAt ? 'Reminder: ' + new Date(note.reminderAt).toLocaleString('en-US') : 'Set reminder';
    const reminderPop = buildReminderPopover(note);
    document.body.appendChild(reminderPop);
    el._qnReminderPop = reminderPop;
    reminderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleReminderPopover(reminderBtn, reminderPop, note);
    });
    actions.appendChild(reminderBtn);

    const domainBtn = document.createElement('button');
    domainBtn.className = 'qn-btn qn-domain-btn';
    if (note.domainWide) domainBtn.classList.add('qn-active');
    domainBtn.textContent = '\u2316';
    domainBtn.title = note.domainWide ? 'Applies to entire domain — click to unset' : 'Apply to entire domain';
    domainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleDomainWide(note.id);
    });
    actions.appendChild(domainBtn);

    if (note.anchorSelector) {
      const anchorBtn = document.createElement('button');
      anchorBtn.className = 'qn-btn qn-anchor-btn qn-active';
      anchorBtn.textContent = '\u2693';
      anchorBtn.title = 'Anchored to element — click to detach';
      anchorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        unanchorNote(note.id);
      });
      actions.appendChild(anchorBtn);
    }

    const minBtn = document.createElement('button');
    minBtn.className = 'qn-btn qn-min-btn';
    minBtn.textContent = note.collapsed ? '\u25B4' : '\u25BE';
    minBtn.title = note.collapsed ? 'Expand' : 'Collapse';
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleCollapsed(note.id);
    });
    actions.appendChild(minBtn);

    const hideBtn = document.createElement('button');
    hideBtn.className = 'qn-btn';
    hideBtn.textContent = '\u2212';
    hideBtn.title = 'Hide';
    hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setNoteVisible(note.id, false);
    });
    actions.appendChild(hideBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'qn-btn';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (settings.confirmDelete && !confirm('Delete this note?')) return;
      deleteNoteWithUndo(note.id);
    });
    actions.appendChild(delBtn);

    header.appendChild(actions);
    el.appendChild(header);

    const body = document.createElement('div');
    body.className = 'qn-note-body';
    el.appendChild(body);

    const textarea = document.createElement('textarea');
    textarea.className = 'qn-note-text';
    textarea.value = note.text || '';
    textarea.placeholder = 'Note...';
    textarea.spellcheck = false;
    textarea.style.fontSize = (settings.fontSize || 13) + 'px';

    const mdView = document.createElement('div');
    mdView.className = 'qn-note-md';
    mdView.style.fontSize = (settings.fontSize || 13) + 'px';

    function updateMdView() {
      const hasText = (textarea.value || '').trim().length > 0;
      if (!hasText) {
        mdView.innerHTML = '<span class="qn-md-empty">Empty note…</span>';
      } else {
        mdView.innerHTML = S.renderMarkdown(textarea.value);
      }
    }

    function enterEdit() {
      body.classList.add('qn-editing');
      textarea.style.display = '';
      mdView.style.display = 'none';
      setTimeout(() => textarea.focus(), 0);
    }
    function exitEdit() {
      body.classList.remove('qn-editing');
      updateMdView();
      textarea.style.display = 'none';
      mdView.style.display = '';
    }

    textarea.addEventListener('input', () => {
      const n = notes.find(x => x.id === note.id);
      if (n) {
        n.text = textarea.value;
        scheduleSave();
      }
    });
    textarea.addEventListener('keydown', (e) => e.stopPropagation());
    textarea.addEventListener('mousedown', (e) => e.stopPropagation());
    textarea.addEventListener('blur', () => {
      if (settings.markdownEnabled) exitEdit();
    });

    mdView.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      enterEdit();
    });
    mdView.addEventListener('mousedown', (e) => e.stopPropagation());

    body.appendChild(textarea);
    body.appendChild(mdView);

    if (settings.markdownEnabled) {
      updateMdView();
      textarea.style.display = 'none';
      mdView.style.display = '';
    } else {
      textarea.style.display = '';
      mdView.style.display = 'none';
    }

    makeDraggable(el, header, note.id);
    observeResize(el, note.id);

    document.body.appendChild(el);
    noteElements.set(note.id, el);
  }

  function buildColorPopover(note) {
    const popover = document.createElement('div');
    popover.className = 'qn-color-popover';
    popover.dataset.noteId = note.id;
    for (const colorKey of COLOR_KEYS) {
      const swatch = document.createElement('button');
      swatch.className = 'qn-color-swatch';
      swatch.style.backgroundColor = COLOR_VALUES[colorKey];
      swatch.title = colorKey;
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        setNoteColor(note.id, colorKey);
        popover.classList.remove('qn-open');
      });
      swatch.addEventListener('mousedown', (e) => e.stopPropagation());
      popover.appendChild(swatch);
    }
    return popover;
  }

  function toggleColorPopover(btn, popover) {
    const wasOpen = popover.classList.contains('qn-open');
    closeAllPopovers();
    if (!wasOpen) {
      positionPopover(btn, popover, 156);
      popover.classList.add('qn-open');
    }
  }

  function buildReminderPopover(note) {
    const pop = document.createElement('div');
    pop.className = 'qn-reminder-popover';
    pop.dataset.noteId = note.id;

    const title = document.createElement('div');
    title.className = 'qn-rem-title';
    title.textContent = 'Reminder';
    pop.appendChild(title);

    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'qn-rem-input';
    pop.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.className = 'qn-rem-btns';

    const setBtn = document.createElement('button');
    setBtn.className = 'qn-rem-set';
    setBtn.textContent = 'Set';
    setBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!input.value) return;
      const ts = new Date(input.value).getTime();
      if (isNaN(ts) || ts < Date.now()) {
        alert('Please choose a date in the future.');
        return;
      }
      setReminder(note.id, ts);
      pop.classList.remove('qn-open');
    });
    btnRow.appendChild(setBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'qn-rem-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setReminder(note.id, null);
      pop.classList.remove('qn-open');
    });
    btnRow.appendChild(clearBtn);

    pop.appendChild(btnRow);

    pop.addEventListener('mousedown', (e) => e.stopPropagation());
    return pop;
  }

  function toggleReminderPopover(btn, pop, note) {
    const wasOpen = pop.classList.contains('qn-open');
    closeAllPopovers();
    if (!wasOpen) {
      const input = pop.querySelector('.qn-rem-input');
      if (note.reminderAt) {
        const d = new Date(note.reminderAt);
        const pad = (n) => String(n).padStart(2, '0');
        input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } else {
        const d = new Date(Date.now() + 60 * 60 * 1000);
        const pad = (n) => String(n).padStart(2, '0');
        input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      positionPopover(btn, pop, 240);
      pop.classList.add('qn-open');
    }
  }

  function positionPopover(btn, pop, width) {
    const rect = btn.getBoundingClientRect();
    let left = rect.right + window.scrollX - width;
    const minLeft = window.scrollX + 8;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - width - 8;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    pop.style.left = left + 'px';
    pop.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  }

  function closeAllPopovers() {
    document.querySelectorAll('.qn-color-popover.qn-open, .qn-reminder-popover.qn-open').forEach(p => p.classList.remove('qn-open'));
  }

  function makeDraggable(el, handle, noteId) {
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.qn-btn')) return;
      const note = notes.find(n => n.id === noteId);
      if (note && note.anchorSelector) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = parseFloat(el.style.left) || 0;
      const startTop = parseFloat(el.style.top) || 0;
      el.classList.add('qn-dragging');
      closeAllPopovers();

      const grid = settings.snapToGrid ? (settings.gridSize || 20) : 0;

      function onMove(ev) {
        let newLeft = startLeft + ev.clientX - startX;
        let newTop = Math.max(0, startTop + ev.clientY - startY);
        if (grid > 0) {
          newLeft = Math.round(newLeft / grid) * grid;
          newTop = Math.round(newTop / grid) * grid;
        }
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
      }
      function onUp() {
        el.classList.remove('qn-dragging');
        const n = notes.find(x => x.id === noteId);
        if (n) {
          n.x = parseFloat(el.style.left) || 0;
          n.y = parseFloat(el.style.top) || 0;
          saveNotes();
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function observeResize(el, noteId) {
    let initialized = false;
    const observer = new ResizeObserver(() => {
      if (!initialized) { initialized = true; return; }
      const n = notes.find(x => x.id === noteId);
      if (n && !n.collapsed) {
        n.width = el.offsetWidth;
        n.height = el.offsetHeight;
        scheduleSave();
      }
    });
    observer.observe(el);
  }

  function captureAnchorFromSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    if (node.nodeType === 3) node = node.parentElement;
    if (!node || node.nodeType !== 1) return null;
    const selector = getCssPath(node);
    if (!selector) return null;
    const rect = range.getBoundingClientRect();
    const parentRect = node.getBoundingClientRect();
    return {
      selector,
      dx: rect.left - parentRect.left,
      dy: rect.bottom - parentRect.top + 6,
    };
  }

  function getCssPath(el) {
    if (!el || el.nodeType !== 1) return null;
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement && depth < 10) {
      let part = cur.tagName.toLowerCase();
      if (cur.id && /^[a-zA-Z_][\w-]*$/.test(cur.id)) {
        parts.unshift('#' + cur.id);
        break;
      }
      const parent = cur.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(cur) + 1;
          part += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(part);
      cur = parent;
      depth++;
    }
    return parts.join(' > ');
  }

  function createNote() {
    const offset = notes.filter(n => n.visible && shouldShowHere(n)).length * 22;
    let x = window.scrollX + 40 + offset;
    let y = window.scrollY + 60 + offset;
    let anchorSelector = null;
    let anchorOffset = null;

    const freshAnchor = captureAnchorFromSelection();
    const cachedAnchor = lastSelection && (Date.now() - lastSelection.at < 10000) ? lastSelection : null;
    const anchor = freshAnchor || cachedAnchor;
    lastSelection = null;
    if (anchor) {
      anchorSelector = anchor.selector;
      anchorOffset = { dx: anchor.dx, dy: anchor.dy };
      try {
        const el = document.querySelector(anchorSelector);
        if (el) {
          const rect = el.getBoundingClientRect();
          x = rect.left + window.scrollX + anchor.dx;
          y = rect.top + window.scrollY + anchor.dy;
        }
      } catch {}
    }

    const note = {
      id: crypto.randomUUID(),
      text: '',
      created: Date.now(),
      x, y,
      width: 240,
      height: 200,
      visible: true,
      color: settings.defaultColor || 'yellow',
      collapsed: false,
      domainWide: false,
      reminderAt: null,
      anchorSelector,
      anchorOffset,
      _key: currentKey,
    };
    notes.push(note);
    renderNote(note);
    saveNotes();
    requestAnimationFrame(() => {
      const el = noteElements.get(note.id);
      if (el) {
        const ta = el.querySelector('.qn-note-text');
        if (ta) {
          if (settings.markdownEnabled) {
            const body = el.querySelector('.qn-note-body');
            const mdView = el.querySelector('.qn-note-md');
            body.classList.add('qn-editing');
            ta.style.display = '';
            mdView.style.display = 'none';
          }
          ta.focus();
        }
      }
    });
  }

  function deleteNoteRaw(id) {
    const idx = notes.findIndex(n => n.id === id);
    if (idx < 0) return null;
    const [removed] = notes.splice(idx, 1);
    removeNoteEl(id);
    if (removed.reminderAt) {
      try { chrome.runtime.sendMessage({ type: 'clearAlarm', id }); } catch {}
    }
    return removed;
  }

  function deleteNoteWithUndo(id) {
    const removed = deleteNoteRaw(id);
    if (!removed) return;
    saveNotes();
    showInPageToast('Note deleted', 5000, () => {
      notes.push(removed);
      renderNote(removed);
      if (removed.reminderAt && removed.reminderAt > Date.now()) {
        try { chrome.runtime.sendMessage({ type: 'setAlarm', id: removed.id, when: removed.reminderAt }); } catch {}
      }
      saveNotes();
    });
  }

  function deleteNote(id) {
    deleteNoteRaw(id);
    saveNotes();
  }

  function setNoteVisible(id, visible) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.visible = visible;
    if (visible) {
      if (!noteElements.has(id) && shouldShowHere(note)) renderNote(note);
    } else {
      removeNoteEl(id);
    }
    saveNotes();
  }

  function setNoteColor(id, color) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.color = color;
    const el = noteElements.get(id);
    if (el) applyColor(el, color);
    saveNotes();
  }

  function toggleCollapsed(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.collapsed = !note.collapsed;
    const el = noteElements.get(id);
    if (el) {
      el.classList.toggle('qn-minimized', note.collapsed);
      el.style.height = note.collapsed ? 'auto' : (note.height + 'px');
      const btn = el.querySelector('.qn-min-btn');
      if (btn) {
        btn.textContent = note.collapsed ? '\u25B4' : '\u25BE';
        btn.title = note.collapsed ? 'Expand' : 'Collapse';
      }
    }
    saveNotes();
  }

  function toggleDomainWide(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.domainWide = !note.domainWide;
    const el = noteElements.get(id);
    if (el) {
      const btn = el.querySelector('.qn-domain-btn');
      if (btn) {
        btn.classList.toggle('qn-active', note.domainWide);
        btn.title = note.domainWide ? 'Applies to entire domain — click to unset' : 'Apply to entire domain';
      }
    }
    saveNotes();
  }

  function unanchorNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.anchorSelector = null;
    note.anchorOffset = null;
    const el = noteElements.get(id);
    if (el) {
      el.classList.remove('qn-anchored');
      const btn = el.querySelector('.qn-anchor-btn');
      if (btn) btn.remove();
      note.x = parseFloat(el.style.left) || note.x;
      note.y = parseFloat(el.style.top) || note.y;
    }
    saveNotes();
  }

  function setReminder(id, when) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.reminderAt = when;
    try {
      chrome.runtime.sendMessage({
        type: when ? 'setAlarm' : 'clearAlarm',
        id,
        when: when || 0,
      });
    } catch (e) {
      console.warn('Noteful alarm message failed:', e);
    }
    const el = noteElements.get(id);
    if (el) {
      const btn = el.querySelector('.qn-reminder-btn');
      if (btn) {
        btn.classList.toggle('qn-active', !!when);
        btn.title = when ? 'Reminder: ' + new Date(when).toLocaleString('en-US') : 'Set reminder';
      }
    }
    saveNotes();
  }

  function showAll() {
    for (const note of notes) {
      if (!shouldShowHere(note)) continue;
      note.visible = true;
      if (!noteElements.has(note.id)) renderNote(note);
    }
    saveNotes();
  }

  function hideAll() {
    for (const note of notes) {
      if (!shouldShowHere(note)) continue;
      note.visible = false;
    }
    removeAllNoteEls();
    saveNotes();
  }

  function toggleAllVisibility() {
    const relevant = notes.filter(shouldShowHere);
    const anyVisible = relevant.some(n => n.visible && noteElements.has(n.id));
    if (anyVisible) hideAll(); else showAll();
  }

  let toastEl = null;
  let toastTimer = null;

  function showInPageToast(message, duration = 5000, onUndo = null) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.className = 'qn-toast';
    const msgEl = document.createElement('span');
    msgEl.textContent = message;
    toastEl.appendChild(msgEl);
    if (onUndo) {
      const btn = document.createElement('button');
      btn.className = 'qn-toast-btn';
      btn.textContent = 'Undo';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        clearTimeout(toastTimer);
        onUndo();
        toastEl.remove();
        toastEl = null;
      });
      toastEl.appendChild(btn);
    }
    document.body.appendChild(toastEl);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) { toastEl.remove(); toastEl = null; }
    }, duration);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      switch (msg && msg.type) {
        case 'createNote': createNote(); break;
        case 'deleteNote':
          if (msg.fromPopup) { deleteNote(msg.id); }
          else { deleteNoteWithUndo(msg.id); }
          break;
        case 'toggleNote': {
          const n = notes.find(x => x.id === msg.id);
          if (n) setNoteVisible(msg.id, !n.visible);
          break;
        }
        case 'showAll': showAll(); break;
        case 'hideAll': hideAll(); break;
        case 'toggleAll': toggleAllVisibility(); break;
        case 'reloadNotes': loadNotes(); break;
      }
      sendResponse({ ok: true });
    } catch (err) {
      console.error('Noteful message error:', err);
      sendResponse({ ok: false, error: String(err) });
    }
  });

  function onStorageChanged(changes, area) {
    const expectedArea = settings.syncEnabled ? 'sync' : 'local';
    if (area === 'local' && changes[SETTINGS_KEY]) {
      const old = settings;
      settings = { ...S.DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue || {}) };
      if (old.syncEnabled !== settings.syncEnabled || old.markdownEnabled !== settings.markdownEnabled || old.fontSize !== settings.fontSize) {
        loadNotes();
      }
    }
    if (area !== expectedArea) return;
    if (!changes[STORAGE_KEY]) return;
    const newAll = changes[STORAGE_KEY].newValue || {};
    const expected = buildExpectedNotesFromStore(newAll);
    if (JSON.stringify(expected) === JSON.stringify(notes.map(sanitizeNote))) return;
    loadNotes();
  }

  function buildExpectedNotesFromStore(all) {
    const out = [];
    for (const n of all[currentKey] || []) out.push(n);
    for (const key of Object.keys(all)) {
      if (key === currentKey) continue;
      let u; try { u = new URL(key); } catch { continue; }
      if (u.origin !== location.origin) continue;
      for (const n of all[key] || []) out.push(n);
    }
    return out;
  }

  chrome.storage.onChanged.addListener(onStorageChanged);

  function onUrlChange() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    removeAllNoteEls();
    notes = [];
    loadNotes();
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && (e.target.closest('.qn-color-popover') || e.target.closest('.qn-color-btn') || e.target.closest('.qn-reminder-popover') || e.target.closest('.qn-reminder-btn'))) {
      return;
    }
    closeAllPopovers();
  }, true);

  document.addEventListener('selectionchange', () => {
    const anchor = captureAnchorFromSelection();
    if (anchor) lastSelection = { ...anchor, at: Date.now() };
  });

  window.addEventListener('popstate', onUrlChange);
  window.addEventListener('scroll', () => closeAllPopovers(), true);
  setInterval(onUrlChange, 500);

  async function init() {
    await loadSettings();
    await migrateOldKeys();
    await loadNotes();
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
