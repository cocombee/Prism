import { useEffect, useRef, type Dispatch } from 'react'
import {
  type SemanticAssetLifecycleAction,
  type SemanticAssetLifecycleState,
} from '../../shared/semanticAssetLifecycle'

export interface SemanticAssetSaveFeedbackProps {
  state: SemanticAssetLifecycleState
  dispatch: Dispatch<SemanticAssetLifecycleAction>
  onConfirm: (state: SemanticAssetLifecycleState) => void | Promise<void>
}

export function SemanticAssetSaveFeedback({ state, dispatch, onConfirm }: SemanticAssetSaveFeedbackProps) {
  const committing = state.status === 'SAVE_COMMITTING'
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previousStatus = useRef<SemanticAssetLifecycleState['status']>(state.status)

  useEffect(() => {
    const previous = previousStatus.current
    previousStatus.current = state.status
    if (state.status !== 'SAVE_CONFIRMATION' || previous === 'SAVE_CONFIRMATION') return
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [state.status])

  return <>
    {state.status === 'SAVE_FAILED' && state.error && <div className="semantic-asset-save-alert" role="alert">{state.error}</div>}
    {committing && <div className="semantic-asset-save-status" aria-live="polite">Saving result…</div>}
    {state.status === 'SAVE_COMPLETE' && <div className="semantic-asset-save-status" aria-live="polite">Result saved.</div>}
    {state.status === 'SAVE_CONFIRMATION' && state.pendingSave && <div className="delete-confirm-backdrop" role="presentation">
      <section
        className="delete-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="semantic-save-title"
        aria-describedby="semantic-save-description"
        onKeyDown={(event) => { if (event.key === 'Escape') dispatch({ type: 'SAVE_CANCELLED' }) }}
      >
        <h2 id="semantic-save-title">Save this result?</h2>
        <p id="semantic-save-description">Saving will permanently delete the other {state.pendingSave.deletionCount} generated reference(s) and replace the current saved asset. This cannot be undone.</p>
        <footer>
          <button ref={cancelRef} type="button" autoFocus onClick={() => dispatch({ type: 'SAVE_CANCELLED' })}>Cancel</button>
          <button type="button" className="is-danger" onClick={() => {
            const committingState = { ...state, status: 'SAVE_COMMITTING' as const, canSave: false }
            dispatch({ type: 'SAVE_CONFIRMED' })
            void onConfirm(committingState)
          }}>Save &amp; Delete Others</button>
        </footer>
      </section>
    </div>}
  </>
}
