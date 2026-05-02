import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0a2e56",
        "primary-content": "#ffffff",
        secondary: "#f59e0b",
        "secondary-content": "#0f172a",
        accent: "#10b981",
        "accent-content": "#0f172a",
        neutral: "#0f172a",
        "neutral-content": "#ffffff",
        info: "#0ea5e9",
        "info-content": "#0f172a",
        success: "#10b981",
        "success-content": "#0f172a",
        warning: "#f59e0b",
        "warning-content": "#0f172a",
        error: "#ef4444",
        "error-content": "#ffffff",
        "base-100": "#ffffff",
        "base-200": "#f8fafc",
        "base-300": "#e2e8f0",
        "base-content": "#0f172a",
        kereta: {
          blue: "#0a2e56",
          orange: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
} as any;

export default config;
