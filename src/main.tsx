import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { ruRU } from '@clerk/localizations'
import './index.css'
import App from './App.tsx'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

const root = createRoot(document.getElementById('root')!)

if (!clerkKey) {
  root.render(
    <div style={{ padding: 40, fontFamily: 'system-ui', color: '#E6E8EC', background: '#0A0B0D', minHeight: '100vh' }}>
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
