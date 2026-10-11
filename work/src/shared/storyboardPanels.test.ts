import { describe, expect, it } from 'vitest'
import type { StoryboardPanel } from './types'
import { appendStoryboardPanel, canAppendStoryboardPanel, removeStoryboardPanel, STORYBOARD_MAX_PANELS, STORYBOARD_MIN_PANELS } from './storyboardPanels'

const panels = (count: number): StoryboardPanel[] => Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, prompt: `Panel ${index + 1}`, duration: 1, shotSize: 'wide', camera: 'static', locked: false }))

describe('Storyboard 2–20 panel collection', () => {
  it('keeps the exact 2 and 20 boundaries', () => {
    expect(STORYBOARD_MIN_PANELS).toBe(2)
    expect(STORYBOARD_MAX_PANELS).toBe(20)
    expect(removeStoryboardPanel(panels(2), 'p1').panels).toHaveLength(2)
    expect(appendStoryboardPanel(panels(20), () => 'new').panels).toHaveLength(20)
  })

  it.each([8, 9, 19])('appends after %i panels without changing existing IDs and returns the new prompt focus target', (count) => {
    const before = panels(count)
    const result = appendStoryboardPanel(before, () => `p${count + 1}`)
    expect(result.panels.slice(0, count).map((panel) => panel.id)).toEqual(before.map((panel) => panel.id))
    expect(result.panels.at(-1)).toEqual({ id: `p${count + 1}`, prompt: '', duration: 5, shotSize: 'close-up', lensMm: 50, camera: 'static', audioCue: '', locked: false })
    expect(result.focusPanelId).toBe(`p${count + 1}`)
    expect(result.added).toBe(true)
  })

  it('deletes at 9 and 20 while choosing the next panel at that ordinal or the prior final panel deterministically', () => {
    const middle = removeStoryboardPanel(panels(9), 'p5')
    expect(middle.panels.map((panel) => panel.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p6', 'p7', 'p8', 'p9'])
    expect(middle.focusPanelId).toBe('p6')
    const final = removeStoryboardPanel(panels(20), 'p20')
    expect(final.panels).toHaveLength(19)
    expect(final.focusPanelId).toBe('p19')
  })

  it('allows disconnected additions under the cap and blocks a connected addition below the1.0s minimum', () => {
    expect(canAppendStoryboardPanel(panels(19))).toBe(true)
    expect(canAppendStoryboardPanel(panels(20))).toBe(false)
    expect(canAppendStoryboardPanel(panels(3), 1)).toBe(true)
    expect(canAppendStoryboardPanel(panels(3), 0.99)).toBe(false)
  })
})
