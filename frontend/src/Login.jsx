import { useState } from "react";
import { loginApi } from "./api";

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const emailValue = email.trim();
  const passwordValue = password;
  const emailLooksValid = !emailValue || /.+@.+\..+/.test(emailValue);
  const canSubmit = !!emailValue && !!passwordValue && emailLooksValid && !loading;

  const handleLogin = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({ email: "", password: "" });

    try {
      const normalizedEmail = emailValue.toLowerCase();
      const res = await loginApi({
        email: normalizedEmail,
        password: passwordValue
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      onLogin(res.user);

    } catch (err) {
      const message = err.message || "Login failed";
      if (message.toLowerCase().includes("email and password are required")) {
        setFieldErrors({
          email: "Email is required.",
          password: "Password is required."
        });
      } else if (message.toLowerCase().includes("invalid credentials")) {
        setFieldErrors({
          email: "",
          password: "Email or password is incorrect."
        });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel auth-panel">
      <h2>Login</h2>

      <form onSubmit={handleLogin} noValidate>
        <input
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={e => {
            setEmail(e.target.value.trim());
            setTouched(prev => ({ ...prev, email: true }));
          }}
        />
        {!emailLooksValid && touched.email && <p className="error">Please enter a valid email.</p>}
        {fieldErrors.email && <p className="error">{fieldErrors.email}</p>}

        <div className="input-row">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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

        <button type="submit" disabled={!canSubmit}>
          {loading ? "Signing in..." : "Login"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      <p className="switch-auth">
        New user?{" "}
        <button type="button" className="link-btn" onClick={onSwitchToRegister}>
          Register
        </button>
      </p>
    </div>
  );
}

export default Login;
