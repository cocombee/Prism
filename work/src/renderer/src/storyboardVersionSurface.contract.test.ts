import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const utility = readFileSync(new URL('UtilityNodes.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('AppNext.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('styles-next.css', import.meta.url), 'utf8')
const nodePort = readFileSync(new URL('NodePort.tsx', import.meta.url), 'utf8')
const activeCompiler = [
  '../../shared/storyboardSequence.ts',
  '../../shared/workflowResolver.ts',
  '../../shared/shotSpec.ts',
  '../../shared/seedanceDirectorValidation.ts',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n')

describe('final Storyboard panel and connection affordance contract', () => {
  it('removes Sequence Type UI and executable compiler authority', () => {
    expect(utility).not.toContain('Sequence Type')
    expect(utility).not.toContain('Storyboard Mode')
    expect(utility).not.toContain('storyboardMode')
    expect(app).not.toContain("storyboardMode: kind === 'storyboard'")
    expect(activeCompiler).not.toContain('storyboardMode')
  })

  it('renders Original, Revamped, Lock, Delete in exact header order with stock icons and accessibility', () => {
    const header = utility.match(/<div className="storyboard-panel-head">([\s\S]*?)<\/div>\s*<div className="storyboard-panel-compose">/)?.[1] || ''
    expect(header.indexOf('Show original prompt')).toBeGreaterThanOrEqual(0)
    expect(header.indexOf('Show revamped prompt')).toBeGreaterThan(header.indexOf('Show original prompt'))
    expect(header.indexOf('Lock panel')).toBeGreaterThan(header.indexOf('Show revamped prompt'))
    expect(header.indexOf('Delete panel')).toBeGreaterThan(header.indexOf('Lock panel'))
    expect(utility).toContain('APP_ICONS.projectDocument')
    expect(header).toContain('<WandSparkles size={10}')
    expect(header).toContain('aria-pressed={selectedPromptVersion ===')
    expect(header).toContain('disabled={!panel.revampedPrompt}')
    expect(header).toContain("panel.locked ? <Lock size={10} /> : <Unlock size={10} />")
    expect(header).toContain('<Trash2 size={10} />')
  })

  it('keeps exact 25px header and 21px controls with rounded clipped selected paint', () => {
    expect(styles).toMatch(/\.storyboard-panel-head\s*\{[^}]*height:\s*25px;[^}]*padding:\s*0 6px;/s)
    expect(styles).toMatch(/\.storyboard-panel-head button\s*\{[^}]*width:\s*21px;[^}]*height:\s*21px;/s)
    expect(styles).toMatch(/\.storyboard-panel-head button\s*\{[^}]*border-radius:\s*6px;/s)
    expect(styles).toMatch(/\.storyboard-panel-head button\s*\{[^}]*overflow:\s*hidden;/s)
    expect(styles).toContain('.storyboard-panel-head > div { display: flex; align-items: center; gap: 1px;')
    expect(styles).toContain('.storyboard-panel-head > div > button[aria-pressed="true"]')
  })

  it('keeps the collapsed source arrow visible and actionable before hover without moving its anchor', () => {
    expect(nodePort).toContain("type === 'source' && connectionAppearance === 'idle'")
    expect(nodePort).toContain("'is-always-visible-at-rest'")
    expect(styles).toMatch(/\.node-port-source\.connection-idle\.is-stowed\.is-always-visible-at-rest \.node-port-visual\s*\{[^}]*opacity:\s*1;/s)
    expect(styles).toMatch(/\.node-port-source\.connection-idle\.is-stowed\.is-always-visible-at-rest\s*\{[^}]*pointer-events:\s*auto;/s)
    expect(nodePort).toContain("'--node-port-offset': anchorDeployed ? '-22px' : '0px'")
    expect(styles).toMatch(/\.node-port-visual\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;/s)
  })
})
