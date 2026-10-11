import type { VideoModelDefinition } from './videoModels'

export type VideoFooterControlId = 'model' | 'duration' | 'resolution' | 'ratio' | 'quantity' | 'motion' | 'sound' | 'settings' | 'run'

export function videoFooterControlIds(model: Pick<VideoModelDefinition, 'supportsBitrateMode' | 'ratios' | 'resolutions'>): VideoFooterControlId[] {
  return [
    'model',
    'duration',
    ...(model.resolutions.length ? ['resolution' as const] : []),
    ...(model.ratios.length ? ['ratio' as const] : []),
    'quantity',
    'motion',
    'sound',
    'settings',
    'run',
  ]
}

export interface FluidControl<Id extends string = string> {
  id: Id
  preferredWidth: number
  minimumWidth: number
  protectDefault?: boolean
}

export interface FluidControlRow<Id extends string = string> {
  controls: FluidControl<Id>[]
  preferredWidth: number
  truncation: number
}

function cutCombinations(length: number, cutCount: number, start = 1, chosen: number[] = []): number[][] {
  if (chosen.length === cutCount) return [chosen]
  const combinations: number[][] = []
  for (let cut = start; cut < length; cut += 1) combinations.push(...cutCombinations(length, cutCount, cut + 1, [...chosen, cut]))
  return combinations
}

export function allocateFluidRows<Id extends string>(controls: readonly FluidControl<Id>[], availableWidth: number, gap: number): FluidControlRow<Id>[] {
  if (!controls.length) return []
  const candidates: Array<{ rows: FluidControlRow<Id>[]; score: number[] }> = []
  for (const rowCount of [2, 3]) {
    if (controls.length < rowCount) continue
    for (const cuts of cutCombinations(controls.length, rowCount - 1)) {
      if (cuts.includes(controls.length - 1)) continue // Settings stays immediately left of Run.
      const boundaries = [0, ...cuts, controls.length]
      const rows = boundaries.slice(0, -1).map((start, index) => {
        const rowControls = controls.slice(start, boundaries[index + 1]) as FluidControl<Id>[]
        const preferredWidth = rowControls.reduce((sum, control) => sum + control.preferredWidth, 0) + gap * Math.max(0, rowControls.length - 1)
        return { controls: rowControls, preferredWidth, truncation: Math.max(0, preferredWidth - availableWidth) }
      })
      if (rows[0]?.controls[0]?.id !== 'model') continue
      const lastIds = rows.at(-1)?.controls.slice(-2).map((control) => control.id)
      if (lastIds?.[0] !== 'settings' || lastIds[1] !== 'run') continue
      const protectedTruncation = rows.reduce((sum, row) => sum + (row.controls.some((control) => control.protectDefault) ? row.truncation : 0), 0)
      const totalTruncation = rows.reduce((sum, row) => sum + row.truncation, 0)
      const widths = rows.map((row) => Math.min(availableWidth, row.preferredWidth))
      const balance = Math.max(...widths) - Math.min(...widths)
      candidates.push({ rows, score: [protectedTruncation, totalTruncation, rowCount, balance] })
    }
  }
  candidates.sort((left, right) => {
    for (let index = 0; index < left.score.length; index += 1) {
      const difference = left.score[index] - right.score[index]
      if (difference) return difference
    }
    return 0
  })
  return candidates[0]?.rows || [{ controls: [...controls], preferredWidth: controls.reduce((sum, control) => sum + control.preferredWidth, 0), truncation: 0 }]
}

export interface SelectorChromeMetrics {
  defaultPaintedTextWidth: number
  leadingMarkWidth?: number
  chevronWidth: number
  internalGap: number
  paddingInline: number
  borderInline: number
}

export function selectorTrackFromDefault(metrics: SelectorChromeMetrics): number {
  const gaps = metrics.leadingMarkWidth ? 2 : 1
  return Math.ceil(
    metrics.defaultPaintedTextWidth
      + (metrics.leadingMarkWidth || 0)
      + metrics.chevronWidth
      + metrics.internalGap * gaps
      + metrics.paddingInline
      + metrics.borderInline,
  )
}

export interface RowSelectorMetric {
  id: string
  defaultTextWidth: number
  beforeTextChrome: number
  chevronAndRightChrome: number
}

