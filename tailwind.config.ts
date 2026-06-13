import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "1.5rem",
        lg: "2rem",
      },
    },
    extend: {
      borderRadius: {
        app: "0.75rem",
        "app-lg": "1rem",
      },
      fontSize: {
        "app-xs": ["0.75rem", { lineHeight: "1rem" }],
        "app-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        "app-base": ["1rem", { lineHeight: "1.5rem" }],
      },
      colors: {
        ocean: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
      },
    },
  },
} satisfies Config;
