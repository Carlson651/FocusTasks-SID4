/* ============================================================
   FocusTasks 9915 - app.js
   - Closure-based store with createStore(storageKey)
   - No global mutable tasks array
   - Transforms use map/filter/reduce/concat only
   - Single delegated listener for lists area
   ============================================================ */

const SID4 = '9915';
const STORAGE_KEY = focustasks_$[SID4];

/* ---------------------------
   Micro-comment (closure store):
   The closure store keeps state and storageKey inside the factory
   (below). This prevents accidental global mutation and makes the API
   deterministic and easier to unit-test because all state access is
   through the returned methods.
   --------------------------- */
function createStore(storageKey) {
  // state is closed over inside this function (no global tasks variable)
  let state = [];

  // hydrate from localStorage if present
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      state = [];
    }
  }

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function list() {
    // return deep-cloned array using map (shallow clone of task objects)
    return state.map(item => ({ ...item }));
  }

  function add(item) {
    // Use concat to avoid mutating original array reference
    state = state.concat([{ id: item.id, title: item.title, done: !!item.done }]);
    persist();
    return list();
  }

  function toggle(id) {
    // map used to produce a new state array (no loops)
    state = state.map(t => (t.id === id ? { ...t, done: !t.done } : t));
    persist();
    return list();
  }

  function remove(id) {
    // filter used to produce new state without the item
    state = state.filter(t => t.id !== id);
    persist();
    return list();
  }

  return { add, toggle, remove, list };
}

// create the store instance exactly as required
const store = createStore(STORAGE_KEY);

/* ---------------------------
   Escaping helper
   --------------------------- */
// escapeHtml used to neutralize any special characters before inserting via innerHTML.
// This is used at render-time to ensure user titles display literally. This is sufficient
// for a client-only app, but server-side rendering or multi-user contexts also require
// server-side sanitization and CSP to fully prevent injection attacks.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* DOM references */
const formEl = document.getElementById('add-form');
const inputEl = document.getElementById('task-input');
const errorEl = document.getElementById('error');
const analyticsEl = document.getElementById('analytics');
const activeListEl = document.getElementById('active-list');
const doneListEl = document.getElementById('done-list');
const listsParent = document.getElementById('lists'); // parent wrapper for delegation

/* Utility: unique id */
function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function isBlank(s) {
  return !s || s.trim().length === 0;
}

/* Pure summarize function as required */
function summarize(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const active = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 1000) / 10; // 1dp
  return { active, done, pct };
}

/* Create DOM node for a task (safe rendering) */
function createTaskListItem(task) {
  const li = document.createElement('li');
  li.dataset.id = task.id;

  const cb = document.createElement('input');
  cb.setAttribute('type', 'checkbox');
  cb.className = 'task-toggle';
  cb.checked = !!task.done;
  cb.setAttribute('aria-label', Toggle done for ${task.title});

  const span = document.createElement('span');
  span.className = 'task-title';
  // We use escapeHtml and assign to innerHTML so user-provided characters are shown literally
  // (escapeHtml prevents injection). We avoid raw innerHTML of user content.
  span.innerHTML = escapeHtml(task.title);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'task-delete';
  del.textContent = 'Delete';
  del.setAttribute('aria-label', Delete ${task.title});

  li.appendChild(cb);
  li.appendChild(span);
  li.appendChild(del);
  return li;
}

/* Build fragment from array of tasks using map + reduce (no loops) */
function buildFragment(items) {
  return items
    .map(createTaskListItem)
    .reduce((frag, node) => { frag.appendChild(node); return frag; }, document.createDocumentFragment());
}

/* Render function reads store.list() and updates DOM + analytics */
function rerender() {
  const tasks = store.list();
  const { active, done, pct } = summarize(tasks);

  analyticsEl.textContent = Active: ${active} · Done: ${done} · Done %: ${pct.toFixed(1)}%;

  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  // clear and append fragments (safe — we only append created nodes)
  activeListEl.innerHTML = '';
  activeListEl.appendChild(buildFragment(activeTasks));

  doneListEl.innerHTML = '';
  doneListEl.appendChild(buildFragment(doneTasks));
}

/* Show / clear error */
function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.textContent = '';
  errorEl.hidden = true;
}

/* Form submit handler (enter submits) */
formEl.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const title = inputEl.value;
  if (isBlank(title)) {
    showError('Please enter a non-empty task title.');
    inputEl.focus();
    return;
  }
  const task = { id: makeId(), title: title.trim(), done: false };
  store.add(task);
  inputEl.value = '';
  clearError();
  rerender();
});

/* ---------------------------
   Event delegation for lists area:
   - Single delegated listener attached to parent (#lists)
   - Handles click (delete) and change (checkbox toggle)
   --------------------------- */
listsParent.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const li = btn.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  if (btn.classList.contains('task-delete')) {
    store.remove(id);
    rerender();
  }
});

listsParent.addEventListener('change', (e) => {
  if (!e.target.matches('.task-toggle')) return;
  const li = e.target.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  store.toggle(id);
  rerender();
});

/* Initial render */
rerender();
