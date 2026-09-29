import { describe, expect, it } from 'vitest'
import type { StoryboardPanel } from './types'
import { reconcileStoryboardDurationBudget, storyboardDurationReadinessError, STORYBOARD_DURATION_FALLBACK_OPTIONS } from './storyboardDurationBudget'

const panel = (id: string, duration: number | 'auto', locked = false): StoryboardPanel => ({ id, prompt: `${id} prompt`, duration, locked, shotSize: 'wide', camera: 'static' })

describe('Storyboard observational duration budget', () => {
  it('preserves every authored panel value when the connected Generator budget is reduced', () => {
    const panels = [panel('one', 8), panel('two', 7), panel('three', 2)]
    const result = reconcileStoryboardDurationBudget({ panels, mode: 'single', targetDuration: 10, modelDurationOptions: [0.5, 1, 1.5, 2, 5, 10] })
    expect(result.panels).toBe(panels)
    expect(result.panels.map((item) => item.duration)).toEqual([8, 7, 2])
    expect(result.totalDuration).toBe(17)
    expect(result.overBudget).toBe(true)
    expect(result.helper).toEqual({ kind: 'overflow', text: 'Timing exceeds Video budget · 17.0s / 10.0s' })
  })

  it('reduces later selectable maxima and preserves locked downstream positive reservation', () => {
    const result = reconcileStoryboardDurationBudget({
      panels: [panel('one', 4), panel('two', 2), panel('three', 3, true)],
      mode: 'single',
      targetDuration: 10,
      modelDurationOptions: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5],
    })
    expect(result.budgets[0].choiceMax).toBe(5)
    expect(result.budgets[1].choiceMax).toBe(3)
    expect(result.budgets[2].choiceMax).toBe(4)
    expect(result.budgets[1].options.find((option) => option.value === 3)?.disabled).toBe(false)
    expect(result.budgets[1].options.find((option) => option.value === 3.5)?.disabled).toBe(true)
  })

  it('keeps a disconnected Storyboard on independent 0.5s planning values through 30.0s', () => {
    const panels = [panel('one', 20), panel('two', 15)]
    const result = reconcileStoryboardDurationBudget({ panels, mode: 'separate', modelDurationOptions: [...STORYBOARD_DURATION_FALLBACK_OPTIONS] })
    expect(result.targetDuration).toBeUndefined()
    expect(result.overBudget).toBeFalsy()
    expect(result.helper).toBeUndefined()
    expect(result.budgets[1].options).toHaveLength(60)
    expect(result.budgets[1].options.slice(0, 4).map((option) => option.value)).toEqual([0.5, 1, 1.5, 2])
    expect(result.budgets[1].options.at(-1)).toMatchObject({ value: 30, label: '30.0s', disabled: false })
  })

  it('uses independent half-step panel choices when the Generator has sparse native choices', () => {
    const result = reconcileStoryboardDurationBudget({ panels: [panel('one', 2), panel('two', 1)], mode: 'single', targetDuration: 6, modelDurationOptions: [4, 6, 8] })
    expect(result.targetOptions.slice(0, 6)).toEqual([0.5, 1, 1.5, 2, 2.5, 3])
    expect(result.targetOptions.at(-1)).toBe(8)
    expect(result.budgets[1].choiceMax).toBe(4)
    expect(result.budgets[1].options.find((option) => option.value === 3.5)?.disabled).toBe(false)
    expect(result.budgets[1].options.find((option) => option.value === 4.5)?.disabled).toBe(true)
  })

  it('keeps half-second options visible and disables unavailable positive options', () => {
    const result = reconcileStoryboardDurationBudget({ panels: [panel('one', 9.5), panel('two', 0.5)], mode: 'single', targetDuration: 10, modelDurationOptions: [0.5, 1, 1.5, 2] })
    expect(result.budgets[1].choiceMax).toBe(0.5)
    expect(result.budgets[1].options).toEqual([
      expect.objectContaining({ value: 0.5, label: '0.5s', disabled: false }),
      expect.objectContaining({ value: 1, label: '1.0s', disabled: true }),
      expect.objectContaining({ value: 1.5, label: '1.5s', disabled: true }),
      expect.objectContaining({ value: 2, label: '2.0s', disabled: true }),
    ])
  })

  it('blocks overflow and any duration below the exact 0.5s minimum, then clears when timing fits', () => {
    expect(storyboardDurationReadinessError([panel('one', 6), panel('two', 5)], 10)).toContain('11.0s exceeds')
    expect(storyboardDurationReadinessError([panel('one', 6), panel('two', 4)], 10)).toBeUndefined()
    expect(storyboardDurationReadinessError([panel('one', 6), panel('two', 0)], 10)).toContain('minimum 0.5s')
    expect(storyboardDurationReadinessError([panel('one', 6), panel('two', 0.25)], 10)).toContain('minimum 0.5s')
  })
})
