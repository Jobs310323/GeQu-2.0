/** @type {import('tailwindcss').Config} */

// The UI was written against Tailwind's stock neon-ish palette (cyan-400,
// purple-400, pink-400 …) in ~500 places. Rather than rewrite every call site,
// the accent hues themselves are redefined here as desaturated, "strict" tones.
// Every utility variant — text-, bg-, border-, gradients, /opacity — inherits
// them at once, in both themes.
const accents = {
  cyan: { 400: '#7E9AAB', 500: '#6C8697' },
  purple: { 400: '#9490AE', 500: '#807C9B' },
  pink: { 400: '#AE8E9B', 500: '#9C7F8B' },
  green: { 400: '#7D9E86', 500: '#6B8B74' },
  emerald: { 300: '#8FAE98', 400: '#7D9E86' },
  red: { 400: '#B58080', 500: '#A16E6E' },
  rose: { 300: '#C09393', 400: '#B58080' },
  yellow: { 400: '#B0A176', 500: '#9B8D64' },
  orange: { 400: '#B0937A' },
  blue: { 400: '#7E93AB' },
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: accents,
    },
  },
  plugins: [],
}
