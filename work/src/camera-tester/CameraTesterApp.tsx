import { useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Prism3DCameraNode } from '../camera3d/Prism3DCameraNode'
import { ReactFlowProvider } from '@xyflow/react'

type NodeRecord = { id: string; name: string }
export function CameraTesterApp() {
  const [nodes, setNodes] = useState<NodeRecord[]>([{ id: 'camera-node-01', name: '3D Camera' }]); const [tabs, setTabs] = useState<string[]>(['camera-node-01']); const [active, setActive] = useState<string | null>('camera-node-01')
  const open = (id: string) => { setTabs((items) => items.includes(id) ? items : [...items, id]); setActive(id) }
  const close = (id: string) => { setTabs((items) => { const next = items.filter((item) => item !== id); if (active === id) setActive(next[next.length - 1] || null); return next }) }
  useEffect(() => { const listener = (event: KeyboardEvent) => { const target = event.target as HTMLElement; if ((event.metaKey || event.ctrlKey) && event.code === 'KeyD' && !active && !target.matches('input,textarea,[contenteditable=true]')) { event.preventDefault(); const id = `camera-node-${String(nodes.length + 1).padStart(2, '0')}`; setNodes((items) => [...items, { id, name: `3D Camera ${items.length + 1}` }]); open(id) } }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener) }, [active, nodes.length])
  return <ReactFlowProvider><div className={`camera-tester-shell ${active ? 'has-workspace' : 'node-only'}`}>{tabs.length > 0 && <nav className="camera-document-tabs" role="tablist" aria-label="3D Camera documents">{tabs.map((id) => { const node = nodes.find((item) => item.id === id)!; return <div className="page-tab" key={id}><button role="tab" aria-selected={active === id} className={active === id ? 'is-active' : ''} onClick={() => setActive(id)}><Camera size={13} />{node.name}</button><button aria-label={`Close ${node.name}`} onClick={() => close(id)}><X size={12} /></button></div> })}</nav>}<div className="camera-tester-content">{nodes.map((node) => <div key={node.id} hidden={active ? active !== node.id : node.id !== nodes[0].id} className={active ? 'camera-tab-panel' : 'camera-canvas-field'}><Prism3DCameraNode nodeId={node.id} expanded={active === node.id} onOpen={() => open(node.id)} /></div>)}</div></div></ReactFlowProvider>
}
