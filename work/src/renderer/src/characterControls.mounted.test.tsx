import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const nodeCard = readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles-next.css', import.meta.url), 'utf8')

describe('removed invented Character controls', () => {
  it('contains no active Character control block, labels, Unspecified copy, or bespoke CSS', () => {
    for (const obsolete of [
      'CharacterControls',
      'CHARACTER_CONTROL_OPTIONS',
      'character-controls',
      'character-control-row',
      'character-control-field',
      'character-control-conflict',
      'character-exact-row',
      'character-height-exact',
      'Soft-tissue fullness',
      'Body frame',
      'Muscularity',
      'Unspecified',
    ]) {
      expect(nodeCard, obsolete).not.toContain(obsolete)
      expect(styles, obsolete).not.toContain(obsolete)
    }
  })
})
