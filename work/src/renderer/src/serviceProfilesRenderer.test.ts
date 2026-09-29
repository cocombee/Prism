import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const app = readFileSync(join(root, 'src/renderer/src/AppNext.tsx'), 'utf8')
const nodeCard = readFileSync(join(root, 'src/renderer/src/NodeCardNext.tsx'), 'utf8')
const styles = readFileSync(join(root, 'src/renderer/src/styles-next.css'), 'utf8')
const projectStyles = readFileSync(join(root, 'src/renderer/src/project-library-card-controls.css'), 'utf8')

describe('service account profile product surface', () => {
  it('renders the same fluid full-width account manager for every provider', () => {
    expect(app).toContain('const providerProfiles = serviceProfiles.profiles.filter((profile) => profile.provider === service.id)')
    expect(app).toContain("${expanded ? 'is-expanded' : ''}")
    expect(app).toContain('{service.name} Accounts')
    expect(app).toContain('This Project')
    expect(app).toContain('Make Default')
    expect(app).toContain('Disconnect')
    expect(app).toContain('Reconnect')
    expect(app).toContain('Sign Out')
    expect(app).toContain('Sign In')
    expect(app).toContain('Add Account')
    expect(app).toContain('Connect Account')
    expect(styles).toMatch(/\.service-card\.is-expanded\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s)
  })

  it('confirms project/default toggles and keeps account actions understandable', () => {
    expect(app).toContain("action: isDefault ? 'cancel-default' : 'make-default'")
    expect(app).toContain("action: isProjectOverride ? 'cancel-project' : 'select-project'")
    expect(app).toContain('Cancel Default')
    expect(app).toContain('Use Default')
    expect(app).toContain('title="Delete Account"')
    expect(app).toContain('serviceActionError')
  })

  it('supports inline profile rename and reveals pencils only while hovering names', () => {
    expect(app).toContain('commitServiceProfileRename')
    expect(app).toContain('onDoubleClick={() => { setRenamingProfileId(profile.id)')
    expect(styles).toContain('.fal-account-name:hover > button')
    expect(styles).toContain('.page-card-title-row:hover > button')
    expect(projectStyles).toContain('.project-library-title-row:hover > button')
  })

  it('opens provider-aware Connections warnings from blocked Run buttons', () => {
    expect(nodeCard).toContain('runtime?.openConnections(billingProvider, providerModelLabel)')
    expect(nodeCard).toContain('is-connection-required')
    expect(app).toContain('connection required')
    expect(app).toContain('Manage Connection')
    expect(styles).toContain('.footer-run.is-connection-required')
  })
})
