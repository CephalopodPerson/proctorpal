import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic palette — keep proctoring states readable.
        violation: {
          DEFAULT: "#dc2626",
          soft: "#fee2e2",
        },
        ok: {
          DEFAULT: "#16a34a",
          soft: "#dcfce7",
        },
        warn: {
          DEFAULT: "#d97706",
          soft: "#fef3c7",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
