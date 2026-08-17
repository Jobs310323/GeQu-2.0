/** @type {import('tailwindcss').Config} */

// The UI was written against Tailwind's stock neon-ish palette (cyan-400,
// purple-400, pink-400 …) in ~500 places. Rather than rewrite every call site,
// the accent hues themselves are redefined here. Every utility variant —
// text-, bg-, border-, gradients, /opacity — inherits them at once, in both
// themes.
//
// The values are the GeQu-Checkin-MyCard design palette (see the `--gq-*`
// block in src/index.css), so the pages still on legacy utilities share one
// accent language with the redesigned ones instead of sitting teal-on-violet:
//   cyan   → the primary violet   (--gq-grad-a)
//   purple → the secondary magenta (--gq-grad-b) — `from-cyan-400
//            to-purple-400`, the app's stock button, becomes the design's own
//            gradient without touching a single call site
//   green/emerald → --gq-good, yellow/orange → --gq-warn, pink → --gq-bad
const accents = {
  cyan: { 400: '#7c6cf6', 500: '#6a58ec' },
  purple: { 400: '#c86ce0', 500: '#b757d1' },
  pink: { 400: '#e05d8f', 500: '#cf4a7d' },
  green: { 400: '#4fd1a5', 500: '#3cbb90' },
  emerald: { 300: '#6fdcb8', 400: '#4fd1a5' },
  red: { 400: '#e0566e', 500: '#cd4259' },
  rose: { 300: '#eb8296', 400: '#e0566e' },
  yellow: { 400: '#e0a95d', 500: '#cd9548' },
  orange: { 400: '#e08f5d' },
  blue: { 400: '#8f83f8' },
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
