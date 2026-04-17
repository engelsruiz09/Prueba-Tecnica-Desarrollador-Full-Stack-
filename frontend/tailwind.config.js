/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Paleta personalizada — dark navy + amber gold
      colors: {
        navy: {
          950: "#050810",
          900: "#080d1a",
          800: "#0d1527",
          700: "#131e36",
          600: "#1a2847",
        },
        amber: {
          gold: "#d4a853",
          light: "#e8c47a",
          muted: "#a07a3a",
        },
        slate: {
          subtle: "#8492a6",
        },
      },
      // Tipografías distintivas cargadas desde Google Fonts en index.html
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],  // para títulos y montos
        ui: ["'DM Sans'", "sans-serif"],                       // para UI general
        mono: ["'JetBrains Mono'", "monospace"],               // para números financieros
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
}