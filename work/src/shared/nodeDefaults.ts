import type { NodeKind } from './types'

export function nodeCreationDefaults(kind: NodeKind): { aspectRatio: string; quantity: number } {
  return {
    aspectRatio: kind === 'image-generator' || kind === 'character'
      ? '2:3'
      : kind === 'element'
        ? '1:1'
        : kind === 'video-generator' || kind === 'location'
          ? '16:9'
          : 'landscape_16_9',
    quantity: kind === 'element' ? 4 : 1,
  }
}
