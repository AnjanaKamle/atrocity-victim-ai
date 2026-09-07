import { Link } from "react-router-dom";

export default function RoleSelect() {
  return (
    <div className="login-shell">
      <div className="card role-card">
        <h1>&#128272; Setu </h1>
        <p className="dim">Continue as:</p>
        <div className="role-buttons">
          <Link to="/victim/login"><button className="primary big">Victim / Complainant</button></Link>
          <Link to="/officer/login"><button className="secondary big">Officer</button></Link>
          <Link to="/counsellor/login"><button className="secondary big">Counsellor</button></Link>
        </div>
      </div>
    </div>
  );
}
