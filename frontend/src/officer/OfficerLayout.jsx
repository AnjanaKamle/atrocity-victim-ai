import { Outlet, Link, NavLink } from "react-router-dom";
import { useAuth } from "../shared/AuthContext.jsx";
import { roleLabel, initialsFor } from "../shared/roleLabels.js";
import { ThemeProvider } from "../shared/ThemeContext.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";

const navLinkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

function OfficerLayoutInner() {
  const { auth, logout } = useAuth();
  return (
    <div className="app-shell">
      <div className="top-nav">
        <Link to="/officer/dashboard" className="nav-brand">SIH26094 &middot; Officer</Link>
        <nav className="nav-links">
          <NavLink to="/officer/dashboard" className={navLinkClass}>Dashboard</NavLink>
          <NavLink to="/officer/register-victim" className={navLinkClass}>Register Victim</NavLink>
        </nav>
        <div className="nav-identity">
          <ThemeToggle />
          <Link to="/officer/profile" className="identity-chip">
            <span className="identity-avatar">{initialsFor(auth?.identifier)}</span>
            <span className="identity-text">
              <span className="identity-name">{auth?.identifier}</span>
              <span className="identity-role">{roleLabel(auth?.role)}</span>
            </span>
          </Link>
          <button className="secondary" onClick={logout}>Log out</button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}

export default function OfficerLayout() {
  return (
    <ThemeProvider role="officer">
      <OfficerLayoutInner />
    </ThemeProvider>
  );
}
