export const SAVE_SUCCESS_TRANSIENT_MS = 2_000

export type FooterSavePhase = 'neutral' | 'saving' | 'saved'
export type WorkflowSavePresentationState = 'saved' | 'unsaved' | 'saving' | 'success'

export type SavePresentationLifecycle = {
  current: () => WorkflowSavePresentationState
  markDirty: () => void
  replaceClean: () => void
  beginSaving: () => boolean
  resolve: (stale: boolean) => void
  reject: () => void
  dispose: () => void
}

export function createSavePresentationLifecycle(
  onStateChange: (state: WorkflowSavePresentationState) => void,
  timers: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'> = globalThis,
): SavePresentationLifecycle {
  let state: WorkflowSavePresentationState = 'saved'
  let successTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const clearSuccessTimer = () => {
    if (successTimer !== null) timers.clearTimeout(successTimer)
    successTimer = null
  }
  const emit = (next: WorkflowSavePresentationState) => {
    state = next
    if (!disposed) onStateChange(next)
  }
  const markDirty = () => {
    clearSuccessTimer()
    emit('unsaved')
  }
  const replaceClean = () => {
    clearSuccessTimer()
    emit('saved')
  }
  const beginSaving = () => {
    if (state === 'saving') return false
    clearSuccessTimer()
    emit('saving')
    return true
  }
  const resolve = (stale: boolean) => {
    clearSuccessTimer()
    if (stale) {
      emit('unsaved')
      return
    }
    emit('success')
    successTimer = timers.setTimeout(() => {
      successTimer = null
      emit('saved')
    }, SAVE_SUCCESS_TRANSIENT_MS)
  }
  const reject = () => {
    clearSuccessTimer()
    emit('unsaved')
  }
  const dispose = () => {
    clearSuccessTimer()
    disposed = true
  }

  return { current: () => state, markDirty, replaceClean, beginSaving, resolve, reject, dispose }
}
