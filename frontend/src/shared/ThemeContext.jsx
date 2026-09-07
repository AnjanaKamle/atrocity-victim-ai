import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const MODE_KEY = "sih26094_theme_mode";

export function ThemeProvider({ role, children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || "dark");

  useEffect(() => {
    document.documentElement.dataset.role = role;
    document.documentElement.dataset.mode = mode;
  }, [role, mode]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const toggleMode = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ mode, toggleMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