export interface AllocatedSelectorTrack extends RowSelectorMetric {
  trackWidth: number
  textStart: number
  chevronDistance: number
}

export function allocateRowSelectorTracks(availableWidth: number, gap: number, selectors: readonly RowSelectorMetric[]): AllocatedSelectorTrack[] {
  if (!selectors.length) return []
  const controlsWidth = Math.max(0, availableWidth - gap * (selectors.length - 1))
  const intrinsicWidth = selectors.reduce((sum, selector) => sum
    + selector.beforeTextChrome
    + selector.defaultTextWidth
    + selector.chevronAndRightChrome, 0)
  const chevronDistance = Math.max(0, (controlsWidth - intrinsicWidth) / selectors.length)
  return selectors.map((selector) => ({
    ...selector,
    trackWidth: selector.beforeTextChrome + selector.defaultTextWidth + chevronDistance + selector.chevronAndRightChrome,
    textStart: selector.beforeTextChrome,
    chevronDistance,
  }))
}

export function controlGroupGaps<Group extends string>(gaps: Readonly<Record<Group, number>>): Record<Group, { columnGap: number; rowGap: number }> {
  return Object.fromEntries(Object.entries(gaps).map(([group, gap]) => [group, { columnGap: gap, rowGap: gap }])) as Record<Group, { columnGap: number; rowGap: number }>
}

export function fitClosedSelector(trackWidth: number, selectedPaintedTextWidth: number, fixedChromeWidth: number) {
  const visibleTextWidth = Math.max(0, trackWidth - fixedChromeWidth)
  return {
    trackWidth,
    visibleTextWidth: Math.min(selectedPaintedTextWidth, visibleTextWidth),
    truncated: selectedPaintedTextWidth > visibleTextWidth,
  }
}

export type FluidControlKind = 'selector' | 'editable-field' | 'bounded-elastic' | 'intrinsic' | 'fixed-action'
export type FluidControlPreferredZone = 'start' | 'middle' | 'end'
export type FluidControlFixedAnchor = 'first' | 'terminal'

export interface MixedControlInput<Id extends string = string> {
  id: Id
  kind: FluidControlKind
  /** Full readable default track, including protected chrome. */
  intrinsicWidth: number
  /** Smallest recognizable closed-track width. Operational selectors keep this equal to preferredWidth. */
  minimumWidth?: number
  /** Width that shows a catalog shortLabel without ellipsis. */
  compactWidth?: number
  /** Width that shows the exact selected label. */
  preferredWidth?: number
  fullLabel?: string
  compactLabel?: string
  shrinkPriority?: 'model' | 'operational'
  /** Intrinsic content is reference-capped; row slack is shared equally by selectors. */
  referenceSized?: boolean
  /** Optional capacity beyond the default; bounded elastic controls never reserve more than two painted characters. */
  maximumExtraWidth?: number
  shortCharacterWidth?: number
  visible?: boolean
  available?: boolean
  defaultLabel?: string
  priority?: number
  preferredRow?: number
  preferredZone?: FluidControlPreferredZone
  fixedAnchor?: FluidControlFixedAnchor
}

export interface FluidControlDescriptor<Id extends string = string> extends MixedControlInput<Id> {
  visible: boolean
  available: boolean
  priority: number
  preferredZone: FluidControlPreferredZone
}

export function activeControlDescriptors<Descriptor extends FluidControlDescriptor<string>>(descriptors: readonly Descriptor[]): Descriptor[] {
  return descriptors.filter((descriptor) => descriptor.visible && descriptor.available)
}

export function controlDescriptorSignature<Id extends string>(descriptors: readonly MixedControlInput<Id>[]): string {
  return JSON.stringify(descriptors.map((descriptor) => [
    descriptor.id,
    descriptor.kind,
    descriptor.visible !== false,
    descriptor.available !== false,
    descriptor.defaultLabel ?? null,
    finiteWidth(descriptor.intrinsicWidth),
    descriptor.minimumWidth ?? null,
    descriptor.compactWidth ?? null,
    descriptor.preferredWidth ?? null,
    descriptor.fullLabel ?? null,
    descriptor.compactLabel ?? null,
    descriptor.shrinkPriority ?? null,
    descriptor.referenceSized ?? false,
    descriptor.maximumExtraWidth ?? null,
    descriptor.shortCharacterWidth ?? null,
    descriptor.priority ?? 0,
    descriptor.preferredRow ?? null,
    descriptor.preferredZone ?? 'middle',
    descriptor.fixedAnchor ?? null,
  ]))
}

