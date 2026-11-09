"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "auto" | "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getTimeTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    const savedTheme = localStorage.getItem("casa-theme") as Theme | null;

    if (savedTheme === "auto" || savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const activeTheme = theme === "auto" ? getTimeTheme() : theme;
      document.documentElement.dataset.theme = activeTheme;
    };

    applyTheme();

    const interval = window.setInterval(applyTheme, 60000);

    return () => window.clearInterval(interval);
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    localStorage.setItem("casa-theme", newTheme);
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser utilizado dentro de ThemeProvider");
  }

  return context;
}