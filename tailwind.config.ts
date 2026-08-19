import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          soft: "rgb(var(--c-ink-soft) / <alpha-value>)",
          mute: "rgb(var(--c-ink-mute) / <alpha-value>)",
        },
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bdd2ff",
          300: "#90b4ff",
          400: "#5c8bfc",
          500: "#3663f4",
          600: "#1f43e6",
          700: "#1a33ce",
          800: "#1c2da6",
          900: "#1c2c83",
          950: "#141c50",
        },
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        gold: { 400: "#e5b769", 500: "#d09b3e" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.18)",
        lift: "0 2px 4px rgba(16,24,40,.05), 0 24px 48px -20px rgba(16,24,40,.28)",
        ring: "0 0 0 1px rgb(var(--c-line))",
        glow: "0 12px 40px -12px rgba(54,99,244,.55)",
      },
      borderRadius: { xl2: "1.125rem", "4xl": "2rem" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
        drift: {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%,-6%,0) scale(1.12)" },
          "100%": { transform: "translate3d(0,0,0) scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        wave: {
          "0%, 65%, 100%": { transform: "rotate(0deg)" },
          "10%": { transform: "rotate(14deg)" },
          "20%": { transform: "rotate(-8deg)" },
          "30%": { transform: "rotate(14deg)" },
          "40%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(10deg)" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
        shimmer: "shimmer 2.2s infinite",
        "fade-up": "fade-up .5s cubic-bezier(.22,1,.36,1) both",
        marquee: "marquee 32s linear infinite",
        wave: "wave 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
