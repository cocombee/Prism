import { memo, useContext, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { NodeResizer, Position, type NodeProps } from '@xyflow/react'
import { ArrowDown, ArrowUp, AudioLines, Bot, ChevronDown, Clapperboard, Clock3, Copy, Frame, Image as ImageIcon, Link2, List, Lock, MessageCircle, Play, Plus, Route, StickyNote, Trash2, Unlock, Video, Volume2, WandSparkles } from 'lucide-react'
import type { StudioNode } from '../../shared/types'
import { fallbackAssetTag, FluidControlGroup, FooterSaveAction, GroupedMenuSelect, hasMaterializedAsset, NodeRuntimeContext, type FluidGroupControl } from './NodeCardNext'
import { curatedAssistantModels, type AssistantProvider } from '../../shared/assistantModels'
import { formatDurationSeconds } from '../../shared/videoModels'
import { NodePort } from './NodePort'
import { nodeInputPorts } from '../../shared/nodePorts'
import { TaggedPromptTextarea } from './TaggedPromptTextarea'
import { measuredFloatingMenuWidth, selectorTriggerFontSize, useContinuousAnchor } from './useContinuousAnchor'

import { normalizedStoryboardTransition } from '../../shared/storyboardSequence'
import { reconcileStoryboardDurationBudget, STORYBOARD_DURATION_FALLBACK_OPTIONS } from '../../shared/storyboardDurationBudget'
import { storyboardTriggerMenuKeyAction } from '../../shared/storyboardMenuInteraction'
import { nodeNotificationCategory } from '../../shared/nodeNotificationCategory'
import { ASSISTANT_PROVIDER_GROUPS, assistantCatalogsWithSavedSelection, assistantModelGroups, resolveAssistantSelection, type AssistantCatalogs } from '../../shared/assistantProviderSelection'
import { filterAndRankSelectorOptions, selectorSearchKeyAction, setSelectorPortalOpen } from '../../shared/selectorSearch'
import { appendStoryboardPanel, canAppendStoryboardPanel, migrateStoryboardPanelDuration, removeStoryboardPanel, STORYBOARD_MAX_PANELS } from '../../shared/storyboardPanels'
import { editStoryboardOriginal, migrateStoryboardPromptVersions, selectStoryboardPromptVersion, selectedStoryboardPrompt } from '../../shared/storyboardPromptVersions'
import { APP_ICONS } from './iconSystem'

function UtilityNodeActions({ id, locked = false }: { id: string; locked?: boolean }) {
  const runtime = useContext(NodeRuntimeContext)
  return <div className="node-hover-toolbar utility-node-toolbar nodrag">
    <button data-tooltip="Connect" aria-label="Connect Node" onClick={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY)}><Link2 size={13} /></button>
    <button data-tooltip="Duplicate [⌘D]" aria-label="Duplicate Node" aria-keyshortcuts="Meta+D" onClick={() => runtime?.duplicateNode(id)}><Copy size={13} /></button>
    <button data-tooltip={locked ? 'Unlock Position' : 'Lock Position'} aria-label={locked ? 'Unlock Node Position' : 'Lock Node Position'} aria-pressed={locked} onClick={() => runtime?.updateNode(id, { locked: !locked })}>{locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
    <button data-tooltip="Delete [⌫]" aria-label="Delete Node" aria-keyshortcuts="Backspace Delete" onClick={() => runtime?.deleteNode(id)}><Trash2 size={13} /></button>
  </div>
}

export const FrameNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  return (
    <section className={`canvas-frame ${selected ? 'is-selected' : ''}`}>
      <NodeResizer
        minWidth={280}
        minHeight={220}
        isVisible={selected}
        color="#8870e8"
        handleClassName="frame-corner-resize"
        lineClassName="frame-edge-outline"
      />
      <label className="frame-label"><Frame size={13} /><input className="nodrag" value={data.title || 'Frame'} onChange={(event) => runtime?.updateNode(id, { title: event.target.value })} /></label>
    </section>
  )
})

FrameNode.displayName = 'FrameNode'

