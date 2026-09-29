import type { StoryboardPanel } from './types'

export type StoryboardPromptVersion = 'original' | 'revamped'

export function migrateStoryboardPromptVersions(panel: StoryboardPanel): StoryboardPanel {
  const originalPrompt = panel.originalPrompt ?? panel.prompt
  const selectedPromptVersion: StoryboardPromptVersion = panel.selectedPromptVersion === 'revamped' && panel.revampedPrompt !== undefined
    ? 'revamped'
    : 'original'
  if (panel.originalPrompt === originalPrompt && panel.selectedPromptVersion === selectedPromptVersion) return panel
  return { ...panel, prompt: originalPrompt, originalPrompt, selectedPromptVersion }
}

export function selectedStoryboardPrompt(panel: StoryboardPanel): string {
  const migrated = migrateStoryboardPromptVersions(panel)
  return migrated.selectedPromptVersion === 'revamped' && migrated.revampedPrompt !== undefined
    ? migrated.revampedPrompt
    : migrated.originalPrompt!
}

export function selectStoryboardPromptVersion(panel: StoryboardPanel, version: StoryboardPromptVersion): StoryboardPanel {
  const migrated = migrateStoryboardPromptVersions(panel)
  if (version === 'revamped' && migrated.revampedPrompt === undefined) return migrated
  if (migrated.selectedPromptVersion === version) return migrated
  return { ...migrated, selectedPromptVersion: version }
}

export function editStoryboardOriginal(panel: StoryboardPanel, originalPrompt: string): StoryboardPanel {
  const migrated = migrateStoryboardPromptVersions(panel)
  if (migrated.originalPrompt === originalPrompt && migrated.prompt === originalPrompt && migrated.selectedPromptVersion === 'original') return migrated
  return { ...migrated, prompt: originalPrompt, originalPrompt, selectedPromptVersion: 'original' }
}

export function applySuccessfulStoryboardRevamps(panels: StoryboardPanel[], rewrites: ReadonlyMap<string, string>): { panels: StoryboardPanel[]; changed: boolean } {
  let changed = false
  const next = panels.map((panel) => {
    const rewrite = rewrites.get(panel.id)
    if (rewrite === undefined || rewrite === selectedStoryboardPrompt(panel)) return panel
    changed = true
    return { ...migrateStoryboardPromptVersions(panel), revampedPrompt: rewrite, selectedPromptVersion: 'revamped' as const }
  })
  return { panels: changed ? next : panels, changed }
}