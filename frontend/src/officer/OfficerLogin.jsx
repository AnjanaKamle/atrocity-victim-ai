import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../shared/AuthContext.jsx";
import { ThemeProvider } from "../shared/ThemeContext.jsx";

function OfficerLoginInner() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/officer/dashboard");
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={handleSubmit}>
        <Link to="/" className="back-link">&larr; Back to role select</Link>
        <h2>Officer Login</h2>
        <p className="dim">Case registration &amp; alert review</p>
        <label>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error-text">{error}</p>}
        <button className="primary" type="submit">Log in</button>
      </form>
    </div>
  );
}

export default function OfficerLogin() {
  return (
    <ThemeProvider role="officer">
      <OfficerLoginInner />
    </ThemeProvider>
  );
}
