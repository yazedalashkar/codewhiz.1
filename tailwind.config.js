/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#120E24",
        plum: "#1D1740",
        haze: "#2C2560",
        bone: "#F3EEFF",
        flare: "#FF5C8A",
        iris: "#7B61FF",
        sun: "#FFC857",
      },
      fontFamily: {
        display: ["Lalezar", '"Readex Pro"', "system-ui", "sans-serif"],
        sans: ['"Readex Pro"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { blob: "28px 28px 28px 8px" },
    },
  },
  plugins: [],
};
