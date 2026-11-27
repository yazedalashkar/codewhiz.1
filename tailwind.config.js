/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0B",
        surface: "#111113",
        elevated: "#18181B",
        ink: "#F5F3EE",
        stone: "#9B9A97",
        accent: "#E85D2A",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"Space Grotesk"', "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', '"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
