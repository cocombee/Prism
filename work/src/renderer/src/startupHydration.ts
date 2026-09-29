export interface StartupHydrationOptions<Project, RecentProject, ServiceState, ProfileState> {
  currentProject: () => Promise<Project>
  recentProjects: () => Promise<readonly RecentProject[]>
  services: () => Promise<ServiceState>
  profileRegistries: () => Promise<ProfileState>
  onEssentialState: (state: { currentProject: Project; services: ServiceState; profileRegistries: ProfileState }) => void | Promise<void>
  onRecentProjects: (projects: readonly RecentProject[]) => void
}

export async function startStartupHydration<Project, RecentProject, ServiceState, ProfileState>(
  options: StartupHydrationOptions<Project, RecentProject, ServiceState, ProfileState>,
): Promise<void> {
  const recentProjects = options.recentProjects()
    .then((projects) => { options.onRecentProjects(projects) })
    .catch(() => undefined)
  const [currentProject, services, profileRegistries] = await Promise.all([
    options.currentProject(),
    options.services(),
    options.profileRegistries(),
  ])
  await options.onEssentialState({ currentProject, services, profileRegistries })
  await recentProjects
}
