import { describe, expect, it } from 'vitest'
import type { StoryboardPanel } from './types'
import { cameraSupportSemantics, CAMERA_SUPPORT_VALUES } from './cameraSupportSemantics'
import { storyboardBatchRewriteInstruction, storyboardRewriteInstruction } from './storyboardRewrite'

function panel(camera: string, prompt = 'Track left while Mara opens the door.'): StoryboardPanel {
  return { id: 'selected', prompt, duration: 4, shotSize: 'medium', camera }
}

describe('Storyboard hidden camera-support Revamp policy', () => {
  it('includes only the selected support instruction and immutable preservation rules', () => {
    for (const value of CAMERA_SUPPORT_VALUES) {
      const instruction = storyboardRewriteInstruction([panel(value)], 'selected')
      const selected = cameraSupportSemantics(value)!
      expect(instruction).toContain(`SELECTED CAMERA SUPPORT POLICY (HIDDEN):\n${selected.revampInstruction}`)
      for (const other of CAMERA_SUPPORT_VALUES.filter((candidate) => candidate !== value)) expect(instruction).not.toContain(cameraSupportSemantics(other)!.revampInstruction)
      expect(instruction).toContain('If visible action and the selected camera movement are already clear and executable, return it byte-for-byte unchanged.')
      expect(instruction).toContain('Return only the revised current panel prompt with its internal line breaks intact')
      expect(panel(value).prompt).not.toContain(selected.providerClause)
      expect(panel(value).prompt).not.toContain(selected.revampInstruction)
    }
  })

  it('does not add hidden support policy for static, Steadicam, gimbal, or unknown values', () => {
    for (const value of ['static', 'steadicam', 'gimbal-follow', 'unknown']) {
      expect(storyboardRewriteInstruction([panel(value)], 'selected')).not.toContain('SELECTED CAMERA SUPPORT POLICY')
    }
  })

  it('scopes Revamp All guidance to editable selected panels and excludes read-only support choices', () => {
    const panels: StoryboardPanel[] = [
      panel('shoulder-rig'),
      { id: 'locked', prompt: 'Mara waits.', duration: 2, shotSize: 'wide', camera: 'handheld-intense', locked: true },
    ]
    const instruction = storyboardBatchRewriteInstruction(panels, new Map(panels.map((item) => [item.id, { entries: [], text: '' }])))
    expect(instruction).toContain(`PANEL selected SELECTED CAMERA SUPPORT POLICY (HIDDEN):\n${cameraSupportSemantics('shoulder-rig')!.revampInstruction}`)
    expect(instruction).not.toContain(cameraSupportSemantics('handheld-intense')!.revampInstruction)
    expect(instruction).toContain('READ-ONLY panels must remain unchanged')
  })
})
