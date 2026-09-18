"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 text-xs text-ink/60 hover:text-ink transition-colors w-full"
      title={theme === "dark" ? "Mudar pra tema claro" : "Mudar pra tema escuro"}
    >
      {theme === "dark" ? (
        <>
          <span className="text-base leading-none">☀️</span> Tema claro
        </>
      ) : (
        <>
          <span className="text-base leading-none">🌙</span> Tema escuro
        </>
      )}
    </button>
  );
}
