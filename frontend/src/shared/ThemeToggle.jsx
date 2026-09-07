import { useTheme } from "./ThemeContext.jsx";

export default function ThemeToggle() {
  const { mode, toggleMode } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggleMode}
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {mode === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
    </button>
  );
}
