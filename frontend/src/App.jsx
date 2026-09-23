import React, { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function formatDate(date) {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function isOverdue(task) {
  if (task.completed || !task.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.due_date.slice(0, 10)}T00:00:00`);
  return due < today;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Não foi possível realizar a operação.';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadTasks() {
    try {
      setError('');
      const params = new URLSearchParams({
        search,
        status,
      });
      const data = await request(`/api/tasks?${params.toString()}`);
      setTasks(data.tasks || []);
      setTotal(Number(data.total) || 0);
      setCompletedTotal(Number(data.completed) || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadTasks, 250);
    return () => clearTimeout(timer);
  }, [search, status]);

  async function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      setError('');
      await request('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          dueDate: dueDate || null,
        }),
      });
      setTitle('');
      setDueDate('');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    try {
      setError('');
      await request(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(task) {
    try {
      setError('');
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing.title.trim()) return;

    try {
      setSaving(true);
      setError('');
      await request(`/api/tasks/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editing.title.trim(),
          dueDate: editing.dueDate || null,
        }),
      });
      setEditing(null);
      await loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const pendingTotal = Math.max(total - completedTotal, 0);

  const emptyMessage = useMemo(() => {
    if (search) return 'Nenhuma tarefa encontrada para essa busca.';
    if (status === 'pending') return 'Você não tem tarefas pendentes.';
    if (status === 'completed') return 'Você ainda não concluiu nenhuma tarefa.';
    return 'Nenhuma tarefa cadastrada.';
  }, [search, status]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">✓</div>
          <div>
            <strong>Todolist</strong>
            <span>Organize suas tarefas</span>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <p className="eyebrow">MINHAS TAREFAS</p>
            <h1>O que você precisa fazer?</h1>
            <p className="subtitle">Adicione suas tarefas, acompanhe os prazos e marque o que já foi concluído.</p>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span className="stat-icon">☷</span>
            <div>
              <small>Total</small>
              <strong>{total}</strong>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">○</span>
            <div>
              <small>Pendentes</small>
              <strong>{pendingTotal}</strong>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✓</span>
            <div>
              <small>Concluídas</small>
              <strong>{completedTotal}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <form className="add-form" onSubmit={addTask}>
            <div className="input-wrap title-input">
              <label htmlFor="task-title">Nova tarefa</label>
              <input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Estudar Fastify"
                maxLength={255}
              />
            </div>

            <div className="input-wrap date-input">
              <label htmlFor="task-date">Data limite <span>(opcional)</span></label>
              <input
                id="task-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <button className="primary-button" type="submit" disabled={saving || !title.trim()}>
              <span>＋</span> Adicionar
            </button>
          </form>

          {error && (
            <div className="error-message" role="alert">
              <span>!</span> {error}
            </div>
          )}

          <div className="toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarefa..."
                aria-label="Buscar tarefa"
              />
            </div>

            <div className="filters" aria-label="Filtrar tarefas">
              <button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')} type="button">
                Todas
              </button>
              <button className={status === 'pending' ? 'active' : ''} onClick={() => setStatus('pending')} type="button">
                Pendentes
              </button>
              <button className={status === 'completed' ? 'active' : ''} onClick={() => setStatus('completed')} type="button">
                Concluídas
              </button>
            </div>
          </div>

          <div className="task-list">
            {loading ? (
              <div className="state-message">Carregando tarefas...</div>
            ) : tasks.length === 0 ? (
              <div className="state-message empty">
                <div className="empty-icon">✓</div>
                <strong>{emptyMessage}</strong>
                {!search && status === 'all' && <span>Adicione uma nova tarefa acima.</span>}
              </div>
            ) : (
              tasks.map((task) => (
                <article className={`task ${task.completed ? 'completed' : ''}`} key={task.id}>
                  <button
                    className={`check ${task.completed ? 'checked' : ''}`}
                    onClick={() => toggleTask(task)}
                    type="button"
                    aria-label={task.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}
                  >
                    {task.completed ? '✓' : ''}
                  </button>

                  <div className="task-content">
                    <h3>{task.title}</h3>
                    {task.due_date && (
                      <span className={`due ${isOverdue(task) ? 'overdue' : ''}`}>
                        <span>◷</span>
                        {isOverdue(task) ? 'Atrasada · ' : 'Prazo · '}
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>

                  <div className="task-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() =>
                        setEditing({
                          id: task.id,
                          title: task.title,
                          dueDate: task.due_date ? task.due_date.slice(0, 10) : '',
                        })
                      }
                      aria-label="Editar tarefa"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-button delete"
                      onClick={() => deleteTask(task)}
                      aria-label="Excluir tarefa"
                      title="Excluir"
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {editing && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">TAREFA</p>
                <h2>Editar tarefa</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setEditing(null)}>×</button>
            </div>

            <form onSubmit={saveEdit}>
              <div className="input-wrap">
                <label htmlFor="edit-title">Nome</label>
                <input
                  id="edit-title"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  maxLength={255}
                  autoFocus
                />
              </div>

              <div className="input-wrap">
                <label htmlFor="edit-date">Data limite <span>(opcional)</span></label>
                <input
                  id="edit-date"
                  type="date"
                  value={editing.dueDate}
                  onChange={(e) => setEditing({ ...editing, dueDate: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
                <button className="primary-button" type="submit" disabled={saving || !editing.title.trim()}>
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}