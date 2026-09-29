import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Background, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Node } from '@xyflow/react'
import { canvasPanButtons, isTextEntryTarget, type CanvasInteractionTool } from '../../shared/canvasInteractions'

declare global { interface Window { canvasHarness: any } }

const initialNodes: Node[] = [{ id: 'node-1', position: { x: 100, y: 100 }, data: { label: 'Drag me' }, style: { width: 120, height: 60 } }]

function Harness() {
  const [tool, setTool] = useState<CanvasInteractionTool>('select')
  const toolRef = useRef(tool)
  const [spacePanning, setSpacePanning] = useState(false)
  const spaceRef = useRef(spacePanning)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const nodesRef = useRef(nodes)
  const flow = useReactFlow()
  toolRef.current = tool
  spaceRef.current = spacePanning
  nodesRef.current = nodes

  useEffect(() => {
    const releaseSpacePanning = (releaseReactFlow = false) => {
      document.documentElement.classList.remove('is-canvas-space-panning')
      setSpacePanning(false)
      if (releaseReactFlow) window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }))
    }
    const down = (event: KeyboardEvent) => {
      const typing = isTextEntryTarget(event.target) || isTextEntryTarget(document.activeElement)
      if (typing || event.code !== 'Space') return
      event.preventDefault()
      if (event.repeat) return
      document.documentElement.classList.add('is-canvas-space-panning')
      setSpacePanning(true)
    }
    const up = (event: KeyboardEvent) => { if (event.code === 'Space') releaseSpacePanning() }
    const blur = () => releaseSpacePanning()
    const visibility = () => { if (document.hidden) releaseSpacePanning(true) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility)
    window.canvasHarness = {
      getViewport: () => flow.getViewport(),
      setViewport: (viewport: any) => flow.setViewport(viewport),
      setTool,
      getTool: () => toolRef.current,
      getNode: () => nodesRef.current[0],
      getNodeRect: () => document.querySelector('.react-flow__node')?.getBoundingClientRect().toJSON(),
      getSpace: () => spaceRef.current,
      triggerVisibilityLoss: () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true })
        document.dispatchEvent(new Event('visibilitychange'))
        Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      },
    }
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [flow])

  return <div style={{ width: '100vw', height: '100vh' }}>
    <textarea id="text-entry" aria-label="Text entry" />
    <ReactFlow
      nodes={nodes}
      edges={[]}
      onNodesChange={onNodesChange}
      nodesDraggable={tool === 'select'}
      elementsSelectable={tool !== 'hand'}
      selectionOnDrag={tool === 'select'}
      panOnDrag={canvasPanButtons(tool)}
      panActivationKeyCode="Space"
      minZoom={0.2}
      maxZoom={4.4}
    ><Background /></ReactFlow>
  </div>
}

createRoot(document.getElementById('root')!).render(<ReactFlowProvider><Harness /></ReactFlowProvider>)
