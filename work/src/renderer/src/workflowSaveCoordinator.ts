import type { WorkflowDocument } from '../../shared/types'
import { workflowSaveOwnerKey, type WorkflowSaveOwner } from '../../shared/workflowSaveOwnership'

export interface WorkflowSaveSnapshot { owner: WorkflowSaveOwner; activation: number; version: number; fingerprint: string; document: WorkflowDocument }

/** A flush resolves only when the current owner's latest content is durable. No React or provider side effects. */
export function createWorkflowSaveCoordinator(dependencies: {
  snapshot(): WorkflowSaveSnapshot | null
  save(snapshot: WorkflowSaveSnapshot): Promise<void>
  begin(snapshot: WorkflowSaveSnapshot): void
  saved(snapshot: WorkflowSaveSnapshot, upToDate: boolean): void
  failed(snapshot: WorkflowSaveSnapshot, error: unknown): void
}) {
  const pending = new Map<string, Promise<boolean>>()
  const scopeKey = (snapshot: WorkflowSaveSnapshot) => JSON.stringify([workflowSaveOwnerKey(snapshot.owner), snapshot.activation])
  const current = (key: string) => {
    const value = dependencies.snapshot()
    return value && scopeKey(value) === key ? value : null
  }
  return {
    flush(): Promise<boolean> {
      const first = dependencies.snapshot()
      if (!first) return Promise.resolve(false)
      const key = scopeKey(first), existing = pending.get(key)
      if (existing) return existing
      const operation = Promise.resolve().then(async () => {
        while (true) {
          const snapshot = current(key)
          if (!snapshot) return false
          const owned = structuredClone(snapshot)
          dependencies.begin(owned)
          try { await dependencies.save(owned) }
          catch (error) { if (current(key)) dependencies.failed(owned, error); return false }
          const latest = current(key)
          if (!latest) return false
          const upToDate = latest.version === owned.version && latest.fingerprint === owned.fingerprint
          dependencies.saved(owned, upToDate)
          if (upToDate) return true
        }
      }).finally(() => { if (pending.get(key) === operation) pending.delete(key) })
      pending.set(key, operation)
      return operation
    },
  }
}
