import React from 'react'
import ReactDOM from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import '../renderer/src/styles-next.css'
import '../camera3d/camera3d.css'
import { CameraTesterApp } from './CameraTesterApp'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><CameraTesterApp /></React.StrictMode>)
