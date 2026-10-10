import { resolve } from 'node:path'
import type { WorkflowDocument } from '../shared/types'
import { workflowSaveOwnerKey, type WorkflowSaveOwner } from '../shared/workflowSaveOwnership'

interface WorkflowOwnerDependencies {
  currentOwner(): WorkflowSaveOwner | null
  runForOwner<T>(key: string, action: () => Promise<T>): Promise<T>
}

function checkedOwner(rawOwner: unknown, dependencies: WorkflowOwnerDependencies) {
  const owner = rawOwner as WorkflowSaveOwner
  if (!owner || typeof owner !== 'object' || Array.isArray(owner) || Object.keys(owner).some(key => !['projectId','rootPath','documentPath'].includes(key)) || [owner.projectId,owner.rootPath,owner.documentPath].some(value => typeof value !== 'string' || !value || value.length > 8192)) throw new Error('A save requires the exact project document owner; no file was changed.')
  const requested = { projectId: owner.projectId, rootPath: resolve(owner.rootPath), documentPath: resolve(owner.documentPath) }
  const key = workflowSaveOwnerKey(requested)
  const assertCurrent = () => {
    const current = dependencies.currentOwner()
    if (!current || workflowSaveOwnerKey({ ...current, rootPath: resolve(current.rootPath), documentPath: resolve(current.documentPath) }) !== key) throw new DOMException('The project changed before the workflow could be saved.', 'AbortError')
  }
  assertCurrent()
  return { key, assertCurrent }
}

/** Main routes only to its active owner; caller paths are assertions, never write destinations. */
export async function saveOwnedWorkflow(document: WorkflowDocument, rawOwner: unknown, dependencies: WorkflowOwnerDependencies & {
  saveCanonical(document: WorkflowDocument): Promise<void>
  savePortable(): Promise<void>
}) {
  const { key, assertCurrent } = checkedOwner(rawOwner, dependencies)
  if (!document || document.schemaVersion !== 1 || !Array.isArray(document.nodes) || !Array.isArray(document.edges)) throw new Error('Invalid workflow document.')
  const snapshot = structuredClone(document)
  // Serialization failure must precede either durable write.
  JSON.stringify(snapshot)
  await dependencies.runForOwner(key, async () => {
    assertCurrent()
    await dependencies.saveCanonical(snapshot)
    assertCurrent()
    await dependencies.savePortable()
    assertCurrent()
  })
}

/** Hydration may repair disk state, so it shares the project command queue and exact owner. */
export async function loadOwnedWorkflow(rawOwner: unknown, dependencies: WorkflowOwnerDependencies & {
  load(): Promise<WorkflowDocument | null>
}) {
  const { key, assertCurrent } = checkedOwner(rawOwner, dependencies)
  return dependencies.runForOwner(key, async () => {
    assertCurrent()
    const document = await dependencies.load()
    assertCurrent()
    return document
  })
}