export interface AllocatedMixedControl<Id extends string = string> extends MixedControlInput<Id> {
  width: number
  sidePadding: number
  leftPadding: number
  rightPadding: number
  labelTier: 'minimum' | 'compact' | 'full'
}

export interface AllocatedMixedControlRow<Id extends string = string> {
  controls: AllocatedMixedControl<Id>[]
  gap: number
  gridTemplateColumns: string
  intrinsicOccupancy: number
  unusedWidth: number
}

export interface MixedControlAllocationOptions<Id extends string = string> {
  minRows?: number
  maxRows?: number
  firstId?: Id
  terminalIds?: readonly Id[]
  preferredRows?: readonly (readonly Id[])[]
  /** Opt-in for groups whose approved contract prioritizes whole-group row balance over row-local selector slack. */
  enforceBalancedRows?: boolean
}

/** Closed fields grow no further than their reference name; shorter names release space to row peers. Chrome is measured at the actual rendered caller. */
export function selectorReferenceTrackWidth(selectedTextWidth: number, referenceTextWidth: number, chromeWidth: number): number {
  return Math.min(finiteWidth(selectedTextWidth), finiteWidth(referenceTextWidth)) + finiteWidth(chromeWidth)
}

function finiteWidth(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, value || 0) : 0
}

function minimumControlWidth(control: MixedControlInput): number {
  return finiteWidth(control.minimumWidth ?? control.intrinsicWidth)
}

// Editable inputs use the same row space as selectors, with their own measured
// input width. They are not fixed actions and may occupy a whole narrow row.
function flexibleTrack(control: MixedControlInput): boolean {
  return control.kind === 'selector' || control.kind === 'editable-field'
}

function maximumControlWidth(control: MixedControlInput): number {
  const minimum = minimumControlWidth(control)
  if (control.kind === 'intrinsic' || control.kind === 'fixed-action') return minimum
  if (control.kind === 'bounded-elastic') {
    return minimum + Math.min(finiteWidth(control.maximumExtraWidth), finiteWidth(control.shortCharacterWidth) * 2)
  }
  if (control.shrinkPriority === 'model') {
    return Math.max(minimum, finiteWidth(control.preferredWidth ?? control.intrinsicWidth))
  }
  const preferred = Math.max(minimum, finiteWidth(control.preferredWidth ?? control.intrinsicWidth))
  return preferred + Math.min(12, control.maximumExtraWidth === undefined ? 12 : finiteWidth(control.maximumExtraWidth))
}

export interface SharedGapRowRange {
  minimumWidths: readonly number[]
  maximumWidths: readonly number[]
}

export interface SharedGapInterval {
  minimum: number
  maximum: number
}

export function sharedGapIntervalForRows(rows: readonly SharedGapRowRange[], availableWidth: number): SharedGapInterval | null {
  const safeWidth = finiteWidth(availableWidth)
  let minimum = 0
  let maximum = Number.POSITIVE_INFINITY
  for (const row of rows) {
    if (!row.minimumWidths.length || row.minimumWidths.length !== row.maximumWidths.length) return null
    const minimumSum = row.minimumWidths.reduce((sum, width) => sum + finiteWidth(width), 0)
    const maximumSum = row.maximumWidths.reduce((sum, width) => sum + finiteWidth(width), 0)
    if (minimumSum > maximumSum + 0.001) return null
    const gapCount = row.minimumWidths.length - 1
    if (!gapCount) {
      if (safeWidth + 0.001 < minimumSum || safeWidth - 0.001 > maximumSum) return null
      continue
    }
    minimum = Math.max(minimum, (safeWidth - maximumSum) / gapCount)
    maximum = Math.min(maximum, (safeWidth - minimumSum) / gapCount)
  }
  minimum = Math.max(0, minimum)
  if (maximum < minimum - 0.001) return null
  return { minimum: Number(minimum.toFixed(6)), maximum: Number(maximum.toFixed(6)) }
}

