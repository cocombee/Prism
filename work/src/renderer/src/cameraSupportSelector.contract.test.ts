import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('StoryboardSharedControls.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('styles-next.css', import.meta.url), 'utf8')
const group = source.split("{ label: 'Stabilized & Handheld', options: [")[1]?.split('] },')[0] || ''

describe('Storyboard handheld selector visible contract', () => {
  it('adds Dolly Down Slow beside and without replacing Dolly Down', () => {
    expect(source).toContain("['dolly-down', 'Lower Camera On Dolly'], ['dolly-down-slow', 'Dolly Down Slow']")
    expect(source).toContain("'dolly-down-slow': 'Dolly Down Slow'")
  })
  it('keeps four exact values/help strings first and preserves the following stabilized options in order', () => {
    const rows = [
      "['handheld', 'Controlled natural handheld movement with organic operator motion while preserving readable framing.']",
      "['handheld-subtle', 'Restrained handheld micro-drift and gentle breathing motion that preserves the authored framing.']",
      "['handheld-intense', 'Stronger controlled handheld irregularity with a visceral, reactive feel while keeping the subject and action readable.']",
      "['shoulder-rig', 'Shoulder-mounted operator movement with human-weighted sway and restrained body-carried bounce while preserving readability.']",
      "['steadicam', 'Smooth Walking Camera']",
      "['steadicam-follow', 'Smooth Follow']",
      "['gimbal-follow', 'Stabilized Follow']",
      "['gimbal-orbit', 'Stabilized Circle']",
      "['slider-left', 'Short Slide Left']",
      "['slider-right', 'Short Slide Right']",
    ]
    let previous = -1
    for (const row of rows) {
      const index = group.indexOf(row)
      expect(index).toBeGreaterThan(previous)
      previous = index
    }
  })

  it('renders exact four labels while retaining direct value selection and existing selector anatomy', () => {
    for (const mapping of [
      "handheld: 'Natural Handheld'",
      "'handheld-subtle': 'Gentle Handheld'",
      "'handheld-intense': 'Intense Handheld'",
      "'shoulder-rig': 'Shoulder-Mounted Camera'",
    ]) expect(source).toContain(mapping)
    expect(source).toContain('onChange: (value: string) => void')
    expect(source).toContain('role="listbox"')
    expect(source).toContain('role="option"')
    expect(source).toContain("aria-selected={option.value === value}")
    expect(styles).not.toContain('camera-support')
    expect(styles).not.toContain('handheld-intense')
  })
})
