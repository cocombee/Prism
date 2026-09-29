import { describe, expect, it } from 'vitest'
import type { StudioNode } from '../../shared/types'
import { recoverCharacterSemanticConnectionAtEnd } from './characterSemanticConnectEnd'

function node(id: string, kind: StudioNode['data']['kind']): StudioNode {
  return { id, type: 'studio', position: { x: 0, y: 0 }, data: { kind, title: id } }
}

function characterBodyElement(nodeId: string): Element {
  const match = {
    classList: { contains: () => false },
    getAttribute: (name: string) => name === 'data-id' ? nodeId : null,
  }
  return {
    closest: (selector: string) => selector === '.react-flow__node' ? match : null,
  } as unknown as Element
}

describe('Character semantic connect-end recovery', () => {
  for (const [sourceKind, expectedHandle] of [['wardrobe', 'wardrobe-in'], ['style-reference', 'style-in']] as const) {
    it(`commits ${sourceKind} to ${expectedHandle} when only the Character body remains under release`, () => {
      const committed: Array<{ source: string; sourceHandle: string; target: string; targetHandle: string }> = []
      const notices: string[] = []
      const handled = recoverCharacterSemanticConnectionAtEnd({
        connectionState: { isValid: false, toNode: null, toHandle: null },
        connectionStart: { nodeId: 'source', handleId: 'media-out' },
        point: { clientX: 410, clientY: 260 },
        nodes: [node('source', sourceKind), node('character', 'character')],
        edges: [],
        elementsFromPoint: () => [characterBodyElement('character')],
        commit: (edge) => committed.push(edge),
        notice: (message) => notices.push(message),
      })

      expect(handled).toBe(true)
      expect(committed).toEqual([{ source: 'source', sourceHandle: 'media-out', target: 'character', targetHandle: expectedHandle }])
      expect(notices).toEqual([])
    })
  }
})