function compareScore(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index]
    if (difference) return difference
  }
  return 0
}

function rowAssignments(length: number, rowCount: number, fixedRows: ReadonlyMap<number, number>): number[][] {
  const assignments: number[][] = []
  const current = Array.from({ length }, () => 0)
  const visit = (index: number) => {
    if (index === length) {
      if (new Set(current).size === rowCount) assignments.push([...current])
      return
    }
    const fixed = fixedRows.get(index)
    if (fixed !== undefined) {
      current[index] = fixed
      visit(index + 1)
      return
    }
    for (let row = 0; row < rowCount; row += 1) {
      current[index] = row
      visit(index + 1)
    }
  }
  visit(0)
  return assignments
}

function allocateMixedRow<Id extends string>(
  controls: readonly MixedControlInput<Id>[],
  availableWidth: number,
  gap: number,
): AllocatedMixedControlRow<Id> | null {
  const safeWidth = finiteWidth(availableWidth)
  const safeGap = finiteWidth(gap)
  const intrinsicOccupancy = controls.reduce((sum, control) => sum + minimumControlWidth(control), 0)
    + safeGap * Math.max(0, controls.length - 1)
  let remaining = safeWidth - intrinsicOccupancy
  if (remaining < -0.001) return null
  const extras = controls.map(() => 0)

  const referenceSelectors = controls.flatMap((control, index) => flexibleTrack(control) ? [index] : [])
  if (referenceSelectors.length && referenceSelectors.every(index => controls[index].referenceSized)) {
    // Predictable numeric/quantity fields retain their established symmetric
    // breathing-room cap; remaining row space belongs equally to selectors.
    for (const [index, control] of controls.entries()) {
      if (control.kind !== 'bounded-elastic') continue
      extras[index] = Math.min(remaining, Math.max(0, maximumControlWidth(control) - minimumControlWidth(control)))
      remaining -= extras[index]
    }
    const sharedExtra = remaining / referenceSelectors.length
    for (const index of referenceSelectors) extras[index] = sharedExtra
    const allocated = controls.map((control, index): AllocatedMixedControl<Id> => ({
      ...control, width: minimumControlWidth(control) + extras[index],
      sidePadding: control.kind === 'bounded-elastic' ? extras[index] / 2 : 0,
      leftPadding: control.kind === 'bounded-elastic' ? extras[index] / 2 : 0,
      rightPadding: control.kind === 'bounded-elastic' ? extras[index] / 2 : 0,
      labelTier: 'full',
    }))
    return { controls: allocated, gap: safeGap,
      gridTemplateColumns: allocated.map(control => `${Number(control.width.toFixed(3))}px`).join(' '),
      intrinsicOccupancy, unusedWidth: 0 }
  }

  // A selector-only row standardizes its default painted text-to-chevron
  // clearance. Each track starts at its readable default and receives the
  // same share of the remaining row width; later longer values may ellipsize.
  if (controls.every((control) => flexibleTrack(control) && control.shrinkPriority !== 'model')) {
    const equalSlack = remaining / controls.length
    const allocated = controls.map((control): AllocatedMixedControl<Id> => ({
      ...control,
      width: minimumControlWidth(control) + equalSlack,
      sidePadding: 0,
      leftPadding: 0,
      rightPadding: 0,
      labelTier: control.shrinkPriority === 'model' && minimumControlWidth(control) + equalSlack + 0.001 < finiteWidth(control.preferredWidth)
        ? minimumControlWidth(control) + equalSlack + 0.001 >= finiteWidth(control.compactWidth) ? 'compact' : 'minimum'
        : 'full',
    }))
    return {
      controls: allocated,
      gap: safeGap,
      gridTemplateColumns: allocated.map((control) => `${Number(control.width.toFixed(3))}px`).join(' '),
      intrinsicOccupancy,
      unusedWidth: 0,
    }
  }

  // Model tracks grow through recognizable identity → catalog shortLabel →
  // exact full label before optional bounded breathing room consumes space.
  for (const [index, control] of controls.entries()) {
    if (control.kind !== 'selector' || control.shrinkPriority !== 'model' || remaining <= 0) continue
    const minimum = minimumControlWidth(control)
    for (const target of [control.compactWidth, control.preferredWidth]) {
      const desired = Math.max(0, finiteWidth(target) - minimum - extras[index])
      const extra = Math.min(desired, remaining)
      extras[index] += extra
      remaining -= extra
    }
  }

  // Short predictable values get symmetric breathing room only after model
  // identity has reclaimed full-label budget. Extreme theoretical values can
  // never reserve more than two painted characters.
  for (const [index, control] of controls.entries()) {
    if (control.kind !== 'bounded-elastic' || remaining <= 0) continue
    const cap = Math.min(finiteWidth(control.maximumExtraWidth), finiteWidth(control.shortCharacterWidth) * 2)
    const extra = Math.min(cap, remaining)
    extras[index] = extra
    remaining -= extra
  }

  // Operational selectors may absorb only their explicit modest collision cap.
  for (const [index, control] of controls.entries()) {
    if (control.kind !== 'selector' || control.shrinkPriority === 'model' || remaining <= 0) continue
    const capacity = Math.max(0, maximumControlWidth(control) - minimumControlWidth(control) - extras[index])
    const extra = Math.min(capacity, remaining)
    extras[index] += extra
    remaining -= extra
  }

  // Mixed rows keep intrinsic actions fixed. Once readable/model/bounded
  // ranges are satisfied, selector tracks share unavoidable residual width
  // instead of converting it into a random larger inter-control gap.
  const fluidSelectorIndexes = controls.flatMap((control, index) => flexibleTrack(control) ? [index] : [])
  if (remaining > 0.001 && fluidSelectorIndexes.length) {
    const sharedExtra = remaining / fluidSelectorIndexes.length
    for (const index of fluidSelectorIndexes) extras[index] += sharedExtra
    remaining = 0
  }

  if (remaining > 0.001) return null

  const allocated = controls.map((control, index): AllocatedMixedControl<Id> => {
    const sidePadding = control.kind === 'bounded-elastic' ? extras[index] / 2 : 0
    return {
      ...control,
      width: flexibleTrack(control) ? minimumControlWidth(control) + extras[index] : Math.min(maximumControlWidth(control), minimumControlWidth(control) + extras[index]),
      sidePadding,
      leftPadding: sidePadding,
      rightPadding: sidePadding,
      labelTier: control.shrinkPriority !== 'model'
        ? 'full'
        : minimumControlWidth(control) + extras[index] + 0.001 >= finiteWidth(control.preferredWidth)
          ? 'full'
          : minimumControlWidth(control) + extras[index] + 0.001 >= finiteWidth(control.compactWidth)
            ? 'compact'
            : 'minimum',
    }
  })
  return {
    controls: allocated,
    gap: safeGap,
    gridTemplateColumns: allocated.map((control) => `${Number(control.width.toFixed(3))}px`).join(' '),
    intrinsicOccupancy,
    unusedWidth: remaining,
  }
}

