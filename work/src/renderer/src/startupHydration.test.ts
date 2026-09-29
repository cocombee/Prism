import { describe, expect, it } from 'vitest'
import { startStartupHydration } from './startupHydration'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('renderer startup hydration', () => {
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