export const CommentNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  return (
    <article className={`canvas-comment ${selected ? 'is-selected' : ''}`}>
      <header><MessageCircle size={14} /><span>Comment</span></header>
      <textarea className="nodrag" value={data.note || ''} placeholder="Leave a note for this workflow…" onChange={(event) => runtime?.updateNode(id, { note: event.target.value })} />
    </article>
  )
})

CommentNode.displayName = 'CommentNode'

export const StickyNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  return (
    <article className={`canvas-sticky ${selected ? 'is-selected' : ''}`}>
      <header><StickyNote size={14} /><span>Sticky note</span></header>
      <textarea className="nodrag" value={data.note || ''} placeholder="Pin an idea to the canvas…" onChange={(event) => runtime?.updateNode(id, { note: event.target.value })} />
    </article>
  )
})

StickyNode.displayName = 'StickyNode'

export const StickerNode = memo(({ data, selected }: NodeProps<StudioNode>) => (
  <div className={`canvas-sticker ${selected ? 'is-selected' : ''}`} aria-label="Sticker">{data.sticker || '✦'}</div>
))

StickerNode.displayName = 'StickerNode'

export const DrawingNode = memo(({ data, selected }: NodeProps<StudioNode>) => (
  <svg className={`canvas-drawing ${selected ? 'is-selected' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Drawing">
    <path d={data.drawingPath || ''} vectorEffect="non-scaling-stroke" />
  </svg>
))

DrawingNode.displayName = 'DrawingNode'

export const ListNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  const items = (data.listItems || []).filter((item) => item.type !== 'text')
  const batch = runtime?.listBatchState(id)
  const changeItems = (next: typeof items) => runtime?.updateNode(id, { listItems: next })
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    changeItems(next)
  }
  const addLabel = batch?.adjustable ? 'Add Output' : 'Add Media'
  const addDisabled = Boolean(batch?.adjustable && batch.quantity !== undefined && batch.maxQuantity !== undefined && batch.quantity >= batch.maxQuantity)
  const addItem = () => batch?.adjustable ? runtime?.adjustListBatchQuantity(id, 1) : runtime?.importAsset(id)
  const MediaIcon = batch?.signal === 'video' ? Video : batch?.signal === 'audio' ? AudioLines : ImageIcon
  return (
    <article className={`canvas-list utility-actions-host ${selected ? 'is-selected' : ''}`}>
      <UtilityNodeActions id={id} locked={data.locked} />
      <header><span className="node-icon"><List size={15} /></span><div><strong>List</strong><small>{items.length} item{items.length === 1 ? '' : 's'} · {batch?.signal ? `${batch.signal[0].toUpperCase()}${batch.signal.slice(1)} Batch` : 'Media Batch'}</small></div></header>
      <div className="list-items">
        {items.map((item, index) => (
          <div className="list-item nodrag" key={item.id}>
            <span>{index + 1}</span>
            {item.asset ? item.type === 'video' ? <video src={item.asset.url} preload="metadata" playsInline /> : item.type === 'audio' ? <div className="list-audio"><Volume2 size={14} /><audio src={item.asset.url} controls preload="metadata" /></div> : <img src={item.asset.url} alt={item.asset.name || 'List media'} loading="lazy" decoding="async" />
              : <div className={`list-pending is-${item.status || 'pending'}`}>{item.type === 'video' ? <Video size={20} /> : item.type === 'audio' ? <AudioLines size={20} /> : <ImageIcon size={20} />}<strong>Output {index + 1}</strong><small>{item.status === 'generating' ? 'Generating' : item.status === 'failed' ? 'Failed' : 'Pending'}</small></div>}
            {item.sourceNodeId ? !item.asset && batch?.adjustable && (batch.quantity || 1) > 1 && item.sourceResultIndex === (batch.quantity || 1) - 1 && <div className="list-item-actions"><button data-tooltip="Remove Output" aria-label={`Remove Output ${index + 1}`} onClick={() => runtime?.adjustListBatchQuantity(id, -1)}><Trash2 size={11} /></button></div>
              : <div className="list-item-actions"><button data-tooltip="Move Item Up" aria-label={`Move Item ${index + 1} Up`} onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={11} /></button><button data-tooltip="Move Item Down" aria-label={`Move Item ${index + 1} Down`} onClick={() => move(index, 1)} disabled={index === items.length - 1}><ArrowDown size={11} /></button><button data-tooltip="Delete Item" aria-label={`Delete Item ${index + 1}`} onClick={() => changeItems(items.filter((candidate) => candidate.id !== item.id))}><Trash2 size={11} /></button></div>}
          </div>
        ))}
        <button className="list-add-item nodrag" aria-label={addLabel} disabled={addDisabled} data-tooltip={addDisabled ? `This generator supports up to ${batch?.maxQuantity} outputs.` : undefined} onClick={addItem}>{items.length ? <Plus size={16} /> : <MediaIcon size={24} />}<span>{addLabel}</span>{!items.length && <small>{batch?.adjustable ? 'Increase the connected generator quantity' : 'Import image, video, or audio'}</small>}</button>
      </div>
      <footer className="nodrag">
        <span>{batch?.adjustable ? `Synced with ${batch.sourceTitle || 'generator'} · x${batch.quantity}` : batch?.sourceCount ? `${batch.sourceCount} generator batches` : `${items.length} media item${items.length === 1 ? '' : 's'}`}</span>
      </footer>
      <NodePort id="input" type="target" signal="mixed" label="Add To List" position={Position.Left} style={{ top: '50%' }} onRoute={(event) => runtime?.openInputQuickConnect(id, 'input', event.clientX, event.clientY)} />
      <NodePort id="mixed-out" type="source" signal={data.listSignal || 'mixed'} label={`${data.listSignal && data.listSignal !== 'mixed' ? `${data.listSignal[0].toUpperCase()}${data.listSignal.slice(1)} ` : ''}List Output`} position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'mixed-out')} />
    </article>
  )
})

ListNode.displayName = 'ListNode'

export const RouterNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  return (
  <div className={`canvas-router utility-actions-host ${selected ? 'is-selected' : ''}`}>
    <UtilityNodeActions id={id} locked={data.locked} />
    <NodePort id="input" type="target" signal="mixed" label="Any Supported Input" position={Position.Left} onRoute={(event) => runtime?.openInputQuickConnect(id, 'input', event.clientX, event.clientY)} />
    <Route size={15} /><span><strong>{data.title || 'Router'}</strong><small>{data.routeSignal && data.routeSignal !== 'mixed' ? `${data.routeSignal[0].toUpperCase()}${data.routeSignal.slice(1)} route` : 'Any route'}</small></span>
    <NodePort id="output" type="source" signal={data.routeSignal || 'mixed'} label={`${data.routeSignal && data.routeSignal !== 'mixed' ? `${data.routeSignal[0].toUpperCase()}${data.routeSignal.slice(1)} ` : ''}Routed Output`} position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'output')} />
  </div>
  )
})

RouterNode.displayName = 'RouterNode'

export { CAMERA_MOVEMENT_GROUPS, STORYBOARD_SHOT_SIZE_OPTIONS, StoryboardCompactSelect, durationChoices } from './StoryboardSharedControls'
import { CAMERA_MOVEMENT_GROUPS, STORYBOARD_SHOT_SIZE_OPTIONS, StoryboardCompactSelect, cameraMovementHelp, cameraMovementName, type StoryboardMenuOption } from './StoryboardSharedControls'

export const StoryboardNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  const gridRef = useRef<HTMLDivElement>(null)
  const pendingPanelFocus = useRef<string | null>(null)
  const storedPanels = (data.storyboardPanels || []).map(migrateStoryboardPromptVersions).map(migrateStoryboardPanelDuration)
  const connectedVideo = runtime?.connectedStoryboardVideo(id)
  const panelLimit = STORYBOARD_MAX_PANELS
  const modelDurationOptions = connectedVideo?.durationOptions.length ? connectedVideo.durationOptions : [...STORYBOARD_DURATION_FALLBACK_OPTIONS]
  const durationBudget = reconcileStoryboardDurationBudget({
    panels: storedPanels,
    mode: 'single',
    targetDuration: connectedVideo?.duration,
    modelDurationOptions,
  })
  const panels = storedPanels
  const totalDuration = durationBudget.totalDuration
  const overBudget = durationBudget.overBudget
  const remainingDuration = connectedVideo ? connectedVideo.duration - totalDuration : undefined
  const addPanelAvailable = canAppendStoryboardPanel(panels, remainingDuration)
  const storyboardInputRules = runtime?.connectedInputRules(id) || []
  const storyboardPromptTags = [...new Set(storyboardInputRules.flatMap((rule) => [rule.tag, ...(rule.aliases || [])]))]
  const availableStoryboardPromptTags = runtime?.availablePromptTags(id) || storyboardPromptTags
  const nodeBusy = data.runState === 'queued' || data.runState === 'running'
  const storyboardNotificationCategory = nodeNotificationCategory(data)
  const storyboardStatus = storyboardNotificationCategory === 'error' ? data.error : storyboardNotificationCategory === 'running' || storyboardNotificationCategory === 'transient' ? data.progress : undefined
  const rawAssistantCatalogs = Object.fromEntries(ASSISTANT_PROVIDER_GROUPS.map(({ id: provider }) => [provider, runtime?.availableModels(provider) || []])) as AssistantCatalogs
  const assistantCatalogs = assistantCatalogsWithSavedSelection(rawAssistantCatalogs, data.assistantProvider, data.assistantModelId)
  const groupedAssistantModels = assistantModelGroups(assistantCatalogs)
  const assistantSelection = resolveAssistantSelection(data.assistantProvider, data.assistantModelId, assistantCatalogs)
  const assistantModelValue = assistantSelection ? `${assistantSelection.provider}::${assistantSelection.model}` : ''
  const assistantDefaultLabel = groupedAssistantModels.flatMap((group) => group.options).find((option) => option.value === assistantModelValue)?.label || 'Model'
  const changePanels = (nextPanels: typeof panels) => runtime?.updateNode(id, {
    storyboardPanels: nextPanels,
    storyboardPanelCount: nextPanels.length,
    storyboardNeedsCompile: Boolean(data.outputPath || data.outputUrl),
  })
  const addPanel = () => {
    if (!addPanelAvailable) return
    const result = appendStoryboardPanel(panels)
    if (!result.added) return
    pendingPanelFocus.current = result.focusPanelId || null
    changePanels(result.panels)
  }
  const removePanel = (panelId: string) => {
    const result = removeStoryboardPanel(panels, panelId)
    if (result.panels === panels) return
    pendingPanelFocus.current = result.focusPanelId || null
    changePanels(result.panels)
  }
  const patchPanel = (panelId: string, patch: Partial<(typeof panels)[number]>) => changePanels(panels.map((panel) => panel.id === panelId ? { ...panel, ...patch } : panel))
  useEffect(() => {
    const panelId = pendingPanelFocus.current
    if (!panelId) return
    const prompt = gridRef.current?.querySelector<HTMLElement>(`[data-panel-id="${panelId}"] textarea`)
    if (!prompt) return
    pendingPanelFocus.current = null
    prompt.scrollIntoView({ block: 'nearest' })
    prompt.focus()
  }, [panels.length])
  const commonPorts = <>
    {nodeInputPorts(data).map((port) => <NodePort
      key={port.id}
      id={port.id}
      type="target"
      signal={port.signal}
      label={port.label}
      icon={port.icon}
      position={Position.Left}
      style={{ top: port.top }}
      onRoute={(event) => runtime?.openInputQuickConnect(id, port.id, event.clientX, event.clientY)}
    />)}
    <NodePort id="storyboard-out" type="source" signal="storyboard" label="Storyboard Output" position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'storyboard-out')} />
  </>
  return (
    <article className={`storyboard-node utility-actions-host ${selected ? 'is-selected' : ''} ${nodeBusy ? 'is-generating' : ''}`} aria-busy={nodeBusy || undefined} aria-label={`Storyboard panel editor, ${panels.length} panels`}>
      <UtilityNodeActions id={id} locked={data.locked} />
      <header>
        <span><Clapperboard size={16} /></span><div><strong>{data.title || 'Storyboard'}</strong><small>{panels.length} panels · panel editor</small></div>
      </header>
      <div ref={gridRef} className="storyboard-grid nodrag nowheel" role="region" aria-label={`Storyboard panels, ${panels.length} panels`} onWheelCapture={(event) => event.stopPropagation()}>
        <span className="storyboard-visually-hidden" aria-live="polite">{panels.length} panels</span>
        {panels.map((panel, index) => {
          const hasTransitionActions = index < panels.length - 1
          const transition = normalizedStoryboardTransition(panel.transitionToNext, index, panels.length)
          const transitionDisabled = Boolean(panel.locked)
          const selectedPromptVersion = panel.selectedPromptVersion || 'original'
          const activePrompt = selectedStoryboardPrompt(panel)
          const panelBudget = durationBudget.budgets[index]
          const positiveDurationOptions: StoryboardMenuOption[] = panelBudget.options.map((option) => ({ value: String(option.value), label: option.label, disabled: option.disabled, disabledReason: option.disabledReason }))
          const panelDurationOptions: StoryboardMenuOption[] = positiveDurationOptions
          const durationDescription = panelBudget.description
          const durationAriaLabel = `Panel ${index + 1} duration, ${panelBudget.effectiveDuration.toFixed(1)} seconds.`
          return (
          <section className={`storyboard-panel ${panel.locked ? 'is-locked' : ''}`} data-panel-id={panel.id} key={panel.id}>
            <div className="storyboard-panel-head"><b>{String(index + 1).padStart(2, '0')}</b><div role="group" aria-label={`Panel ${index + 1} prompt version`}>
              <button type="button" data-tooltip="Show original prompt" aria-label="Show original prompt" aria-pressed={selectedPromptVersion === 'original'} onClick={() => runtime?.updateNode(id, { storyboardPanels: panels.map((candidate) => candidate.id === panel.id ? selectStoryboardPromptVersion(candidate, 'original') : candidate) })}><APP_ICONS.projectDocument size={10} /></button>
              <button type="button" data-tooltip={panel.revampedPrompt ? 'Show revamped prompt' : 'Revamp this panel to create a revamped prompt.'} aria-label="Show revamped prompt" aria-pressed={selectedPromptVersion === 'revamped'} disabled={!panel.revampedPrompt} onClick={() => runtime?.updateNode(id, { storyboardPanels: panels.map((candidate) => candidate.id === panel.id ? selectStoryboardPromptVersion(candidate, 'revamped') : candidate) })}><WandSparkles size={10} /></button>
              <button type="button" data-tooltip={panel.locked ? 'Unlock panel' : 'Lock panel'} aria-label={panel.locked ? 'Unlock panel' : 'Lock panel'} aria-pressed={Boolean(panel.locked)} onClick={() => patchPanel(panel.id, { locked: !panel.locked })}>{panel.locked ? <Lock size={10} /> : <Unlock size={10} />}</button>
              <button type="button" data-tooltip={panels.length <= 2 ? 'A storyboard needs at least two panels' : 'Delete panel'} aria-label="Delete panel" disabled={panels.length <= 2} onClick={() => removePanel(panel.id)}><Trash2 size={10} /></button>
            </div></div>
            <div className="storyboard-panel-compose">
              <div className="storyboard-prompt-field">
                <TaggedPromptTextarea value={activePrompt} connectedTags={storyboardPromptTags} availableTags={availableStoryboardPromptTags} disabled={panel.locked || selectedPromptVersion === 'revamped'} placeholder="Describe this shot…" onValueChange={(prompt) => { changePanels(panels.map((candidate) => candidate.id === panel.id ? editStoryboardOriginal(candidate, prompt) : candidate)); runtime?.connectPromptTags(id, prompt, activePrompt) }} />
                <div className="storyboard-control-reveal-zone">
                  <div className="storyboard-prompt-actions">
                    {hasTransitionActions && <div className="storyboard-transition-choice" role="radiogroup" aria-label={`Transition after panel ${index + 1}`}>
                      <button type="button" className={`storyboard-transition-option ${transition === 'hard-cut' ? 'is-active' : ''}`} role="radio" aria-checked={transition === 'hard-cut'} aria-label="Hard Cut to next panel" title="Hard Cut to next panel" disabled={transitionDisabled} onPointerDown={(event) => event.stopPropagation()} onClick={() => patchPanel(panel.id, { transitionToNext: 'hard-cut' })}>Cut</button>
                      <button type="button" className={`storyboard-transition-option ${transition === 'continue' ? 'is-active' : ''}`} role="radio" aria-checked={transition === 'continue'} aria-label="Continue camera into next panel" title="Continue camera into next panel as the same unbroken shot" disabled={transitionDisabled} onPointerDown={(event) => event.stopPropagation()} onClick={() => patchPanel(panel.id, { transitionToNext: 'continue' })}>Continue</button>
                    </div>}
                    <button className="storyboard-shot-action" aria-label="Revamp Shot" title={panel.locked ? 'Unlock this panel before revamping it' : !activePrompt.trim() ? 'Describe this shot before revamping it' : 'Revamp sends a paid AI text request to the selected provider.'} disabled={nodeBusy || panel.locked || !activePrompt.trim()} onPointerDown={(event) => event.stopPropagation()} onClick={() => runtime?.rewriteStoryboardPanel(id, panel.id)}><WandSparkles size={11} /></button>
                  </div>
                </div>
              </div>
              <FluidControlGroup
                className="storyboard-panel-meta"
                ariaLabel={`Panel ${index + 1} controls`}
                gap={5}
                allocation={{ minRows: 1, maxRows: 1 }}
                recalculationKey={`${panel.id}:${panel.shotSize || 'wide'}:${panelBudget.effectiveDuration}:${panel.camera || 'static'}:${panel.locked}`}
                controls={([
                  { id: 'shot-size', kind: 'selector', intrinsicWidth: 48, node: <StoryboardCompactSelect label="Shot Size" value={!panel.shotSize || panel.shotSize === 'auto' ? 'wide' : panel.shotSize} disabled={panel.locked} options={[...STORYBOARD_SHOT_SIZE_OPTIONS]} onChange={(value) => patchPanel(panel.id, { shotSize: value as typeof panel.shotSize })} /> },
                  { id: 'duration', kind: 'selector', intrinsicWidth: 34, node: <StoryboardCompactSelect label="Duration" value={String(panelBudget.effectiveDuration)} disabled={panel.locked} exhausted={panelBudget.exhausted} description={durationDescription} triggerAriaLabel={durationAriaLabel} options={panelDurationOptions} onChange={(value) => patchPanel(panel.id, { duration: Number(value) })} /> },
                  { id: 'camera', kind: 'selector', intrinsicWidth: 54, node: <StoryboardCompactSelect label="Camera Movement" value={!panel.camera || panel.camera === 'auto' ? 'static' : panel.camera} disabled={panel.locked} options={CAMERA_MOVEMENT_GROUPS.flatMap((group) => group.options.map(([value, help]) => ({ value, label: cameraMovementName(value), group: group.label, title: help })))} onChange={(value) => patchPanel(panel.id, { camera: value })} /> },
                ]) as FluidGroupControl<'shot-size' | 'duration' | 'camera'>[]}
              />
            </div>
          </section>
          )
        })}
        {panels.length < panelLimit && <button className="storyboard-add-panels" disabled={!addPanelAvailable} title={!addPanelAvailable ? 'No sequence time remains. Reduce an earlier panel or increase Video duration.' : undefined} onClick={addPanel}><Plus size={13} />Add Panel</button>}
      </div>
      {connectedVideo && overBudget && durationBudget.helper && <div className="storyboard-feedback-row storyboard-duration-helper is-overflow" role="status" aria-live="polite">{durationBudget.helper.text}</div>}
      <footer className="storyboard-footer nodrag">
        <FluidControlGroup
          className="storyboard-footer-group"
          ariaLabel="Storyboard Footer Controls"
          gap={6}
          allocation={{ minRows: 1, maxRows: 1, firstId: 'assistant-model' }}
          recalculationKey={`${connectedVideo?.duration ?? 'disconnected'}:${panels.length}:${assistantDefaultLabel}`}
          controls={([
            { id: 'assistant-model', kind: 'selector', defaultLabel: assistantDefaultLabel, fullLabel: assistantDefaultLabel, compactLabel: assistantDefaultLabel, intrinsicWidth: 80, minimumWidth: 70, shrinkPriority: 'model', node: <GroupedMenuSelect ariaLabel="Storyboard AI model" title="Revamp sends a paid AI text request to the selected provider." defaultLabel={assistantDefaultLabel} compactLabel={assistantDefaultLabel} fillTrack disabled={!assistantSelection} value={assistantModelValue} groups={groupedAssistantModels} onChange={(selection) => { const [provider, ...modelParts] = selection.split('::'); runtime?.updateNode(id, { assistantProvider: provider as AssistantProvider, assistantModelId: modelParts.join('::'), error: undefined }) }} /> },
            connectedVideo ? { id: 'budget', kind: 'bounded-elastic', intrinsicWidth: 68, maximumExtraWidth: 12, shortCharacterWidth: 6, node: <div className={`storyboard-budget ${overBudget ? 'is-over' : ''}`} role="status" aria-label={overBudget ? `Storyboard timing overflow, ${totalDuration.toFixed(1)} seconds used of ${connectedVideo.duration.toFixed(1)} seconds available` : `Storyboard timing, ${totalDuration.toFixed(1)} seconds used of ${connectedVideo.duration.toFixed(1)} seconds available`}><span style={{ width: `${Math.min(100, (totalDuration / Math.max(0.5, connectedVideo.duration)) * 100)}%` }} /><strong>{totalDuration.toFixed(1)} / {formatDurationSeconds(connectedVideo.duration)}</strong></div> } : null,
            { id: 'save', kind: 'fixed-action', intrinsicWidth: 28, node: <FooterSaveAction className="storyboard-save" ariaLabel="Save Storyboard" tooltip="Save Storyboard" disabled={nodeBusy} onSave={() => runtime?.saveStoryboard(id)} /> },
            { id: 'revamp', kind: 'intrinsic', intrinsicWidth: 62, node: <button className="storyboard-revamp-all" data-tooltip="Revamp sends a paid AI text request to the selected provider." aria-label="Revamp All" disabled={nodeBusy} onClick={() => runtime?.rewriteStoryboardPanel(id)}><WandSparkles size={12} />All</button> },
          ].filter(Boolean)) as FluidGroupControl<'budget' | 'assistant-model' | 'save' | 'revamp'>[]}
        />
      </footer>
      {storyboardStatus && <div className={`node-lifecycle-row storyboard-status is-${storyboardNotificationCategory} ${storyboardNotificationCategory === 'running' ? 'is-running' : ''}`} role={storyboardNotificationCategory === 'error' ? 'alert' : 'status'} aria-live={storyboardNotificationCategory === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{storyboardStatus}</div>}
      {commonPorts}
    </article>
  )
})

StoryboardNode.displayName = 'StoryboardNode'

export const StoryboardAssetNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  const panels = data.storyboardPanels || []
  const assetTag = data.referenceTag || fallbackAssetTag(data, 'Storyboard')
  return <article className={`storyboard-asset-node utility-actions-host ${selected ? 'is-selected' : ''}`}>
    <UtilityNodeActions id={id} locked={data.locked} />
    {hasMaterializedAsset(data) && <label className="node-asset-tag nodrag" title="Rename @ Asset Tag"><span>@</span><input aria-label="Asset Tag" value={assetTag.slice(1)} onChange={(event) => runtime?.updateNode(id, { referenceTag: `@${event.target.value.replace(/^@+/, '').replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').toLowerCase()}` })} /></label>}
    <header><span className="node-icon"><Clapperboard size={15} /></span><div><strong>Storyboard</strong><small>{panels.length} panels · single image</small></div></header>
    <div className="storyboard-asset-stage">{data.outputUrl ? <img src={data.outputUrl} alt="Compiled Storyboard" /> : <span><ImageIcon size={24} strokeWidth={1} /><small>Legacy Storyboard preview unavailable</small></span>}</div>
    <footer><strong>Ready for Video Generator</strong></footer>
    <NodePort id="storyboard-in" type="target" signal="storyboard" label="Storyboard" position={Position.Left} onRoute={(event) => runtime?.openInputQuickConnect(id, 'storyboard-in', event.clientX, event.clientY)} />
    <NodePort id="storyboard-out" type="source" signal="storyboard" label="Deploy To Video Generator" position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'storyboard-out')} />
  </article>
})

