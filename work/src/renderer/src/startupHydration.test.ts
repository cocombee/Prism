import { describe, expect, it, vi } from 'vitest'
import { startStartupHydration } from './startupHydration'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('renderer startup hydration', () => {
  it('discards startup and recent-project replies after a newer project activation', async () => {
    const project = deferred<string>(), recent = deferred<readonly string[]>(), essential = vi.fn(), applyRecent = vi.fn(); let current = true
    const startup = startStartupHydration({ currentProject: () => project.promise, recentProjects: () => recent.promise, services: async () => [], profileRegistries: async () => [], onEssentialState: essential, onRecentProjects: applyRecent, isCurrent: () => current })
    current = false; project.resolve('old'); recent.resolve(['old recent']); await startup
    expect(essential).not.toHaveBeenCalled(); expect(applyRecent).not.toHaveBeenCalled()
  })

  it('keeps later recent projects when the startup itself claims the current activation', async () => {
    const recent = deferred<readonly string[]>(), applyRecent = vi.fn(); let activation = 0, owned = 0
    const startup = startStartupHydration({ currentProject: async () => 'A', recentProjects: () => recent.promise, services: async () => [], profileRegistries: async () => [], onEssentialState: async () => { activation++; owned = activation }, onRecentProjects: applyRecent, isCurrent: () => activation === owned })
    await Promise.resolve(); await Promise.resolve(); recent.resolve(['latest']); await startup
    expect(applyRecent).toHaveBeenCalledWith(['latest'])
  })
  it('hydrates the current project before slow Recent Projects and applies the later list without replacing active canvas state', async () => {
    const recent = deferred<readonly string[]>()
    const state: { activeProject: string | null; activeCanvas: string | null; recentProjects: readonly string[] } = {
      activeProject: null,
      activeCanvas: null,
      recentProjects: [],
    }

    const startup = startStartupHydration({
      currentProject: () => Promise.resolve('project-current'),
      recentProjects: () => recent.promise,
      services: () => Promise.resolve(['service-ready'] as const),
      profileRegistries: () => Promise.resolve(['profiles-ready'] as const),
      onEssentialState: async ({ currentProject }) => {
        state.activeProject = currentProject
        state.activeCanvas = 'canvas-current'
      },
      onRecentProjects: (projects) => { state.recentProjects = projects },
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(state).toMatchObject({ activeProject: 'project-current', activeCanvas: 'canvas-current', recentProjects: [] })

    recent.resolve(['recent-newest', 'recent-older'])
    await startup
    expect(state).toEqual({
      activeProject: 'project-current',
      activeCanvas: 'canvas-current',
      recentProjects: ['recent-newest', 'recent-older'],
    })
  })
})
