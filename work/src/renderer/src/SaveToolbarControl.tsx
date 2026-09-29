import { Save as SaveIcon } from 'lucide-react'
import type { WorkflowSavePresentationState } from '../../shared/footerSaveLifecycle'

export type ManualSaveSurface = 'project-list' | 'canvas-list' | 'canvas-editor'

type CanvasManualSaveControlProps = {
  surface: ManualSaveSurface
  state: WorkflowSavePresentationState
  onSave: () => void
}

export function CanvasManualSaveControl({ surface, state, onSave }: CanvasManualSaveControlProps) {
  if (surface !== 'canvas-editor') return null
  const saving = state === 'saving'
  const success = state === 'success'
  return (
    <>
      <span className="top-align-separator" aria-hidden="true" />
      <button
        className={`save-status ${state}`}
        data-tooltip="Save"
        aria-label="Save project"
        aria-busy={saving}
        disabled={state !== 'unsaved'}
        onClick={onSave}
      ><SaveIcon size={13} /></button>
      <span className="top-align-separator" aria-hidden="true" />
      <span className="sr-only" role="status" aria-live="polite">{saving ? 'Saving project' : success ? 'Project saved' : ''}</span>
    </>
  )
}
