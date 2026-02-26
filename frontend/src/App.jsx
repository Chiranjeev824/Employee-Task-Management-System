import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import Register from "./Register";
import {
  createTask,
  deleteTask,
  fetchDashboard,
  fetchEmployees,
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
  const [employees, setEmployees] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");
    try {
      const requests = [fetchDashboard(user.role), fetchTasks()];
      if (user.role === "admin") {
        requests.push(fetchEmployees());
      }

      const [dashboardData, tasksData, employeesData] = await Promise.all(requests);
      setDashboard(dashboardData);
      setTasks(tasksData);
      if (user.role === "admin") {
        setEmployees(employeesData || []);
      }
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
    setEmployees([]);
    setSelectedAssignees([]);
    setSuccess("");
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
      setError("");
      setSuccess("");
      await deleteTask(taskId);
      setTasks(prev => prev.filter(task => task._id !== taskId));
    } catch (err) {
      setError(err.message || "Unable to delete task");
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");

      const assignees = [...new Set(selectedAssignees.filter(Boolean))];

      const payload = {
        ...createForm,
        assignedTo: assignees.length === 1 ? assignees[0] : undefined,
        assignees: assignees.length > 1 ? assignees : undefined,
        deadline: createForm.deadline || undefined
      };

      const created = await createTask(payload);
      if (Array.isArray(created?.tasks)) {
        setTasks(prev => [...created.tasks, ...prev]);
        setSuccess(`Created ${created.count || created.tasks.length} tasks successfully.`);
      } else {
        setTasks(prev => [created, ...prev]);
        setSuccess(assignees.length ? "Task assigned successfully." : "Unassigned task created successfully.");
      }

      setCreateForm({
        title: "",
        description: "",
        priority: "Medium",
        status: "Pending",
        deadline: "",
        assignedTo: ""
      });
      setSelectedAssignees([]);
    } catch (err) {
      setError(err.message || "Unable to create task");
    }
  }

  function handleAssigneeChange(event) {
    const values = Array.from(event.target.selectedOptions, option => option.value);
    setSelectedAssignees(values);
  }

  function handleAssignAllEmployees() {
    setSelectedAssignees(employees.map(employee => employee.email));
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
      {success && <section className="panel success">{success}</section>}

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
            <label>
              Assign Employees
              <select multiple value={selectedAssignees} onChange={handleAssigneeChange}>
                {employees.map(employee => (
                  <option key={employee._id} value={employee.email}>
                    {employee.name} ({employee.email})
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button type="button" className="btn-secondary" onClick={handleAssignAllEmployees}>
                Assign to all employees
              </button>
              <button type="button" className="btn-secondary" onClick={() => setSelectedAssignees([])}>
                Clear assignees
              </button>
            </div>
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
