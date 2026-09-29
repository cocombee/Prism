import { describe, expect, it } from 'vitest'
import { storyboardTriggerMenuKeyAction } from './storyboardMenuInteraction'

describe('Storyboard menu trigger keyboard lifecycle', () => {
  it('closes an all-disabled open menu on Escape and restores trigger focus intent', () => {
    expect(storyboardTriggerMenuKeyAction(true, 'Escape')).toEqual({ close: true, preventDefault: true, focusTrigger: true, open: false })
  })

  it('closes an all-disabled open menu on Tab without trapping traversal', () => {
    expect(storyboardTriggerMenuKeyAction(true, 'Tab')).toEqual({ close: true, preventDefault: false, focusTrigger: false, open: false })
  })

  it('preserves initial open keys and ignores unrelated trigger keys', () => {
    for (const key of ['Enter', ' ', 'ArrowDown']) {
      expect(storyboardTriggerMenuKeyAction(false, key)).toEqual({ close: false, preventDefault: true, focusTrigger: false, open: true })
    }
    expect(storyboardTriggerMenuKeyAction(false, 'Escape')).toEqual({ close: false, preventDefault: false, focusTrigger: false, open: false })
  })
})
