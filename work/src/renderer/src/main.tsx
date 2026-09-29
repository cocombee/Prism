import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './styles.css'
import { App } from './App'
import { GlobalButtonTooltips } from './NodeCard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactFlowProvider>
      <GlobalButtonTooltips />
      <App />
    </ReactFlowProvider>
  </StrictMode>,
)
