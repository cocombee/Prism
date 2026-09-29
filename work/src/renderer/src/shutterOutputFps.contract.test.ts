import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')

describe('active ShutterSettings output-FPS contract', () => {
  it('passes actual output FPS without consulting visual Motion FPS', () => {
    const shutter = app.slice(app.indexOf('<ShutterSettings'), app.indexOf('/>', app.indexOf('<ShutterSettings')))
    expect(shutter).toContain('fps={knownOutputFrameRate(inspectorVideoModel || resolveVideoModel(inspectorNode.data.videoEngine), inspectorNode.data.frameRate) || inspectorNode.data.frameRate || 24}')
    expect(shutter).not.toContain('normalizedMotionCadence')
    expect(shutter).not.toContain('motionCadence')
  })
})