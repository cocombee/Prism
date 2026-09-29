import { describe, expect, it } from 'vitest'
import { compileProviderPrompt } from './referenceInstructions'
import type { GenerationRequest } from './types'

const request = (overrides: Partial<GenerationRequest> = {}): GenerationRequest => ({
  nodeId: 'video', kind: 'video-generator', prompt: 'A dancer crosses the room.', authoredPrompt: 'A dancer crosses the room.',
  videoEngine: 'bytedance/seedance-2.5/text-to-video', motionCadence: 24, shutterMode: 'angle', shutterAngle: 180,
  ...overrides,
})

describe('Director shutter prompt ownership', () => {
  it('places both selected shutter forms and exact physical wording in the secret provider prompt', () => {
    const text = compileProviderPrompt(request({ shutterMode: 'speed', shutterAngle: 270 })).text
    expect(text).toContain('Capture at 24fps and play back at 24fps at normal speed.')
    expect(text).toContain('Use a 270-degree shutter angle, equivalent to 1/32-second exposure for every captured frame.')
    expect(text).not.toContain('1/48-second exposure')
    expect(text.match(/270-degree shutter angle/g)).toHaveLength(1)
  })

  it('adds nothing in the shutter domain when exact authored shutter already owns it', () => {
    const authored = 'A dancer crosses the room with a 90° shutter angle, equivalent to 1/96s at 24fps.'
    const text = compileProviderPrompt(request({ prompt: authored, authoredPrompt: authored, shutterAngle: 270 })).text
    expect(text.match(/90° shutter angle/g)).toHaveLength(1)
    expect(text).not.toContain('270° shutter angle')
    expect(text).not.toContain('use the explicitly authored shutter')
  })

  it('keeps Style visual-art wording separate from shutter and physical lighting ownership', () => {
    const stylePrompt = 'Heavy organic grain with restrained amber halation.'
    const text = compileProviderPrompt(request({ shutterAngle: 180, stylePrompt })).text
    expect(text.match(/180-degree shutter angle/g)).toHaveLength(1)
    expect(text.match(/Heavy organic grain with restrained amber halation\./g)).toHaveLength(1)
    const lighting = text.slice(text.indexOf('LIGHTING\n'), text.indexOf('LOOK AND CAPTURE CHARACTER\n'))
    expect(lighting).not.toContain(stylePrompt)
    expect(lighting).not.toMatch(/Style authorit/i)
  })
})
