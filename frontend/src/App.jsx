import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import Register from "./Register";
import {
  createEmployee,
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
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeCreateLoading, setEmployeeCreateLoading] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [expandedSummaryKey, setExpandedSummaryKey] = useState("");
  const [authView, setAuthView] = useState("login");
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    password: ""
  });
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

  const getAssigneeLabel = task => {
    if (!task.assignedTo) return "Unassigned";

    if (typeof task.assignedTo === "object") {
      return task.assignedTo?.name || task.assignedTo?.email || "Assigned";
    }

    if (typeof task.assignedTo === "string") {
      return task.assignedTo === user?._id ? "You" : "Assigned";
    }

    return "Assigned";
  };

  const groupedTaskSummaries = useMemo(() => {
    if (!isAdmin) return [];

    const map = new Map();
    for (const task of tasks) {
      const key = `${task.title}::${task.description || ""}`;
      const assignee =
        typeof task.assignedTo === "object"
          ? task.assignedTo?.name || task.assignedTo?.email || "Assigned"
          : task.assignedTo || "Unassigned";

      if (!map.has(key)) {
        map.set(key, {
          key,
          title: task.title,
          description: task.description || "No description",
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          assignees: new Set(),
          memberTasks: []
        });
      }

      const summary = map.get(key);
      summary.total += 1;
      if (task.status === "Completed") summary.completed += 1;
      else if (task.status === "In Progress") summary.inProgress += 1;
      else summary.pending += 1;
      summary.assignees.add(assignee);
      summary.memberTasks.push(task);
    }

    return Array.from(map.values()).map(item => ({
      ...item,
      assignees: Array.from(item.assignees)
    }));
  }, [tasks, isAdmin]);

  const selectedSummary = useMemo(
    () => groupedTaskSummaries.find(item => item.key === expandedSummaryKey) || null,
    [groupedTaskSummaries, expandedSummaryKey]
  );

  async function loadEmployees() {
    const employeesResult = await fetchEmployees()
      .then(data => ({ ok: true, data }))
      .catch(err => ({ ok: false, error: err }));

    if (employeesResult.ok) {
      setEmployees(employeesResult.data || []);
      setEmployeeLoadError("");
      return;
    }

    setEmployees([]);
    setEmployeeLoadError(employeesResult.error?.message || "Failed to load employee list");
  }

  async function loadData() {
    if (!user) return;

    setLoading(true);
    setError("");
    setEmployeeLoadError("");
    setSuccess("");
    try {
      const [dashboardResult, tasksResult] = await Promise.allSettled([
        fetchDashboard(user.role),
        fetchTasks()
      ]);

      if (dashboardResult.status === "fulfilled") {
        setDashboard(dashboardResult.value);
      } else {
        setError(dashboardResult.reason?.message || "Failed to load dashboard");
      }

      if (tasksResult.status === "fulfilled") {
        setTasks(tasksResult.value);
      } else {
        setError(prev => prev || tasksResult.reason?.message || "Failed to load tasks");
      }

      if (user.role === "admin") {
        await loadEmployees();
      }
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
    setAssigneeMenuOpen(false);
    setEmployeeLoadError("");
    setSuccess("");
    setShowEmployeeList(false);
    setExpandedSummaryKey("");
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
      setAssigneeMenuOpen(false);
    } catch (err) {
      setError(err.message || "Unable to create task");
    }
  }

  async function handleCreateEmployee(e) {
    e.preventDefault();
    try {
      setEmployeeCreateLoading(true);
      setError("");
      setSuccess("");

      const payload = {
        name: employeeForm.name.trim(),
        email: employeeForm.email.trim().toLowerCase(),
        password: employeeForm.password
      };

      await createEmployee(payload);
      setSuccess(`Employee ${payload.name} created successfully.`);
      setEmployeeForm({ name: "", email: "", password: "" });
      await loadEmployees();
    } catch (err) {
      setError(err.message || "Unable to create employee");
    } finally {
      setEmployeeCreateLoading(false);
    }
  }

  function handleAssignAllEmployees() {
    setSelectedAssignees(employees.map(employee => employee.email));
  }

  function toggleAssignee(email) {
    setSelectedAssignees(prev =>
      prev.includes(email)
        ? prev.filter(value => value !== email)
        : [...prev, email]
    );
  }

  function getAssigneeDropdownLabel() {
    if (!selectedAssignees.length) return "Select employees";
    if (selectedAssignees.length === employees.length) return "All employees selected";
    if (selectedAssignees.length === 1) {
      const employee = employees.find(item => item.email === selectedAssignees[0]);
      return employee ? employee.name : "1 employee selected";
    }
    return `${selectedAssignees.length} employees selected`;
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
        <section className="panel admin-grid">
          <article className="panel admin-card">
            <h2>Add Employee</h2>
            <form className="task-form" onSubmit={handleCreateEmployee}>
              <input
                placeholder="Employee name"
                value={employeeForm.name}
                onChange={e => setEmployeeForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              <input
                placeholder="Employee email"
                type="email"
                value={employeeForm.email}
                onChange={e => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
              <input
                placeholder="Temporary password"
                type="password"
                value={employeeForm.password}
                onChange={e => setEmployeeForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
              <button type="submit" disabled={employeeCreateLoading}>
                {employeeCreateLoading ? "Creating..." : "Add Employee"}
              </button>
            </form>
          </article>
        </section>
      )}

      {isAdmin && (
        <section className="panel">
          <div className="task-header">
            <h2>Create Task</h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowEmployeeList(prev => !prev)}
            >
              {showEmployeeList ? "Hide Employee List" : "Show Employee List"}
            </button>
          </div>
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
              <div className="assignee-dropdown">
                <button
                  type="button"
                  className="assignee-trigger"
                  onClick={() => setAssigneeMenuOpen(prev => !prev)}
                >
                  <span>{getAssigneeDropdownLabel()}</span>
                  <span className="assignee-caret">▾</span>
                </button>
                {assigneeMenuOpen && (
                  <div className="assignee-menu">
                    {!employees.length && <p className="muted">No employees found.</p>}
                    {employees.map(employee => (
                      <label key={employee._id} className="assignee-option">
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(employee.email)}
                          onChange={() => toggleAssignee(employee.email)}
                        />
                        <span>{employee.name} ({employee.email})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <div className="actions">
              <button type="button" className="btn-secondary" onClick={handleAssignAllEmployees}>
                Assign to all employees
              </button>
            </div>
            <div className="task-action-row">
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
            </div>
            {showEmployeeList && (
              <div className="panel employee-list employee-side">
                <h3>Employee List</h3>
                {employees.length ? (
                  <div className="employee-list-grid">
                    {employees.map(employee => {
                      const isSelected =
                        selectedAssignees.includes(employee.email);
                      return (
                        <article
                          key={employee._id}
                          className={`employee-item ${isSelected ? "employee-item-selected" : ""}`}
                        >
                          <p><strong>Name:</strong> {employee.name}</p>
                          <p><strong>Email:</strong> {employee.email}</p>
                          <p><strong>User ID:</strong> {employee._id}</p>
                          <p><strong>Will Receive Task:</strong> {isSelected ? "Yes" : "No"}</p>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">No employees found.</p>
                )}
                {employeeLoadError && <p className="error">{employeeLoadError}</p>}
              </div>
            )}
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="panel">
          <h2>Task Overview</h2>
          <div className="task-summary-grid">
            {groupedTaskSummaries.map(summary => (
              <article
                className={`task-summary-card ${expandedSummaryKey === summary.key ? "task-summary-card-active" : ""}`}
                key={summary.key}
                onClick={() =>
                  setExpandedSummaryKey(prev => (prev === summary.key ? "" : summary.key))
                }
              >
                <div className="summary-head">
                  <h3>{summary.title}</h3>
                  <span className="muted">{expandedSummaryKey === summary.key ? "Selected" : "View details"}</span>
                </div>
                <p className="muted">{summary.description}</p>
                <p className="summary-meta">Total Assigned: {summary.total}</p>
                <div className="summary-status-row">
                  <span className="status-badge status-pending">Pending: {summary.pending}</span>
                  <span className="status-badge status-progress">In Progress: {summary.inProgress}</span>
                  <span className="status-badge status-completed">Completed: {summary.completed}</span>
                </div>
                <div className="assignee-chip-row">
                  {summary.assignees.map(name => (
                    <span className="assignee-chip" key={name}>{name}</span>
                  ))}
                </div>
              </article>
            ))}
            {!groupedTaskSummaries.length && <p className="muted">No tasks available.</p>}
          </div>
        </section>
      )}

      {isAdmin && selectedSummary && (
        <section className="panel task-details-panel">
          <h2>{selectedSummary.title} - Member Details</h2>
          <p className="muted">{selectedSummary.description}</p>
          <div className="summary-details">
            {selectedSummary.memberTasks.map(task => (
              <article className="task-card" key={task._id}>
                <h3>{task.title}</h3>
                <span className={getStatusClass(task.status)}>{task.status}</span>
                <p className="muted">{task.description || "No description"}</p>
                <p>Priority: {task.priority}</p>
                <p>Assigned: {getAssigneeLabel(task)}</p>
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
                <button className="btn-danger" onClick={() => handleDelete(task._id)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {!isAdmin && (
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
                  {getAssigneeLabel(task)}
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
              </article>
            ))}
            {!tasks.length && <p className="muted">No tasks available.</p>}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
