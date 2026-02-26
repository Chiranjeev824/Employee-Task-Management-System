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

const OVERVIEW_PAGE_SIZE = 6;

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

function getDeadlineMeta(deadline) {
  if (!deadline) return { label: "No deadline", className: "deadline-none" };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(deadline);
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Overdue", className: "deadline-overdue" };
  if (diffDays === 0) return { label: "Due today", className: "deadline-today" };
  return { label: `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`, className: "deadline-upcoming" };
}

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
  const [loading, setLoading] = useState(false);
  const [employeeCreateLoading, setEmployeeCreateLoading] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [expandedSummaryKey, setExpandedSummaryKey] = useState("");
  const [openSummaryMenuKey, setOpenSummaryMenuKey] = useState("");
  const [summaryToDelete, setSummaryToDelete] = useState(null);
  const [overviewPage, setOverviewPage] = useState(1);
  const [toast, setToast] = useState(null);
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
    deadline: ""
  });
  const [overviewFilter, setOverviewFilter] = useState({
    query: "",
    status: "All",
    priority: "All",
    fromDate: "",
    toDate: ""
  });

  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const getStatusClass = status => {
    if (status === "Completed") return "status-badge status-completed";
    if (status === "In Progress") return "status-badge status-progress";
    return "status-badge status-pending";
  };

  function pushToast(message, type = "success") {
    setToast({ id: Date.now(), message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    setOverviewPage(1);
  }, [overviewFilter.query, overviewFilter.status, overviewFilter.priority, overviewFilter.fromDate, overviewFilter.toDate]);

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
      const assignee = getAssigneeLabel(task);

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

  const filteredSummaries = useMemo(() => {
    return groupedTaskSummaries.filter(summary => {
      const query = overviewFilter.query.trim().toLowerCase();
      const matchesQuery =
        !query ||
        summary.title.toLowerCase().includes(query) ||
        summary.description.toLowerCase().includes(query);

      const matchesStatus =
        overviewFilter.status === "All" ||
        summary.memberTasks.some(task => task.status === overviewFilter.status);

      const matchesPriority =
        overviewFilter.priority === "All" ||
        summary.memberTasks.some(task => task.priority === overviewFilter.priority);

      const matchesDate = summary.memberTasks.some(task => {
        if (!overviewFilter.fromDate && !overviewFilter.toDate) return true;
        const created = toInputDate(task.createdAt);
        if (!created) return false;
        if (overviewFilter.fromDate && created < overviewFilter.fromDate) return false;
        if (overviewFilter.toDate && created > overviewFilter.toDate) return false;
        return true;
      });

      return matchesQuery && matchesStatus && matchesPriority && matchesDate;
    });
  }, [groupedTaskSummaries, overviewFilter]);

  const totalOverviewPages = Math.max(1, Math.ceil(filteredSummaries.length / OVERVIEW_PAGE_SIZE));
  const pagedSummaries = useMemo(() => {
    const start = (overviewPage - 1) * OVERVIEW_PAGE_SIZE;
    return filteredSummaries.slice(start, start + OVERVIEW_PAGE_SIZE);
  }, [filteredSummaries, overviewPage]);

  const selectedSummary = useMemo(
    () => groupedTaskSummaries.find(item => item.key === expandedSummaryKey) || null,
    [groupedTaskSummaries, expandedSummaryKey]
  );

  const selectedSummaryEmployeeStats = useMemo(() => {
    if (!selectedSummary) return [];

    const map = new Map();
    for (const task of selectedSummary.memberTasks) {
      const assignee = getAssigneeLabel(task);
      if (!map.has(assignee)) {
        map.set(assignee, {
          assignee,
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0
        });
      }
      const row = map.get(assignee);
      row.total += 1;
      if (task.status === "Completed") row.completed += 1;
      else if (task.status === "In Progress") row.inProgress += 1;
      else row.pending += 1;
    }
    return Array.from(map.values());
  }, [selectedSummary]);

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
    setShowEmployeeList(false);
    setExpandedSummaryKey("");
    setOpenSummaryMenuKey("");
    setSummaryToDelete(null);
    setToast(null);
  }

  async function handleStatusChange(taskId, status) {
    try {
      const updated = await updateTaskStatus(taskId, status);
      setTasks(prev => prev.map(task => (task._id === taskId ? updated : task)));
      pushToast("Task status updated");
    } catch (err) {
      setError(err.message || "Unable to update task");
    }
  }

  async function handleDelete(taskId) {
    try {
      setError("");
      await deleteTask(taskId);
      setTasks(prev => prev.filter(task => task._id !== taskId));
      pushToast("Task deleted");
    } catch (err) {
      setError(err.message || "Unable to delete task");
    }
  }

  async function handleDeleteSummary(summary) {
    try {
      setError("");
      setOpenSummaryMenuKey("");
      setSummaryToDelete(null);

      const taskIds = summary.memberTasks.map(task => task._id);
      const results = await Promise.allSettled(taskIds.map(id => deleteTask(id)));
      const failedCount = results.filter(item => item.status === "rejected").length;
      const deletedIds = taskIds.filter((_, index) => results[index].status === "fulfilled");

      if (deletedIds.length) {
        setTasks(prev => prev.filter(task => !deletedIds.includes(task._id)));
      }
      if (expandedSummaryKey === summary.key) {
        setExpandedSummaryKey("");
      }

      if (failedCount) {
        setError(`Deleted ${deletedIds.length} tasks, but ${failedCount} failed.`);
      } else {
        pushToast(`Deleted ${deletedIds.length} tasks from "${summary.title}".`);
      }
    } catch (err) {
      setError(err.message || "Unable to delete task group");
    }
  }

  function handleDuplicateSummary(summary) {
    const firstTask = summary.memberTasks[0];
    setCreateForm({
      title: summary.title,
      description: summary.description === "No description" ? "" : summary.description,
      priority: firstTask?.priority || "Medium",
      status: firstTask?.status || "Pending",
      deadline: toInputDate(firstTask?.deadline)
    });
    setOpenSummaryMenuKey("");
    pushToast("Template copied to Create Task form");
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    try {
      setError("");
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
        pushToast(`Created ${created.count || created.tasks.length} tasks`);
      } else {
        setTasks(prev => [created, ...prev]);
        pushToast(assignees.length ? "Task assigned successfully" : "Unassigned task created");
      }

      setCreateForm({
        title: "",
        description: "",
        priority: "Medium",
        status: "Pending",
        deadline: ""
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

      const payload = {
        name: employeeForm.name.trim(),
        email: employeeForm.email.trim().toLowerCase(),
        password: employeeForm.password
      };

      await createEmployee(payload);
      setEmployeeForm({ name: "", email: "", password: "" });
      await loadEmployees();
      pushToast(`Employee ${payload.name} created`);
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
      prev.includes(email) ? prev.filter(value => value !== email) : [...prev, email]
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

  function exportOverviewCsv() {
    const rows = [];
    for (const summary of filteredSummaries) {
      for (const task of summary.memberTasks) {
        rows.push({
          taskTitle: task.title,
          description: task.description || "",
          assignedTo: getAssigneeLabel(task),
          priority: task.priority,
          status: task.status,
          deadline: toInputDate(task.deadline),
          createdAt: toInputDate(task.createdAt)
        });
      }
    }

    if (!rows.length) {
      pushToast("No rows to export", "error");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(row =>
        headers.map(header => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <main className="app-shell">
        {authView === "login" ? (
          <Login onLogin={setUser} onSwitchToRegister={() => setAuthView("register")} />
        ) : (
          <Register onSwitchToLogin={() => setAuthView("login")} />
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      {toast && <section className={`toast toast-${toast.type}`}>{toast.message}</section>}

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
            <button type="button" className="btn-secondary" onClick={() => setShowEmployeeList(prev => !prev)}>
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
                  <span className="assignee-caret">v</span>
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
                      const isSelected = selectedAssignees.includes(employee.email);
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
          <div className="task-header">
            <h2>Task Overview</h2>
            <button type="button" className="btn-secondary" onClick={exportOverviewCsv}>
              Export CSV
            </button>
          </div>
          <div className="overview-filters">
            <input
              placeholder="Search by task title/description"
              value={overviewFilter.query}
              onChange={e => setOverviewFilter(prev => ({ ...prev, query: e.target.value }))}
            />
            <select
              value={overviewFilter.status}
              onChange={e => setOverviewFilter(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <select
              value={overviewFilter.priority}
              onChange={e => setOverviewFilter(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <label>
              From
              <input
                type="date"
                value={overviewFilter.fromDate}
                onChange={e => setOverviewFilter(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={overviewFilter.toDate}
                onChange={e => setOverviewFilter(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </label>
          </div>

          <div className="task-summary-grid">
            {pagedSummaries.map(summary => (
              <article
                className={`task-summary-card ${expandedSummaryKey === summary.key ? "task-summary-card-active" : ""}`}
                key={summary.key}
                onClick={() => setExpandedSummaryKey(prev => (prev === summary.key ? "" : summary.key))}
              >
                <div className="summary-menu-anchor">
                  <button
                    type="button"
                    className="summary-menu-trigger"
                    onClick={e => {
                      e.stopPropagation();
                      setOpenSummaryMenuKey(prev => (prev === summary.key ? "" : summary.key));
                    }}
                  >
                    ...
                  </button>
                  {openSummaryMenuKey === summary.key && (
                    <div className="summary-menu" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="summary-menu-item"
                        onClick={() => handleDuplicateSummary(summary)}
                      >
                        Duplicate Template
                      </button>
                      <button
                        type="button"
                        className="summary-menu-item summary-menu-danger"
                        onClick={() => setSummaryToDelete(summary)}
                      >
                        Delete Task
                      </button>
                    </div>
                  )}
                </div>
                <div className="summary-head">
                  <h3>{summary.title}</h3>
                </div>
                <p className="muted">{summary.description}</p>
                <p className="summary-meta">Total Assigned: {summary.total}</p>
                <div className="summary-status-row">
                  <span className="status-badge status-pending">Pending: {summary.pending}</span>
                  <span className="status-badge status-progress">In Progress: {summary.inProgress}</span>
                  <span className="status-badge status-completed">Completed: {summary.completed}</span>
                </div>
              </article>
            ))}
            {!pagedSummaries.length && <p className="muted">No tasks found for selected filters.</p>}
          </div>

          <div className="pagination-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOverviewPage(prev => Math.max(1, prev - 1))}
              disabled={overviewPage === 1}
            >
              Previous
            </button>
            <span>Page {overviewPage} of {totalOverviewPages}</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOverviewPage(prev => Math.min(totalOverviewPages, prev + 1))}
              disabled={overviewPage === totalOverviewPages}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {isAdmin && selectedSummary && (
        <section className="panel task-details-panel">
          <h2>{selectedSummary.title} - Member Details</h2>
          <p className="muted">{selectedSummary.description}</p>

          <div className="employee-stats-grid">
            {selectedSummaryEmployeeStats.map(stat => (
              <article className="employee-stat-card" key={stat.assignee}>
                <h4>{stat.assignee}</h4>
                <p>Total: {stat.total}</p>
                <p>Pending: {stat.pending}</p>
                <p>In Progress: {stat.inProgress}</p>
                <p>Completed: {stat.completed}</p>
              </article>
            ))}
          </div>

          <div className="summary-details">
            {selectedSummary.memberTasks.map(task => {
              const deadline = getDeadlineMeta(task.deadline);
              return (
                <article className="task-card" key={task._id}>
                  <h3>{task.title}</h3>
                  <span className={getStatusClass(task.status)}>{task.status}</span>
                  <p className="muted">{task.description || "No description"}</p>
                  <p>Priority: {task.priority}</p>
                  <p>Assigned: {getAssigneeLabel(task)}</p>
                  <p>
                    Deadline: <span className={`deadline-badge ${deadline.className}`}>{deadline.label}</span>
                  </p>
                  <p>Created: {formatDate(task.createdAt)}</p>
                  <p>Updated: {formatDate(task.updatedAt)}</p>
                  <label>
                    Status
                    <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </label>
                  <button className="btn-danger" onClick={() => handleDelete(task._id)}>
                    Delete
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!isAdmin && (
        <section className="panel">
          <h2>Tasks</h2>
          <div className="task-list">
            {tasks.map(task => {
              const deadline = getDeadlineMeta(task.deadline);
              return (
                <article className="task-card" key={task._id}>
                  <h3>{task.title}</h3>
                  <span className={getStatusClass(task.status)}>{task.status}</span>
                  <p className="muted">{task.description || "No description"}</p>
                  <p>Priority: {task.priority}</p>
                  <p>Assigned: {getAssigneeLabel(task)}</p>
                  <p>
                    Deadline: <span className={`deadline-badge ${deadline.className}`}>{deadline.label}</span>
                  </p>
                  <label>
                    Status
                    <select value={task.status} onChange={e => handleStatusChange(task._id, e.target.value)}>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </label>
                </article>
              );
            })}
            {!tasks.length && <p className="muted">No tasks available.</p>}
          </div>
        </section>
      )}

      {summaryToDelete && (
        <div className="modal-backdrop" onClick={() => setSummaryToDelete(null)}>
          <section className="modal-panel" onClick={e => e.stopPropagation()}>
            <h3>Delete "{summaryToDelete.title}"?</h3>
            <p>
              This will delete {summaryToDelete.total} task records for assigned members.
              This action cannot be undone.
            </p>
            <div className="actions">
              <button type="button" className="btn-secondary" onClick={() => setSummaryToDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={() => handleDeleteSummary(summaryToDelete)}>
                Confirm Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
