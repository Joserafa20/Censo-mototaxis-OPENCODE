import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { setupSyncListener } from './pwa/syncQueue'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  // vite-plugin-pwa auto registers, just setup sync
  setupSyncListener(() => localStorage.getItem('token'));
}
