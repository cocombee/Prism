/** Main-process connection checks are authoritative; registry rows are display metadata. */
export function createProviderProfileReadiness() {
  let revision = 0
  return {
    invalidate(): void { revision += 1 },
    capture(): () => boolean {
      const requested = revision
      return () => revision === requested
    },
    async refresh<T>(isCurrent: () => boolean, read: () => Promise<T>, commit: (value: T) => void): Promise<boolean> {
      const requested = ++revision
      const owns = () => revision === requested && isCurrent()
      if (!owns()) return false
      try {
        const value = await read()
        if (!owns()) return false
        commit(value)
        return true
      } catch (error) {
        if (!owns()) return false
        throw error
      }
    },
  }
}
