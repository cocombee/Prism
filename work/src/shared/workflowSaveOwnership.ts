import type { ProjectWorkspace } from './types'

/** Ephemeral save routing identity; never part of the persisted workflow schema. */
export interface WorkflowSaveOwner { projectId: string; rootPath: string; documentPath: string }
export function workflowSaveOwner(project: ProjectWorkspace): WorkflowSaveOwner {
  if (!project.id || !project.rootPath || !project.documentPath) throw new Error('The project document is not ready for saving. Reopen the project; saved data is preserved.')
  return { projectId: project.id, rootPath: project.rootPath, documentPath: project.documentPath }
}
export function workflowSaveOwnerKey(owner: WorkflowSaveOwner): string {
  return JSON.stringify([owner.projectId, owner.rootPath, owner.documentPath])
}
