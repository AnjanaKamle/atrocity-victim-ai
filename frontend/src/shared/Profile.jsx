import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { changePasswordRequest } from "./api.js";
import { roleLabel, initialsFor } from "./roleLabels.js";

// NOTE: backend/auth.py's /auth/change-password only requires the
// identifier + a new password -- it doesn't verify the CURRENT password
// first. Fine for the demo, worth tightening before real use.
export default function Profile() {
  const { auth, logout } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (newPassword.length < 8) {
      setStatus({ type: "error", message: "Use at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords don't match." });
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordRequest(auth.identifier, newPassword);
      setStatus({ type: "ok", message: "Password updated. Use it next time you log in." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Couldn't update the password." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Profile</h1>

      <div className="card profile-header">
        <span className="identity-avatar large">{initialsFor(auth?.identifier)}</span>
        <div>
          <div className="profile-name">{auth?.identifier}</div>
          <p className="dim">{roleLabel(auth?.role)} &middot; {auth?.accountType}</p>
        </div>
      </div>

      <div className="card">
        <h3>Change password</h3>
        <p className="dim">Choose something you haven't used elsewhere for this account.</p>
        <form onSubmit={handleChangePassword} style={{ maxWidth: 360 }}>
          <label className="dim">New password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          <label className="dim" style={{ display: "block", marginTop: 12 }}>Confirm new password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          {status && (
            <p className={status.type === "error" ? "error-text" : "success-text"} style={{ marginTop: 10 }}>
              {status.message}
            </p>
          )}
          <button className="primary" type="submit" disabled={submitting} style={{ marginTop: 16 }}>
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Session</h3>
        <p className="dim">Log out on shared or public devices when you're done.</p>
        <button className="secondary" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
