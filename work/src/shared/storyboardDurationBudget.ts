import type { StoryboardPanel } from './types'
import { formatDurationSeconds } from './videoModels'

export const STORYBOARD_MIN_DURATION = 0.5
export const STORYBOARD_DISCONNECTED_MAX_DURATION = 30
export const STORYBOARD_DURATION_FALLBACK_OPTIONS = Array.from(
  { length: STORYBOARD_DISCONNECTED_MAX_DURATION / STORYBOARD_MIN_DURATION },
  (_, index) => Number(((index + 1) * STORYBOARD_MIN_DURATION).toFixed(1)),
)

export interface StoryboardDurationBudgetInput {
  panels: StoryboardPanel[]
  mode: 'single' | 'separate'
  targetDuration?: number
  modelDurationOptions: Array<number | string>
}

export interface StoryboardDurationOptionBudget {
  value: number
  label: string
  disabled: boolean
  disabledReason?: string
}

export interface StoryboardPanelDurationBudget {
  panelId: string
  panelIndex: number
  rawEffectiveMax: number
  choiceMax: number
  effectiveDuration: number
  locked: boolean
  exhausted: boolean
  lockedZero: boolean
  description: string
  options: StoryboardDurationOptionBudget[]
}

export interface StoryboardDurationConflict {
  panelIndex: number
  message: string
}

export type StoryboardDurationHelper = {
  kind: 'exhausted' | 'locked-zero' | 'locked-conflict' | 'overflow'
  text: string
}

export interface StoryboardDurationBudgetResult {
  panels: StoryboardPanel[]
  budgets: StoryboardPanelDurationBudget[]
  conflicts: StoryboardDurationConflict[]
  targetOptions: number[]
  targetDuration?: number
  modelPerPanelMax: number
  totalDuration: number
  overBudget: boolean
  helper?: StoryboardDurationHelper
}

function numericDuration(value: StoryboardPanel['duration']): number {
  if (value === 'auto') return 1
  return Number.isFinite(value) ? Math.max(STORYBOARD_MIN_DURATION, Number(value)) : 1
}

export function normalizedStoryboardDurationOptions(values: Array<number | string>): number[] {
  const native = [...new Set(values
    .map((value) => typeof value === 'number' ? value : Number.NaN)
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Number(value.toFixed(3))))]
    .sort((left, right) => left - right)
  const maximum = native.length ? Math.max(...native) : STORYBOARD_DISCONNECTED_MAX_DURATION
  return Array.from(
    { length: Math.max(1, Math.floor(maximum / STORYBOARD_MIN_DURATION + 1e-9)) },
    (_, index) => Number(((index + 1) * STORYBOARD_MIN_DURATION).toFixed(1)),
  )
}

export function normalizedStoryboardTargetDuration(requested: number, options: number[]): number {
  const supported = normalizedStoryboardDurationOptions(options)
  if (supported.includes(requested)) return requested
  return [...supported].reverse().find((value) => value <= requested) || supported[0]
}

function durationOptions(values: number[], choiceMax: number, locked: boolean, lockedDuration: number): StoryboardDurationOptionBudget[] {
  return values.map((value) => {
    const disabled = locked || value > choiceMax
    const disabledReason = locked
      ? lockedDuration === 0
        ? 'Locked at 0.0s. Unlock this panel to let available time recover.'
        : `Locked at ${formatDurationSeconds(lockedDuration)}. Unlock panel to change duration.`
      : value > choiceMax
        ? choiceMax > 0
          ? `Only ${formatDurationSeconds(choiceMax)} remains after earlier and locked panels.`
          : 'No sequence time remains. Reduce an earlier panel or increase Video duration.'
        : undefined
    return { value, label: formatDurationSeconds(value), disabled, disabledReason }
  })
}

export function reconcileStoryboardDurationBudget(input: StoryboardDurationBudgetInput): StoryboardDurationBudgetResult {
  const targetOptions = normalizedStoryboardDurationOptions(input.modelDurationOptions)
  const modelPerPanelMax = Math.max(...targetOptions)
  const connected = Number.isFinite(input.targetDuration)
  const targetDuration = connected ? Number(input.targetDuration) : undefined
  const sourceDurations = input.panels.map((panel) => numericDuration(panel.duration))
  const lockedSuffix = new Array(input.panels.length + 1).fill(0) as number[]
  for (let index = input.panels.length - 1; index >= 0; index -= 1) {
    lockedSuffix[index] = lockedSuffix[index + 1] + (input.panels[index].locked && sourceDurations[index] > 0 ? sourceDurations[index] : 0)
  }

  let elapsed = 0
  const budgets: StoryboardPanelDurationBudget[] = input.panels.map((panel, panelIndex) => {
    const locked = Boolean(panel.locked)
    const storedDuration = sourceDurations[panelIndex]
    const availableAfterPrior = connected ? Math.max(0, targetDuration! - elapsed) : modelPerPanelMax
    const lockedReserveAfter = connected ? lockedSuffix[panelIndex + 1] : 0
    const choiceMax = locked ? availableAfterPrior : Math.min(modelPerPanelMax, Math.max(0, availableAfterPrior - lockedReserveAfter))
    elapsed += storedDuration
    const exhausted = false
    const lockedZero = false
    return {
      panelId: panel.id,
      panelIndex,
      rawEffectiveMax: Math.min(modelPerPanelMax, availableAfterPrior),
      choiceMax,
      effectiveDuration: storedDuration,
      locked,
      exhausted,
      lockedZero,
      description: connected
        ? `Panel ${panelIndex + 1} has ${formatDurationSeconds(choiceMax)} available after earlier and locked panels.`
        : `Panel ${panelIndex + 1} timing is planning data until connected to a Video Generator.`,
      options: durationOptions(targetOptions, choiceMax, locked, storedDuration),
    }
  })

  const totalDuration = sourceDurations.reduce((total, duration) => total + duration, 0)
  const overBudget = connected && totalDuration > targetDuration!
  const conflicts: StoryboardDurationConflict[] = overBudget
    ? [{ panelIndex: Math.max(0, budgets.findIndex((_, index) => sourceDurations.slice(0, index + 1).reduce((sum, duration) => sum + duration, 0) > targetDuration!)), message: `Storyboard timing exceeds the connected Video Generator budget (${formatDurationSeconds(totalDuration)} / ${formatDurationSeconds(targetDuration!)}).` }]
    : []
  const helper: StoryboardDurationHelper | undefined = overBudget
    ? { kind: 'overflow', text: `Timing exceeds Video budget · ${formatDurationSeconds(totalDuration)} / ${formatDurationSeconds(targetDuration!)}` }
    : undefined

  return { panels: input.panels, budgets, conflicts, targetOptions, targetDuration, modelPerPanelMax, totalDuration, overBudget, helper }
}

export function storyboardDurationReadinessError(panels: Array<Pick<StoryboardPanel, 'duration'>>, budget?: number): string | undefined {
  const firstBelowMinimum = panels.findIndex((panel) => panel.duration !== 'auto' && Number(panel.duration) < STORYBOARD_MIN_DURATION)
  if (firstBelowMinimum >= 0) return `Storyboard panel ${firstBelowMinimum + 1} is below the minimum 0.5s duration.`
  const total = panels.reduce((sum, panel) => sum + numericDuration(panel.duration), 0)
  return Number.isFinite(budget) && total > budget!
    ? `Storyboard timing ${formatDurationSeconds(total)} exceeds the connected Video Generator budget ${formatDurationSeconds(budget!)}. Reduce a panel or increase Video duration.`
    : undefined
}
