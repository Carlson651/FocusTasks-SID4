const store = createStore("focustasks_0211");

function createStore(storageKey) {
  let tasks = JSON.parse(localStorage.getItem(storageKey) || "[]");

  const save = newTasks => {
    tasks = newTasks;
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    return list();
  };

  const list = () => structuredClone(tasks);

  return {
    add(task) {
      if (!task.title.trim()) return list();
      const newTasks = tasks.concat(task);
      return save(newTasks);
    },
    toggle(id) {
      return save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    },
    remove(id) {
      return save(tasks.filter(t => t.id !== id));
    },
    list
  };
}


function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;

}


function summarize(tasks) {
  const active = tasks.filter(t => !t.done).length;
  const done = tasks.filter(t => t.done).length;
  const pct = (active + done) ? ((done / (active + done)) * 100).toFixed(1) : 0;
  return { active, done, pct };
}


const form = document.getElementById("taskForm");
const input = document.getElementById("taskInput");
const errorMsg = document.getElementById("errorMsg");
const activeList = document.getElementById("activeList");
const doneList = document.getElementById("doneList");
const analytics = document.getElementById("analytics");
const themeToggle = document.getElementById("themeToggle");


function render() {
  const tasks = store.list();
  const safeTasks = tasks.map(t => ({ ...t, title: escapeHTML(t.title) }));

  activeList.innerHTML = safeTasks
    .filter(t => !t.done)
    .map(t => `<li>
        <span>${t.title}</span>
        <div>
          <button data-action="toggle" data-id="${t.id}">✔</button>
          <button data-action="remove" data-id="${t.id}">✖</button>
        </div>
      </li>`).join("");

  doneList.innerHTML = safeTasks
    .filter(t => t.done)
    .map(t => `<li>
        <span>${t.title}</span>
        <div>
          <button data-action="toggle" data-id="${t.id}">↩</button>
          <button data-action="remove" data-id="${t.id}">🗑</button>
        </div>
      </li>`).join("");

  const { active, done, pct } = summarize(safeTasks);
  analytics.textContent = Active: ${active} · Done: ${done} · Done %: ${pct}%;
}


document.body.addEventListener("click", e => {
  const action = e.target.dataset.action;
  if (!action) return;

  const id = e.target.dataset.id;
  if (action === "toggle") store.toggle(id);
  else if (action === "remove") store.remove(id);

  render();
});


form.addEventListener("submit", e => {
  e.preventDefault();
  const title = input.value.trim();

  if (!title) {
    errorMsg.textContent = "Task cannot be empty.";
    return;
  }
  errorMsg.textContent = "";

  const task = { id: Date.now() + "_" + Math.random().toString(16).slice(2), title, done: false };
  store.add(task);
  input.value = "";
  render();
});


function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "☀" : "🌙";
}

const savedTheme = localStorage.getItem("theme_dark") === "true";
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark);
  localStorage.setItem("theme_dark", isDark);
});


render();
