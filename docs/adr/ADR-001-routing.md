# ADR-001 — Routing: React Router v7

**Status:** Accepted · 2026-08-28

## Context

Navigation is `useState('dashboard')` in `src/App.tsx:34`, with a `PAGES` record mapping ids to
eagerly-constructed elements. Consequences: no URLs, no browser back/forward, no refresh-safety,
no deep links, no shareable state, no route-level code splitting, and `setPage` threaded as a prop
through `Sidebar`, `Dashboard` and `Knowledge`.

The planned IA rework (Today / Plan / Track / Insights / Brain / Profile with today's 19
destinations as sub-routes) requires nested routes. It cannot be expressed as a flat id lookup.

## Decision

Adopt **React Router v7** with `createBrowserRouter` and nested route objects.

- One route per screen; `React.lazy` per route element.
- `errorElement` at the route level plus a feature-level `ErrorBoundary`.
- A catch-all 404 route.
- `src/lib/nav.ts` remains the nav *data* source and gains a `path` per item, so the sidebar,
  the command palette and the router all read one structure.
- Old page ids redirect to their new paths so existing bookmarks survive.

## Consequences

**Positive.** URLs per screen; back/forward and refresh work; deep links and sharing work; the
initial bundle sheds 18 of 19 pages plus Chart.js, `@xyflow/react` and `marked`; `setPage` prop
threading disappears in favour of `useNavigate`/`<NavLink>`; nested layouts become expressible.

**Negative.** One dependency added. Route-level lazy loading introduces suspense boundaries that
must have real loading states rather than blank frames.

**Neutral.** `vercel.json` already rewrites all non-`/api` paths to `index.html`, so no deployment
change is needed. The `/concept-v2` preview path in `main.tsx` is removed when `concept-v2` is
merged (ADR-005), not by this change.

## Alternatives considered

**TanStack Router.** Fully type-safe routes and search params, which is genuinely attractive given
the TypeScript-strict migration. Rejected: its file-based route generation adds a codegen step to
the build for a 19-screen app, and its ecosystem and documentation surface is smaller. The typing
benefit does not pay for the build complexity at this size.

**Keep `useState` and add a `history` shim.** Rejected: reimplements a router badly, and does not
give nested routes, which the IA rework needs.
