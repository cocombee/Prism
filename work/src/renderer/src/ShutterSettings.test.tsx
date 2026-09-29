import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShutterSettings, nextShutterSettingsPatch } from './ShutterSettings'

describe('expanded Video Settings shutter control', () => {
  it('renders the approved accessible Angle mode anatomy and resolved pair', () => {
    const html = renderToStaticMarkup(<ShutterSettings mode="angle" angle={180} fps={24} onChange={() => undefined} />)
    expect(html).toContain('Shutter Mode<sup>*</sup>')
    expect(html).toContain('aria-label="Shutter mode"')
    expect(html).toMatch(/aria-pressed="true"[^>]*>Angle<\/button>/)
    expect(html).toMatch(/aria-pressed="false"[^>]*>Speed<\/button>/)
    expect(html).toContain('aria-label="Shutter angle"')
    expect(html).toContain('Resolved: 180° • 1/48s at 24fps')
    expect(html).not.toMatch(/>On<|>Off</)
  })

  it('switches display mode without changing the canonical angle and selects speed equivalents by angle', () => {
    expect(nextShutterSettingsPatch('mode', 'speed', 180)).toEqual({ shutterMode: 'speed' })
    expect(nextShutterSettingsPatch('value', '172.8', 180)).toEqual({ shutterAngle: 172.8 })
    const html = renderToStaticMarkup(<ShutterSettings mode="speed" angle={172.8} fps={25} onChange={() => undefined} />)
    expect(html).toMatch(/aria-pressed="true"[^>]*>Speed<\/button>/)
    expect(html).toContain('aria-label="Shutter speed"')
    expect(html).toContain('Resolved: 172.8° • ≈ 1/52s at 25fps')
  })

  it('carries the exact motion-blur and sync-utility tooltip intent', () => {
    const html = renderToStaticMarkup(<ShutterSettings mode="angle" angle={180} fps={24} onChange={() => undefined} />)
    expect(html).toContain('Controls motion blur per frame. 180° gives natural cinematic motion; lower angles look crisper and more staccato, while higher angles produce more smear. Equivalent shutter speed updates with FPS. Results depend on provider support.')
    expect(html).toContain('Sync Utility values are timing conveniences, not universal anti-flicker settings.')
  })
})
