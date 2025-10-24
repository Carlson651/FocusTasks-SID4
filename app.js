function createStore(storageKey) {
  let tasks = [];

  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) tasks = parsed;
    } catch (e) {
      tasks = [];
    }
  }

  const deepClone = (arr) => JSON.parse(JSON.stringify(arr));

  const persist = (next) => {
    tasks = next;
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    return deepClone(tasks);
  };

  return {
    add(item) {
      const next = [...tasks, item];
      return persist(next);
    },
    toggle(id) {
      const next = tasks.map(t =>
        t.id === id ? Object.assign({}, t, { done: !t.done }) : t
      );
      return persist(next);
    },
    remove(id) {
      const next = tasks.filter(t => t.id !== id);
      return persist(next);
    },
    list() {
      return deepClone(tasks);
    }
  };
}
