import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        kereta: {
          blue: "#0a2e56",
          orange: "#f59e0b",
        },
      },
    },
  },
  plugins: [daisyui],
} as any;

(config as any).daisyui = {
  themes: [
    {
      kereta: {
        primary: "#0a2e56",
        secondary: "#f59e0b",
        accent: "#10b981",
        neutral: "#0f172a",
        "base-100": "#ffffff",
        "base-200": "#f8fafc",
        "base-300": "#e2e8f0",
        "base-content": "#0f172a",
        info: "#0ea5e9",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
      },
    },
    "dark",
  ],
};

export default config;
