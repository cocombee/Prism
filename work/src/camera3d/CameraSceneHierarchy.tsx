import { useEffect, useState } from 'react'
import { Box, Camera, Circle, Copy, Cylinder, Group, Link2, Lock, Scissors, Trash2, Unlock, UserRound } from 'lucide-react'
import { cameraEntityForShot, type CameraDocument, type EntityKind, type ShapeGroup } from './model'

const iconFor: Record<Exclude<EntityKind, 'camera'>, typeof Box> = { human: UserRound, block: Box, sphere: Circle, column: Cylinder }
type SelectionEvent = { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
type Props = {
  document: CameraDocument
  activeShotId: string
  selectedIds: string[]
  expandedGroups: Set<string>
  onShot(id: string): void
  onBoundaryChange?(shotId: string, boundary: 'cut' | 'continue'): void
  onEntity(id: string, event?: SelectionEvent): void
  onGroup(group: ShapeGroup): void
  onObject?(id: string): void
  onToggleGroup(id: string): void
  onDuplicateShot?(shotId: string): void
  onDeleteShot?(shotId: string): void
  onAllLock(shotId: string): void
  onEntityAllLock?(entityId: string): void
  onDuplicateEntity?(entityId: string): void
  onDeleteEntity?(entityId: string): void
  onReorderShot?(shotId: string, beforeId: string | null): void
}

export function CameraSceneHierarchy(props: Props) {
  const { document } = props
  const canonicalShotIds = document.shots.map((shot) => shot.id)
  const shotKey = canonicalShotIds.join('|')
  const [shotOrder, setShotOrder] = useState(canonicalShotIds)
  const [dragged, setDragged] = useState<string | null>(null)
  useEffect(() => setShotOrder(canonicalShotIds), [shotKey])
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { setShotOrder(canonicalShotIds); setDragged(null) } }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [shotKey])
  const groups = new Map(document.groups.map((group) => [group.id, group]))
  const entities = new Map(document.entities.filter((entity) => entity.kind !== 'camera').map((entity) => [entity.id, entity]))
  const objects = new Map((document.objects || []).map((object) => [object.id, object]))
  const owned = new Set(document.groups.flatMap((group) => group.childIds))
  const fallbackRoots = [...shotOrder, ...document.groups.filter((group) => !owned.has(group.id)).map((group) => group.id), ...document.entities.filter((entity) => entity.kind !== 'camera' && !owned.has(entity.id)).map((entity) => entity.id), ...(document.objects || []).filter((object) => !owned.has(object.id)).map((object) => object.id)]
  const roots = [...new Set([...shotOrder, ...(document.sceneTree || []).filter((id) => !canonicalShotIds.includes(id)), ...fallbackRoots])].filter((id) => document.shots.some((shot) => shot.id === id) || groups.has(id) || entities.has(id) || objects.has(id)).filter((id) => !owned.has(id) || document.sceneTree?.includes(id))
  const renderNode = (id: string, depth: number, seen: Set<string>): React.ReactNode => {
    if (seen.has(id)) return null
    const group = groups.get(id)
    if (group) {
      const expanded = props.expandedGroups.has(id)
      const next = new Set(seen).add(id)
      return <div key={id} className="camera3d-shape-group" role="group" data-root-kind={depth === 0 ? 'group' : undefined} data-tree-depth={depth}>
        <div className={`camera3d-group-row ${group.childIds.every((child) => props.selectedIds.includes(child)) ? 'is-active' : ''}`} role="treeitem" aria-expanded={expanded} data-tree-depth={depth} style={{ paddingLeft: `${8 + depth * 14}px` }}>
          <button type="button" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.name}`} onClick={() => props.onToggleGroup(id)}>{expanded ? '−' : '+'}</button>
          <button type="button" onClick={() => props.onGroup(group)}><Group size={12}/><span>{group.name}</span>{group.childIds.length > 0 && group.childIds.every((child) => entities.get(child)?.locks?.all) ? <Lock size={11}/> : null}</button>
        </div>
        {expanded && <div className="camera3d-hierarchy-children" role="group" data-tree-depth={depth + 1}>{group.childIds.map((child) => renderNode(child, depth + 1, next))}</div>}
      </div>
    }
    const entity = entities.get(id)
    if (entity) {
      const Icon = iconFor[entity.kind as Exclude<EntityKind, 'camera'>]
      const selected = props.selectedIds.includes(id)
      const lockLabel = entity.locks?.all ? 'Unlock All' : 'Lock All'
      return <div key={id} className={`camera3d-entity-row ${selected ? 'is-active' : ''}`} role="treeitem" data-tree-depth={depth} data-entity-id={entity.id} style={{ paddingLeft: `${8 + depth * 14}px` }} aria-selected={selected}>
        <button type="button" className="camera3d-entity-select" aria-label={`Select ${entity.name}`} onClick={(event) => props.onEntity(id, event)}>
          <Icon size={12}/><span className="camera3d-entity-swatch" style={{ background: entity.color }}/><span className="camera3d-entity-name">{entity.name}</span>
        </button>
        <div className="camera3d-hierarchy-actions camera3d-entity-actions" role="group" aria-label={`${entity.name} actions`}>
          <button type="button" className="camera3d-hierarchy-action camera3d-entity-action" aria-label={`Duplicate ${entity.name}`} title={`Duplicate ${entity.name}`} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onDuplicateEntity?.(entity.id) }}><Copy size={11}/></button>
          <button type="button" className="camera3d-hierarchy-action camera3d-entity-action camera3d-location-lock-button" aria-label={lockLabel} aria-pressed={Boolean(entity.locks?.all)} title={lockLabel} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onEntityAllLock?.(entity.id) }}>{entity.locks?.all ? <Lock size={11}/> : <Unlock size={11}/>}</button>
          {props.onDeleteEntity && <button type="button" className="camera3d-hierarchy-action camera3d-entity-action" aria-label={`Delete ${entity.name}`} title={`Delete ${entity.name}`} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onDeleteEntity?.(entity.id) }}><Trash2 size={11}/></button>}
        </div>
      </div>
    }
    const object = objects.get(id)
    if (object) return <button key={id} type="button" className="camera3d-entity-row is-object" role="treeitem" data-tree-depth={depth} style={{ paddingLeft: `${8 + depth * 14}px` }} onClick={() => props.onObject?.(id)}><Box size={12}/><span style={{ background: '#8d78d6' }}/>{object.name}</button>
    return null
  }
  return <div className="camera3d-hierarchy-roots">{roots.map((id) => {
    const shot = document.shots.find((item) => item.id === id)
    if (!shot) return renderNode(id, 0, new Set())
    const camera = cameraEntityForShot(document, shot.id)
    if (!camera) return null
    const cameraSelected = props.selectedIds.includes(camera.id)
    const cameraAllLocked = Boolean(camera.locks?.all)
    return <div key={id} data-shot-id={shot.id} data-camera-entity-id={camera.id} data-entity-kind="camera" data-tree-depth={0} data-root-kind="shot-camera" draggable className={`camera3d-shot-row ${cameraSelected ? 'is-active' : ''} ${dragged === shot.id ? 'is-reorder-placeholder' : ''}`} role="treeitem" aria-selected={cameraSelected}
      onDragStart={() => setDragged(shot.id)}
      onDragOver={(event) => { event.preventDefault(); if (!dragged || dragged === shot.id) return; const root=event.currentTarget.parentElement; const below = event.clientY > event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2; setShotOrder((current) => { const next = current.filter((item) => item !== dragged); const target = next.indexOf(shot.id); next.splice(target + (below ? 1 : 0), 0, dragged); requestAnimationFrame(() => root?.querySelectorAll<HTMLElement>('.camera3d-shot-row').forEach((row) => row.animate([{ transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 170, easing: 'cubic-bezier(.2,.75,.25,1)' }))); return next }) }}
      onDrop={(event) => { event.preventDefault(); if (!dragged) return; const at = shotOrder.indexOf(dragged); props.onReorderShot?.(dragged, shotOrder[at + 1] || null); setDragged(null) }} onDragEnd={() => setDragged(null)}>
      <button type="button" className="camera3d-shot-select" onClick={(event) => { event.stopPropagation(); props.onEntity(camera.id, { shiftKey: event.shiftKey, metaKey: event.metaKey, ctrlKey: event.ctrlKey }); props.onShot(shot.id) }}><Camera size={13}/><span>{camera.name || 'Camera'} · {shot.name}</span></button>
      <div className="camera3d-hierarchy-actions camera3d-shot-actions" role="group" aria-label={`${shot.name} actions`}>
        {props.onBoundaryChange && (() => { const boundaryIsContinue = shot.boundary === 'continue'; const label = `${boundaryIsContinue ? 'Continue' : 'Cut'} boundary for ${shot.name}; click to switch to ${boundaryIsContinue ? 'Cut' : 'Continue'}`; return <button type="button" className="camera3d-hierarchy-action camera3d-shot-action camera3d-boundary-toggle" aria-label={label} aria-pressed={boundaryIsContinue} title={label} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onBoundaryChange?.(shot.id, boundaryIsContinue ? 'cut' : 'continue') }}>{boundaryIsContinue ? <Link2 size={11}/> : <Scissors size={11}/>}</button> })()}
        {props.onDuplicateShot && <button type="button" className="camera3d-hierarchy-action camera3d-shot-action" aria-label={`Duplicate ${shot.name}`} title={`Duplicate ${shot.name}`} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onDuplicateShot?.(shot.id) }}><Copy size={11}/></button>}
        <button type="button" className="camera3d-hierarchy-action camera3d-shot-action camera3d-location-lock-button" aria-label={cameraAllLocked ? 'Unlock All' : 'Lock All'} aria-pressed={cameraAllLocked} title={cameraAllLocked ? 'Unlock All' : 'Lock All'} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onEntityAllLock ? props.onEntityAllLock(camera.id) : props.onAllLock(shot.id) }}>{cameraAllLocked ? <Lock size={11}/> : <Unlock size={11}/>}</button>
        {props.onDeleteShot && <button type="button" className="camera3d-hierarchy-action camera3d-shot-action" aria-label={`Delete ${shot.name}`} title={`Delete ${shot.name}`} onPointerDown={(event) => event.stopPropagation()} onDragStart={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.onDeleteShot?.(shot.id) }}><Trash2 size={11}/></button>}
      </div>
    </div>
  })}</div>
}
