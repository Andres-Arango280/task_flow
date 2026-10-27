import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ProveedorAvisos } from './components/ui/Toast'
import { ProveedorConfirmacion } from './components/ui/Confirmacion'
import './store/usePreferencias'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorAvisos>
      <ProveedorConfirmacion>
        <App />
      </ProveedorConfirmacion>
    </ProveedorAvisos>
  </StrictMode>,
)