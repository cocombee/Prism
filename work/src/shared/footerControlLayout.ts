import { allocateMixedControlRows, validateControlLayout, type AllocatedMixedControlRow, type MixedControlInput } from './controlGroupLayout'

export interface FooterControlLayoutOptions<Id extends string = string> {
  modelId?: Id
  runId?: Id
  settingsId?: Id
  /** Circular actions; omitted means all fixed-action controls. */
  iconIds?: readonly Id[]
}

export interface AllocatedFooterControlRow<Id extends string = string> extends AllocatedMixedControlRow<Id> {
  alignment: 'fill' | 'right'
  /** Only action-only rows may leave this leading space; their right edge remains fixed. */
  leadingUnusedWidth: number
}

const maximumOptimizedControls = 10
const maximumOptimizedRows = 3
const minimumWidth = (control: MixedControlInput) => control.minimumWidth ?? control.intrinsicWidth
const occupied = (controls: readonly MixedControlInput[], gap: number) => controls.reduce((sum, control) => sum + minimumWidth(control), 0) + gap * Math.max(0, controls.length - 1)
const flexible = (control: MixedControlInput) => control.kind === 'selector' || control.kind === 'editable-field'
const filled = <Id extends string>(rows: AllocatedMixedControlRow<Id>[]): AllocatedFooterControlRow<Id>[] => rows.map(row => ({ ...row, alignment: 'fill', leadingUnusedWidth: 0 }))

function optimize<Id extends string>(controls: MixedControlInput<Id>[], width: number, gap: number, firstId?: Id, terminalIds: readonly Id[] = []): AllocatedFooterControlRow<Id>[] {
  if (!controls.length || controls.length > maximumOptimizedControls) return []
  return filled(allocateMixedControlRows(controls, width, gap, { minRows: 1, maxRows: Math.min(maximumOptimizedRows, controls.length), firstId, terminalIds, balanceFieldPressure: true }))
}

/** Fixed circle frames and the established gap never expand to fill an action-only row. */
function actionRow<Id extends string>(actions: MixedControlInput<Id>[], width: number, gap: number): AllocatedFooterControlRow<Id> {
  const occupancy = occupied(actions, gap)
  return {
    controls: actions.map(control => ({ ...control, width: minimumWidth(control), sidePadding: 0, leftPadding: 0, rightPadding: 0, labelTier: 'full' })),
    gap,
    gridTemplateColumns: actions.map(control => `${minimumWidth(control)}px`).join(' '),
    intrinsicOccupancy: occupancy,
    unusedWidth: width - occupancy,
    alignment: 'right',
    leadingUnusedWidth: width - occupancy,
  }
}

/** Bounded deterministic fallback for many/narrow fields, preserving the first field. */
function fieldRows<Id extends string>(fields: MixedControlInput<Id>[], width: number, gap: number, firstId?: Id): AllocatedFooterControlRow<Id>[] {
  if (!fields.length) return []
  const optimized = optimize(fields, width, gap, firstId)
  if (optimized.length) return optimized
  const groups = fields.filter(flexible).map(control => [control])
  if (!groups.length) return []
  for (const control of fields.filter(control => !flexible(control))) {
    const group = groups.find(row => occupied([...row, control], gap) <= width)
    if (!group) return []
    group.push(control)
  }
  const rows: AllocatedFooterControlRow<Id>[] = []
  for (const group of groups) {
    const row = allocateMixedControlRows(group, width, gap, { minRows: 1, maxRows: 1 })
    if (!row.length) return []
    rows.push(...filled(row))
  }
  return rows
}

/**
 * Footer consumers supply measured selected-label/chrome widths and their existing tokens.
 * Fields use the shared space-pressure optimizer. Only the first field and circular suffix
 * are constrained. Renderer validation must accept leading space on `right` action-only
 * rows and paint those rows at the usable right edge, with the same vertical/horizontal gap.
 */
