import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#045830",
        "primary-light": "#2f8042",
        "primary-bg": "#daefdc",
        "trust-bg": "#f5fbf9",
        "text-main": "#121212",
        "text-muted": "#767676",
      },
      fontFamily: {
        outfit: ["var(--font-outfit)", "sans-serif"],
        rem: ["var(--font-rem)", "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 45s linear infinite",
      },
      screens: {
        xs: "480px",
        "3xl": "1920px",
      },
    },
  },
  plugins: [typography],
};

export default config;

