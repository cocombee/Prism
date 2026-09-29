import type { StoryboardPanel } from './types'

export const STORYBOARD_MIN_PANELS = 2
export const STORYBOARD_MAX_PANELS = 20
export const STORYBOARD_MIN_PANEL_DURATION = 0.5

export interface StoryboardPanelMutation {
  panels: StoryboardPanel[]
  focusPanelId?: string
  added?: boolean
}

export function migrateStoryboardPanelDuration(panel: StoryboardPanel): StoryboardPanel {
  if (panel.duration === 'auto') return { ...panel, duration: 1 }
  if (!Number.isFinite(panel.duration) || Number(panel.duration) < STORYBOARD_MIN_PANEL_DURATION) return { ...panel, duration: STORYBOARD_MIN_PANEL_DURATION }
  return panel
}

export function canAppendStoryboardPanel(panels: StoryboardPanel[], remainingDuration?: number): boolean {
  return panels.length < STORYBOARD_MAX_PANELS
    && (!Number.isFinite(remainingDuration) || Number(remainingDuration) >= STORYBOARD_MIN_PANEL_DURATION)
}

export function appendStoryboardPanel(panels: StoryboardPanel[], createId: () => string = () => crypto.randomUUID()): StoryboardPanelMutation {
  if (panels.length >= STORYBOARD_MAX_PANELS) return { panels, added: false }
  const panel: StoryboardPanel = { id: createId(), prompt: '', duration: 1, shotSize: 'wide', camera: 'static', audioCue: '', locked: false }
  return { panels: [...panels, panel], focusPanelId: panel.id, added: true }
}

export function removeStoryboardPanel(panels: StoryboardPanel[], panelId: string): StoryboardPanelMutation {
  if (panels.length <= STORYBOARD_MIN_PANELS) return { panels }
  const index = panels.findIndex((panel) => panel.id === panelId)
  if (index < 0) return { panels }
  const next = panels.filter((panel) => panel.id !== panelId)
  return { panels: next, focusPanelId: next[Math.min(index, next.length - 1)]?.id }
}