export function allocateFooterControlRows<Id extends string>(controls: readonly MixedControlInput<Id>[], width: number, gap: number, options: FooterControlLayoutOptions<Id> = {}): AllocatedFooterControlRow<Id>[] {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(gap) || gap < 0) return []
  const active = controls.filter(control => control.visible !== false && control.available !== false)
  if (!active.length || new Set(active.map(control => control.id)).size !== active.length) return []
  if (active.some(control => !Number.isFinite(minimumWidth(control)) || minimumWidth(control) < 0 || minimumWidth(control) > width)) return []
  const runId = options.runId ?? 'run' as Id
  const settingsId = options.settingsId ?? 'settings' as Id
  const iconIds = new Set(options.iconIds ?? active.filter(control => control.kind === 'fixed-action').map(control => control.id))
  const isAction = (control: MixedControlInput<Id>) => iconIds.has(control.id) || control.id === runId || control.id === settingsId
  if (active.some(control => isAction(control) && control.kind !== 'fixed-action')) return []
  const normalized: MixedControlInput<Id>[] = active.map(control => ({ ...control, fixedAnchor: undefined, preferredRow: undefined, preferredZone: undefined }))
  const actions = normalized.filter(control => isAction(control) && control.id !== runId && control.id !== settingsId)
  const settings = normalized.find(control => control.id === settingsId)
  const run = normalized.find(control => control.id === runId)
  if (settings) actions.push(settings)
  if (run) actions.push(run)
  const fields = normalized.filter(control => !isAction(control))
  const modelId = options.modelId ?? 'model' as Id
  const first = fields.find(control => control.id === modelId) ?? fields.filter(flexible).reduce<MixedControlInput<Id> | undefined>((longest, control) => !longest || (control.preferredWidth ?? control.intrinsicWidth) > (longest.preferredWidth ?? longest.intrinsicWidth) ? control : longest, undefined)
  if (first) fields.splice(0, fields.length, first, ...fields.filter(control => control.id !== first.id))
  const ordered = [...fields, ...actions]
  if (occupied(actions, gap) <= width) {
    const optimized = optimize(ordered, width, gap, first?.id, actions.map(control => control.id))
    if (optimized.length) return optimized
    const rows = fieldRows(fields, width, gap, first?.id)
    if (fields.length && !rows.length) return []
    return [...rows, ...(actions.length ? [actionRow(actions, width, gap)] : [])]
  }
  // Preserve the terminal pair; preceding circles wrap as a right-aligned suffix above it.
  const terminal = actions.filter(control => control.id === settingsId || control.id === runId)
  if (occupied(terminal, gap) > width) return []
  const optional = actions.filter(control => control.id !== settingsId && control.id !== runId)
  while (optional.length && occupied([optional.at(-1)!, ...terminal], gap) <= width) terminal.unshift(optional.pop()!)
  const overflow: AllocatedFooterControlRow<Id>[] = []
  while (optional.length) {
    const row: MixedControlInput<Id>[] = [optional.pop()!]
    while (optional.length && occupied([optional.at(-1)!, ...row], gap) <= width) row.unshift(optional.pop()!)
    overflow.unshift(actionRow(row, width, gap))
  }
  const rows = fieldRows(fields, width, gap, first?.id)
  if (fields.length && !rows.length) return []
  return [...rows, ...overflow, ...(terminal.length ? [actionRow(terminal, width, gap)] : [])]
}

export interface FooterControlValidationOptions<Id extends string = string> extends FooterControlLayoutOptions<Id> {
  /** Expected shared horizontal/vertical gap; Prism footers use 7px. */
  gap?: number
}

