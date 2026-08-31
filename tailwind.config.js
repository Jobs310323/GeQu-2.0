/** @type {import('tailwindcss').Config} */

/*
 * Tailwind is wired to `src/styles/tokens.css`, not to literal hex.
 *
 * Two things make that work, and both matter:
 *
 * 1. Every colour is `rgb(var(--token-rgb) / <alpha-value>)`. Tailwind
 *    substitutes the opacity modifier into that slot, so `bg-cyan-400/10`,
 *    `border-cyan-400/30` and `text-white/80` keep working — there are ~500
 *    such call sites and a bare `var(--x)` would have silently dropped the
 *    alpha on all of them.
 *
 * 2. `colors` and `textColor` are deliberately given DIFFERENT values for the
 *    same scale name. `colors` is the fill tone (buttons, borders, gradients);
 *    `textColor` is the ink tone (readable on the page background). The same
 *    `cyan-400` has to be both, and one value cannot serve both jobs across
 *    two themes — a fill light enough to carry black button text is far too
 *    faint as 13px body text on a white page.
 *
 * That split is what allowed the ~25 `:root.light .text-…` specificity
 * overrides to be deleted from `index.css`: the token flips with the theme, so
 * no rule has to out-rank another.
 */

const alpha = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** Fill tones: buttons, borders, gradients, washes. Identical in both themes. */
const surfaceScale = (hue) => ({
    300: alpha(`--gq-${hue}-300-rgb`),
    400: alpha(`--gq-${hue}-400-rgb`),
    500: alpha(`--gq-${hue}-500-rgb`),
});

/** Ink tones: text on the page. Flip per theme. One value per hue — the
 *  numbered steps all resolve to it so `text-cyan-300/400/500` stay legible. */
const inkScale = (hue) => {
    const v = alpha(`--gq-${hue}-ink-rgb`);
    return { 300: v, 400: v, 500: v };
};

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                cyan: surfaceScale('cyan'),
                purple: surfaceScale('purple'),
                pink: surfaceScale('pink'),
                green: surfaceScale('green'),
                red: surfaceScale('red'),
                yellow: surfaceScale('yellow'),
                emerald: surfaceScale('green'),
                rose: surfaceScale('red'),
                blue: { 400: alpha('--gq-blue-400-rgb') },
                orange: { 400: alpha('--gq-orange-400-rgb') },

                /* `white` is the translucent-veil channel, so `bg-white/5`,
                   `border-white/10` and `ring-white` invert on the light theme
                   instead of vanishing into it. `black` is left as real black
                   on purpose: its uses are modal scrims and sunken wells, both
                   of which should stay dark in both themes. */
                white: alpha('--gq-veil-rgb'),

                /* Semantic names for new code. Prefer these over hue names. */
                surface: {
                    canvas: alpha('--gq-surface-canvas-rgb'),
                    raised: alpha('--gq-surface-raised-rgb'),
                    sunken: alpha('--gq-surface-sunken-rgb'),
                    overlay: alpha('--gq-surface-overlay-rgb'),
                },
                success: alpha('--gq-green-400-rgb'),
                warning: alpha('--gq-yellow-400-rgb'),
                danger: alpha('--gq-red-400-rgb'),
                info: alpha('--gq-blue-400-rgb'),
            },

            textColor: {
                cyan: inkScale('cyan'),
                purple: inkScale('purple'),
                pink: inkScale('pink'),
                green: inkScale('green'),
                red: inkScale('red'),
                yellow: inkScale('yellow'),
                emerald: inkScale('green'),
                rose: inkScale('red'),
                blue: { 400: alpha('--gq-blue-ink-rgb') },
                orange: { 400: alpha('--gq-yellow-ink-rgb') },

                /* The neutral ink ramp. `text-white` and `text-gray-*` are the
                   two most common utilities in the codebase (~420 uses between
                   them) and were written dark-first; routing them through
                   tokens is what makes the light theme correct by default
                   rather than by override.

                   Contrast against both themes' canvas AND card surfaces is
                   enforced by `npm run check:contrast`. Stock Tailwind
                   `gray-500` on the dark canvas measured 4.0:1 — below AA —
                   which is why these are not the stock values. */
                white: alpha('--gq-text-primary-rgb'),
                gray: {
                    200: alpha('--gq-text-primary-rgb'),
                    300: alpha('--gq-text-secondary-rgb'),
                    400: alpha('--gq-text-tertiary-rgb'),
                    500: alpha('--gq-text-quaternary-rgb'),
                    600: alpha('--gq-text-subtle-rgb'),
                },
                /* Semantic ink for new code. */
                ink: {
                    primary: alpha('--gq-text-primary-rgb'),
                    secondary: alpha('--gq-text-secondary-rgb'),
                    tertiary: alpha('--gq-text-tertiary-rgb'),
                    quaternary: alpha('--gq-text-quaternary-rgb'),
                    subtle: alpha('--gq-text-subtle-rgb'),
                },
                success: alpha('--gq-green-ink-rgb'),
                warning: alpha('--gq-yellow-ink-rgb'),
                danger: alpha('--gq-red-ink-rgb'),
                info: alpha('--gq-blue-ink-rgb'),
            },

            fontFamily: {
                sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
            },

            /* Named elevation alongside Tailwind's stock shadows, so a card can
               ask for a level rather than invent a blur radius. */
            boxShadow: {
                e1: 'var(--gq-shadow-1)',
                e2: 'var(--gq-shadow-2)',
                e3: 'var(--gq-shadow-3)',
                e4: 'var(--gq-shadow-4)',
            },

            /* Semantic layers. A raw `z-50` cannot be reasoned about; these can. */
            zIndex: {
                raised: 'var(--gq-z-raised)',
                sticky: 'var(--gq-z-sticky)',
                nav: 'var(--gq-z-nav)',
                drawer: 'var(--gq-z-drawer)',
                overlay: 'var(--gq-z-overlay)',
                modal: 'var(--gq-z-modal)',
                toast: 'var(--gq-z-toast)',
            },

            transitionDuration: {
                instant: 'var(--gq-duration-instant)',
                fast: 'var(--gq-duration-fast)',
                base: 'var(--gq-duration-base)',
                slow: 'var(--gq-duration-slow)',
            },
            transitionTimingFunction: {
                standard: 'var(--gq-ease-standard)',
                'gq-out': 'var(--gq-ease-out)',
                'gq-in': 'var(--gq-ease-in)',
            },
        },
    },
    plugins: [],
};
