import { ControlButton, Controls } from '@xyflow/react'
import { Maximize2, Minus, Plus } from 'lucide-react'

type Props = { onZoomIn(): void; onZoomOut(): void; onFitView(): void; standalone?: boolean; className?: string }

function Buttons({ onZoomIn, onZoomOut, onFitView }: Props) {
  return <>
    <ControlButton onClick={onZoomIn} data-tooltip="Zoom In [⌥+]" aria-label="Zoom In" aria-keyshortcuts="Alt++"><Plus size={14} /></ControlButton>
    <ControlButton onClick={onZoomOut} data-tooltip="Zoom Out [⌥−]" aria-label="Zoom Out" aria-keyshortcuts="Alt+-"><Minus size={14} /></ControlButton>
    <ControlButton onClick={onFitView} data-tooltip="Fit View [Z]" aria-label="Fit View" aria-keyshortcuts="Z"><Maximize2 size={13} /></ControlButton>
  </>
}

/** The single owner for Prism Canvas and expanded 3D viewport navigation controls. */
export function CanvasNavigationControls(props: Props) {
  if (props.standalone) return <div className={`react-flow__panel react-flow__controls bottom right ${props.className || ''}`}><Buttons {...props} /></div>
  return <Controls position="bottom-right" showZoom={false} showFitView={false} showInteractive={false}><Buttons {...props} /></Controls>
}
