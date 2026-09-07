import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../shared/AuthContext.jsx";
import { changePasswordRequest } from "../shared/api.js";
import { ThemeProvider } from "../shared/ThemeContext.jsx";

function VictimLoginInner() {
  const [caseId, setCaseId] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const info = await login(caseId, password);
      if (info.mustChangePassword) {
        setNeedsPasswordChange(true);
      } else {
        navigate("/victim/dashboard");
      }
    } catch {
      setError("Invalid case ID or password.");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Please choose a password with at least 6 characters.");
      return;
    }
    try {
      await changePasswordRequest(caseId, newPassword);
      navigate("/victim/dashboard");
    } catch {
      setError("Could not update password. Please try again.");
    }
  };

  if (needsPasswordChange) {
    return (
      <div className="login-shell">
        <form className="card login-card" onSubmit={handlePasswordChange}>
          <Link to="/" className="back-link">&larr; Back to role select</Link>
          <h2>Set a new password</h2>
          <p className="dim">This is your first time logging in. Please choose your own password.</p>
          <label>New password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
          {error && <p className="error-text">{error}</p>}
          <button className="primary" type="submit">Save password</button>
        </form>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={handleLogin}>
        <Link to="/" className="back-link">&larr; Back to role select</Link>
        <h2>Victim / Complainant Login</h2>
        <p className="dim">Use the Case ID and password given to you by your case officer.</p>
        <label>Case ID</label>
        <input type="text" value={caseId} onChange={(e) => setCaseId(e.target.value)} autoFocus />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error-text">{error}</p>}
        <button className="primary" type="submit">Log in</button>
      </form>
    </div>
  );
}

export default function VictimLogin() {
  return (
    <ThemeProvider role="victim">
      <VictimLoginInner />
    </ThemeProvider>
  );
}
