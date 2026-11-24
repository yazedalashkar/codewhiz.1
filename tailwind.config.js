/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#09090B",
        surface: "#111114",
        elevated: "#18181B",
        accent: "#38BDF8",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
