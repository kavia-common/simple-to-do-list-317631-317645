import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/**
 * @typedef {Object} Task
 * @property {string} id Unique identifier
 * @property {string} title Task title
 * @property {boolean} completed Whether task is completed
 * @property {number} createdAt Epoch milliseconds used for stable ordering
 */

const STORAGE_KEY = "kavia.todo.tasks.v1";

/**
 * Create a reasonably unique id without extra dependencies.
 * Using crypto when available; fallback to timestamp + random.
 */
function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Load tasks from localStorage. Falls back to empty list on any error.
 * @returns {Task[]}
 */
function loadTasksFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Minimal validation / normalization
    return parsed
      .filter((t) => t && typeof t.title === "string")
      .map((t) => ({
        id: typeof t.id === "string" ? t.id : createId(),
        title: t.title,
        completed: Boolean(t.completed),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * Persist tasks to localStorage. Best-effort only.
 * @param {Task[]} tasks
 */
function saveTasksToStorage(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore storage errors (e.g., private mode quotas)
  }
}

// PUBLIC_INTERFACE
function App() {
  const [tasks, setTasks] = useState(() => loadTasksFromStorage());
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  // Persist on change
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  // Autofocus the add input on first load for quick entry
  useEffect(() => {
    inputRef.current?.focus?.();
  }, []);

  const remainingCount = useMemo(
    () => tasks.reduce((acc, t) => (t.completed ? acc : acc + 1), 0),
    [tasks]
  );

  const completedCount = useMemo(
    () => tasks.reduce((acc, t) => (t.completed ? acc + 1 : acc), 0),
    [tasks]
  );

  // PUBLIC_INTERFACE
  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    /** @type {Task} */
    const task = {
      id: createId(),
      title,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks((prev) => [task, ...prev]);
    setNewTitle("");
    // Keep focus for fast repeated entry
    inputRef.current?.focus?.();
  };

  // PUBLIC_INTERFACE
  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    // If deleting the item being edited, exit edit mode
    if (editingId === id) {
      setEditingId(null);
      setEditingTitle("");
    }
  };

  // PUBLIC_INTERFACE
  const toggleCompleted = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // PUBLIC_INTERFACE
  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);

    // Focus after state updates render the input
    window.requestAnimationFrame(() => {
      editInputRef.current?.focus?.();
      editInputRef.current?.select?.();
    });
  };

  // PUBLIC_INTERFACE
  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  // PUBLIC_INTERFACE
  const saveEditing = () => {
    const title = editingTitle.trim();
    if (!editingId) return;

    if (!title) {
      // If user empties a task title, interpret as delete (simple UX).
      deleteTask(editingId);
      return;
    }

    setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, title } : t)));
    setEditingId(null);
    setEditingTitle("");
  };

  // PUBLIC_INTERFACE
  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const onNewKeyDown = (e) => {
    if (e.key === "Enter") addTask();
  };

  const onEditKeyDown = (e) => {
    if (e.key === "Enter") saveEditing();
    if (e.key === "Escape") cancelEditing();
  };

  return (
    <div className="todoApp">
      <header className="todoHeader">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <h1 className="title">To‑Do</h1>
            <p className="subtitle">
              {remainingCount} remaining <span className="dot">•</span> {completedCount} completed
            </p>
          </div>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearCompleted}
            disabled={completedCount === 0}
            aria-disabled={completedCount === 0}
            title={completedCount === 0 ? "No completed tasks to clear" : "Clear completed tasks"}
          >
            Clear completed
          </button>
        </div>
      </header>

      <main className="todoMain">
        <section className="card">
          <label className="label" htmlFor="new-task">
            Add a task
          </label>
          <div className="inputRow">
            <input
              ref={inputRef}
              id="new-task"
              className="input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={onNewKeyDown}
              placeholder="e.g., Buy groceries"
              autoComplete="off"
            />
            <button type="button" className="btn btn-primary" onClick={addTask} disabled={!newTitle.trim()}>
              Add
            </button>
          </div>
          <p className="hint">Tip: Press Enter to add quickly.</p>
        </section>

        <section className="card cardList" aria-label="Task list">
          {tasks.length === 0 ? (
            <div className="emptyState" role="status" aria-live="polite">
              <div className="emptyTitle">No tasks yet</div>
              <div className="emptyText">Add your first task above to get started.</div>
            </div>
          ) : (
            <ul className="taskList">
              {tasks.map((task) => {
                const isEditing = editingId === task.id;

                return (
                  <li key={task.id} className={`taskItem ${task.completed ? "completed" : ""}`}>
                    <div className="taskLeft">
                      <button
                        type="button"
                        className={`check ${task.completed ? "checked" : ""}`}
                        onClick={() => toggleCompleted(task.id)}
                        aria-label={task.completed ? `Mark "${task.title}" as not completed` : `Mark "${task.title}" as completed`}
                        title={task.completed ? "Mark as not completed" : "Mark as completed"}
                      >
                        <span className="checkIcon" aria-hidden="true">
                          ✓
                        </span>
                      </button>

                      {!isEditing ? (
                        <div className="taskText">
                          <div className="taskTitle">{task.title}</div>
                        </div>
                      ) : (
                        <div className="taskEdit">
                          <input
                            ref={editInputRef}
                            className="input input-small"
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={onEditKeyDown}
                            aria-label="Edit task title"
                          />
                          <div className="editActions">
                            <button type="button" className="btn btn-primary btn-small" onClick={saveEditing}>
                              Save
                            </button>
                            <button type="button" className="btn btn-ghost btn-small" onClick={cancelEditing}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="taskActions">
                        <button
                          type="button"
                          className="iconBtn"
                          onClick={() => startEditing(task)}
                          aria-label={`Edit "${task.title}"`}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="iconBtn iconDanger"
                          onClick={() => deleteTask(task.id)}
                          aria-label={`Delete "${task.title}"`}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="taskActions" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="todoFooter">
        <div className="footerInner">
          <span className="footerText">Minimal to‑do list • Local storage</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
