/** @type {import('tailwindcss').Config} */
import { accents } from '../tailwind.config.js';

// Same accent remap as the app (../tailwind.config.js) — imported, not copied,
// so the two never drift. Content only scans this package's own src: the DS
// bundle should carry exactly the utility classes its own components use.
export default {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: accents,
        },
    },
    plugins: [],
};
