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
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const normalizedForm = {
    ...form,
    name: form.name.trim(),
    email: form.email.trim()
  };
  const emailLooksValid = !normalizedForm.email || /.+@.+\..+/.test(normalizedForm.email);
  const canSubmit = !!normalizedForm.name && !!normalizedForm.email && !!form.password && emailLooksValid && !loading;

  const strength = (() => {
    const value = form.password;
    if (!value) {
      return { label: "Empty", score: 0 };
    }
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    const label = ["Weak", "Okay", "Good", "Strong"][Math.max(0, score - 1)] || "Weak";
    return { label, score };
  })();

  const handleRegister = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({ name: "", email: "", password: "" });

    try {
      const payload = {
        ...normalizedForm,
        email: normalizedForm.email.toLowerCase()
      };
      await registerApi(payload);
      setSuccess("Registration successful. Please login.");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "employee"
      });
    } catch (err) {
      const message = err.message || "Registration failed";
      if (message.toLowerCase().includes("user already exists")) {
        setFieldErrors({
          name: "",
          email: "This email is already registered.",
          password: ""
        });
      } else if (message.toLowerCase().includes("name, email, and password are required")) {
        setFieldErrors({
          name: "Name is required.",
          email: "Email is required.",
          password: "Password is required."
        });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel auth-panel">
      <h2>Register</h2>

      <form onSubmit={handleRegister} noValidate>
        <input
          placeholder="Full name"
          autoComplete="name"
          value={form.name}
          onChange={e => handleChange("name", e.target.value)}
          onBlur={e => {
            handleChange("name", e.target.value.trim());
            setTouched(prev => ({ ...prev, name: true }));
          }}
        />
        {fieldErrors.name && <p className="error">{fieldErrors.name}</p>}

        <input
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={e => handleChange("email", e.target.value)}
          onBlur={e => {
            handleChange("email", e.target.value.trim());
            setTouched(prev => ({ ...prev, email: true }));
          }}
        />
        {!emailLooksValid && touched.email && <p className="error">Please enter a valid email.</p>}
        {fieldErrors.email && <p className="error">{fieldErrors.email}</p>}

        <div className="input-row">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete="new-password"
            value={form.password}
            onChange={e => handleChange("password", e.target.value)}
            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
          />
          <button
            type="button"
            className="toggle-btn"
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors.password && <p className="error">{fieldErrors.password}</p>}
        <div className="password-meter" aria-live="polite">
          <div className={`password-meter-bar password-meter-${strength.score}`} />
          <span className="password-meter-label">Strength: {strength.label}</span>
        </div>

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
          type="submit"
          disabled={!canSubmit}
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>

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
