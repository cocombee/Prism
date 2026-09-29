import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const nodeCard = readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8')
const utility = readFileSync(new URL('./UtilityNodes.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles-next.css', import.meta.url), 'utf8')

describe('active next-generation notification categories', () => {
  it('proves NodeCardNext is the sole active generic node target', () => {
    expect(app).toContain("from './NodeCardNext'")
    expect(app).not.toContain("from './NodeCard'")
  })

  it('uses centralized guarded terminal progress expiry', () => {
    expect(app).toContain('const nodeProgressExpiryTimers = useRef<NodeProgressExpiryTimers>(new Map())')
    expect(app).toContain('scheduleNodeProgressExpiry(')
    expect(app).toContain('cancelNodeProgressExpiry(')
    expect(app).toContain("current.data.progress === expectedProgress")
    expect(app).toContain("current.data.runState !== 'queued' && current.data.runState !== 'running'")
    expect(app).toContain('!current.data.error')
  })

  it('maps generic active nodes to shared running, transient and persistent error rows', () => {
    expect(nodeCard).toContain('const notificationCategory = nodeNotificationCategory({')
    expect(nodeCard).toContain('aria-busy={running || undefined}')
    expect(nodeCard).toContain('node-lifecycle-row node-status')
    expect(nodeCard).toContain("notificationCategory === 'error' ? 'alert' : 'status'")
    expect(nodeCard).toContain("notificationCategory === 'running' && <LoaderCircle")
  })

  it('maps Storyboard and Assistant to the same lifecycle contract while leaving the helper separate', () => {
    expect(utility).toContain('const storyboardNotificationCategory = nodeNotificationCategory(data)')
    expect(utility).toContain('const assistantNotificationCategory = nodeNotificationCategory(data)')
    expect(utility).toContain('node-lifecycle-row storyboard-status')
    expect(utility).toContain('node-lifecycle-row assistant-status')
    expect(utility).toContain('disabled={assistantBusy || blocked')
    expect(utility).toContain('aria-busy={assistantBusy || undefined}')
    expect(utility).toContain('storyboard-feedback-row storyboard-duration-helper')
  })

  it('splits global transient information from persistent actionable errors', () => {
    expect(app).toContain('connection-notice-toast')
    expect(app).toContain('role="status" aria-live="polite" aria-atomic="true"')
    expect(app).toContain('connection-error-toast')
    expect(app).toContain('role="alert"')
    expect(app).toContain('setConnectionErrorNotice')
  })

  it('owns one shared lifecycle geometry with semantic variants and no persistent green', () => {
    expect(styles).toMatch(/\.node-lifecycle-row,\s*\.storyboard-feedback-row \{[^}]*min-height:\s*var\(--node-control-height\);[^}]*padding:\s*0 8px;[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*font-size:\s*var\(--font-node-control\);[^}]*font-weight:\s*400;[^}]*line-height:\s*1\.25;/)
    expect(styles).toContain('.node-lifecycle-row.is-running')
    expect(styles).toContain('.node-lifecycle-row.is-transient')
    expect(styles).toContain('.node-lifecycle-row.is-error')
    expect(styles).not.toMatch(/\.storyboard-status \{[^}]*#8dd5af/)
    expect(styles).not.toMatch(/\.node-status \{[^}]*(?:padding|min-height|font-size|line-height)/)
    expect(styles).not.toMatch(/\.assistant-status \{[^}]*(?:padding|min-height|font-size|line-height)/)
  })

  it('uses no left accent for active compact errors', () => {
    expect(styles).not.toMatch(/\.node-lifecycle-row\.is-error[^\{]*\{[^}]*border-left/)
    expect(styles).not.toMatch(/\.node-status\.character-needs-front[^\{]*\{[^}]*border-left/)
    expect(styles).not.toContain('.node-lifecycle-row.is-error::before')
    expect(styles).not.toContain('.node-status.character-needs-front::before')
  })
})