export function allocateMixedControlRows<Id extends string>(
  controls: readonly MixedControlInput<Id>[],
  availableWidth: number,
  gap: number,
  options: MixedControlAllocationOptions<Id> = {},
): AllocatedMixedControlRow<Id>[] {
  if (!controls.length) return []
  const safeWidth = finiteWidth(availableWidth)
  const safeGap = finiteWidth(gap)
  if (!safeWidth || controls.some((control) => minimumControlWidth(control) > safeWidth)) return []

  const minRows = Math.max(1, Math.min(controls.length, options.minRows ?? 1))
  const maxRows = Math.max(minRows, Math.min(controls.length, options.maxRows ?? minRows))
  const terminalIds = options.terminalIds || []
  const fixedRows = new Map<number, number>()
  if (options.firstId) {
    const firstIndex = controls.findIndex((control) => control.id === options.firstId)
    if (firstIndex < 0) return []
    fixedRows.set(firstIndex, 0)
  }

  const candidates: Array<{ rows: AllocatedMixedControlRow<Id>[]; score: number[] }> = []
  for (let rowCount = minRows; rowCount <= maxRows; rowCount += 1) {
    const rowFixed = new Map(fixedRows)
    for (const terminalId of terminalIds) {
      const terminalIndex = controls.findIndex((control) => control.id === terminalId)
      if (terminalIndex < 0) return []
      rowFixed.set(terminalIndex, rowCount - 1)
    }
    for (const assignment of rowAssignments(controls.length, rowCount, rowFixed)) {
      const groups = Array.from({ length: rowCount }, (_, row) => controls.filter((_control, index) => assignment[index] === row) as MixedControlInput<Id>[])
      if (options.firstId && groups[0]?.[0]?.id !== options.firstId) continue
      if (terminalIds.length) {
        const terminal = groups.at(-1)?.slice(-terminalIds.length).map((control) => control.id)
        if (!terminal || terminal.some((id, index) => id !== terminalIds[index])) continue
      }
      if (rowCount > 1 && groups.some((row) => row.reduce((sum, control) => sum + maximumControlWidth(control), 0) + safeGap * Math.max(0, row.length - 1) < safeWidth - 0.001 && !row.some(flexibleTrack))) continue
      const interval = sharedGapIntervalForRows(groups.map((row) => ({
        minimumWidths: row.map(minimumControlWidth),
        maximumWidths: row.map((control) => flexibleTrack(control) ? safeWidth : maximumControlWidth(control)),
      })), safeWidth)
      if (!interval) continue
      // The caller's established group gap is a layout invariant, not spare
      // width for the optimizer to resize. Reject a membership candidate that
      // cannot fill every row at that exact horizontal/vertical rhythm.
      if (safeGap < interval.minimum - 0.001 || safeGap > interval.maximum + 0.001) continue
      const sharedGap = safeGap
      const allocatedRows = groups.map((row) => allocateMixedRow(row, safeWidth, sharedGap))
      if (allocatedRows.some((row) => !row)) continue
      const finalRows = allocatedRows as AllocatedMixedControlRow<Id>[]
      const preferredPenalty = options.preferredRows
        ? groups.reduce((penalty, row, rowIndex) => penalty + row.reduce((rowPenalty, control, controlIndex) => {
          const preferredRow = options.preferredRows!.findIndex((ids) => ids.includes(control.id))
          const preferredIndex = preferredRow < 0 ? -1 : options.preferredRows![preferredRow].indexOf(control.id)
          return rowPenalty + (preferredRow >= 0 && preferredRow !== rowIndex ? 100 : 0) + (preferredRow === rowIndex && preferredIndex !== controlIndex ? 1 : 0)
        }, 0), 0)
        : 0
      const modelCompaction = finalRows.flatMap((row) => row.controls)
        .filter((control) => control.shrinkPriority === 'model')
        .reduce((sum, control) => sum + Math.max(0, finiteWidth(control.preferredWidth) - control.width), 0)
      const controlCounts = groups.map((row) => row.length)
      const orphanPenalty = controlCounts.some((count) => count === 1) ? 1 : 0
      const countSpread = Math.max(...controlCounts) - Math.min(...controlCounts)
      const densities = groups.map((row) => row.reduce((sum, control) => sum + minimumControlWidth(control), 0))
      const meanDensity = densities.reduce((sum, width) => sum + width, 0) / densities.length
      const densityVariance = densities.reduce((sum, width) => sum + (width - meanDensity) ** 2, 0) / densities.length
      const operationalExpansion = finalRows.flatMap((row) => row.controls)
        .filter((control) => control.kind === 'selector' && control.shrinkPriority !== 'model')
        .reduce((sum, control) => sum + Math.max(0, control.width - minimumControlWidth(control)), 0)
      const widestOperational = Math.max(0, ...finalRows.flatMap((row) => row.controls)
        .filter((control) => control.kind === 'selector' && control.shrinkPriority !== 'model')
        .map((control) => control.width))
      candidates.push({
        rows: finalRows,
        score: options.enforceBalancedRows
          ? [modelCompaction, rowCount, orphanPenalty, countSpread, preferredPenalty, densityVariance, widestOperational, operationalExpansion]
          : [modelCompaction, widestOperational, rowCount, countSpread, densityVariance, operationalExpansion, preferredPenalty],
      })
    }
  }

  candidates.sort((left, right) => compareScore(left.score, right.score))
  return candidates[0]?.rows || []
}

