export type SemanticAssetLifecycleStatus =
  | 'EMPTY'
  | 'REFERENCE_READY'
  | 'GENERATING'
  | 'RESULTS_READY'
  | 'SAVED_VIEW'
  | 'EDITING_SAVED'
  | 'SAVE_CONFIRMATION'
  | 'SAVE_COMMITTING'
  | 'SAVE_FAILED'
  | 'SAVE_COMPLETE'

export type SemanticAssetReferenceSource = 'saved' | 'generated' | 'imported'

export interface SemanticAssetReference {
  id: string
  path: string
  url?: string
  source: SemanticAssetReferenceSource
  createdAt: string
}

export interface PendingSemanticAssetSave {
  selectedResultId: string
  deleteGeneratedIds: string[]
  deletionCount: number
}

export interface SemanticAssetLifecycleState {
  status: SemanticAssetLifecycleStatus
  references: SemanticAssetReference[]
  selectedId?: string
  pendingSave?: PendingSemanticAssetSave
  error?: string
  showIntake: boolean
  canSave: boolean
}

export type SemanticAssetLifecycleAction =
  | { type: 'REFERENCES_REPLACED'; references: SemanticAssetReference[] }
  | { type: 'REFERENCE_DELETED'; id: string }
  | { type: 'SELECT'; id: string }
  | { type: 'NAVIGATE'; target: 'first' | 'previous' | 'next' | 'last' }
  | { type: 'EDIT_SAVED' }
  | { type: 'GENERATION_STARTED' }
  | { type: 'GENERATION_FINISHED'; references: SemanticAssetReference[] }
  | { type: 'SAVE_REQUESTED' }
  | { type: 'SAVE_CONFIRMED' }
  | { type: 'SAVE_CANCELLED' }
  | { type: 'SAVE_FAILED'; error: string }
  | { type: 'SAVE_SUCCEEDED'; saved: SemanticAssetReference }
  | { type: 'SAVE_COMPLETE_ACKNOWLEDGED' }

function ordered(references: SemanticAssetReference[]): SemanticAssetReference[] {
  return [...references].sort((left, right) => {
    if (left.source === 'saved' && right.source !== 'saved') return -1
    if (right.source === 'saved' && left.source !== 'saved') return 1
    const created = left.createdAt.localeCompare(right.createdAt)
    return created || left.id.localeCompare(right.id)
  })
}

function steadyStatus(references: SemanticAssetReference[]): SemanticAssetLifecycleStatus {
  if (!references.length) return 'EMPTY'
  if (references.some((reference) => reference.source === 'generated')) return 'RESULTS_READY'
  if (references.length === 1 && references[0].source === 'saved') return 'SAVED_VIEW'
  return 'REFERENCE_READY'
}

function withDerived(state: Omit<SemanticAssetLifecycleState, 'showIntake' | 'canSave'>): SemanticAssetLifecycleState {
  const selected = state.references.find((reference) => reference.id === state.selectedId)
  const frozen = state.status === 'SAVE_CONFIRMATION' || state.status === 'SAVE_COMMITTING'
  return {
    ...state,
    showIntake: state.status === 'EMPTY',
    canSave: !frozen && selected?.source === 'generated',
  }
}

export function createSemanticAssetLifecycle(references: SemanticAssetReference[]): SemanticAssetLifecycleState {
  const sorted = ordered(references)
  return withDerived({ status: steadyStatus(sorted), references: sorted, selectedId: sorted[0]?.id })
}

export function semanticAssetNavigation(state: SemanticAssetLifecycleState) {
  const index = Math.max(0, state.references.findIndex((reference) => reference.id === state.selectedId))
  const total = state.references.length
  return {
    current: total ? index + 1 : 0,
    total,
    canFirst: index > 0,
    canPrevious: index > 0,
    canNext: index < total - 1,
    canLast: index < total - 1,
  }
}

