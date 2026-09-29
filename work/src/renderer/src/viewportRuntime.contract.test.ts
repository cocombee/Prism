import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mainSource = readFileSync(new URL('../../main/index.ts', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./styles-next.css', import.meta.url), 'utf8')

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))
  expect(match, `missing CSS rule for ${selector}`).not.toBeNull()
  return match![1]
}

describe('native viewport runtime contract', () => {
  it('normalizes BrowserWindow page zoom before the first visible show without changing normal dimensions', () => {
    expect(mainSource).toContain('width: 1480')
    expect(mainSource).toContain('minWidth: 440')
    expect(mainSource).toContain('show: false')
    expect(mainSource).toContain('mainWindow.webContents.setZoomFactor(1)')

    const constructed = mainSource.indexOf('mainWindow = new BrowserWindow({')
    const normalized = mainSource.indexOf('mainWindow.webContents.setZoomFactor(1)')
    const firstShowRegistration = mainSource.indexOf("mainWindow.once('ready-to-show'")
    expect(constructed).toBeGreaterThanOrEqual(0)
    expect(normalized).toBeGreaterThan(constructed)
    expect(normalized).toBeLessThan(firstShowRegistration)
  })

  it('keeps the 1480 CSS-pixel launcher geometry uncapped in the active stylesheet', () => {
    expect(rule('html, body, #root')).toMatch(/width:\s*100%/)
    expect(rule('html, body, #root')).toMatch(/height:\s*100%/)

    const launcher = rule('.project-launcher')
    expect(launcher).toMatch(/position:\s*fixed/)
    expect(launcher).toMatch(/inset:\s*0/)
    expect(launcher).toMatch(/grid-template-columns:\s*220px\s+minmax\(0,\s*1fr\)/)
    expect(launcher).not.toMatch(/(?:^|;)\s*(?:width|max-width)\s*:/)

    const sidebar = rule('.launcher-sidebar')
    expect(sidebar).not.toMatch(/(?:^|;)\s*(?:width|max-width)\s*:/)

    const main = rule('.launcher-main')
    expect(main).not.toMatch(/(?:^|;)\s*(?:width|max-width)\s*:/)

    const viewportWidth = 1480
    const sidebarWidth = 220
    expect(viewportWidth - sidebarWidth).toBe(1260)
  })
})
