import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CameraContextMenu, CameraShotSettings, CameraTransformInspector, sceneContextMenuItems } from './exactCanvasCamera'
import { addEntity, createCameraDocument } from './model'
import { CAMERA3D_ADD_CATALOG } from './interaction'

const source = (name: string) => readFileSync(resolve(process.cwd(), 'src/camera3d', name), 'utf8')

describe('3D Camera Eighteenth production surface', () => {
  it('uses Scale with a truthful Link2 control and moves Human location lock out of Transform rows', () => {
    const document = addEntity(createCameraDocument('surface'), 'human', 'Human')
    const html = renderToStaticMarkup(<CameraTransformInspector entity={document.entities[0]} frame={0} disabled={false} scaleLinked onScaleLinkedChange={vi.fn()} onRotationLock={vi.fn()} onDraft={vi.fn()} onCommit={vi.fn()} onKeyframe={vi.fn()} onReset={vi.fn()} />)
    expect(html).toContain('aria-label="Unlink Scale axes"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toMatch(/camera3d-scale-link[\s\S]*?<\/button><span>Scale<\/span>/)
    expect(html).not.toContain('Location Lock</span><input')
    expect(html).not.toContain('>Zoom</span>')
  })

  it('shows Name, Cut/Continue, Shot Size and Duration seconds without Active Camera', () => {
    const document = createCameraDocument('shot-settings')
    const html = renderToStaticMarkup(<CameraShotSettings document={document} shotId={document.shots[0].id} disabled={false} onChange={vi.fn()} onDurationFrames={vi.fn()} />)
    expect(html).toMatch(/Name[\s\S]*Cut[\s\S]*Continue[\s\S]*Shot Size[\s\S]*Duration/)
    expect(html).toContain('aria-label="Duration (seconds)"')
    expect(html).toContain('step="0.5"')
    expect(html).not.toContain('Active Camera')
  })

  it('removes Camera from generic Add and exposes checked Allow Below Canvas menu state', () => {
    expect(CAMERA3D_ADD_CATALOG.flatMap((group) => group.items).some((item) => item.kind === 'camera')).toBe(false)
    const html = renderToStaticMarkup(<CameraContextMenu target="object" clipboardAvailable={false} entityKind="block" allowBelowCanvas onCommand={vi.fn()} />)
    expect(html).toContain('Allow Below Canvas')
    expect(html).toContain('role="menuitemcheckbox"')
    expect(html).toContain('aria-checked="true"')
  })

  it('exposes all five final Prompt Tools from the production object menu', () => {
    const labels = sceneContextMenuItems('object', false, 'block', false).map((row) => row.label)
    expect(labels).toEqual(expect.arrayContaining(['Describe This Object', 'Ask About Object', 'Create Similar Object', 'Use As Reference', 'Tutorial']))
  })

  it('owns flat timeline shell, exact separator, one divider, and continuous playhead token styles', () => {
    const css = source('camera3d.css')
    expect(css).toMatch(/\.camera3d-timeline\.page-strip[^}]*padding:\s*0[^}]*border:\s*0[^}]*border-radius:\s*0/)
    expect(css).toMatch(/\.camera3d-local-toolbar-separator[^}]*width:\s*3px[^}]*height:\s*20px[^}]*background:\s*#393541[^}]*margin:\s*0 3px[^}]*border-radius:\s*0/)
    expect(css).toContain('var(--node-divider)')
    expect(css).toContain('.camera3d-playhead-token')
    expect(css).toMatch(/\.camera3d-timeline-height-resize[^}]*background:\s*transparent/)
  })

  it('uses exact isolated Eighteenth source/config identity', () => {
    const builder = JSON.parse(readFileSync(resolve(process.cwd(), 'electron-builder.camera.json'), 'utf8'))
    expect(builder).toMatchObject({ appId: 'com.cocombees.prismfoundry.3dcamera.eighteenth.20260830', productName: 'Prism 3D Camera Eighteenth Flight Tester', extraMetadata: { name: 'prism-3d-camera-eighteenth-20260830' }, directories: { output: '/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/outputs/candidates/2026-08-30-prism-3d-camera-eighteenth-final' } })
    const main = readFileSync(resolve(process.cwd(), 'src/camera-tester/main.ts'), 'utf8')
    expect(main).toContain("app.setName('Prism 3D Camera Eighteenth Flight Tester')")
    expect(main).toContain("'Prism3DCameraEighteenthCorrection20260830'")
    expect(main).toContain("title: 'Prism 3D Camera Eighteenth Flight Tester'")
  })
})