/** Arithmetic policy gate. Actual DOM painting still requires the renderer's geometry check. */
export function validateFooterControlLayout<Id extends string>(name: string, descriptors: readonly MixedControlInput<Id>[], rows: readonly AllocatedFooterControlRow<Id>[], availableWidth: number, options: FooterControlValidationOptions<Id> = {}): { valid: boolean; reasons: string[] } {
  const prefix = name || 'Unnamed Footer'
  const reasons: string[] = []
  const fail = (reason: string) => reasons.push(`${prefix}/${reason}`)
  const tolerance = 0.001
  const gap = options.gap ?? 7
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) fail('available-width-invalid')
  if (!Number.isFinite(gap) || gap < 0) fail('shared-gap-invalid')
  if (reasons.length) return { valid: false, reasons }
  const active = descriptors.filter(control => control.visible !== false && control.available !== false)
  const byId = new Map(active.map(control => [control.id, control]))
  if (byId.size !== active.length) fail('descriptor-id-duplicate')
  const runId = options.runId ?? 'run' as Id
  const settingsId = options.settingsId ?? 'settings' as Id
  const icons = new Set(options.iconIds ?? active.filter(control => control.kind === 'fixed-action').map(control => control.id))
  const isAction = (control: MixedControlInput<Id>) => icons.has(control.id) || control.id === settingsId || control.id === runId
  const optional = active.filter(control => isAction(control) && control.id !== settingsId && control.id !== runId)
  const settings = active.find(control => control.id === settingsId)
  const run = active.find(control => control.id === runId)
  const actions = [...optional, ...(settings ? [settings] : []), ...(run ? [run] : [])]
  for (const action of actions) if (action.kind !== 'fixed-action') fail(`control:${action.id}/circle-category-invalid`)
  for (const control of active) if (!Number.isFinite(minimumWidth(control)) || minimumWidth(control) < 0) fail(`control:${control.id}/minimum-width-invalid`)
  if (active.length && !rows.length) fail('layout-empty')
  const counts = new Map<Id, number>()
  rows.forEach((row, index) => {
    const rowPrefix = `row:${index}`
    if (!row.controls.length) fail(`${rowPrefix}/empty`)
    if (!Number.isFinite(row.gap) || Math.abs(row.gap - gap) > tolerance) fail(`${rowPrefix}/shared-gap-mismatch`)
    const occupancy = row.controls.reduce((sum, control) => sum + control.width, 0) + row.gap * Math.max(0, row.controls.length - 1)
    if (!Number.isFinite(occupancy) || occupancy > availableWidth + tolerance) fail(`${rowPrefix}/right-bound-exceeded`)
    for (const control of row.controls) {
      counts.set(control.id, (counts.get(control.id) || 0) + 1)
      const descriptor = byId.get(control.id)
      if (!descriptor) { fail(`control:${control.id}/unknown-or-inactive`); continue }
      if (descriptor.kind !== control.kind) fail(`control:${control.id}/category-mismatch`)
      if (!Number.isFinite(control.width) || control.width < minimumWidth(descriptor) - tolerance) fail(`control:${control.id}/width-invalid`)
      if (isAction(descriptor) && (Math.abs(control.width - minimumWidth(descriptor)) > tolerance || control.leftPadding !== 0 || control.rightPadding !== 0 || control.sidePadding !== 0)) fail(`control:${control.id}/circle-frame-changed`)
    }
    if (row.alignment === 'right') {
      if (row.controls.some(control => !byId.has(control.id) || !isAction(byId.get(control.id)!) || control.kind !== 'fixed-action')) fail(`${rowPrefix}/right-row-has-fields`)
      if (!Number.isFinite(row.leadingUnusedWidth) || row.leadingUnusedWidth < -tolerance || Math.abs(row.leadingUnusedWidth + occupancy - availableWidth) > tolerance) fail(`${rowPrefix}/right-edge-mismatch`)
      if (!Number.isFinite(row.unusedWidth) || Math.abs(row.unusedWidth - row.leadingUnusedWidth) > tolerance) fail(`${rowPrefix}/unused-width-mismatch`)
      if (!Number.isFinite(row.intrinsicOccupancy) || Math.abs(row.intrinsicOccupancy - occupancy) > tolerance) fail(`${rowPrefix}/intrinsic-occupancy-mismatch`)
    } else if (row.alignment === 'fill') {
      if (row.leadingUnusedWidth !== 0) fail(`${rowPrefix}/fill-row-leading-space`)
      if (Math.abs(occupancy - availableWidth) > tolerance) fail(`${rowPrefix}/fill-row-not-full`)
      const context = row.controls.flatMap(control => {
        const descriptor = byId.get(control.id)
        return descriptor ? [{ ...descriptor, fixedAnchor: undefined, preferredRow: undefined }] : []
      })
      const validation = validateControlLayout(`${prefix}/${rowPrefix}`, context, [row], availableWidth)
      reasons.push(...validation.reasons)
    } else fail(`${rowPrefix}/alignment-invalid`)
  })
  for (const control of active) {
    const count = counts.get(control.id) ?? 0
    if (!count) fail(`control:${control.id}/missing`)
    if (count > 1) fail(`control:${control.id}/duplicate`)
  }
  const flattened = rows.flatMap(row => row.controls)
  const fields = active.filter(control => !isAction(control))
  const modelId = options.modelId ?? 'model' as Id
  const first = fields.find(control => control.id === modelId) ?? fields.filter(flexible).reduce<MixedControlInput<Id> | undefined>((longest, control) => !longest || (control.preferredWidth ?? control.intrinsicWidth) > (longest.preferredWidth ?? longest.intrinsicWidth) ? control : longest, undefined)
  if (first && flattened[0]?.id !== first.id) fail(`control:${first.id}/first-anchor-moved`)
  const actionIds = actions.map(control => control.id)
  if (actionIds.length && flattened.slice(-actionIds.length).some((control, index) => control.id !== actionIds[index])) fail('circle-suffix-order-or-contiguity')
  const final = rows.at(-1)?.controls ?? []
  const terminal = [...(settings ? [settings.id] : []), ...(run ? [run.id] : [])]
  if (terminal.length && (final.length < terminal.length || final.slice(-terminal.length).some((control, index) => control.id !== terminal[index]))) fail('terminal-settings-run-moved')
  if (actionIds.length && occupied(actions, gap) <= availableWidth + tolerance) {
    if (final.length < actionIds.length || final.slice(-actionIds.length).some((control, index) => control.id !== actionIds[index])) fail('circle-cluster-unnecessarily-wrapped')
  }
  rows.slice(0, -1).forEach((row, index) => {
    if (row.controls.some(control => byId.has(control.id) && isAction(byId.get(control.id)!)) && row.alignment !== 'right') fail(`row:${index}/overflow-circles-not-right-aligned`)
  })
  return { valid: reasons.length === 0, reasons }
}
