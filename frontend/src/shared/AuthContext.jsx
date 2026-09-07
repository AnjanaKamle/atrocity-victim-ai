import { createContext, useContext, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { loginRequest, setToken, clearToken, setStoredAuth, getStoredAuth } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth()); // null | { identifier, role, accountType, mustChangePassword }

  const login = useCallback(async (identifier, password) => {
    const data = await loginRequest(identifier, password);
    setToken(data.access_token);
    const info = {
      identifier,
      role: data.role,
      accountType: data.account_type,
      mustChangePassword: data.must_change_password,
    };
    setStoredAuth(info);
    setAuth(info);
    return info;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuth(null);
  }, []);

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Wrap any route element: <RequireRole roles={['officer']} loginPath="/officer/login">
// loginPath is explicit now that each portal (victim/officer/counsellor)
// has its own login route rather than one shared "/official/login".
export function RequireRole({ roles, loginPath, children }) {
  const { auth } = useAuth();
  if (!auth || !roles.includes(auth.role)) {
    return <Navigate to={loginPath} replace />;
  }
  return children;
}
