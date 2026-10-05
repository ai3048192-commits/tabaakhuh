import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { prefetchLandingContent } from './landing/landingApi'

// The public pages: start their content request and code download now, in
// parallel, instead of one after the other once React has mounted.
if (window.location.pathname === '/' || window.location.pathname === '/contact') {
  prefetchLandingContent()
  void import('./pages/LandingPage')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
