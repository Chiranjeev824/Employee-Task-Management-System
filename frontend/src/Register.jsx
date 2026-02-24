import { useState } from "react";
import { registerApi } from "./api";

function Register({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await registerApi(form);
      setSuccess("Registration successful. Please login.");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "employee"
      });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel auth-panel">
      <h2>Register</h2>

      <input
        placeholder="Full name"
        value={form.name}
        onChange={e => handleChange("name", e.target.value)}
      />

      <input
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={e => handleChange("email", e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={e => handleChange("password", e.target.value)}
      />

      <label>
        Role
        <select
          value={form.role}
          onChange={e => handleChange("role", e.target.value)}
        >
          <option value="employee">employee</option>
          <option value="admin">admin</option>
        </select>
      </label>

      <button
        onClick={handleRegister}
        disabled={loading || !form.name || !form.email || !form.password}
      >
        {loading ? "Creating account..." : "Register"}
      </button>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <p className="switch-auth">
        Already have an account?{" "}
        <button type="button" className="link-btn" onClick={onSwitchToLogin}>
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;
