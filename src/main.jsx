import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DisplayRouter } from './components/displays/DisplayRouter.jsx'

const isDisplayMode = typeof window !== 'undefined' && window.location.search.includes('display=');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDisplayMode ? <DisplayRouter /> : <App />}
  </StrictMode>,
)
