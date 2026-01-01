import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './polyfills' // Import polyfills first
import { DexProvider } from './contexts/DexContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DexProvider>
      <App />
    </DexProvider>
  </React.StrictMode>,
)
