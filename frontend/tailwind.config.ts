import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: {
          DEFAULT: "var(--accent)",
          contrast: "var(--accent-contrast)",
        },
        status: {
          safe: "var(--status-safe)",
          flagged: "var(--status-flagged)",
          critical: "var(--status-critical)",
        },
        safe: {
          soft: "var(--safe-soft)",
          line: "var(--safe-line)",
          ink: "var(--safe-ink)",
        },
        flag: {
          soft: "var(--flag-soft)",
          line: "var(--flag-line)",
          ink: "var(--flag-ink)",
        },
        crit: {
          soft: "var(--crit-soft)",
          line: "var(--crit-line)",
          ink: "var(--crit-ink)",
        },
        // Back-compat aliases so existing clinical-* utilities theme automatically.
        clinical: {
          canvas: "var(--canvas)",
          surface: "var(--surface)",
          border: "var(--line)",
          "text-strong": "var(--ink)",
          "text-muted": "var(--muted)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
