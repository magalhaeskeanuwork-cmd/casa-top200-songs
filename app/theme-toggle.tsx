"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="casa-theme-control">
      <span className="casa-theme-icon">◐</span>

      <select
        className="casa-theme-select"
        value={theme}
        onChange={(event) =>
          setTheme(event.target.value as "auto" | "light" | "dark")
        }
        aria-label="Escolher tema"
      >
        <option value="auto">Automático</option>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
      </select>
    </div>
  );
}