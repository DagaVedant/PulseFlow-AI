import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          canvas: "#F8FAFC",
          surface: "#FFFFFF",
          border: "#E2E8F0",
          "text-strong": "#0F172A",
          "text-muted": "#475569",
        },
        status: {
          safe: "#059669",
          flagged: "#D97706",
          critical: "#DC2626",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
