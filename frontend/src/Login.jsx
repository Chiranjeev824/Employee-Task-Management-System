import { useState } from "react";
import { loginApi } from "./api";

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await loginApi({
        email,
        password
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      onLogin(res.user);

    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel auth-panel">
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button onClick={handleLogin} disabled={loading || !email || !password}>
        {loading ? "Signing in..." : "Login"}
      </button>
      {error && <p className="error">{error}</p>}
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
