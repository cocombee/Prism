import { selectorReferenceTrackWidth } from './controlGroupLayout'
import { describe, expect, it } from 'vitest'
import {
  activeControlDescriptors,
  allocateMixedControlRows,
  controlDescriptorSignature,
  controlGroupGaps,
  controlGroupWidthChanged,
  deterministicSafeControlRows,
  fitClosedSelector,
  layoutSignature,
  rowMembershipKey,
  selectorTrackFromDefault,
  sharedGapIntervalForRows,
  validateControlLayout,
  validatePaintedControlLayout,
  videoFooterControlIds,
  type FluidControlDescriptor,
  type MixedControlInput,
} from './controlGroupLayout'
import { resolveVideoModel } from './videoModels'

const selector = (id: string, intrinsicWidth: number): MixedControlInput => ({
  id,
  kind: 'selector',
  intrinsicWidth,
})

const occupied = (row: ReturnType<typeof allocateMixedControlRows>[number]) =>
  row.controls.reduce((sum, control) => sum + control.width, 0) + row.gap * Math.max(0, row.controls.length - 1)

describe('node-wide whole-group fluid control optimizer', () => {
  it('wraps an editable voice ID beneath its model on narrow nodes, preserving action widths and gap', () => {
    const controls: MixedControlInput[] = [selector('model', 176), { id: 'voice', kind: 'editable-field', intrinsicWidth: 132 }]
    const rows = allocateMixedControlRows(controls, 232, 7, { minRows: 1, maxRows: 2, firstId: 'model' })
    expect(rows.map(row => row.controls.map(control => control.id))).toEqual([['model'], ['voice']])
    expect(rows.map(row => row.controls[0].width)).toEqual([232, 232])
    expect(validateControlLayout('Voice', controls, rows, 232)).toEqual({ valid: true, reasons: [] })
    const wide = allocateMixedControlRows(controls, 380, 7, { minRows: 1, maxRows: 2, firstId: 'model' })
    expect(wide).toHaveLength(1)
    expect(occupied(wide[0])).toBe(380)
  })
  it('intersects one shared gap interval across rows with different control counts', () => {
    expect(sharedGapIntervalForRows([
      { minimumWidths: [20, 20, 20], maximumWidths: [24, 24, 24] },
      { minimumWidths: [30, 30], maximumWidths: [40, 40] },
    ], 100)).toEqual({ minimum: 20, maximum: 20 })
  })

  it('rejects sparse row candidates when their full-row gap intervals do not intersect', () => {
    expect(sharedGapIntervalForRows([
      { minimumWidths: [20, 20, 20], maximumWidths: [24, 24, 24] },
      { minimumWidths: [25, 25], maximumWidths: [35, 35] },
    ], 100)).toBeNull()
    expect(sharedGapIntervalForRows([
      { minimumWidths: [40], maximumWidths: [40] },
      { minimumWidths: [20, 20], maximumWidths: [40, 40] },
    ], 100)).toBeNull()
  })

  it('opt-in Image groups reject a model orphan and preserve the approved terminal slot', () => {
    const controls: MixedControlInput[] = [
      { id: 'model', kind: 'selector', intrinsicWidth: 112, minimumWidth: 80, preferredWidth: 140, shrinkPriority: 'model' },
      selector('format', 64), selector('resolution', 58),
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 72, maximumExtraWidth: 24, shortCharacterWidth: 5 },
      selector('ratio', 52),
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 28 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 28 },
    ]
    const rows = allocateMixedControlRows(controls, 342, 6, {
      minRows: 1, maxRows: 3, enforceBalancedRows: true, firstId: 'model',
      terminalIds: ['ratio', 'settings', 'run'],
      preferredRows: [['model', 'resolution', 'quantity'], ['format', 'ratio', 'settings', 'run']],
    })
    expect(rows.map((row) => row.controls.map((control) => control.id))).toEqual([
      ['model', 'resolution', 'quantity'],
      ['format', 'ratio', 'settings', 'run'],
    ])
    expect(rows.every((row) => Math.abs(occupied(row) - 342) <= 0.001)).toBe(true)
  })

  it('allocates the representative Video footer as balanced full-width 4/5 rows without Bitrate', () => {
    const controls: MixedControlInput[] = [
      selector('model', 80), selector('motion', 54), selector('ratio', 44), selector('duration', 38),
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 42, maximumExtraWidth: 24, shortCharacterWidth: 5 },
      selector('resolution', 48),
      { id: 'sound', kind: 'intrinsic', intrinsicWidth: 64 },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ]
    const rows = allocateMixedControlRows(controls, 315, 7, {
      minRows: 2, maxRows: 2, firstId: 'model', terminalIds: ['settings', 'run'],
      preferredRows: [['model', 'motion', 'ratio', 'duration'], ['quantity', 'resolution', 'sound', 'settings', 'run']],
    })

    expect(rows.map((row) => row.controls.map((control) => control.id))).toEqual([
      ['model', 'motion', 'resolution', 'sound'],
      ['ratio', 'duration', 'quantity', 'settings', 'run'],
    ])
    expect(rows.every((row) => Math.abs(occupied(row) - 315) <= 0.001)).toBe(true)
    expect(rows.flatMap((row) => row.controls).some((control) => control.id === 'bitrate')).toBe(false)
    expect(rows.flatMap((row) => row.controls).find((control) => control.id === 'sound')?.width).toBe(64)
  })

  it('allocates the Storyboard footer as one exact full-width row with readable model and fixed Save action', () => {
    const [row] = allocateMixedControlRows([
      selector('assistant-model', 94),
      { id: 'budget', kind: 'bounded-elastic', intrinsicWidth: 58, maximumExtraWidth: 12, shortCharacterWidth: 6 },
      { id: 'save', kind: 'fixed-action', intrinsicWidth: 28 },
      { id: 'revamp', kind: 'intrinsic', intrinsicWidth: 62 },
    ], 315, 6, { minRows: 1, maxRows: 1, firstId: 'assistant-model' })

    expect(row.controls.map((control) => control.id)).toEqual(['assistant-model', 'budget', 'save', 'revamp'])
    expect(occupied(row)).toBeCloseTo(315, 6)
    expect(row.controls.find((control) => control.id === 'assistant-model')!.width).toBeGreaterThanOrEqual(94)
    expect(row.controls.find((control) => control.id === 'budget')!.width).toBeLessThanOrEqual(70)
    expect(row.controls.find((control) => control.id === 'save')!.width).toBe(28)
    expect(row.controls.find((control) => control.id === 'revamp')!.width).toBe(62)
  })

  it('rejects an intrinsic-only row instead of changing its established group gap to fill width', () => {
    const rows = allocateMixedControlRows([
      { id: 'sound', kind: 'intrinsic', intrinsicWidth: 64 },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ], 315, 6, { minRows: 1, maxRows: 1, terminalIds: ['settings', 'run'] })
    expect(rows).toEqual([])
  })

  it('uses a non-contiguous assignment when moving a compatible control avoids row three', () => {
    const controls: MixedControlInput[] = [
      selector('model', 130),
      selector('duration', 60),
      selector('resolution', 90),
      selector('ratio', 80),
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ]

    const rows = allocateMixedControlRows(controls, 260, 5, {
      minRows: 1,
      maxRows: 3,
      firstId: 'model',
      terminalIds: ['settings', 'run'],
    })

    expect(rows).toHaveLength(2)
    expect(rows[0].controls.map((control) => control.id)).toEqual(['model', 'resolution'])
    expect(rows[1].controls.map((control) => control.id)).toEqual(['duration', 'ratio', 'settings', 'run'])
    expect(rows.flatMap((row) => row.controls.map((control) => control.id)).sort()).toEqual(controls.map((control) => control.id).sort())
  })

  it('rebalances all rows when a readable third row is required', () => {
    const controls: MixedControlInput[] = [
      selector('model', 120), selector('duration', 78), selector('resolution', 92), selector('ratio', 80),
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 44, maximumExtraWidth: 100, shortCharacterWidth: 8 },
      selector('motion', 66),
      { id: 'sound', kind: 'intrinsic', intrinsicWidth: 64 },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ]

    const rows = allocateMixedControlRows(controls, 220, 6, {
      minRows: 1,
      maxRows: 3,
      firstId: 'model',
      terminalIds: ['settings', 'run'],
    })

    expect(rows).toHaveLength(3)
    const baseOccupancies = rows.map((row) => row.intrinsicOccupancy)
    expect(Math.max(...baseOccupancies) - Math.min(...baseOccupancies)).toBeLessThanOrEqual(38)
    expect(rows.at(-1)!.controls.length).toBeGreaterThanOrEqual(3)
    expect(rows.every((row) => occupied(row) <= 220.001)).toBe(true)
  })

  it('rejects every candidate that would truncate a default selected label', () => {
    const rows = allocateMixedControlRows([
      selector('model', 321),
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ], 315, 6, { minRows: 1, maxRows: 3, firstId: 'model', terminalIds: ['settings', 'run'] })

    expect(rows).toEqual([])
  })

  it('caps bounded short-value capacity at two painted characters and ignores extreme theoretical values', () => {
    const [row] = allocateMixedControlRows([
      { id: 'budget', kind: 'bounded-elastic', intrinsicWidth: 58, maximumExtraWidth: 1000, shortCharacterWidth: 8 },
      selector('model', 100),
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 42, maximumExtraWidth: 1000, shortCharacterWidth: 7 },
    ], 270, 6, { minRows: 1, maxRows: 1 })

    const budget = row.controls.find((control) => control.id === 'budget')!
    const quantity = row.controls.find((control) => control.id === 'quantity')!
    expect(budget.width).toBeLessThanOrEqual(58 + 16)
    expect(quantity.width).toBeLessThanOrEqual(42 + 14)
    expect(budget.leftPadding).toBe(budget.rightPadding)
    expect(quantity.leftPadding).toBe(quantity.rightPadding)
  })

  it('protects full operational values before growing a model from minimum to compact to full', () => {
    const controls: MixedControlInput[] = [
      {
        id: 'model', kind: 'selector', intrinsicWidth: 70,
        minimumWidth: 70, compactWidth: 112, preferredWidth: 176,
        fullLabel: 'Seedance 2 Mini · References', compactLabel: 'Seedance 2 Mini',
        shrinkPriority: 'model',
      },
      { id: 'motion', kind: 'selector', intrinsicWidth: 58, minimumWidth: 58, preferredWidth: 58, fullLabel: 'Native', shrinkPriority: 'operational' },
      { id: 'resolution', kind: 'selector', intrinsicWidth: 52, minimumWidth: 52, preferredWidth: 52, fullLabel: '480p', shrinkPriority: 'operational' },
      { id: 'ratio', kind: 'selector', intrinsicWidth: 48, minimumWidth: 48, preferredWidth: 48, fullLabel: '16:9', shrinkPriority: 'operational' },
      { id: 'duration', kind: 'selector', intrinsicWidth: 42, minimumWidth: 42, preferredWidth: 42, fullLabel: '10s', shrinkPriority: 'operational' },
    ]

    const [compactRow] = allocateMixedControlRows(controls, 340, 7, { minRows: 1, maxRows: 1, firstId: 'model' })
    const compactModel = compactRow.controls.find((control) => control.id === 'model')!
    expect(compactModel.labelTier).toBe('compact')
    expect(compactModel.width).toBeGreaterThanOrEqual(112)
    expect(compactRow.controls.filter((control) => control.id !== 'model').every((control) => control.width >= control.preferredWidth!)).toBe(true)

    const [fullRow] = allocateMixedControlRows(controls, 404, 7, { minRows: 1, maxRows: 1, firstId: 'model' })
    const fullModel = fullRow.controls.find((control) => control.id === 'model')!
    expect(fullModel.labelTier).toBe('full')
    expect(fullModel.width).toBeGreaterThanOrEqual(176)
  })

  it('never lets an operational short selector absorb unbounded row slack', () => {
    const rows = allocateMixedControlRows([
      {
        id: 'model', kind: 'selector', intrinsicWidth: 80,
        minimumWidth: 80, compactWidth: 116, preferredWidth: 164,
        fullLabel: 'WAN 2.2 Animate · Replace', compactLabel: 'WAN 2.2', shrinkPriority: 'model',
      },
      { id: 'motion', kind: 'selector', intrinsicWidth: 58, minimumWidth: 58, preferredWidth: 58, shrinkPriority: 'operational' },
      { id: 'ratio', kind: 'selector', intrinsicWidth: 48, minimumWidth: 48, preferredWidth: 48, shrinkPriority: 'operational' },
      { id: 'duration', kind: 'selector', intrinsicWidth: 42, minimumWidth: 42, preferredWidth: 42, shrinkPriority: 'operational' },
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 42, maximumExtraWidth: 24, shortCharacterWidth: 5 },
      { id: 'resolution', kind: 'selector', intrinsicWidth: 52, minimumWidth: 52, preferredWidth: 52, shrinkPriority: 'operational' },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ], 315, 7, { minRows: 2, maxRows: 2, firstId: 'model', terminalIds: ['settings', 'run'] })

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.gap)).toEqual([7, 7])
    expect(rows.every((row) => Math.abs(occupied(row) - 315) <= 0.001)).toBe(true)
    const allocated = rows.flatMap((row) => row.controls)
    const model = allocated.find((control) => control.id === 'model')!
    const resolution = allocated.find((control) => control.id === 'resolution')!
    expect(resolution.width).toBeLessThanOrEqual(64)
    expect(resolution.width).toBeLessThan(model.width)
    expect(allocated.filter((control) => control.shrinkPriority === 'operational').every((control) => control.width <= control.minimumWidth! + 12)).toBe(true)
  })

  it.each([
    ['WAN without Sound', false],
    ['Seedance with Sound', true],
  ])('keeps %s in two balanced full rows with compact Resolution and contained terminals', (_name, soundAvailable) => {
    const controls: MixedControlInput[] = [
      { id: 'model', kind: 'selector', intrinsicWidth: 80, minimumWidth: 80, compactWidth: 118, preferredWidth: 170, shrinkPriority: 'model' },
      { id: 'motion', kind: 'selector', intrinsicWidth: 58, minimumWidth: 58, preferredWidth: 58, shrinkPriority: 'operational' },
      { id: 'ratio', kind: 'selector', intrinsicWidth: 48, minimumWidth: 48, preferredWidth: 48, shrinkPriority: 'operational' },
      { id: 'duration', kind: 'selector', intrinsicWidth: 42, minimumWidth: 42, preferredWidth: 42, shrinkPriority: 'operational' },
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 42, maximumExtraWidth: 24, shortCharacterWidth: 5 },
      { id: 'resolution', kind: 'selector', intrinsicWidth: 52, minimumWidth: 52, preferredWidth: 52, shrinkPriority: 'operational' },
      { id: 'sound', kind: 'intrinsic', intrinsicWidth: 64, available: soundAvailable },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ]
    const active = controls.filter((control) => control.available !== false)
    const rows = allocateMixedControlRows(active, 315, 7, {
      minRows: 2, maxRows: 2, firstId: 'model', terminalIds: ['settings', 'run'],
      preferredRows: [['model', 'motion', 'ratio', 'duration'], ['quantity', 'resolution', 'sound', 'settings', 'run']],
    })

    expect(rows).toHaveLength(2)
    expect(rows.every((row) => Math.abs(occupied(row) - 315) <= 0.001)).toBe(true)
    expect(rows.map((row) => row.gap)).toEqual([7, 7])
    expect(rows.flatMap((row) => row.controls).find((control) => control.id === 'resolution')!.width).toBeLessThanOrEqual(64)
    expect(rows.at(-1)!.controls.slice(-2).map((control) => control.id)).toEqual(['settings', 'run'])
    expect(rows.at(-1)!.controls.slice(-2).every((control) => control.width <= 32)).toBe(true)
  })

  it('reclaims bounded optional width before compacting a full Storyboard assistant model', () => {
    const [row] = allocateMixedControlRows([
      {
        id: 'assistant-model', kind: 'selector', intrinsicWidth: 70,
        minimumWidth: 70, compactWidth: 96, preferredWidth: 116,
        fullLabel: 'Claude Opus 5', compactLabel: 'Claude Opus 5', shrinkPriority: 'model',
      },
      { id: 'budget', kind: 'bounded-elastic', intrinsicWidth: 58, maximumExtraWidth: 12, shortCharacterWidth: 6 },
      { id: 'save', kind: 'intrinsic', intrinsicWidth: 56 },
      { id: 'revamp', kind: 'intrinsic', intrinsicWidth: 54 },
    ], 302, 6, { minRows: 1, maxRows: 1, firstId: 'assistant-model' })

    expect(row.controls.find((control) => control.id === 'assistant-model')).toMatchObject({ labelTier: 'full', width: 116 })
    expect(row.controls.find((control) => control.id === 'budget')!.width).toBe(58)
  })

  it('keeps intrinsic Sound and fixed actions at exact standard widths', () => {
    const rows = allocateMixedControlRows([
      selector('model', 120),
      { id: 'sound', kind: 'intrinsic', intrinsicWidth: 64 },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 32 },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 31 },
    ], 315, 6, { minRows: 1, maxRows: 2, firstId: 'model', terminalIds: ['settings', 'run'] })
    const allocated = rows.flatMap((row) => row.controls)

    expect(allocated.find((control) => control.id === 'sound')?.width).toBe(64)
    expect(allocated.find((control) => control.id === 'settings')?.width).toBe(32)
    expect(allocated.find((control) => control.id === 'run')?.width).toBe(31)
    expect(rows.every((row) => Math.abs(occupied(row) - 315) <= 0.001)).toBe(true)
  })

  it.each([
    ['Seedance Pro', 'bytedance/seedance-2.0/text-to-video'],
    ['Seedance Mini', 'bytedance/seedance-2.0/mini/text-to-video'],
    ['WAN native controls', 'wan-controlled'],
    ['Kling variant', 'fal-ai/kling-video/v3/pro/text-to-video'],
    ['Veo variant', 'fal-ai/veo3.1'],
  ])('preserves expected Video IDs once for %s', (_name, modelId) => {
    const ids = videoFooterControlIds(resolveVideoModel(modelId))
    expect(ids[0]).toBe('model')
    expect(ids.slice(-2)).toEqual(['settings', 'run'])
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toContain('bitrate')
  })

  it('keeps selector intrinsic sizing, closed-track truncation, and group gaps deterministic', () => {
    expect(selectorTrackFromDefault({ defaultPaintedTextWidth: 31, leadingMarkWidth: 16, chevronWidth: 10, internalGap: 7, paddingInline: 16, borderInline: 2 })).toBe(89)
    expect(fitClosedSelector(89, 104, 58)).toEqual({ trackWidth: 89, visibleTextWidth: 31, truncated: true })
    expect(controlGroupGaps({ upper: 7, middle: 6 })).toEqual({ upper: { columnGap: 7, rowGap: 7 }, middle: { columnGap: 6, rowGap: 6 } })
  })

  it('rejects wrapper-perfect rows when painted child edges or border gaps are wrong', () => {
    const valid = validatePaintedControlLayout('Storyboard Footer', 10, 310, 6, [[
      { id: 'model', left: 10, right: 104 },
      { id: 'budget', left: 110, right: 168 },
      { id: 'save', left: 174, right: 236 },
      { id: 'revamp', left: 242, right: 310 },
    ]])
    expect(valid).toEqual({ valid: true, reasons: [] })
    const invalid = validatePaintedControlLayout('Storyboard Footer', 10, 310, 6, [[
      { id: 'model', left: 11.5, right: 104 },
      { id: 'budget', left: 112, right: 168 },
      { id: 'save', left: 174, right: 233 },
      { id: 'revamp', left: 242, right: 308 },
    ]])
    expect(invalid.valid).toBe(false)
    expect(invalid.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('painted-left'),
      expect.stringContaining('painted-gap'),
      expect.stringContaining('painted-right'),
    ]))
  })

  it('filters unavailable descriptors before allocation and validates every active ID exactly once', () => {
    const descriptors: FluidControlDescriptor[] = [
      { id: 'model', kind: 'selector', visible: true, available: true, defaultLabel: 'Seedance 2.5 Image', intrinsicWidth: 142, priority: 100, preferredRow: 0, preferredZone: 'start', fixedAnchor: 'first' },
      { id: 'ratio', kind: 'selector', visible: true, available: false, defaultLabel: 'From Input', intrinsicWidth: 68, priority: 50, preferredRow: 0, preferredZone: 'middle' },
      { id: 'settings', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 32, priority: 90, preferredRow: 1, preferredZone: 'end', fixedAnchor: 'terminal' },
      { id: 'run', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 31, priority: 100, preferredRow: 1, preferredZone: 'end', fixedAnchor: 'terminal' },
    ]
    const active = activeControlDescriptors(descriptors)
    const rows = deterministicSafeControlRows(active, 315, 7, { minRows: 1, maxRows: 2, firstId: 'model', terminalIds: ['settings', 'run'] })

    expect(active.map(({ id }) => id)).toEqual(['model', 'settings', 'run'])
    expect(rows.length).toBeGreaterThan(0)
    expect(validateControlLayout('Video Footer Controls', active, rows, 315)).toEqual({ valid: true, reasons: [] })
    expect(rows.flatMap((row) => row.controls.map(({ id }) => id))).not.toContain('ratio')
  })

  it('names the group, control, and reason for stale, duplicate, unreadable, and out-of-bounds layouts', () => {
    const descriptors: FluidControlDescriptor[] = [
      { id: 'model', kind: 'selector', visible: true, available: true, defaultLabel: 'Seedance 2.5 Image', intrinsicWidth: 140, priority: 100, preferredZone: 'start', fixedAnchor: 'first' },
      { id: 'run', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 31, priority: 100, preferredZone: 'end', fixedAnchor: 'terminal' },
    ]
    const invalid = [{
      controls: [
        { ...descriptors[0], width: 80, sidePadding: 0, leftPadding: 0, rightPadding: 0, labelTier: 'full' as const },
        { ...descriptors[0], width: 200, sidePadding: 0, leftPadding: 0, rightPadding: 0, labelTier: 'full' as const },
        { id: 'ratio', kind: 'selector' as const, visible: false, available: false, defaultLabel: 'From Input', intrinsicWidth: 50, priority: 0, preferredZone: 'middle' as const, width: 50, sidePadding: 0, leftPadding: 0, rightPadding: 0, labelTier: 'full' as const },
      ],
      gap: 7,
      gridTemplateColumns: '80px 140px 50px',
      intrinsicOccupancy: 284,
      unusedWidth: 0,
    }]
    const result = validateControlLayout('Video Footer Controls', descriptors, invalid, 260)

    expect(result.valid).toBe(false)
    expect(result.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Video Footer Controls/control:model/default-not-readable'),

      expect.stringContaining('Video Footer Controls/control:model/duplicate'),
      expect.stringContaining('Video Footer Controls/control:ratio/inactive-present'),
      expect.stringContaining('Video Footer Controls/row:0/right-bound-exceeded'),
      expect.stringContaining('Video Footer Controls/control:run/missing'),
    ]))
  })

  it('never returns a blank fallback when optimization has no valid candidate', () => {
    const descriptors: FluidControlDescriptor[] = [
      { id: 'model', kind: 'selector', visible: true, available: true, defaultLabel: 'Default Model', intrinsicWidth: 120, priority: 100, preferredZone: 'start', fixedAnchor: 'first' },
      { id: 'settings', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 32, priority: 90, preferredZone: 'end', fixedAnchor: 'terminal' },
      { id: 'run', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 31, priority: 100, preferredZone: 'end', fixedAnchor: 'terminal' },
    ]
    expect(allocateMixedControlRows(descriptors, 315, 7, { minRows: 1, maxRows: 1, firstId: 'missing' })).toEqual([])
    const fallback = deterministicSafeControlRows(descriptors, 315, 7, { minRows: 1, maxRows: 2, firstId: 'missing' })
    expect(fallback.length).toBeGreaterThan(0)
    expect(fallback.every((row) => row.controls.length > 0)).toBe(true)
    expect(fallback.flatMap((row) => row.controls.map(({ id }) => id))).toEqual(['model', 'settings', 'run'])
    expect(validateControlLayout('Image Footer Controls', descriptors, fallback, 315).valid).toBe(true)
  })

  it('keeps row/component membership keys stable across selected-value changes', () => {
    const base: FluidControlDescriptor[] = [
      { id: 'model', kind: 'selector', visible: true, available: true, defaultLabel: 'Seedance 2.5 Image', intrinsicWidth: 142, priority: 100, preferredZone: 'start', fixedAnchor: 'first' },
      { id: 'duration', kind: 'selector', visible: true, available: true, defaultLabel: '5s', intrinsicWidth: 38, priority: 50, preferredZone: 'middle' },
    ]
    const selectedValueChanged = base.map((control) => ({ ...control }))
    const rows = deterministicSafeControlRows(base, 315, 7, { minRows: 1, maxRows: 1 })
    const nextRows = deterministicSafeControlRows(selectedValueChanged, 315, 7, { minRows: 1, maxRows: 1 })

    expect(controlDescriptorSignature(base)).toBe(controlDescriptorSignature(selectedValueChanged))
    expect(rows.map(rowMembershipKey)).toEqual(nextRows.map(rowMembershipKey))
    expect(layoutSignature(rows)).toBe(layoutSignature(nextRows))
  })

  it('includes every live full and compact label in the descriptor signature without changing membership keys', () => {
    const placeholder: FluidControlDescriptor[] = [
      { id: 'model', kind: 'selector', visible: true, available: true, intrinsicWidth: 70, minimumWidth: 70, compactWidth: 70, preferredWidth: 70, fullLabel: 'Model', compactLabel: 'Model', shrinkPriority: 'model', priority: 100, preferredZone: 'start', fixedAnchor: 'first' },
    ]
    const loaded = placeholder.map((control) => ({ ...control, preferredWidth: 116, compactWidth: 96, fullLabel: 'Claude Opus 5', compactLabel: 'Claude Opus 5' }))
    expect(controlDescriptorSignature(placeholder)).not.toBe(controlDescriptorSignature(loaded))
    expect(rowMembershipKey(deterministicSafeControlRows(placeholder, 315, 6, { minRows: 1, maxRows: 1 })[0])).toBe(
      rowMembershipKey(deterministicSafeControlRows(loaded, 315, 6, { minRows: 1, maxRows: 1 })[0]),
    )
  })

  it('omits input-controlled ratio and restores it exactly once for a selectable model through 50 switches', () => {
    const imageControlled = resolveVideoModel('bytedance/seedance-2.5/image-to-video')
    const selectable = resolveVideoModel('bytedance/seedance-2.5/text-to-video')
    for (let cycle = 0; cycle < 50; cycle += 1) {
      const withoutRatio = videoFooterControlIds(imageControlled)
      const withRatio = videoFooterControlIds(selectable)
      expect(withoutRatio).not.toContain('ratio')
      expect(withoutRatio).not.toContain('fixed')
      expect(withRatio.filter((id) => id === 'ratio')).toHaveLength(1)
      expect(new Set(withRatio).size).toBe(withRatio.length)
    }
  })

  it('ignores 50 height-only ResizeObserver callbacks and reacts only to usable-width changes', () => {
    let lastWidth = 315
    let allocations = 0
    for (let callback = 1; callback <= 50; callback += 1) {
      const nextWidth = callback % 10 === 0 ? lastWidth + 1 : lastWidth
      if (controlGroupWidthChanged(lastWidth, nextWidth)) {
        allocations += 1
        lastWidth = nextWidth
      }
    }
    expect(allocations).toBe(5)
    expect(controlGroupWidthChanged(315, 315.1)).toBe(false)
    expect(controlGroupWidthChanged(315, 315.25)).toBe(true)
  })
})


