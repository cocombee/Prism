import type { StudioNode } from '../../shared/types'
import { inputCardinalityError, nodeConnectionError, recoveredConnectionTargetHandle } from '../../shared/nodeConnections'

type ConnectEndState = {
  isValid: boolean | null
  toNode?: { id: string } | null
  toHandle?: { id?: string | null } | null
}

type ConnectionStart = { nodeId: string; handleId?: string | null }
type ReleasePoint = { clientX: number; clientY: number }
type ExistingEdge = { source: string; target: string; targetHandle?: string | null }
export type RecoveredSemanticConnection = { source: string; sourceHandle: string; target: string; targetHandle: string }

export function recoverCharacterSemanticConnectionAtEnd({
  connectionState,
  connectionStart,
  point,
  nodes,
  edges,
  elementsFromPoint,
  commit,
  notice,
}: {
  connectionState: ConnectEndState
  connectionStart: ConnectionStart
  point: ReleasePoint
  nodes: StudioNode[]
  edges: ExistingEdge[]
  elementsFromPoint: (x: number, y: number) => Element[]
  commit: (connection: RecoveredSemanticConnection) => void
  notice: (message: string) => void
}): boolean {
  if (connectionState.isValid || !connectionStart.nodeId) return false

  const releaseElements = elementsFromPoint(point.clientX, point.clientY)
  const releasedTargetHandle = releaseElements
    .map((element) => element.closest<HTMLElement>('.react-flow__handle'))
    .find((handle): handle is HTMLElement => Boolean(handle?.classList.contains('react-flow__handle-target')))
  const releasedTargetNode = releaseElements
    .map((element) => element.closest<HTMLElement>('.react-flow__node'))
    .find((node): node is HTMLElement => Boolean(node))

  const targetNodeId = connectionState.toNode?.id
    || releasedTargetHandle?.getAttribute('data-nodeid')
    || releasedTargetNode?.getAttribute('data-id')
    || ''
  const reportedTargetHandle = connectionState.toHandle?.id
    || releasedTargetHandle?.getAttribute('data-handleid')
    || undefined
  const source = nodes.find((node) => node.id === connectionStart.nodeId)
  const target = nodes.find((node) => node.id === targetNodeId)
  if (!source || !target || !['style-reference', 'wardrobe'].includes(source.data.kind) || target.data.kind !== 'character') return false

  const sourceHandleId = connectionStart.handleId || 'media-out'
  const targetHandleId = recoveredConnectionTargetHandle(source.data, target.data, sourceHandleId, reportedTargetHandle)
  if (!targetHandleId) return false

  const error = inputCardinalityError(edges, target.id, target.data, targetHandleId, true)
    || nodeConnectionError(source.id, target.id, source.data, target.data, sourceHandleId, targetHandleId)
  if (error) notice(error)
  else commit({ source: source.id, sourceHandle: sourceHandleId, target: target.id, targetHandle: targetHandleId })
  return true
}
