import { describe, expect, it } from 'vitest'
import { allocateFooterControlRows, validateFooterControlLayout, type AllocatedFooterControlRow } from './footerControlLayout'
import { type MixedControlInput } from './controlGroupLayout'

const field = (id: string, width: number, kind: 'selector' | 'editable-field' = 'selector'): MixedControlInput => ({ id, kind, intrinsicWidth: width, minimumWidth: width, preferredWidth: width, referenceSized: true })
const circle = (id: string, width = 28): MixedControlInput => ({ id, kind: 'fixed-action', intrinsicWidth: width })
const quantity: MixedControlInput = { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 49.625, maximumExtraWidth: 24, shortCharacterWidth: 5 }
const ids = (rows: AllocatedFooterControlRow[]) => rows.map(row => row.controls.map(control => control.id))
const occupancy = (row: AllocatedFooterControlRow) => row.controls.reduce((sum, control) => sum + control.width, 0) + row.gap * Math.max(0, row.controls.length - 1)
function invariant(controls: MixedControlInput[], rows: AllocatedFooterControlRow[], width: number, gap: number) {
  const active = controls.filter(control => control.visible !== false && control.available !== false)
  expect(validateFooterControlLayout('Invariant', controls, rows, width, { gap })).toEqual({ valid: true, reasons: [] })
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.flatMap(row => row.controls.map(control => control.id)).sort()).toEqual(active.map(control => control.id).sort())
  for (const row of rows) {
    expect(row.gap).toBe(gap)
    expect(occupancy(row)).toBeLessThanOrEqual(width + 0.001)
    if (row.alignment === 'right') {
      expect(row.controls.every(control => control.kind === 'fixed-action')).toBe(true)
      expect(row.leadingUnusedWidth + occupancy(row)).toBeCloseTo(width, 6)
    } else {
      expect(row.leadingUnusedWidth).toBe(0)
      expect(occupancy(row)).toBeCloseTo(width, 6)
    }
    for (const control of row.controls) {
      const original = active.find(candidate => candidate.id === control.id)!
      expect(control.width).toBeGreaterThanOrEqual((original.minimumWidth ?? original.intrinsicWidth) - 0.001)
      if (control.kind === 'fixed-action') expect(control.width).toBe(original.minimumWidth ?? original.intrinsicWidth)
    }
  }
  const activeCircles = active.filter(control => control.kind === 'fixed-action')
  const settings = activeCircles.find(control => control.id === 'settings')
  const run = activeCircles.find(control => control.id === 'run')
  const expected = [...activeCircles.filter(control => control !== settings && control !== run), ...(settings ? [settings] : []), ...(run ? [run] : [])].map(control => control.id)
  expect(rows.flatMap(row => row.controls).slice(-expected.length).map(control => control.id)).toEqual(expected)
  if (activeCircles.reduce((sum, control) => sum + (control.minimumWidth ?? control.intrinsicWidth), 0) + gap * Math.max(0, activeCircles.length - 1) <= width && expected.length) {
    expect(rows.at(-1)!.controls.slice(-expected.length).map(control => control.id)).toEqual(expected)
  }
}

