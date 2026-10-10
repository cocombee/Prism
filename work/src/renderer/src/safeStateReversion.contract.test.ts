import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const app = readFileSync(new URL('./AppNext.tsx', import.meta.url), 'utf8')
const preload = readFileSync(new URL('../../preload/index.ts', import.meta.url), 'utf8')
const main = readFileSync(new URL('../../main/index.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../../shared/types.ts', import.meta.url), 'utf8')
const entry = readFileSync(new URL('./main-next.tsx', import.meta.url), 'utf8')

describe('safe product state without Director semantic workspace', () => {
  it('has no semantic workspace runtime imports, IPC, AppView, buttons, render, or stylesheet', () => {
    for (const source of [app, preload, main, types, entry]) {
      expect(source).not.toMatch(/PrismSemanticWorkspace|prism-workspace\.css|semantic:(?:load|save)|semanticWorkspacePath|window\.prism\.semantic/)
    }
    expect(app).not.toMatch(/type AppView = [^\n]*semantic|setAppView\('semantic'\)|appView === 'semantic'|Open Semantic Plans|>Plans</)
    expect(app).not.toContain('semantic-nav-entry')
  })

  it('hydrates the current project before pending recent cards and preserves registry order', () => {
    expect(app).toContain('void startStartupHydration({')
    expect(app).toContain('currentProject: () => window.prism.projects.current()')
    expect(app).toContain('recentProjects: () => window.prism.projects.recent()')
    expect(app).toContain('onRecentProjects: (projects) => setRecentProjects([...projects])')
    expect(app).toContain('const activation = activateProject(storedProject, false)')
    expect(app.indexOf("const activation = activateProject(storedProject, false)")).toBeLessThan(app.indexOf('setProjectReady(true)'))
    expect(app).not.toMatch(/Promise\.all\(\[[^\]]*projects\.current\(\)[^\]]*projects\.recent\(\)/)
    const fixture = [{ name: '00. Prism' }, { name: 'Test Flow' }]
    expect(fixture.map((project) => project.name)).toEqual(['00. Prism', 'Test Flow'])
  })
})
