import { createContext, useContext, useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { usePortOcclusion } from './nodePortOcclusion'
import { Handle, Position, useConnection, useNodeConnections, useNodeId, useStore } from '@xyflow/react'
import { nodeConnectionError, type ConnectionSignal } from '../../shared/nodeConnections'
import type { StudioNodeData } from '../../shared/types'
import type { NodeInputPortContract } from '../../shared/nodePorts'
import { ACTION_ICONS, PORT_ROLE_ICONS, PORT_SIGNAL_ICONS } from './iconSystem'

export type PortConnectionAppearance = 'idle' | 'origin' | 'compatible' | 'accepting' | 'hidden'

export type ActivePortRoute =
  | { direction: 'forward'; sourceNodeId: string; sourceHandleId?: string | null }
  | { direction: 'backward'; targetNodeId: string; targetHandleId: string }
  | null

export const PortRouteContext = createContext<ActivePortRoute>(null)

export function shouldDeployNodePort(connected: boolean, appearance: PortConnectionAppearance) {
  return appearance === 'idle'
    ? connected
    : ['origin', 'compatible', 'accepting'].includes(appearance)
}

export function shouldAnchorNodePort(_connected: boolean, _appearance: PortConnectionAppearance) {
  // The real handle is always measured at the deployed icon centre before a
  // drag begins. Only the painted child stows, so no wire can cache the body.
  return true
}

export function connectionGuidanceAppearance(
  portType: 'target' | 'source',
  originType: 'target' | 'source',
  isOrigin: boolean,
  compatible: boolean,
  approached: boolean,
): PortConnectionAppearance {
  if (isOrigin) return 'origin'
  // Same-direction ports are not connection candidates. Preserve their normal
  // occupied/empty lifecycle instead of mislabelling them as incompatible.
  if (portType === originType) return 'idle'
  if (!compatible) return 'hidden'
  return approached ? 'accepting' : 'compatible'
}

export function NodePort({ id, type, signal, label, icon, position = type === 'target' ? Position.Left : Position.Right, style, onRoute, available = true, nodeId: explicitNodeId }: {
  id: string
  type: 'target' | 'source'
  signal: ConnectionSignal
  label: string
  icon?: NodeInputPortContract['icon']
  position?: Position
  style?: CSSProperties
  onRoute?: (event: ReactMouseEvent<HTMLDivElement>) => void
  available?: boolean
  nodeId?: string
}) {
  const handleRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLSpanElement>(null)
  usePortOcclusion(handleRef, railRef)
  const contextNodeId = useNodeId()
  const nodeId = explicitNodeId || contextNodeId
  const activeRoute = useContext(PortRouteContext)
  const connections = useNodeConnections({ id: nodeId || undefined, handleType: type, handleId: id })
  // React Flow's connection lookup can be empty while a restored workflow is
  // still rebuilding its handle bounds. The edge list is the durable source of
  // truth, so use it as a fallback to keep occupied sockets visible at rest.
  const hasPersistedConnection = useStore((state) => state.edges.some((edge) => type === 'source'
    ? edge.source === nodeId && (edge.sourceHandle === id || !edge.sourceHandle)
    : edge.target === nodeId && (edge.targetHandle === id || !edge.targetHandle)))
  const connected = connections.length > 0 || hasPersistedConnection
  const currentNodeData = useStore((state) => nodeId
    ? state.nodeLookup.get(nodeId)?.internals.userNode.data as StudioNodeData | undefined
    : undefined)
  // Return a small stable state rather than the live pointer position so every
  // port does not re-render on every pixel of an edge drag.
  const connectionAppearance: PortConnectionAppearance = useConnection((connection): PortConnectionAppearance => {
    if (!connection.inProgress || !nodeId || !currentNodeData) return 'idle'
    const fromHandle = connection.fromHandle
    const fromData = connection.fromNode.internals.userNode.data as StudioNodeData
    const isOrigin = fromHandle.nodeId === nodeId && fromHandle.id === id && fromHandle.type === type
    if (isOrigin) return 'origin'
    if (fromHandle.type === type) return 'idle'
    const approached = connection.toHandle?.nodeId === nodeId
      && connection.toHandle.id === id
      && connection.toHandle.type === type
      && connection.isValid === true
    if (type === 'target' && fromHandle.type === 'source') {
      return connectionGuidanceAppearance(type, fromHandle.type, false, !nodeConnectionError(fromHandle.nodeId, nodeId, fromData, currentNodeData, fromHandle.id, id), approached)
    }
    if (type === 'source' && fromHandle.type === 'target') {
      return connectionGuidanceAppearance(type, fromHandle.type, false, !nodeConnectionError(nodeId, fromHandle.nodeId, currentNodeData, fromData, id, fromHandle.id), approached)
    }
    return 'idle'
  })
  const Icon = type === 'source' ? ACTION_ICONS.export : icon ? PORT_ROLE_ICONS[icon] : PORT_SIGNAL_ICONS[signal]
  // Hover reveal is CSS-only so it never adds pointer-driven React rerenders.
  // State deployment is reserved for occupied and live-guidance sockets.
  const routeActive = Boolean(nodeId && (activeRoute?.direction === 'forward'
    ? type === 'source' && activeRoute.sourceNodeId === nodeId && (activeRoute.sourceHandleId || 'media-out') === id
    : activeRoute?.direction === 'backward'
      ? type === 'target' && activeRoute.targetNodeId === nodeId && activeRoute.targetHandleId === id
      : false))
  const iconDeployed = routeActive || shouldDeployNodePort(connected, connectionAppearance)
  const alwaysVisibleAtRest = type === 'source' && connectionAppearance === 'idle'
  const anchorDeployed = shouldAnchorNodePort(connected, connectionAppearance)
  const handleStyle = {
    ...style,
    '--node-port-offset': anchorDeployed ? '-22px' : '0px',
  } as CSSProperties
  return <>
    {/* A real nodrag descendant owns the continuous side-hover area. A pseudo-
        element on React Flow's node wrapper would hit-test as the draggable
        node itself and steal pointer-down from every Handle below it. */}
    <span ref={railRef} className={`node-port-hover-rail node-port-hover-rail-${position} nodrag nopan`} aria-hidden="true" />
    <Handle
      ref={handleRef}
      id={id}
      type={type}
      position={position}
      className={`node-port nodrag nopan node-port-${type} node-port-${signal} node-port-${icon || 'standard'} ${connected ? 'is-connected' : 'is-unconnected'} ${routeActive ? 'is-route-active' : ''} ${iconDeployed ? 'is-deployed' : 'is-stowed'} ${alwaysVisibleAtRest ? 'is-always-visible-at-rest' : ''} ${available ? '' : 'is-offline'} connection-${connectionAppearance}`}
      style={handleStyle}
      data-port-label={label}
      aria-label={type === 'source' ? `Export or connect ${label}` : `Connect ${label}`}
      aria-disabled={!available}
      data-semantic-role={signal}
      title={label}
      tabIndex={0}
      // React Flow exclusively owns mouse/touch down. Prism owns only the plain
      // click that opens quick-connect after no drag occurred.
      onClick={available ? onRoute : undefined}
    ><span className="node-port-visual" data-port-label={label}><Icon size={15} strokeWidth={1.9} /></span></Handle>
  </>
}
