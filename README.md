# GeQu

A personal cognitive operating system: capture what is happening, understand it, decide what
matters, act, reflect, adapt. Tasks, habits, journal, body, finance and cognitive training are
sub-features of that loop — not the point of the app. See
[docs/PRODUCT_PRINCIPLES.md](docs/PRODUCT_PRINCIPLES.md).

## Stack

React 19 · TypeScript · Vite · Tailwind · React Router · Clerk (auth) · Neon Postgres (sync) · PWA

## Getting started

```bash
npm ci
cp .env.example .env.local   # fill in the Clerk and Neon values
npm run dev
```

Without `VITE_CLERK_PUBLISHABLE_KEY` the app renders a configuration notice instead of booting —
it will not fall back to an unauthenticated mode, because every screen holds personal data.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build |
| `npm run typecheck` | Types only, no emit |
| `npm run lint` | oxlint |
| `npm run check:emoji` | Guards against emoji the icon font cannot render |

## Layout

```
api/            Vercel serverless functions (one per-user state row in Postgres)
src/app/        Application-wide state
src/routes/     Route tree, layout, error and 404 routes
src/pages/      Screens
src/features/   Feature modules (gym, snowman, training, finance, …)
src/lib/        Shared logic — dates, persistence, scoring, sync, AI
src/components/ Shared UI
docs/           Architecture, product principles, ADRs, progress
```

## Dates

Use `src/lib/datetime.ts` for anything involving a day. It draws the distinction the rest of the
code depends on: an **instant** (`nowInstant()`) is a moment, a **calendar date**
(`todayKey()`, `toLocalDateKey()`) is a day in the user's timezone. Never call `toISOString()` to
get a date — it renders UTC, which files entries under the wrong day for most of the world.

## Documentation

- [Architecture audit](docs/GEQU_ARCHITECTURE_AUDIT.md) — current state, debt, risks
- [Product principles](docs/PRODUCT_PRINCIPLES.md) — the loop, the decision test
- [ADRs](docs/adr/) — routing, state, persistence, sync, design system
- [Progress](docs/GEQU_PROGRESS.md) — per-phase completion reports
