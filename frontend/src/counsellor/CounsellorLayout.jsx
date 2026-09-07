import { Outlet, Link, NavLink } from "react-router-dom";
import { useAuth } from "../shared/AuthContext.jsx";
import { roleLabel, initialsFor } from "../shared/roleLabels.js";
import { ThemeProvider } from "../shared/ThemeContext.jsx";
import ThemeToggle from "../shared/ThemeToggle.jsx";

const navLinkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

function CounsellorLayoutInner() {
  const { auth, logout } = useAuth();
  return (
    <div className="app-shell">
      <div className="top-nav">
        <Link to="/counsellor/dashboard" className="nav-brand">SIH26094 &middot; Counsellor</Link>
        <nav className="nav-links">
          <NavLink to="/counsellor/dashboard" className={navLinkClass}>Dashboard</NavLink>
        </nav>
        <div className="nav-identity">
          <ThemeToggle />
          <Link to="/counsellor/profile" className="identity-chip">
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

export default function CounsellorLayout() {
  return (
    <ThemeProvider role="counsellor">
      <CounsellorLayoutInner />
    </ThemeProvider>
  );
}