describe('selected field baseline cap', () => {
  it('caps longer names and releases shorter names without consuming measured chrome', () => {
    expect(selectorReferenceTrackWidth(160, 90, 41)).toBe(131)
    expect(selectorReferenceTrackWidth(90, 90, 41)).toBe(131)
    expect(selectorReferenceTrackWidth(35, 90, 41)).toBe(76)
    expect(selectorReferenceTrackWidth(0, 90, 41)).toBe(41)
  })
})

describe('reference-sized row slack', () => {
  const field = (id: string, selected: number, reference: number): MixedControlInput => {
    const width = selectorReferenceTrackWidth(selected, reference, 40)
    return { id, kind: 'selector', intrinsicWidth: width, minimumWidth: width, preferredWidth: width, referenceSized: true }
  }
  it('keeps long names at baseline and shares released short-name space equally', () => {
    const baseline = allocateMixedControlRows([field('model', 100, 100), field('ratio', 30, 30)], 300, 6)[0]
    const long = allocateMixedControlRows([field('model', 230, 100), field('ratio', 30, 30)], 300, 6)[0]
    const short = allocateMixedControlRows([field('model', 50, 100), field('ratio', 30, 30)], 300, 6)[0]
    expect(long.controls.map(x => x.width)).toEqual(baseline.controls.map(x => x.width))
    expect(short.controls[0].width).toBe(baseline.controls[0].width - 25)
    expect(short.controls[1].width).toBe(baseline.controls[1].width + 25)
    expect(occupied(short)).toBe(300)
  })
  it('fills a sole selector row and keeps fixed action tokens unchanged', () => {
    const controls: MixedControlInput[] = [field('model', 50, 100), { id: 'settings', kind: 'fixed-action', intrinsicWidth: 28 }, { id: 'run', kind: 'fixed-action', intrinsicWidth: 28 }]
    expect(allocateMixedControlRows(controls, 300, 6)[0].controls.map(x => x.width)).toEqual([232, 28, 28])
  })
  it('shares mixed-row slack equally after symmetric bounded quantity breathing room', () => {
    const controls: MixedControlInput[] = [field('model', 100, 100), field('duration', 20, 20), { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 42, maximumExtraWidth: 24, shortCharacterWidth: 5 }]
    const row = allocateMixedControlRows(controls, 300, 6)[0]
    expect(row.controls[0].width - 140).toBe(row.controls[1].width - 60)
    expect(row.controls[2].width).toBe(52)
    expect(row.controls[2].leftPadding).toBe(row.controls[2].rightPadding)
  })
})
