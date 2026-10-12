import { ChevronLeft, ChevronRight, FolderOpen, Heart, PencilLine, Trash2 } from 'lucide-react'
export function GeneratedMediaOverlay({ activeIndex, total, favorite, onPrevious, onNext, onReveal, onEdit, onFavorite, onDelete, hideReveal = false, hideNavigation = false }: { activeIndex: number; total: number; favorite: boolean; onPrevious: () => void; onNext: () => void; onReveal: () => void; onEdit: () => void; onFavorite: () => void; onDelete: () => void; hideReveal?: boolean; hideNavigation?: boolean }) {
  return <div className="generated-media-overlay" data-overlay-owner="GeneratedMediaOverlay">
    <div className="generated-media-actions nodrag" aria-label="Generated Media Actions">
      {!hideReveal && <button data-tooltip="Show In Finder" aria-label="Show Generated Media In Finder" onClick={(event) => { event.stopPropagation(); onReveal() }}><FolderOpen size={13} /></button>}
      <button data-tooltip="Rename" aria-label="Rename Generated Media" onClick={(event) => { event.stopPropagation(); onEdit() }}><PencilLine size={13} /></button>
      <button data-tooltip={favorite ? 'Remove From Favorites' : 'Add To Favorites'} aria-label={favorite ? 'Remove Generated Media From Favorites' : 'Add Generated Media To Favorites'} className={favorite ? 'is-active' : ''} onClick={(event) => { event.stopPropagation(); onFavorite() }}><Heart size={13} fill={favorite ? 'currentColor' : 'none'} /></button>
      <button className="is-danger" data-tooltip="Delete" aria-label="Delete Generated Media" onClick={(event) => { event.stopPropagation(); onDelete() }}><Trash2 size={13} /></button>
    </div>
    {!hideNavigation && total > 1 && <div className="result-carousel nodrag" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
      <button data-tooltip="Previous Result" aria-label="Previous Result" disabled={activeIndex === 0} onClick={onPrevious}><ChevronLeft size={11} /></button><span>{activeIndex + 1}/{total}</span><button data-tooltip="Next Result" aria-label="Next Result" disabled={activeIndex === total - 1} onClick={onNext}><ChevronRight size={11} /></button>
    </div>}
  </div>
}
