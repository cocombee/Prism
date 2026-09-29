import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('camera Object creation owner contract', () => {
  it('uses the successor NodeCard semantic owner instead of StructuredObjectCreatePanel', () => {
    const cameraSource = readFileSync(resolve(process.cwd(), 'src/camera3d/Prism3DCameraNode.tsx'), 'utf8')
    const ownerSource = readFileSync(resolve(process.cwd(), 'src/camera3d/CameraObjectCreationOwner.tsx'), 'utf8')

    expect(cameraSource).not.toContain('StructuredObjectCreatePanel')
    expect(cameraSource).toContain('CameraObjectCreationOwner')
    expect(ownerSource).toContain("from '../renderer/src/NodeCardNext'")
    expect(ownerSource).toContain('nodeTypes={{ \'camera-object\': NodeCard }}')
    expect(ownerSource).toContain('semanticEditorOpen: true')
    expect(ownerSource).toContain('cameraObjectSurface: true')
  })
})
