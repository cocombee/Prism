import { describe, expect, it } from 'vitest'
import { assignElementView, ELEMENT_ANCHOR_VIEW, ELEMENT_VIEWS, elementCompletionPrompt, elementViewAssets, missingElementViews } from './elementViews'
import type { ElementView, ImportedAsset } from './types'

function asset(id: string, view?: ElementView, path = `/${id}.png`): ImportedAsset {
  return { id, name: `${id}.png`, path, url: `prism://${id}`, mimeType: 'image/png', createdAt: '2026-08-02T00:00:00.000Z', metadata: view ? { elementView: view } : undefined }
}

describe('Element view identity contract', () => {
  it('orders views strongest to weakest and uses Three-Quarter as the sole anchor', () => {
    expect(ELEMENT_ANCHOR_VIEW).toBe('three-quarter')
    expect(ELEMENT_VIEWS.map((view) => view.id)).toEqual(['three-quarter', 'front', 'side', 'back'])
  })

  it('keeps one source in one named angle and replaces an occupied angle', () => {
    const first = assignElementView([], asset('front-source'), 'front')
    const moved = assignElementView(first, asset('front-source'), 'side')
    expect(moved.map((item) => item.metadata?.elementView)).toEqual(['side'])
    const replaced = assignElementView(moved, asset('new-side'), 'side')
    expect(replaced).toHaveLength(1)
    expect(replaced[0].id).toBe('new-side')
  })

  it('reports only missing canonical views and removes duplicate persisted assignments', () => {
    const clean = elementViewAssets([asset('a', 'front'), asset('b', 'front'), asset('c', 'side'), asset('d', 'back', '/a.png')])
    expect(clean.map((item) => item.metadata?.elementView)).toEqual(['front', 'side'])
    expect(missingElementViews(clean).map((item) => item.id)).toEqual(['three-quarter', 'back'])
  })

  it('builds a target-specific prompt that forbids regenerating supplied angles', () => {
    const target = missingElementViews([asset('a', 'three-quarter'), asset('b', 'side')])[0]
    const prompt = elementCompletionPrompt(target, ['three-quarter', 'side'], 'retain the brass latch')
    expect(prompt).toContain('exactly one missing angle: Front')
    expect(prompt).toContain('Do not recreate, replace, mirror, or reinterpret any supplied angle')
    expect(prompt).toContain('retain the brass latch')
  })
})
