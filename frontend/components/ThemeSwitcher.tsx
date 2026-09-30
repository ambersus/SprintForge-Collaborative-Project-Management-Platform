"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { useAccent } from "./ThemeProvider";

const ACCENTS = [
  { id: "violet", color: "bg-[#5E6AD2]" },
  { id: "blue", color: "bg-[#3B82F6]" },
  { id: "emerald", color: "bg-[#10B981]" },
  { id: "rose", color: "bg-[#F43F5E]" },
  { id: "amber", color: "bg-[#F59E0B]" },
] as const;

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn-icon text-ink-muted hover:text-ink hover:bg-background"
        aria-label="Theme settings"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-64 bg-surface rounded-xl shadow-modal border border-border flex flex-col z-50 animate-toast-in text-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-background font-semibold text-ink">
            Personalization
          </div>
          
          <div className="p-4 space-y-5">
            {/* Dark Mode Toggle */}
            <div>
              <p className="label mb-2">Appearance</p>
              <div className="flex bg-background rounded-lg p-1 border border-border">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${theme === "light" ? "bg-surface shadow-xs text-ink" : "text-ink-muted hover:text-ink"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${theme === "dark" ? "bg-surface shadow-xs text-ink" : "text-ink-muted hover:text-ink"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  Dark
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <p className="label mb-2">Accent Color</p>
              <div className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id as any)}
                    className={`w-6 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink ${a.color} ${accent === a.id ? "ring-2 ring-ink ring-offset-2 ring-offset-surface scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"}`}
                    aria-label={`Select ${a.id} accent`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
