import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootKernel } from '@/core'
import App from './App.tsx'

bootKernel()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
