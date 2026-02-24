import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import Register from "./Register";
import {
  createTask,
  deleteTask,
  fetchDashboard,
  fetchTasks,
  updateTaskStatus
} from "./api";
import "./App.css";

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState("login");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: "Pending",
    deadline: "",
    assignedTo: ""
  });

  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const getStatusClass = status => {
    if (status === "Completed") return "status-badge status-completed";
    if (status === "In Progress") return "status-badge status-progress";
    return "status-badge status-pending";
  };

  async function loadData() {
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      const [dashboardData, tasksData] = await Promise.all([
        fetchDashboard(user.role),
        fetchTasks()
      ]);
      setDashboard(dashboardData);
      setTasks(tasksData);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setDashboard(null);
    setTasks([]);
  }

  async function handleStatusChange(taskId, status) {
    try {
      const updated = await updateTaskStatus(taskId, status);
      setTasks(prev => prev.map(task => (task._id === taskId ? updated : task)));
    } catch (err) {
      setError(err.message || "Unable to update task");
    }
  }

  async function handleDelete(taskId) {
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(task => task._id !== taskId));
    } catch (err) {
      setError(err.message || "Unable to delete task");
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      const payload = {
        ...createForm,
        assignedTo: createForm.assignedTo || undefined,
        deadline: createForm.deadline || undefined
      };
      const created = await createTask(payload);
      setTasks(prev => [created, ...prev]);
      setCreateForm({
        title: "",
        description: "",
        priority: "Medium",
        status: "Pending",
        deadline: "",
        assignedTo: ""
      });
    } catch (err) {
      setError(err.message || "Unable to create task");
    }
  }

  if (!user) {
    return (
      <main className="app-shell">
        {authView === "login" ? (
          <Login
            onLogin={setUser}
            onSwitchToRegister={() => setAuthView("register")}
          />
        ) : (
          <Register onSwitchToLogin={() => setAuthView("login")} />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="panel header">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">
            Logged in as {user.name} ({user.role})
          </p>
        </div>
        <div className="actions">
          <button className="btn-secondary" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn-danger" onClick={handleLogout}>Logout</button>
        </div>
      </section>

      {error && <section className="panel error">{error}</section>}

      {dashboard && (
        <section className="dashboard-grid">
          {Object.entries(dashboard).map(([key, value]) => (
            <article className="panel metric" key={key}>
              <h3>{key}</h3>
              <p>{value}</p>
            </article>
          ))}
        </section>
      )}

      {isAdmin && (
        <section className="panel">
          <h2>Create Task</h2>
          <form className="task-form" onSubmit={handleCreateTask}>
            <input
              placeholder="Title"
              value={createForm.title}
              onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
            <input
              placeholder="Description"
              value={createForm.description}
              onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <input
              placeholder="Assigned User ID (optional)"
              value={createForm.assignedTo}
              onChange={e => setCreateForm(prev => ({ ...prev, assignedTo: e.target.value }))}
            />
            <label>
              Priority
              <select
                value={createForm.priority}
                onChange={e => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={createForm.status}
                onChange={e => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </label>
            <label>
              Deadline
              <input
                type="date"
                value={createForm.deadline}
                onChange={e => setCreateForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </label>
            <button type="submit">Create Task</button>
          </form>
        </section>
      )}

      <section className="panel">
        <h2>Tasks</h2>
        <div className="task-list">
          {tasks.map(task => (
            <article className="task-card" key={task._id}>
              <h3>{task.title}</h3>
              <span className={getStatusClass(task.status)}>{task.status}</span>
              <p className="muted">{task.description || "No description"}</p>
              <p>Priority: {task.priority}</p>
              <p>
                Assigned:{" "}
                {typeof task.assignedTo === "object" ? task.assignedTo?.name || "Unknown" : "Unassigned"}
              </p>
              <label>
                Status
                <select
                  value={task.status}
                  onChange={e => handleStatusChange(task._id, e.target.value)}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </label>
              {isAdmin && (
                <button className="btn-danger" onClick={() => handleDelete(task._id)}>
                  Delete
                </button>
              )}
            </article>
          ))}
          {!tasks.length && <p className="muted">No tasks available.</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
