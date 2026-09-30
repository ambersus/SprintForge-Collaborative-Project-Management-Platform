"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { createContext, useContext, useEffect, useState } from "react";

type AccentColor = "violet" | "blue" | "emerald" | "rose" | "amber";

interface ThemeContextType {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>("violet");

  useEffect(() => {
    const saved = localStorage.getItem("sf_accent") as AccentColor;
    if (saved) {
      setAccentState(saved);
      document.documentElement.classList.add(`theme-${saved}`);
    }
  }, []);

  const setAccent = (newAccent: AccentColor) => {
    document.documentElement.classList.remove(`theme-${accent}`);
    document.documentElement.classList.add(`theme-${newAccent}`);
    localStorage.setItem("sf_accent", newAccent);
    setAccentState(newAccent);
  };

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeContext.Provider value={{ accent, setAccent }}>
        {children}
      </ThemeContext.Provider>
    </NextThemesProvider>
  );
}

export function useAccent() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAccent must be used within ThemeProvider");
  return ctx;
}
