export interface StoryboardTriggerMenuKeyResult {
  close: boolean
  preventDefault: boolean
  focusTrigger: boolean
  open: boolean
}

export function storyboardTriggerMenuKeyAction(open: boolean, key: string): StoryboardTriggerMenuKeyResult {
  if (open && key === 'Escape') return { close: true, preventDefault: true, focusTrigger: true, open: false }
  if (open && key === 'Tab') return { close: true, preventDefault: false, focusTrigger: false, open: false }
  if (!open && ['Enter', ' ', 'ArrowDown'].includes(key)) return { close: false, preventDefault: true, focusTrigger: false, open: true }
  return { close: false, preventDefault: false, focusTrigger: false, open }
}