StoryboardAssetNode.displayName = 'StoryboardAssetNode'

export const AssistantNode = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const runtime = useContext(NodeRuntimeContext)
  const assistantCatalogs = Object.fromEntries(ASSISTANT_PROVIDER_GROUPS.map(({ id: provider }) => [provider, curatedAssistantModels(provider, runtime?.availableModels(provider) || [])])) as AssistantCatalogs
  const modelGroups = assistantModelGroups(assistantCatalogs)
  const selection = resolveAssistantSelection(data.assistantProvider, data.assistantModelId, assistantCatalogs)
  const provider = selection?.provider || 'omniroute'
  const selectedModel = selection?.model || ''
  const models = assistantCatalogs[provider] || []
  const account = runtime?.providerAccount(provider)
  const blocked = Boolean(account && ['credit-required', 'temporarily-limited', 'unavailable'].includes(account.state))
  const assistantBusy = data.runState === 'queued' || data.runState === 'running'
  const assistantNotificationCategory = nodeNotificationCategory(data)
  const assistantStatus = assistantNotificationCategory === 'error' ? data.error : assistantNotificationCategory === 'running' || assistantNotificationCategory === 'transient' ? data.progress : undefined
  return <article className={`assistant-node ${selected ? 'is-selected' : ''} ${blocked ? 'is-access-blocked' : ''}`} title={blocked ? account?.message : undefined} aria-busy={assistantBusy || undefined}>
    <header><Bot size={15} /><div><strong>{data.title || 'Assistant'}</strong><small>Prompt revamp</small></div></header>
    <div className="assistant-model-row nodrag">
      <GroupedMenuSelect ariaLabel="Assistant AI model" title={blocked ? account?.message : 'AI model used for prompt enhancement'} disabled={!modelGroups.some((group) => group.options.length) || blocked} value={`${provider}::${selectedModel}`} groups={modelGroups} onChange={(selection) => { const [nextProvider, ...modelParts] = selection.split('::'); runtime?.updateNode(id, { assistantProvider: nextProvider as AssistantProvider, assistantModelId: modelParts.join('::') }) }} />
    </div>
    <textarea className="assistant-input nodrag" value={data.prompt || ''} placeholder="Write or connect a prompt…" onChange={(event) => runtime?.updateNode(id, { prompt: event.target.value })} />
    <div className="assistant-output nodrag">{data.assistantOutput ? <textarea value={data.assistantOutput} onChange={(event) => runtime?.updateNode(id, { assistantOutput: event.target.value })} /> : <span>Revamped prompt appears here</span>}</div>
    <footer className="nodrag"><small>{blocked ? account?.message : models.length ? `${models.length} accessible model${models.length === 1 ? '' : 's'}` : 'No accessible models loaded'}</small><button disabled={assistantBusy || blocked || !selectedModel || !(data.prompt || '').trim()} onClick={() => runtime?.runAssistantNode(id)}><Play size={11} />Revamp</button></footer>
    {assistantStatus && <div className={`node-lifecycle-row assistant-status is-${assistantNotificationCategory}`} role={assistantNotificationCategory === 'error' ? 'alert' : 'status'} aria-live={assistantNotificationCategory === 'error' ? 'assertive' : 'polite'} aria-atomic="true">{assistantStatus}</div>}
    <NodePort id="attachments" type="target" signal="image" label="Reference Attachment" position={Position.Left} style={{ top: 75 }} onRoute={(event) => runtime?.openInputQuickConnect(id, 'attachments', event.clientX, event.clientY)} />
    <NodePort id="prompt" type="target" signal="text" label="Prompt" position={Position.Left} style={{ top: 112 }} onRoute={(event) => runtime?.openInputQuickConnect(id, 'prompt', event.clientX, event.clientY)} />
    <NodePort id="generated_prompt" type="source" signal="text" label="Enhanced Prompt" position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'generated_prompt')} />
  </article>
})

AssistantNode.displayName = 'AssistantNode'