export function controlGroupWidthChanged(previousWidth: number, nextWidth: number): boolean {
  return !Number.isFinite(previousWidth) || Math.abs(finiteWidth(nextWidth) - finiteWidth(previousWidth)) >= 0.25
}

export function rowMembershipKey<Id extends string>(row: AllocatedMixedControlRow<Id>): string {
  return row.controls.map((control) => control.id).join('|')
}

export function layoutSignature<Id extends string>(rows: readonly AllocatedMixedControlRow<Id>[]): string {
  return JSON.stringify(rows.map((row) => [
    rowMembershipKey(row),
    Number(row.gap.toFixed(3)),
    ...row.controls.map((control) => Number(control.width.toFixed(3))),
  ]))
}

export interface ControlLayoutValidation {
  valid: boolean
  reasons: string[]
}

export interface PaintedControlBox {
  id: string
  left: number
  right: number
}

export function validatePaintedControlLayout(
  groupName: string,
  usableLeft: number,
  usableRight: number,
  gap: number,
  rows: readonly (readonly PaintedControlBox[])[],
  tolerance = 1,
): ControlLayoutValidation {
  const prefix = groupName || 'Unnamed Control Group'
  const reasons: string[] = []
  for (const [rowIndex, row] of rows.entries()) {
    if (!row.length) {
      reasons.push(`${prefix}/row:${rowIndex}/painted-empty`)
      continue
    }
    if (Math.abs(row[0].left - usableLeft) > tolerance) reasons.push(`${prefix}/row:${rowIndex}/painted-left:${row[0].left.toFixed(3)}!=${usableLeft.toFixed(3)}`)
    if (Math.abs(row.at(-1)!.right - usableRight) > tolerance) reasons.push(`${prefix}/row:${rowIndex}/painted-right:${row.at(-1)!.right.toFixed(3)}!=${usableRight.toFixed(3)}`)
    for (let index = 1; index < row.length; index += 1) {
      const paintedGap = row[index].left - row[index - 1].right
      if (Math.abs(paintedGap - gap) > tolerance) reasons.push(`${prefix}/row:${rowIndex}/painted-gap:${row[index - 1].id}->${row[index].id}:${paintedGap.toFixed(3)}!=${gap.toFixed(3)}`)
    }
  }
  return { valid: reasons.length === 0, reasons }
}

