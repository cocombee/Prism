import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainSource = () => readFileSync(resolve(process.cwd(), 'src/camera-tester/main.ts'), 'utf8')

describe('camera tester main-window lifecycle', () => {
  it('shows only the exact retained live window when its first ready-to-show event fires', () => {
    const source = mainSource()

    expect(source).toMatch(/new\s+BrowserWindow\s*\(\s*\{[^}]*\bshow\s*:\s*false\b/s)
    expect(source.match(/ready-to-show/g)).toHaveLength(1)
    expect(source).toMatch(/win\.once\(\s*['"]ready-to-show['"]\s*,\s*\(\)\s*=>\s*\{\s*if\s*\(mainWindow\s*===\s*win\s*&&\s*!win\.isDestroyed\(\)\)\s*win\.show\(\)\s*\}\s*\)/s)
  })

  it('retains the created window until that exact window closes and recreates or shows it on macOS activation', () => {
    const source = mainSource()

    expect(source).toMatch(/let\s+mainWindow\s*:\s*BrowserWindow\s*\|\s*null\s*=\s*null/)
    expect(source).toMatch(/mainWindow\s*=\s*new\s+BrowserWindow\s*\(/)
    expect(source).toMatch(/const\s+win\s*=\s*mainWindow/)
    expect(source).toMatch(/win\.on\(\s*['"]closed['"]\s*,\s*\(\)\s*=>\s*\{\s*if\s*\(mainWindow\s*===\s*win\)\s*mainWindow\s*=\s*null\s*\}\s*\)/s)
    expect(source).toMatch(/app\.on\(\s*['"]activate['"]\s*,\s*\(\)\s*=>\s*\{\s*if\s*\(!mainWindow\s*\|\|\s*mainWindow\.isDestroyed\(\)\)\s*\{\s*createWindow\(\)\s*;?\s*return\s*;?\s*\}\s*mainWindow\.show\(\)\s*\}\s*\)/s)
    expect(source).not.toMatch(/mainWindow\.focus\(\)/)
  })
})