describe('shared footer field pressure and circular suffix', () => {
  it('keeps Model first despite a longer field and arbitrary incoming action order', () => {
    const controls = [circle('run'), field('lyrics', 219), circle('sample'), field('model', 88), circle('settings'), quantity]
    const rows = allocateFooterControlRows(controls, 289, 7)
    invariant(controls, rows, 289, 7)
    expect(rows[0].controls[0].id).toBe('model')
    expect(rows.at(-1)!.controls.slice(-3).map(control => control.id)).toEqual(['sample', 'settings', 'run'])
  })
  it('uses the longest active measured flexible field first only when Model is absent', () => {
    const controls = [field('short', 45), field('long', 160), field('hidden-longer', 220), circle('run')]
    controls[2].visible = false
    const rows = allocateFooterControlRows(controls, 289, 7)
    invariant(controls, rows, 289, 7)
    expect(rows[0].controls[0].id).toBe('long')
  })
  it('shares residual space equally after selected label and chrome widths without growing circles', () => {
    const controls = [field('model', 100), field('duration', 40), circle('settings'), circle('run')]
    const rows = allocateFooterControlRows(controls, 300, 7)
    invariant(controls, rows, 300, 7)
    expect(rows).toHaveLength(1)
    const [model, duration, settings, run] = rows[0].controls
    expect(model.width - 100).toBeCloseTo(duration.width - 40, 6)
    expect(settings.width).toBe(28)
    expect(run.width).toBe(28)
    expect(model.width - 100).toBeCloseTo((300 - 100 - 40 - 56 - 21) / 2, 6)
  })
  it('moves Quantity into available field space without attaching it to Lyrics', () => {
    const controls = [field('model', 250), field('duration', 42), field('lyrics', 79), quantity, circle('settings'), circle('run')]
    const rows = allocateFooterControlRows(controls, 264, 7)
    invariant(controls, rows, 264, 7)
    expect(rows[0].controls.map(control => control.id)).not.toContain('quantity')
    expect(rows.some(row => row.controls.some(control => control.id === 'quantity') && row.controls.some(control => control.id === 'duration' || control.id === 'lyrics'))).toBe(true)
  })
  it('moves a short editable field beside Model so the mode selector can use the freer action row', () => {
    // Actual Music selected text/chrome minima: Music v2.5 70, Prompt 56,
    // 3.125 38 raised to the consumer's established 52px field floor.
    const controls = [field('model', 70), field('mode', 56), field('duration', 52, 'editable-field'), quantity, circle('instrumental'), circle('settings'), circle('run')]
    for (const width of [224, 289, 349]) {
      const rows = allocateFooterControlRows(controls, width, 7, { iconIds: ['instrumental'] })
      invariant(controls, rows, width, 7)
      expect(rows).toHaveLength(2)
      expect(rows[0].controls.map(control => control.id)).toContain('duration')
      expect(rows.at(-1)!.controls.map(control => control.id)).toContain('mode')
      const firstFields = rows[0].controls.filter(control => control.referenceSized)
      expect(firstFields[0].width - firstFields[0].minimumWidth!).toBeCloseTo(firstFields[1].width - firstFields[1].minimumWidth!, 6)
    }
  })
  it('reassigns fields by their measured pressure when a selected label becomes longer and resets deterministically', () => {
    const make = (modeWidth: number, durationWidth: number) => [field('model', 70), field('mode', modeWidth), field('duration', durationWidth, 'editable-field'), quantity, circle('instrumental'), circle('settings'), circle('run')]
    const short = make(56, 52), longMode = make(220, 52), longDuration = make(56, 220)
    const initial = allocateFooterControlRows(short, 289, 7)
    const selected = allocateFooterControlRows(longMode, 289, 7)
    const edited = allocateFooterControlRows(longDuration, 289, 7)
    for (const [controls, rows] of [[short, initial], [longMode, selected], [longDuration, edited]] as [MixedControlInput[], AllocatedFooterControlRow[]][]) invariant(controls, rows, 289, 7)
    expect(ids(selected)).not.toEqual(ids(initial))
    expect(ids(edited)).not.toEqual(ids(initial))
    expect(ids(allocateFooterControlRows(short, 289, 7))).toEqual(ids(initial))
  })
  it('keeps optional circles contiguous even when Quantity originally separates them', () => {
    const controls = [field('model', 88.391), field('duration', 42), circle('sample'), quantity, field('lyrics', 79), circle('settings'), circle('run')]
    for (const width of [349, 289, 224]) invariant(controls, allocateFooterControlRows(controls, width, 7), width, 7)
  })
  it('right-aligns action overflow above the retained terminal pair at the exact gap', () => {
    const controls = [field('model', 60), circle('a'), circle('b'), circle('c'), circle('settings'), circle('run')]
    const rows = allocateFooterControlRows(controls, 98, 7)
    invariant(controls, rows, 98, 7)
    expect(ids(rows)).toEqual([['model'], ['a', 'b'], ['c', 'settings', 'run']])
    expect(rows[1].alignment).toBe('right')
    expect(rows[1].leadingUnusedWidth).toBe(35)
    expect(rows[2].leadingUnusedWidth).toBe(0)
  })
  it('keeps circles fixed on a sparse action-only footer instead of widening frames or gaps', () => {
    const controls = [circle('settings'), circle('run')]
    const rows = allocateFooterControlRows(controls, 289, 7)
    invariant(controls, rows, 289, 7)
    expect(rows[0].alignment).toBe('right')
    expect(rows[0].leadingUnusedWidth).toBe(226)
  })
  it('rejects widths that cannot fit the terminal pair with the shared gap', () => {
    expect(allocateFooterControlRows([circle('settings'), circle('run')], 62, 7)).toEqual([])
    expect(allocateFooterControlRows([circle('settings'), circle('run')], 63, 7)[0].leadingUnusedWidth).toBe(0)
  })
  it('recalculates when an editable duration appears and disappears across width changes', () => {
    const base = [field('model', 88), field('duration', 42), field('lyrics', 79), quantity, circle('sample'), circle('settings'), circle('run')]
    for (const width of [349, 224, 289, 349]) {
      const custom = [...base.slice(0, 2), field('seconds', 121.5, 'editable-field'), ...base.slice(2)]
      invariant(custom, allocateFooterControlRows(custom, width, 7), width, 7)
      const reset = allocateFooterControlRows(base, width, 7)
      invariant(base, reset, width, 7)
      expect(reset.flatMap(row => row.controls).some(control => control.id === 'seconds')).toBe(false)
    }
  })
  it('ignores unavailable controls and supports consumer IDs without leaking old anchors', () => {
    const controls = [{ ...field('engine', 90), fixedAnchor: 'terminal' as const }, { ...circle('sample'), available: false }, circle('options'), circle('generate')]
    const rows = allocateFooterControlRows(controls, 224, 7, { modelId: 'engine', settingsId: 'options', runId: 'generate', iconIds: ['sample'] })
    expect(ids(rows)).toEqual([['engine', 'options', 'generate']])
    expect(rows[0].controls[0].fixedAnchor).toBeUndefined()
  })
  it.each([
    ['Image', [field('model', 90), field('resolution', 58), field('format', 64), quantity, field('ratio', 52), circle('settings'), circle('run')]],
    ['Video', [field('model', 88), field('motion', 54), field('ratio', 44), field('duration', 38), quantity, field('resolution', 48), { id: 'sound', kind: 'intrinsic', intrinsicWidth: 64 }, circle('settings'), circle('run')]],
    ['Voice', [field('model', 140), field('stability', 52), field('similarity', 52), field('voice', 100), circle('sample'), circle('settings'), circle('run')]],
    ['Music', [field('model', 88), field('duration', 42), field('lyrics', 79), quantity, circle('settings'), circle('run')]],
    ['Prompt', [field('model', 130), field('effort', 55), circle('settings'), circle('run')]],
  ] as [string, MixedControlInput[]][])('preserves field readability and action tokens for %s descriptors', (_family, controls) => {
    for (const width of [224, 289, 349]) invariant(controls, allocateFooterControlRows(controls, width, 7), width, 7)
  })
  it('bounds fallback for many independent fields without enumerating their row assignments', () => {
    const controls = [field('model', 80), ...Array.from({ length: 15 }, (_, index) => field(`field-${index}`, 72)), circle('settings'), circle('run')]
    const rows = allocateFooterControlRows(controls, 224, 7)
    invariant(controls, rows, 224, 7)
    expect(rows[0].controls[0].id).toBe('model')
  })
  it('does not mutate caller descriptors or accept duplicate IDs/invalid geometry', () => {
    const controls = [field('model', 88), circle('settings'), circle('run')]
    const snapshot = structuredClone(controls)
    allocateFooterControlRows(controls, 224, 7)
    expect(controls).toEqual(snapshot)
    expect(allocateFooterControlRows([...controls, circle('run')], 224, 7)).toEqual([])
    expect(allocateFooterControlRows(controls, NaN, 7)).toEqual([])
    expect(allocateFooterControlRows(controls, 224, -1)).toEqual([])
  })
})


