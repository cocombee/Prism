import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './styles-next.css'

import './media-offline-state.css'
import './project-library-card-controls.css'
import { App } from './AppNext'
import { GlobalButtonTooltips } from './NodeCardNext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactFlowProvider>
      <GlobalButtonTooltips />
      <App />
    </ReactFlowProvider>
  </StrictMode>,
)
