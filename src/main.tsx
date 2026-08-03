import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { ruRU } from '@clerk/localizations'
import './index.css'
import App from './App.tsx'
import { ConceptV2App } from './concept-v2/ConceptV2App.tsx'

const isConceptV2 = window.location.pathname.startsWith('/concept-v2')
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

const root = createRoot(document.getElementById('root')!)

if (isConceptV2) {
  // The design preview stays open, unauthenticated — it holds no user data.
  root.render(
    <StrictMode>
      <ConceptV2App />
    </StrictMode>,
  )
} else if (!clerkKey) {
  root.render(
    <div style={{ padding: 40, fontFamily: 'system-ui', color: '#E3E5E9', background: '#0A0B0D', minHeight: '100vh' }}>
      <h1>GeQu не настроен</h1>
      <p>Не задан VITE_CLERK_PUBLISHABLE_KEY — добавь его в переменные окружения (.env.local локально, Vercel → Settings → Environment Variables на проде) и пересобери.</p>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={clerkKey} localization={ruRU} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </StrictMode>,
  )
}