export function validateControlLayout<Id extends string>(
  groupName: string,
  descriptors: readonly MixedControlInput<Id>[],
  rows: readonly AllocatedMixedControlRow<Id>[],
  availableWidth: number,
): ControlLayoutValidation {
  const prefix = groupName || 'Unnamed Control Group'
  const active = descriptors.filter((descriptor) => descriptor.visible !== false && descriptor.available !== false)
  const activeById = new Map(active.map((descriptor) => [descriptor.id, descriptor]))
  const counts = new Map<Id, number>()
  const reasons: string[] = []
  if (active.length && !rows.length) reasons.push(`${prefix}/layout:empty`)
  const flattened = rows.flatMap((row) => row.controls)

  rows.forEach((row, rowIndex) => {
    if (!row.controls.length) reasons.push(`${prefix}/row:${rowIndex}/empty`)
    const occupied = row.controls.reduce((sum, control) => sum + finiteWidth(control.width), 0)
      + finiteWidth(row.gap) * Math.max(0, row.controls.length - 1)
    if (occupied > finiteWidth(availableWidth) + 0.001) reasons.push(`${prefix}/row:${rowIndex}/right-bound-exceeded:${occupied.toFixed(3)}>${finiteWidth(availableWidth).toFixed(3)}`)
    else if (occupied < finiteWidth(availableWidth) - 0.001) reasons.push(`${prefix}/row:${rowIndex}/not-full:${occupied.toFixed(3)}<${finiteWidth(availableWidth).toFixed(3)}`)
    row.controls.forEach((control) => {
      counts.set(control.id, (counts.get(control.id) || 0) + 1)
      const descriptor = activeById.get(control.id)
      if (!descriptor) {
        reasons.push(`${prefix}/control:${control.id}/inactive-present`)
        return
      }
      if (descriptor.kind !== control.kind) reasons.push(`${prefix}/control:${control.id}/category-mismatch:${control.kind}!=${descriptor.kind}`)
      if (finiteWidth(control.width) + 0.001 < minimumControlWidth(descriptor)) reasons.push(`${prefix}/control:${control.id}/default-not-readable:${finiteWidth(control.width).toFixed(3)}<${minimumControlWidth(descriptor).toFixed(3)}`)
      if (!flexibleTrack(descriptor) && finiteWidth(control.width) > maximumControlWidth(descriptor) + 0.001) reasons.push(`${prefix}/control:${control.id}/maximum-exceeded:${finiteWidth(control.width).toFixed(3)}>${maximumControlWidth(descriptor).toFixed(3)}`)
    })
  })

  for (const descriptor of active) {
    const count = counts.get(descriptor.id) || 0
    if (!count) reasons.push(`${prefix}/control:${descriptor.id}/missing`)
    else if (count > 1) reasons.push(`${prefix}/control:${descriptor.id}/duplicate:${count}`)
  }

  const firstAnchors = active.filter((descriptor) => descriptor.fixedAnchor === 'first')
  if (firstAnchors.length && flattened[0]?.id !== firstAnchors[0].id) reasons.push(`${prefix}/control:${firstAnchors[0].id}/first-anchor-moved`)
  const terminalAnchors = active.filter((descriptor) => descriptor.fixedAnchor === 'terminal').map((descriptor) => descriptor.id)
  if (terminalAnchors.length) {
    const trailing = flattened.slice(-terminalAnchors.length).map((control) => control.id)
    if (terminalAnchors.some((id, index) => trailing[index] !== id)) reasons.push(`${prefix}/control:${terminalAnchors.join(',')}/terminal-anchor-moved`)
  }

  return { valid: reasons.length === 0, reasons }
}

