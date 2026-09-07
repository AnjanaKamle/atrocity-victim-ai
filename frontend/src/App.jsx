import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, RequireRole } from "./shared/AuthContext.jsx";
import Profile from "./shared/Profile.jsx";
import CaseDetail from "./shared/CaseDetail.jsx";

import RoleSelect from "./RoleSelect.jsx";

import OfficerLogin from "./officer/OfficerLogin.jsx";
import OfficerLayout from "./officer/OfficerLayout.jsx";
import OfficerDashboard from "./officer/OfficerDashboard.jsx";
import RegisterVictim from "./officer/RegisterVictim.jsx";

import CounsellorLogin from "./counsellor/CounsellorLogin.jsx";
import CounsellorLayout from "./counsellor/CounsellorLayout.jsx";
import CounsellorDashboard from "./counsellor/CounsellorDashboard.jsx";

import VictimLogin from "./victim/VictimLogin.jsx";
import VictimHome from "./victim/VictimHome.jsx";

// Three fully separate portals -- different login pages, different
// token roles, different themes (see shared/ThemeContext.jsx). Officer
// and counsellor are now distinct dashboards (previously shared one
// "official" layout) with their own routes and RequireRole loginPath.
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RoleSelect />} />

          {/* Officer portal */}
          <Route path="/officer/login" element={<OfficerLogin />} />
          <Route
            path="/officer"
            element={
              <RequireRole roles={["officer"]} loginPath="/officer/login">
                <OfficerLayout />
              </RequireRole>
            }
          >
            <Route path="dashboard" element={<OfficerDashboard />} />
            <Route path="register-victim" element={<RegisterVictim />} />
            <Route path="case/:caseId" element={<CaseDetail />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Counsellor portal */}
          <Route path="/counsellor/login" element={<CounsellorLogin />} />
          <Route
            path="/counsellor"
            element={
              <RequireRole roles={["counsellor"]} loginPath="/counsellor/login">
                <CounsellorLayout />
              </RequireRole>
            }
          >
            <Route path="dashboard" element={<CounsellorDashboard />} />
            <Route path="case/:caseId" element={<CaseDetail />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Victim portal */}
          <Route path="/victim/login" element={<VictimLogin />} />
          <Route
            path="/victim/dashboard"
            element={
              <RequireRole roles={["victim"]} loginPath="/victim/login">
                <VictimHome />
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