export function beginSemanticAssetSave(state: SemanticAssetLifecycleState): SemanticAssetLifecycleState {
  const selected = state.references.find((reference) => reference.id === state.selectedId)
  if (!selected || selected.source !== 'generated') return state
  const deleteGeneratedIds = state.references
    .filter((reference) => reference.source === 'generated' && reference.id !== selected.id)
    .map((reference) => reference.id)
  const pendingSave = { selectedResultId: selected.id, deleteGeneratedIds, deletionCount: deleteGeneratedIds.length }
  return withDerived({
    ...state,
    status: deleteGeneratedIds.length ? 'SAVE_CONFIRMATION' : 'SAVE_COMMITTING',
    pendingSave,
    error: undefined,
  })
}

export function semanticAssetLifecycleReducer(state: SemanticAssetLifecycleState, action: SemanticAssetLifecycleAction): SemanticAssetLifecycleState {
  if ((state.status === 'SAVE_CONFIRMATION' || state.status === 'SAVE_COMMITTING') && !['SAVE_CONFIRMED', 'SAVE_CANCELLED', 'SAVE_FAILED', 'SAVE_SUCCEEDED'].includes(action.type)) return state

  switch (action.type) {
    case 'REFERENCES_REPLACED': {
      const references = ordered(action.references)
      return withDerived({ status: steadyStatus(references), references, selectedId: references.some((reference) => reference.id === state.selectedId) ? state.selectedId : references[0]?.id })
    }
    case 'REFERENCE_DELETED': {
      const references = state.references.filter((reference) => reference.id !== action.id)
      const index = state.references.findIndex((reference) => reference.id === action.id)
      const selectedId = state.selectedId === action.id ? references[Math.min(Math.max(index, 0), Math.max(references.length - 1, 0))]?.id : state.selectedId
      return withDerived({ status: steadyStatus(references), references, selectedId })
    }
    case 'SELECT':
      return state.references.some((reference) => reference.id === action.id) ? withDerived({ ...state, selectedId: action.id }) : state
    case 'NAVIGATE': {
      if (!state.references.length) return state
      const navigation = semanticAssetNavigation(state)
      const index = navigation.current - 1
      const nextIndex = action.target === 'first' ? 0 : action.target === 'last' ? navigation.total - 1 : action.target === 'previous' ? Math.max(0, index - 1) : Math.min(navigation.total - 1, index + 1)
      return withDerived({ ...state, selectedId: state.references[nextIndex].id })
    }
    case 'EDIT_SAVED':
      return withDerived({ ...state, status: 'EDITING_SAVED' })
    case 'GENERATION_STARTED':
      return withDerived({ ...state, status: 'GENERATING', error: undefined })
    case 'GENERATION_FINISHED': {
      const references = ordered(action.references)
      const newest = [...references].reverse().find((reference) => reference.source === 'generated')
      return withDerived({ status: 'RESULTS_READY', references, selectedId: newest?.id || state.selectedId })
    }
    case 'SAVE_REQUESTED':
      return beginSemanticAssetSave(state)
    case 'SAVE_CONFIRMED':
      return state.status === 'SAVE_CONFIRMATION' ? withDerived({ ...state, status: 'SAVE_COMMITTING' }) : state
    case 'SAVE_CANCELLED':
      return withDerived({ ...state, status: steadyStatus(state.references), pendingSave: undefined })
    case 'SAVE_FAILED':
      return withDerived({ ...state, status: 'SAVE_FAILED', pendingSave: undefined, error: action.error })
    case 'SAVE_SUCCEEDED':
      return withDerived({ status: 'SAVE_COMPLETE', references: [{ ...action.saved, source: 'saved' }], selectedId: action.saved.id })
    case 'SAVE_COMPLETE_ACKNOWLEDGED':
      return state.status === 'SAVE_COMPLETE' ? withDerived({ ...state, status: 'SAVED_VIEW' }) : state
  }
}
