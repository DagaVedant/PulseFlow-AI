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
        // Dark space theme — NASA mission control aesthetic
        space: {
          950: "#030712",
          900: "#0a0e1a",
          800: "#0f1629",
          700: "#141d38",
          600: "#1a2545",
          500: "#1e2d52",
        },
        // Status colors
        pulse: {
          healthy: "#00ff88",
          warning: "#ffaa00",
          critical: "#ff3b3b",
          info: "#3b82f6",
        },
        // Brand accent
        accent: {
          DEFAULT: "#3b82f6",
          dim: "#1d4ed8",
          glow: "#60a5fa",
        },
        // Severity
        severity: {
          low: "#22c55e",
          medium: "#f59e0b",
          high: "#ef4444",
          critical: "#dc2626",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "scan": "scan 2s linear infinite",
        "flow": "flow 1.5s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(59, 130, 246, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.9), 0 0 40px rgba(59, 130, 246, 0.4)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.95)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
        "radar": "radial-gradient(circle at center, rgba(59,130,246,0.1) 0%, transparent 70%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
      boxShadow: {
        "dept-healthy": "0 0 20px rgba(0,255,136,0.2), inset 0 0 20px rgba(0,255,136,0.05)",
        "dept-warning": "0 0 20px rgba(255,170,0,0.2), inset 0 0 20px rgba(255,170,0,0.05)",
        "dept-critical": "0 0 20px rgba(255,59,59,0.3), inset 0 0 20px rgba(255,59,59,0.1)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
        "glow-blue": "0 0 30px rgba(59,130,246,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