function manualSafeRows<Id extends string>(
  controls: readonly MixedControlInput<Id>[],
  availableWidth: number,
  gap: number,
  maxRows: number,
): AllocatedMixedControlRow<Id>[] {
  if (!controls.length) return []
  const safeWidth = finiteWidth(availableWidth)
  const safeGap = finiteWidth(gap)
  const groups: MixedControlInput<Id>[][] = [[]]
  for (const control of controls) {
    const current = groups.at(-1)!
    const occupied = current.reduce((sum, item) => sum + minimumControlWidth(item), 0)
      + safeGap * current.length + minimumControlWidth(control)
    if (current.length && occupied > safeWidth && groups.length < maxRows) groups.push([control])
    else current.push(control)
  }
  return groups.filter((group) => group.length).map((group) => {
    const allocated = group.map((control): AllocatedMixedControl<Id> => ({
      ...control,
      width: minimumControlWidth(control),
      sidePadding: 0,
      leftPadding: 0,
      rightPadding: 0,
      labelTier: control.shrinkPriority === 'model' ? 'minimum' : 'full',
    }))
    const intrinsicOccupancy = allocated.reduce((sum, control) => sum + control.width, 0) + safeGap * Math.max(0, allocated.length - 1)
    return {
      controls: allocated,
      gap: safeGap,
      gridTemplateColumns: allocated.map((control) => `${Number(control.width.toFixed(3))}px`).join(' '),
      intrinsicOccupancy,
      unusedWidth: Math.max(0, safeWidth - intrinsicOccupancy),
    }
  })
}

export function deterministicSafeControlRows<Id extends string>(
  controls: readonly MixedControlInput<Id>[],
  availableWidth: number,
  gap: number,
  options: MixedControlAllocationOptions<Id> = {},
): AllocatedMixedControlRow<Id>[] {
  const active = controls.filter((control) => control.visible !== false && control.available !== false)
  if (!active.length) return []
  const ids = new Set(active.map((control) => control.id))
  const safeOptions: MixedControlAllocationOptions<Id> = {
    ...options,
    firstId: options.firstId && ids.has(options.firstId) ? options.firstId : undefined,
    terminalIds: options.terminalIds?.filter((id) => ids.has(id)),
    preferredRows: options.preferredRows?.map((row) => row.filter((id) => ids.has(id))).filter((row) => row.length),
  }
  const allocated = allocateMixedControlRows(active, availableWidth, gap, safeOptions)
  if (validateControlLayout('deterministic-fallback', active, allocated, availableWidth).valid) return allocated
  const maximumRows = Math.max(1, Math.min(active.length, safeOptions.maxRows ?? active.length))
  return manualSafeRows(active, availableWidth, gap, maximumRows)
}
