/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          // Base surfaces — deep navy/black "command center" feel
          bg: "#07111a",
          panel: "#0b1a26",
          panel2: "#0e2233",
          // Primary accent (matches Business.accent default)
          cyan: "#35e7ff",
          cyanDim: "#1fb6d4",
          // Supporting HUD palette
          green: "#3ef2a5",
          amber: "#ffb224",
          red: "#ff5d5d",
          violet: "#a78bfa",
          // Text + lines on dark surfaces
          ink: "#e8f4fa",
          muted: "#8ba3b3",
          line: "#1d3448",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "hud-glow": "0 0 24px rgba(53, 231, 255, 0.25)",
        "hud-panel": "0 8px 32px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};
