/* app.js
   IST4035 practical solution — FocusTasks 9915
   - Closure-based store API as required
   - Event delegation on the main app wrapper
   - Uses only map/filter/reduce for list transforms
   - Escapes user input before inserting into DOM (see escapeHTML)
*/

/* === Configuration / SID4 === */
const SID4 = '9915'; // <-- use your exact last 4 student ID digits here

/* === Create store factory (must produce the exact-shape API) === */
function createStore(storageKey) {
  // Private closure state: encapsulates tasks and storageKey
  let tasks = []; // private to closure; not visible globally

  // Hydrate from localStorage
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) tasks = parsed;
    } catch (e) {
      tasks = [];
    }
  }

  // Persist helper
  const persist = (next) => {
    tasks = next;
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    return deepClone(tasks);
  };

  // Deep clone for returns
  const deepClone = (arr) => JSON.parse(JSON.stringify(arr));

  return {
    add(item) {
      // create new array (no mutation methods)
      const next = [...tasks, item];
      return persist(next);
    },
    toggle(id) {
      // use map only to toggle
      const next = tasks.map(t => (t.id === id ? Object.assign({}, t, { done: !t.done }) : t));
      return persist(next);
    },
    remove(id) {
      // use filter only
      const next = tasks.filter(t => t.id !== id);
      return persist(next);
    },
    list() {
      return deepClone(tasks);
    }
  };
}

/* === Instantiate store exactly as required === */
const store = createStore(focustasks_${SID4}); // required shape: createStore(focustasks_${SID4})

/* === Escaping function === */
function escapeHTML(str) {
  // minimal client-side escaping for inserting user text into innerHTML safely
  // characters escaped: & < > " '
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* === DOM refs === */
const app = document.getElementById('app');
const addForm = document.getElementById('add-form');
const taskInput = document.getElementById('task-input');
const errorBox = document.getElementById('error');
const activeList = document.getElementById('active-list');
const doneList = document.getElementById('done-list');
const analyticsEl = document.getElementById('analytics');

/* === Utility: unique id generator === */
function makeId() {
  return ${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)};
}

/* === Pure summary function as required === */
function summarize(tasks) {
  const done = tasks.filter(t => t.done).length;
  const active = tasks.length - done;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 1000) / 10; // 1 dp
  return { active, done, pct };
}

/* === Render functions === */
function renderAnalytics() {
  const s = summarize(store.list());
  analyticsEl.textContent = Active: ${s.active} · Done: ${s.done} · Done %: ${s.pct.toFixed(1)}%;
}

function renderLists() {
  const tasks = store.list();

  // Clear
  activeList.innerHTML = '';
  doneList.innerHTML = '';

  // Partition using filter (functional approach)
  const activeTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  // Render helper (uses escaped user text inserted into innerHTML)
  const makeListItem = (task) => {
    const li = document.createElement('li');
    li.className = task-item ${task.done ? 'done' : ''};
    li.setAttribute('data-id', task.id);
    // We build small safe markup and insert escaped user title.
    // Using innerHTML here is safe because we escape user input via escapeHTML.
    li.innerHTML = `
      <div class="task-left">
        <span class="task-title">${escapeHTML(task.title)}</span>
      </div>
      <div class="task-actions">
        <button class="btn-icon toggle-btn" data-action="toggle" aria-label="Toggle task">${task.done ? '↺' : '✓'}</button>
        <button class="btn-icon delete-btn" data-action="delete" aria-label="Delete task">✕</button>
      </div>
    `;
    return li;
  };

  activeTasks.forEach(t => activeList.appendChild(makeListItem(t)));
  doneTasks.forEach(t => doneList.appendChild(makeListItem(t)));

  renderAnalytics();
}

/* === Validation === */
function validateTitle(raw) {
  if (!raw) return false;
  if (raw.trim().length === 0) return false;
  return true;
}

/* === Show error message === */
function showError(msg) {
  if (!msg) {
    errorBox.hidden = true;
    errorBox.textContent = '';
  } else {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }
}

/* === Initial render === */
renderLists();

/* === Event delegation: single handler attached to the main app wrapper === */
function delegatedHandler(e) {
  // Handle form submit
  if (e.type === 'submit') {
    e.preventDefault();
    const title = taskInput.value || '';
    if (!validateTitle(title)) {
      showError('Please enter a non-empty task title.');
      return;
    }
    showError('');
    const id = makeId();
    store.add({ id, title: title.trim(), done: false });
    taskInput.value = '';
    renderLists();
    taskInput.focus();
    return;
  }

  // Handle clicks delegated inside app wrapper
  if (e.type === 'click') {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const li = btn.closest('li.task-item');
    if (!li) return;
    const id = li.getAttribute('data-id');

    if (action === 'toggle') {
      store.toggle(id);
      renderLists();
      return;
    }

    if (action === 'delete') {
      store.remove(id);
      renderLists();
      return;
    }
  }
}

// Attach the same handler for click and submit events on a single area (main app wrapper).
// This keeps event listeners delegated and centralized.
app.addEventListener('click', delegatedHandler);
app.addEventListener('submit', delegatedHandler);

/* === Micro-explanations (Task 4) === */

/*
1) Why closure store improves testability and avoids accidental mutation:
   The createStore factory keeps tasks inside its function scope (closure), so code
   outside cannot directly mutate it. Tests can instantiate createStore with a test
   storageKey and exercise its API (add/toggle/remove/list) without touching global
   state — this isolates side effects and makes unit tests deterministic.
   (See createStore's let tasks = [] within this file.)
*/

/*
2) Why escapeHTML line is sufficient here but not for server-rendered multi-user apps:
   We call escapeHTML(...) before inserting user content into innerHTML (see li.innerHTML).
   That prevents injection in this single-user client-side app. However, in server-rendered
   or multi-user contexts you also need server-side escaping/validation and Content Security
   Policy (CSP) headers because attackers can target data at the source, or subvert clients.
   (See the escapeHTML function above and its uses in renderLists.)
*/
