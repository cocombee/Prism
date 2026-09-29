import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')

describe('active next-gen Canvas keyboard contract', () => {
  it('disables React Flow deletion and routes guarded actions through the existing AppNext listener', () => {
    expect(app).toContain('deleteKeyCode={null}')
    expect(app).not.toContain("deleteKeyCode={['Backspace', 'Delete']}")
    expect(app).toContain('const canvasAction = canvasKeyboardAction({')
    expect(app).toContain("canvasScope: appView === 'canvas' && keyboardSelectionScope.current === 'canvas'")
    expect(app).toContain("canvasAction === 'select-all'")
    expect(app).toContain("if (canvasAction === 'delete-selection')")
    expect(app).toContain("window.addEventListener('keydown', onKeyDown)")
    expect(app).not.toContain("window.addEventListener('keydown', onKeyDown, true)")
  })
})
