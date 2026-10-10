interface ProjectActivationReaders<Workflow, Entries, Assets, Legacy, Connections> {
  isCurrent(): boolean
  loadWorkflow(): Promise<Workflow>
  readEntries(): Promise<Entries>
  readAssets(): Promise<Assets>
  readLegacyStatus(): Promise<Legacy>
  readConnections(): Promise<Connections>
}

/** Owned hydration may repair disk state; provider reads must wait until its queue releases. */
export async function loadProjectActivationState<Workflow, Entries, Assets, Legacy, Connections>(
  readers: ProjectActivationReaders<Workflow, Entries, Assets, Legacy, Connections>,
) {
  if (!readers.isCurrent()) return null
  const stored = await readers.loadWorkflow()
  // A new invocation of the same project is also a different activation.
  if (!readers.isCurrent()) return null
  const [entries, assetStatus, legacyStatus, connections] = await Promise.all([
    readers.readEntries(), readers.readAssets(), readers.readLegacyStatus(), readers.readConnections(),
  ])
  return readers.isCurrent() ? { stored, entries, assetStatus, legacyStatus, connections } : null
}
