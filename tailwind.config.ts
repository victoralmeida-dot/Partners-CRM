import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores via CSS variables (definidas em globals.css) — permite
        // trocar tema claro/escuro sem alterar nenhum componente, já que
        // todo o app usa esses tokens (bg-surface, text-ink, etc) em vez
        // de cores fixas.
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        amber: "rgb(var(--c-amber) / <alpha-value>)",
        rose: "rgb(var(--c-rose) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
