const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

async function request(path, options = {}) {
  const { method = "GET", body, requiresAuth = true } = options;
  const headers = {
    "Content-Type": "application/json"
  };

  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      // Frontend only sends JWT; backend secret key must stay on server only.
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function loginApi(payload) {
  return request("/auth/login", { method: "POST", body: payload, requiresAuth: false });
}

export function registerApi(payload) {
  return request("/auth/register", { method: "POST", body: payload, requiresAuth: false });
}

export function fetchDashboard(role) {
  const path = role === "admin" ? "/dashboard/admin" : "/dashboard/employee";
  return request(path);
}

export function fetchTasks() {
  return request("/tasks");
}

export function updateTaskStatus(taskId, status) {
  return request(`/tasks/${taskId}`, { method: "PUT", body: { status } });
}

export function deleteTask(taskId) {
  return request(`/tasks/${taskId}`, { method: "DELETE" });
}

export function createTask(payload) {
  return request("/tasks", { method: "POST", body: payload });
}
