import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { enUS, ruRU } from '@clerk/localizations'
import './index.css'
import App from './App.tsx'
import { initStorage } from './data'
// Side-effecting: resolves the locale, initialises i18next and sets <html lang>
// before the first render, so nothing paints in the wrong language and then
// flips.
import './i18n'
import { getLocale } from './i18n/locale'

// Migrates localStorage into IndexedDB and opens the write mirror. Deliberately
// not awaited: reads come from localStorage, so nothing on screen depends on
// this finishing, and a failure leaves the app working exactly as before.
void initStorage()

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

// Clerk renders its own sign-in UI, so it needs telling separately. It ships
// these bundles; there is nothing to translate on our side.
const clerkLocale = getLocale() === 'ru' ? ruRU : enUS

const root = createRoot(document.getElementById('root')!)

if (!clerkKey) {
  root.render(
    <div style={{ padding: 40, fontFamily: 'system-ui', color: '#E6E8EC', background: '#0A0B0D', minHeight: '100vh' }}>
      {/* Deliberately not translated: this is a deployment error shown to
          whoever is deploying, before any user-facing locale matters, and it
          must render even if the i18n bundle itself failed to load. */}
      <h1>GeQu is not configured</h1>
      <p>VITE_CLERK_PUBLISHABLE_KEY is not set. Add it to the environment (.env.local locally, Vercel &rarr; Settings &rarr; Environment Variables in production) and rebuild.</p>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={clerkKey} localization={clerkLocale} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </StrictMode>,
  )
}
