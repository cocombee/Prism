import { nativeFpsLabel } from '../../shared/videoCadenceSelection'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FluidControlGroup, type FluidGroupControl } from './FluidControlGroup'
import { knownOutputFrameRate, motionCadenceOptions, normalizedMotionCadence, resolveVideoModel } from '../../shared/videoModels'
import { type MixedControlInput } from '../../shared/controlGroupLayout'
import { allocateFooterControlRows, validateFooterControlLayout, type FooterControlLayoutOptions } from '../../shared/footerControlLayout'

const source = ts.createSourceFile('NodeCardNext.tsx', readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let expression: ts.ObjectLiteralExpression | undefined
const visit = (node: ts.Node): void => {
  if (ts.isObjectLiteralExpression(node) && node.properties.some(property => ts.isPropertyAssignment(property) && property.name.getText(source) === 'id' && property.initializer.getText(source) === "'motion'")) expression = node
  ts.forEachChild(node, visit)
}
visit(source)
if (!expression) throw new Error('Actual Motion FPS control owner missing')
const code = ts.transpileModule(`const control = ${expression.getText(source)}; return control;`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
// The leaf is a readable probe; the actual owning descriptor and allocator decide
// availability. Native acceptance separately mounts the complete production leaf.
const GroupedMenuSelect = (props: { ariaLabel: string; displayLabel: string }) => <button aria-label={props.ariaLabel}>{props.displayLabel}</button>
function actualControl(frameRate: number | undefined, modelId = 'wan-controlled'): FluidGroupControl {
  const selectedVideoModel = resolveVideoModel(modelId), data = { frameRate, videoEngine: modelId }
  const bindings = { React, data, selectedVideoModel, effectiveMotionCadence: normalizedMotionCadence(selectedVideoModel, frameRate), nativeVideoFps: knownOutputFrameRate(selectedVideoModel, frameRate), motionCadenceOptions, resolveVideoModel, nativeFpsLabel, running: false, GroupedMenuSelect, runtime: undefined, id: 'fixture-node' }
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings))
}
function render(control: FluidGroupControl) {
  return renderToStaticMarkup(<FluidControlGroup recalculationKey="motion-availability-regression" controls={[control, { id: 'settings', kind: 'fixed-action', available: true, fixedAnchor: 'terminal', intrinsicWidth: 28, node: <button aria-label="Node Settings">Settings</button> }, { id: 'run', kind: 'fixed-action', available: true, fixedAnchor: 'terminal', intrinsicWidth: 28, node: <button aria-label="Run">Run</button> }]} />)
}

describe('production Motion FPS availability through shared control allocator', () => {
  it('fits the restored operational controls inside a 250px node using the actual footer allocation', () => {
    let options: FooterControlLayoutOptions<string> | undefined
    const visitAllocation = (node: ts.Node): void => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === 'GeneratorFooterControlGroup' && node.attributes.properties.some(p => ts.isJsxAttribute(p) && p.name.getText(source) === 'ariaLabel' && p.initializer?.getText(source) === '"Video Footer Controls"')) {
        const readRole = (name: string): string | undefined => {
          const attribute = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(source) === name) as ts.JsxAttribute | undefined
          return attribute?.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : undefined
        }
        options = { modelId: readRole('modelId'), settingsId: readRole('settingsId'), runId: readRole('runId') }
      }
      ts.forEachChild(node, visitAllocation)
    }
    visitAllocation(source)
    if (!options) throw new Error('Actual Video Footer policy owner missing')
    // A 250px node leaves224px after its2px shell and12px outer insets.
    const controls: MixedControlInput[] = [['model', 80], ['motion', 66], ['ratio', 56], ['duration', 54], ['quantity', 66], ['resolution', 53], ['settings', 28], ['run', 28]].map(([id, width]) => ({ id: String(id), kind: ['settings', 'run'].includes(String(id)) ? 'fixed-action' : id === 'quantity' ? 'bounded-elastic' : 'selector', intrinsicWidth: Number(width), minimumWidth: Number(width), maximumExtraWidth: id === 'quantity' ? 24 : undefined }))
    const rows = allocateFooterControlRows(controls, 224, 7, options)
    expect(validateFooterControlLayout('Actual Video Footer', controls, rows, 224, options)).toEqual({ valid: true, reasons: [] })
    expect(rows.length).toBeGreaterThanOrEqual(2); expect(rows.length).toBeLessThanOrEqual(3)
    expect(rows[0].controls[0].id).toBe('model'); expect(rows.at(-1)?.controls.slice(-2).map(c => c.id)).toEqual(['settings', 'run'])
  })
  it('retains Native12 and its legal cadence without undefined text or lost actions', () => {
    const model = resolveVideoModel('wan-controlled')
    expect(knownOutputFrameRate(model, 12)).toBe(12)
    expect(motionCadenceOptions(model, 12)).toEqual([12])
    const html = render(actualControl(12))
    expect(html).toContain('aria-label="Motion FPS"')
    expect(html).not.toContain('undefined fps')
    expect(html).toContain('aria-label="Node Settings"'); expect(html).toContain('aria-label="Run"')
  })
  it.each([[16, 16], [24, 24], [25, 24], [60, 24]])('keeps the legal selector/default at Native%s', (frameRate, expected) => {
    const html = render(actualControl(frameRate))
    expect(html).toContain('aria-label="Motion FPS"'); expect(html).toContain(`${expected} fps`)
    expect(motionCadenceOptions(resolveVideoModel('wan-controlled'), frameRate).every(value => value <= frameRate)).toBe(true)
  })
  it('retains all documented motion choices when encoded FPS is unknown', () => {
    const model = resolveVideoModel('bytedance/seedance-2.0/reference-to-video')
    expect(knownOutputFrameRate(model)).toBeUndefined()
    expect(motionCadenceOptions(model)).toEqual([12, 16, 24, 35, 50, 60])
    expect(render(actualControl(undefined, model.id))).toContain('24 fps')
  })
})