describe('footer arithmetic policy validation', () => {
  const descriptors = [field('model', 88), field('duration', 42), circle('sample'), quantity, circle('settings'), circle('run')]
  const validRows = () => allocateFooterControlRows(descriptors, 289, 7)
  const validate = (rows: AllocatedFooterControlRow[]) => validateFooterControlLayout('Music', descriptors, rows, 289)
  it('accepts normal rows and fixed-width right-aligned overflow without weakening the generic gate', () => {
    expect(validate(validRows())).toEqual({ valid: true, reasons: [] })
    const overflowControls = [field('model', 60), circle('a'), circle('b'), circle('c'), circle('settings'), circle('run')]
    expect(validateFooterControlLayout('Narrow', overflowControls, allocateFooterControlRows(overflowControls, 98, 7), 98)).toEqual({ valid: true, reasons: [] })
  })
  it.each([
    ['missing', (rows: AllocatedFooterControlRow[]) => { rows[0].controls.shift() }],
    ['duplicate', (rows: AllocatedFooterControlRow[]) => { rows[0].controls.push(rows[0].controls[0]) }],
    ['unknown', (rows: AllocatedFooterControlRow[]) => { rows[0].controls[0].id = 'foreign' }],
    ['first-anchor-moved', (rows: AllocatedFooterControlRow[]) => { const first = rows[0].controls; const other = rows.flatMap(row => row.controls).find(control => control.kind === 'selector' && control.id !== 'model')!; const otherRow = rows.find(row => row.controls.includes(other))!; const otherIndex = otherRow.controls.indexOf(other); [first[0], otherRow.controls[otherIndex]] = [other, first[0]] }],
    ['terminal-settings-run-moved', (rows: AllocatedFooterControlRow[]) => { const last = rows.at(-1)!.controls; [last[last.length - 1], last[last.length - 2]] = [last[last.length - 2], last[last.length - 1]] }],
    ['shared-gap-mismatch', (rows: AllocatedFooterControlRow[]) => { rows[0].gap = 3 }],
    ['circle-frame-changed', (rows: AllocatedFooterControlRow[]) => { rows.flatMap(row => row.controls).find(control => control.id === 'sample')!.width += 1 }],
    ['circle-frame-changed', (rows: AllocatedFooterControlRow[]) => { rows.flatMap(row => row.controls).find(control => control.id === 'run')!.sidePadding = 4 }],
    ['fill-row-leading-space', (rows: AllocatedFooterControlRow[]) => { rows[0].leadingUnusedWidth = 1 }],
    ['width-invalid', (rows: AllocatedFooterControlRow[]) => { rows[0].controls[0].width = NaN }],
  ] as [string, (rows: AllocatedFooterControlRow[]) => void][])('rejects corrupted %s', (reason, corrupt) => {
    const rows = structuredClone(validRows())
    corrupt(rows)
    const result = validate(rows)
    expect(result.valid).toBe(false)
    expect(result.reasons.some(message => message.includes(reason))).toBe(true)
  })
  it('rejects Quantity above its existing bounded maximum even if total row occupancy is preserved', () => {
    const rows = validRows()
    const row = rows.find(row => row.controls.some(control => control.id === 'quantity'))!
    const q = row.controls.find(control => control.id === 'quantity')!
    const flexible = row.controls.find(control => control.kind === 'selector')!
    q.width += 15
    flexible.width -= 15
    expect(validate(rows).reasons.some(reason => reason.includes('maximum-exceeded'))).toBe(true)
  })
  it('rejects incorrect right-row offsets, field-bearing right rows and unused-space arithmetic', () => {
    const controls = [field('model', 60), circle('a'), circle('b'), circle('c'), circle('settings'), circle('run')]
    const make = () => allocateFooterControlRows(controls, 98, 7)
    const wrongOffset = make(); wrongOffset[1].leadingUnusedWidth = 0
    expect(validateFooterControlLayout('Overflow', controls, wrongOffset, 98).reasons.some(reason => reason.includes('right-edge-mismatch'))).toBe(true)
    const wrongUnused = make(); wrongUnused[1].unusedWidth = Infinity
    expect(validateFooterControlLayout('Overflow', controls, wrongUnused, 98).reasons.some(reason => reason.includes('unused-width-mismatch'))).toBe(true)
    const fieldAtRight = make(); fieldAtRight[0].alignment = 'right'
    expect(validateFooterControlLayout('Overflow', controls, fieldAtRight, 98).reasons.some(reason => reason.includes('right-row-has-fields'))).toBe(true)
  })
  it('rejects overflow circles mixed with fields or a split cluster that fits on the final row', () => {
    const rows = validRows()
    const final = rows.at(-1)!
    const sampleIndex = final.controls.findIndex(control => control.id === 'sample')
    rows[0].controls.push(...final.controls.splice(sampleIndex, 1))
    const result = validate(rows)
    expect(result.reasons.some(reason => reason.includes('circle-suffix-order-or-contiguity'))).toBe(true)
    expect(result.reasons.some(reason => reason.includes('circle-cluster-unnecessarily-wrapped'))).toBe(true)
    expect(result.reasons.some(reason => reason.includes('overflow-circles-not-right-aligned'))).toBe(true)
  })
  it('uses the longest flexible fallback and excludes unavailable descriptors from coverage', () => {
    const controls = [field('short', 40), field('long', 130), { ...circle('sample'), available: false }, circle('run')]
    const rows = allocateFooterControlRows(controls, 224, 7)
    expect(validateFooterControlLayout('Fallback', controls, rows, 224)).toEqual({ valid: true, reasons: [] })
    const first = rows[0].controls; [first[0], first[1]] = [first[1], first[0]]
    expect(validateFooterControlLayout('Fallback', controls, rows, 224).reasons.some(reason => reason.includes('long/first-anchor-moved'))).toBe(true)
  })
  it('supports explicit shared gaps and custom action identifiers while rejecting invalid descriptors', () => {
    const controls = [field('engine', 80), circle('options'), circle('generate')]
    const options = { modelId: 'engine', settingsId: 'options', runId: 'generate', gap: 6 }
    const rows = allocateFooterControlRows(controls, 224, 6, options)
    expect(validateFooterControlLayout('Custom', controls, rows, 224, options)).toEqual({ valid: true, reasons: [] })
    expect(validateFooterControlLayout('Bad', [...controls, controls[0]], rows, 224, options).reasons.some(reason => reason.includes('descriptor-id-duplicate'))).toBe(true)
    expect(validateFooterControlLayout('Bad', controls, rows, Infinity, options).valid).toBe(false)
    expect(validateFooterControlLayout('Bad', controls, rows, 224, { ...options, gap: NaN }).valid).toBe(false)
  })
})
