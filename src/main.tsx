import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConceptV2App } from './concept-v2/ConceptV2App.tsx'

const isConceptV2 = window.location.pathname.startsWith('/concept-v2')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isConceptV2 ? <ConceptV2App /> : <App />}
  </StrictMode>,
)