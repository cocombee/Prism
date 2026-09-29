import { createContext, memo, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Position, type NodeProps } from '@xyflow/react'
import { GeneratedMediaOverlay } from './GeneratedMediaOverlay'
export { GeneratedMediaOverlay } from './GeneratedMediaOverlay'
import { measuredFloatingMenuWidth, selectorTriggerFontSize, useContinuousAnchor } from './useContinuousAnchor'
import { generationActionState, useGenerationTimeLeft } from './runPresentation'
import {
  ArrowUpRight,
  Box,
  Clapperboard,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderOpen,
  Image as ImageIcon,
  Heart,
  Images,
  LoaderCircle,
  LayoutGrid,
  Layers3,
  Lock,
  Link2,
  Mic2,
  Music2,
  AudioLines,
  Minus,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Maximize2,
  Mountain,
  MessageSquareText,
  PencilLine,
  Play,
  RefreshCcw,
  Save,
  Search,
  Shirt,
  SkipBack,
  SkipForward,
  Upload,
  Unlock,
  UserRound,
  Video,
  Volume2,
} from 'lucide-react'
import type { CharacterView, ElementView, GenerationCostEstimate, ImportedAsset, SemanticAssetAvailability, ServiceAccountStatus, ServiceProvider, StudioNode, StudioNodeData } from '../../shared/types'
import { curatedAssistantModels, type AssistantProvider } from '../../shared/assistantModels'
import { closedVideoModelLabel, defaultVideoRatio, formatDurationSeconds, knownOutputFrameRate, motionCadenceOptions, normalizedMotionCadence, resolvedVideoRatio, resolveVideoModel, videoModelDurationInventory, VIDEO_MODELS, VIDEO_MODEL_MENU_SECTIONS } from '../../shared/videoModels'
import { normalizedGeneratorDurationPatch } from '../../shared/storyboardVideoSync'
import { generationServiceProvider } from '../../shared/generationServiceProvider'
import { SAVE_SUCCESS_TRANSIENT_MS, type FooterSavePhase } from '../../shared/footerSaveLifecycle'
import { activeControlDescriptors, allocateMixedControlRows, controlDescriptorSignature, controlGroupWidthChanged, deterministicSafeControlRows, layoutSignature, rowMembershipKey, validateControlLayout, validatePaintedControlLayout, type AllocatedMixedControlRow, type FluidControlKind, type FluidControlPreferredZone, type MixedControlAllocationOptions, type VideoFooterControlId } from '../../shared/controlGroupLayout'
import { siAlibabacloud, siAnthropic, siBytedance, siDeepseek, siElevenlabs, siFishaudio, siGoogle, siGooglegemini, siKimi, siKuaishou, siMeta } from 'simple-icons'
import { STYLE_PRESETS } from '../../shared/stylePresets'
import { firstPanelAssetName, mediaRenameStem, normalizeLogicalAssetName } from '../../shared/assetNaming'
import { nodeInputPorts } from '../../shared/nodePorts'
import { NodePort } from './NodePort'
import { prioritizeConnectedInputRules, workflowTag, type ConnectedInputRule, type InputFidelity } from '../../shared/inputRules'
import { formatRequirementList } from '../../shared/generationReadiness'
import { outputSignalFor } from '../../shared/nodeConnections'
import { previewFocalPosition } from '../../shared/previewFocus'
import { FAL_IMAGE_MODELS, FAL_REFERENCE_IMAGE_MODELS, imageModelSelectionPatch, imageResolutionOptions } from '../../shared/imageModels'
import { compactProviderError } from '../../shared/providerErrors'
import { nodeNotificationCategory } from '../../shared/nodeNotificationCategory'
import { activeMediaName, generatedResultName } from '../../shared/generatedMedia'
import { ELEVEN_AUDIO_OUTPUT_FORMATS, ELEVEN_V3_BUILT_IN_VOICES, FISH_AUDIO_FORMATS, FISH_MP3_BITRATES, FISH_OPUS_BITRATES, FISH_SAMPLE_RATES, FISH_TTS_MODELS } from '../../shared/providerOptions'
import { ELEVEN_V3_LANGUAGES, normalizedElevenV3LanguageCode } from '../../shared/voiceLanguages'
import { ELEMENT_ANCHOR_VIEW, ELEMENT_VIEWS, missingElementViews } from '../../shared/elementViews'
import { incompleteSemanticReason } from '../../shared/semanticReadiness'
import { localAssetGenerationPrompt } from '../../shared/semanticAssetPromptBoundary'
import { balancedSemanticPreview, characterAssetsForMode, characterSemanticPreview } from '../../shared/semanticAssetCollections'
import { TaggedPromptTextarea } from './TaggedPromptTextarea'
import { modelDisplayName } from '../../shared/modelNames'
import { generatorInputIconFor, NODE_KIND_ICONS } from './iconSystem'
import { isRunnableNodeKind, reusableSelectorItemIsActive } from './rendererBehavior'
import { canvasMediaDragMime, shouldUseIntrinsicAssetRatio, type AssetMediaFamily } from '../../shared/assetInteraction'
import { nextVideoPromptRovingMode, videoPromptRovingTabIndex, type VideoPromptMode } from '../../shared/videoPromptMode'
import { MediaOfflineState, type MediaOfflineVisualState } from './MediaOfflineState'
import { useHorizontalAssetSelector } from './useHorizontalAssetSelector'
import { acceptedAssetBatch, assetBatchDisplayName, removeSavedBatchRow, type AssetBatchInspection, type AssetBatchKind } from '../../shared/assetBatch'
import { filterAndRankSelectorOptions, selectorSearchKeyAction, setSelectorPortalOpen } from '../../shared/selectorSearch'
import { migrateSemanticAssetLifecycleMetadata } from '../../shared/semanticAssetLifecycleMigration'
import { reusableEditorDraft } from '../../shared/reusableEditorDraft'
import { beginSemanticAssetSave, semanticAssetLifecycleReducer, type SemanticAssetLifecycleAction, type SemanticAssetLifecycleState } from '../../shared/semanticAssetLifecycle'
import { SemanticAssetSaveFeedback } from './SemanticAssetSaveFeedback'
import { semanticAssetAvailability } from '../../shared/semanticAssetAvailability'
import characterFrameworkFace from './assets/character-framework/face.png'
import characterFrameworkThreeQuarter from './assets/character-framework/three-quarter.png'
import characterFrameworkProfile from './assets/character-framework/profile.png'
import characterFrameworkFullBody from './assets/character-framework/full-body.png'
import characterFrameworkBack from './assets/character-framework/back.png'
import characterFrameworkSmile from './assets/character-framework/smile.png'
import characterFrameworkLeftThreeQuarter from './assets/character-framework/left-three-quarter.png'
import characterFrameworkSideBody from './assets/character-framework/side-body.png'
import characterFrameworkBackBody from './assets/character-framework/back-body.png'
import elementFrameworkThreeQuarter from './assets/element-framework/three-quarter.png'
import elementFrameworkFront from './assets/element-framework/front.png'
import elementFrameworkSide from './assets/element-framework/side.png'
import elementFrameworkBack from './assets/element-framework/back.png'

export type ModelCompany = 'fal' | 'byteplus' | 'omniroute' | 'openai' | 'google' | 'anthropic' | 'deepseek' | 'moonshot' | 'meta' | 'black-forest-labs' | 'alibaba' | 'bytedance' | 'kuaishou' | 'elevenlabs' | 'fish'
export type GroupedMenuOption = { value: string; label: string; iconPath?: string; provider?: ModelCompany; aspectRatioPreview?: string; aliases?: readonly string[]; disabled?: boolean }
export type GroupedMenuGroup = { label: string; options: GroupedMenuOption[] }

export function GeneratorInputIcon({ id, signal, kind }: { id: string; signal: ReturnType<typeof nodeInputPorts>[number]['signal']; kind: StudioNodeData['kind'] }) {
  const Icon = generatorInputIconFor(id, signal, kind)
  return <Icon size={15} strokeWidth={1.4} />
}

export function generatorInputLabel(id: string, fallback: string): string {
  return ({
    'text-in': 'Add Prompt',
    'storyboard-in': 'Add Storyboard',
    'image-in': fallback.includes('Starting') ? 'Add Start Frame' : 'Add Reference Image',
    'end-image': 'Add End Frame',
    'reference-in': 'Add Reference',
    'character-in': 'Add Character',
    'wardrobe-in': 'Add Wardrobe',
    'element-in': 'Add Element',
    'location-in': 'Add Location',
    'style-in': 'Add Style',
    'video-in': 'Add Source Video',
    'video-reference-in': 'Add Reference Video',
    'audio-reference-in': 'Add Reference Audio',
  } as Record<string, string>)[id] || `Add ${fallback.replace(/\s*\(Optional\)\s*/g, '')}`
}

export function SemanticCreateToggle({ label, onClick, disabled = false }: { label: string; onClick(): void; disabled?: boolean }) {
  return <button type="button" className="style-create-toggle" onClick={onClick} disabled={disabled}><Plus size={12} aria-hidden="true" />{label}</button>
}

function audioFormatLabel(format: string): string {
  const [codec, sampleRate, bitrate] = format.split('_')
  const rate = Number(sampleRate)
  return [codec.toUpperCase(), Number.isFinite(rate) ? `${rate / 1000}k` : sampleRate, bitrate ? `${bitrate}k` : ''].filter(Boolean).join(' · ')
}

const ELEVEN_SPEED_OPTIONS = Array.from({ length: 11 }, (_, index) => {
  const speed = Number((0.7 + index * 0.05).toFixed(2))
  return { value: String(speed), label: `${speed}×` }
})

const FISH_VOLUME_OPTIONS = Array.from({ length: 41 }, (_, index) => {
  const decibels = index - 20
  return { value: String(decibels), label: `${decibels > 0 ? '+' : ''}${decibels} dB` }
})

export const VIDEO_MODEL_MENU_GROUPS: GroupedMenuGroup[] = VIDEO_MODEL_MENU_SECTIONS.map((section) => ({
  label: section === 'wan' ? 'fal.ai · Wan' : section === 'seedance-2.5' ? 'fal.ai · Seedance 2.5' : section === 'seedance-2' ? 'fal.ai · Seedance 2' : section === 'byteplus-seedance-2.5' ? 'BytePlus · Seedance 2.5' : section === 'byteplus-seedance-2' ? 'BytePlus · Seedance 2' : section === 'kling' ? 'fal.ai · Kling' : 'fal.ai · Google Veo',
  options: VIDEO_MODELS.filter((model) => model.menuSection === section).map((model) => ({
    value: model.id,
    label: model.label,
    iconPath: section === 'wan' ? siAlibabacloud.path : section.startsWith('seedance') ? siBytedance.path : section === 'kling' ? siKuaishou.path : siGoogle.path,
  })),
}))

export function modelCompanyFor(value: string, label = ''): ModelCompany | undefined {
  const identity = `${value} ${label}`.toLowerCase()
  if (/flux|black forest/.test(identity)) return 'black-forest-labs'
  if (/nano-banana|gemini|imagen|veo/.test(identity)) return 'google'
  if (/gpt|openai/.test(identity)) return 'openai'
  if (/claude|anthropic/.test(identity)) return 'anthropic'
  if (/deepseek/.test(identity)) return 'deepseek'
  if (/kimi|moonshot/.test(identity)) return 'moonshot'
  if (/llama|meta/.test(identity)) return 'meta'
  if (/seedance|bytedance/.test(identity)) return 'bytedance'
  if (/kling|kuaishou/.test(identity)) return 'kuaishou'
  if (/\bwan\b|alibaba/.test(identity)) return 'alibaba'
  if (/eleven/.test(identity)) return 'elevenlabs'
  if (/fish/.test(identity)) return 'fish'
  return undefined
}

export function GroupedMenuSelect({ value, groups, ariaLabel, ariaDescribedBy, accessibleLabel: requestedAccessibleLabel, title, disabled = false, className = '', menuClassName = '', displayLabel, compactLabel: requestedCompactLabel, defaultLabel: requestedDefaultLabel, fillTrack = false, onChange }: {
  value: string
  groups: GroupedMenuGroup[]
  ariaLabel: string
  ariaDescribedBy?: string
  accessibleLabel?: string
  title?: string
  disabled?: boolean
  className?: string
  menuClassName?: string
  displayLabel?: string
  compactLabel?: string
  defaultLabel?: string
  fillTrack?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeValue, setActiveValue] = useState(value)
  const [position, setPosition] = useState<{ left: number; bottom: number; width: number; fontSize: number } | null>(null)
  const selectorId = useId().replace(/:/g, '')
  const listboxId = `selector-listbox-${selectorId}`
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const preSearchScrollTop = useRef(0)
  const previousSearchQuery = useRef('')
  const selected = groups.flatMap((group) => group.options).find((option) => option.value === value)
  const searchableOptions = groups.flatMap((group) => group.options.map((option) => ({ ...option, group: group.label })))
  const filteredOptions = searchQuery ? filterAndRankSelectorOptions(searchableOptions, searchQuery) : searchableOptions
  const enabledFiltered = filteredOptions.filter((option) => !option.disabled)
  const filteredOrder = new Map(filteredOptions.map((option, index) => [option.value, index]))
  const visibleGroups = groups.map((group) => ({ ...group, options: group.options.filter((option) => filteredOrder.has(option.value)).sort((a, b) => (filteredOrder.get(a.value) || 0) - (filteredOrder.get(b.value) || 0)) })).filter((group) => group.options.length).sort((a, b) => Math.min(...a.options.map((option) => filteredOrder.get(option.value) || 0)) - Math.min(...b.options.map((option) => filteredOrder.get(option.value) || 0)))
  const fallbackModelId = value.replace(/^[^:]+::/, '')
  const selectedLabel = displayLabel || selected?.label || modelDisplayName(fallbackModelId)
  const accessibleLabel = requestedAccessibleLabel || selected?.label || selectedLabel
  const compactLabel = requestedCompactLabel || selectedLabel
  const defaultLabel = requestedDefaultLabel || groups.flatMap((group) => group.options)[0]?.label || selectedLabel
  const selectedCompany = selected?.provider || modelCompanyFor(value, selectedLabel)
  const longestLabel = groups.flatMap((group) => group.options).reduce((longest, option) => Math.max(longest, option.label.length), 0)
  const fittedWidth = Math.min(184, Math.max(112, Math.ceil(longestLabel * 4.5 + 44)))
  const equalizedLabels = groups.flatMap((group) => group.options).map((option) => option.label)
  const hasEqualizedLeadingMark = groups.some((group) => group.options.some((option) => option.provider || option.iconPath || modelCompanyFor(option.value, option.label)))

  const ratioPreview = (ratio?: string) => {
    if (!ratio || ratio === 'auto' || ratio === 'fixed') return null
    const [width, height] = ratio.split(':').map(Number)
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
    const magnitude = Math.max(width / height, height / width)
    const shape = magnitude <= 1.15 ? 'square' : magnitude <= 1.6 ? 'standard' : magnitude <= 2.1 ? 'wide' : 'ultrawide'
    const orientation = width === height ? 'square' : width > height ? 'landscape' : 'portrait'
    return <span className="aspect-ratio-preview-frame" aria-hidden="true"><span className={`aspect-ratio-preview is-${shape} is-${orientation}`} /></span>
  }

  const positionMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      setOpen(false)
      return
    }
    const measuredWidth = measuredFloatingMenuWidth(buttonRef.current!, groups.flatMap((group) => [group.label, ...group.options.map((option) => option.label)]), fittedWidth, 360, 44)
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, measuredWidth))
    const fontSize = selectorTriggerFontSize(buttonRef.current!)
    const next = { left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), bottom: window.innerHeight - rect.top + 4, width, fontSize }
    setPosition((current) => current && Math.abs(current.left - next.left) < .25 && Math.abs(current.bottom - next.bottom) < .25 && Math.abs(current.width - next.width) < .25 && Math.abs(current.fontSize - next.fontSize) < .05 ? current : next)
  }

  useContinuousAnchor(open, positionMenu)

  const closeMenu = () => {
    setOpen(false)
    setSearchQuery('')
    setActiveValue(value)
  }

  useEffect(() => {
    setSelectorPortalOpen(selectorId, open)
    if (!open) return () => setSelectorPortalOpen(selectorId, false)
    setActiveValue(value)
    return () => setSelectorPortalOpen(selectorId, false)
  }, [open, selectorId, value])

  useEffect(() => {
    if (!open || !searchQuery) { previousSearchQuery.current = ''; return }
    inputRef.current?.focus()
    if (previousSearchQuery.current === searchQuery) return
    previousSearchQuery.current = searchQuery
    const nextActive = enabledFiltered[0]?.value || ''
    setActiveValue(nextActive)
    window.requestAnimationFrame(() => {
      if (resultsRef.current) resultsRef.current.scrollTop = 0
      if (nextActive) document.getElementById(`${listboxId}-${nextActive}`)?.scrollIntoView({ block: 'nearest' })
    })
  }, [activeValue, enabledFiltered, open, searchQuery, value])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.grouped-menu-select-menu') && !buttonRef.current?.contains(target)) closeMenu()
    }
    window.addEventListener('pointerdown', close, true)
    return () => {
      window.removeEventListener('pointerdown', close, true)
    }
  }, [open, value])

  const focusOption = (optionValue = value) => {
    window.requestAnimationFrame(() => document.getElementById(`${listboxId}-${optionValue}`)?.focus())
  }

  const hideSearch = () => {
    setSearchQuery('')
    setActiveValue(value)
    window.requestAnimationFrame(() => {
      if (resultsRef.current) resultsRef.current.scrollTop = preSearchScrollTop.current
      focusOption(value)
    })
  }

  const moveActive = (delta: number, edge?: 'first' | 'last') => {
    if (!enabledFiltered.length) return
    const currentIndex = enabledFiltered.findIndex((option) => option.value === activeValue)
    const nextIndex = edge === 'first' ? 0 : edge === 'last' ? enabledFiltered.length - 1 : Math.max(0, Math.min(enabledFiltered.length - 1, (currentIndex < 0 ? 0 : currentIndex) + delta))
    const next = enabledFiltered[nextIndex]
    setActiveValue(next.value)
    window.requestAnimationFrame(() => document.getElementById(`${listboxId}-${next.value}`)?.scrollIntoView({ block: 'nearest' }))
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent) => {
    event.stopPropagation()
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); buttonRef.current?.focus(); return }
    if (searchQuery && event.key === 'Backspace' && searchQuery.length === 1) { event.preventDefault(); hideSearch(); return }
    if (searchQuery && event.key.length === 1 && !(event.target instanceof HTMLInputElement) && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); setSearchQuery((current) => current + event.key); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1); return }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1); return }
    if (event.key === 'Home') { event.preventDefault(); moveActive(0, 'first'); return }
    if (event.key === 'End') { event.preventDefault(); moveActive(0, 'last'); return }
    if (event.key === 'Enter' && activeValue) {
      const option = filteredOptions.find((candidate) => candidate.value === activeValue)
      if (option && !option.disabled) { event.preventDefault(); onChange(option.value); closeMenu(); buttonRef.current?.focus() }
      return
    }
    if (!searchQuery) {
      const action = selectorSearchKeyAction(event)
      if (action.activate) {
        event.preventDefault()
        preSearchScrollTop.current = resultsRef.current?.scrollTop || 0
        setSearchQuery(action.firstCharacter)
      }
    }
  }

  const toggle = () => {
    if (!open) {
      positionMenu()
      setSearchQuery('')
      setActiveValue(value)
      setOpen(true)
      focusOption(value)
    } else closeMenu()
  }

  return <>
    <button ref={buttonRef} type="button" className={`grouped-menu-select ${className}`} data-equalized-options={fillTrack ? JSON.stringify(equalizedLabels) : undefined} data-equalized-default={fillTrack ? defaultLabel : undefined} data-equalized-full={fillTrack ? selectedLabel : undefined} data-equalized-compact={fillTrack ? compactLabel : undefined} data-equalized-leading={fillTrack && hasEqualizedLeadingMark ? 'true' : undefined} style={fillTrack ? { width: '100%', minWidth: 0, maxWidth: '100%' } : { width: fittedWidth, maxWidth: '100%' }} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} aria-description={accessibleLabel} aria-haspopup="listbox" aria-expanded={open} title={title ? `${title} · ${accessibleLabel}` : accessibleLabel} disabled={disabled} onClick={toggle}>
      {selectedCompany ? <CompanyIcon provider={selectedCompany} /> : selected?.iconPath ? <svg className="model-company-logo" viewBox="0 0 24 24" aria-hidden="true"><path d={selected.iconPath} /></svg> : null}<span className="selected-label"><span className="selected-label-full">{selectedLabel}</span><span className="selected-label-compact" aria-hidden="true">{compactLabel}</span></span><ChevronDown size={10} />
    </button>
    {open && position && createPortal(<div className={`grouped-menu-select-menu ${menuClassName} nodrag`} style={{ left: position.left, bottom: position.bottom, width: position.width, '--floating-menu-font-size': `${position.fontSize}px` } as CSSProperties} onKeyDown={handleMenuKeyDown}>
      {searchQuery && <div className="selector-search-row"><input ref={inputRef} value={searchQuery} aria-label={`Search ${ariaLabel} options`} aria-controls={listboxId} aria-activedescendant={activeValue ? `${listboxId}-${activeValue}` : undefined} onChange={(event) => { const next = event.target.value; if (!next) hideSearch(); else setSearchQuery(next) }} /><button type="button" aria-label="Clear selector search" onClick={hideSearch}>×</button></div>}
      <div className="selector-result-count sr-only" aria-live="polite">{filteredOptions.length} result{filteredOptions.length === 1 ? '' : 's'}</div>
      <div ref={resultsRef} id={listboxId} className="selector-results" role="listbox" aria-label={`${ariaLabel} options`}>
        {!filteredOptions.length ? <div className="selector-empty-state" role="status">No matching options</div> : visibleGroups.map((group) => <section key={group.label}>{group.label && <small>{group.label}</small>}{group.options.map((option) => { const company = option.provider || modelCompanyFor(option.value, option.label); return <button id={`${listboxId}-${option.value}`} type="button" role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} disabled={option.disabled} tabIndex={searchQuery ? -1 : option.value === activeValue ? 0 : -1} className={`${option.value === value ? 'is-active' : ''} ${option.value === activeValue ? 'is-keyboard-active' : ''}`} key={option.value} onMouseMove={() => { if (!option.disabled) setActiveValue(option.value) }} onClick={() => { if (option.disabled) return; onChange(option.value); closeMenu() }}>{company ? <CompanyIcon provider={company} /> : option.iconPath ? <svg className="model-company-logo" viewBox="0 0 24 24" aria-hidden="true"><path d={option.iconPath} /></svg> : ratioPreview(option.aspectRatioPreview) || <span className="model-company-logo-placeholder" aria-hidden="true" />}<span>{option.label}</span>{option.value === value && <Check size={11} />}</button> })}</section>)}
      </div>
    </div>, document.body)}
  </>
}

export function SimpleMenuSelect({ value, options, ariaLabel, accessibleLabel, displayLabel, title, disabled = false, className = '', menuClassName = '', defaultLabel, fillTrack = false, onChange }: {
  value: string | undefined
  options: GroupedMenuOption[]
  ariaLabel: string
  accessibleLabel?: string
  displayLabel?: string
  title?: string
  disabled?: boolean
  className?: string
  menuClassName?: string
  defaultLabel?: string
  fillTrack?: boolean
  onChange: (value: string) => void
}) {
  return <GroupedMenuSelect
    value={value || options[0]?.value || ''}
    groups={[{ label: '', options }]}
    ariaLabel={ariaLabel}
    accessibleLabel={accessibleLabel}
    displayLabel={displayLabel}
    title={title}
    disabled={disabled}
    className={`simple-menu-select ${className}`}
    menuClassName={`simple-menu-select-menu ${menuClassName}`}
    defaultLabel={defaultLabel}
    fillTrack={fillTrack}
    onChange={onChange}
  />
}

export function FooterSaveAction({ ariaLabel, tooltip = 'Save', title, disabled = false, className = '', onSave }: {
  ariaLabel: string
  tooltip?: string
  title?: string
  disabled?: boolean
  className?: string
  onSave: () => void | boolean | Promise<void | boolean>
}) {
  const [phase, setPhase] = useState<FooterSavePhase>('neutral')
  const resetTimer = useRef<number | null>(null)
  useEffect(() => () => { if (resetTimer.current !== null) window.clearTimeout(resetTimer.current) }, [])
  const save = async () => {
    if (disabled || phase === 'saving') return
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    setPhase('saving')
    try {
      const result = await onSave()
      if (result === false) {
        setPhase('neutral')
        return
      }
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      setPhase('saved')
      resetTimer.current = window.setTimeout(() => {
        resetTimer.current = null
        setPhase('neutral')
      }, SAVE_SUCCESS_TRANSIENT_MS)
    } catch {
      setPhase('neutral')
    }
  }
  return <button type="button" className={`footer-save-action ${className} ${phase === 'saving' ? 'is-saving' : phase === 'saved' ? 'is-saved' : 'is-neutral'}`} data-save-phase={phase} data-tooltip={tooltip} title={title} aria-label={ariaLabel} disabled={disabled || phase === 'saving'} onClick={() => { void save() }}><Save size={14} /></button>
}


export type FluidGroupControl<Id extends string = string> = {
  id: Id
  node: ReactNode
  kind: FluidControlKind
  visible?: boolean
  available?: boolean
  defaultLabel?: string
  fullLabel?: string
  compactLabel?: string
  minimumWidth?: number
  compactWidth?: number
  preferredWidth?: number
  shrinkPriority?: 'model' | 'operational'
  intrinsicWidth: number
  maximumExtraWidth?: number
  shortCharacterWidth?: number
  priority?: number
  preferredRow?: number
  preferredZone?: FluidControlPreferredZone
  fixedAnchor?: 'first' | 'terminal'
}

type FluidControlGroupProps<Id extends string> = {
  controls: FluidGroupControl<Id>[]
  recalculationKey: string
  className?: string
  ariaLabel?: string
  gap?: number
  allocation?: MixedControlAllocationOptions<Id>
}

type FluidLayoutState<Id extends string> = {
  descriptorSignature: string
  availableWidth: number
  rows: AllocatedMixedControlRow<Id>[]
}

export function FluidControlGroup<Id extends string>({ controls, recalculationKey, className = '', ariaLabel = 'Fluid Control Group', gap = 6, allocation = {} }: FluidControlGroupProps<Id>) {
  const groupRef = useRef<HTMLDivElement>(null)
  const lastValidRows = useRef(new Map<string, FluidLayoutState<Id>>())
  const normalizedControls = controls.map((control, index) => {
    const preferredRow = control.preferredRow ?? allocation.preferredRows?.findIndex((row) => row.includes(control.id))
    const fixedAnchor = control.fixedAnchor
      ?? (allocation.firstId === control.id ? 'first' : allocation.terminalIds?.includes(control.id) ? 'terminal' : undefined)
    return {
      ...control,
      visible: control.visible ?? true,
      available: control.available ?? true,
      defaultLabel: control.defaultLabel,
      priority: control.priority ?? (fixedAnchor ? 100 : Math.max(1, 50 - index)),
      preferredRow: preferredRow !== undefined && preferredRow >= 0 ? preferredRow : undefined,
      preferredZone: control.preferredZone ?? (fixedAnchor === 'first' ? 'start' : fixedAnchor === 'terminal' ? 'end' : 'middle'),
      fixedAnchor,
    }
  })
  const activeControls = activeControlDescriptors(normalizedControls)
  const descriptors = activeControls.map(({ node: _node, ...descriptor }) => descriptor)
  const descriptorSignature = controlDescriptorSignature(descriptors)
  const allocationSignature = JSON.stringify(allocation)
  const immediateRows = deterministicSafeControlRows(descriptors, 315, gap, allocation)
  const [layoutState, setLayoutState] = useState<FluidLayoutState<Id>>(() => ({ descriptorSignature, availableWidth: 315, rows: immediateRows }))
  const exactLastValid = lastValidRows.current.get(descriptorSignature)
  const rows = layoutState.descriptorSignature === descriptorSignature
    ? layoutState.rows
    : exactLastValid?.descriptorSignature === descriptorSignature
      ? exactLastValid.rows
      : immediateRows

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return
    let active = true
    let allocationFrame: number | null = null
    let pendingWidth = 0
    let lastMeasuredWidth = -1
    const numeric = (value: string) => Number.parseFloat(value) || 0
    const usableWidth = () => {
      const groupStyle = window.getComputedStyle(group)
      return Math.max(0, group.clientWidth - numeric(groupStyle.paddingLeft) - numeric(groupStyle.paddingRight))
    }
    const paintedWidth = (control: HTMLElement, value: string) => {
      const style = window.getComputedStyle(control)
      const context = document.createElement('canvas').getContext('2d')
      if (!context) return 0
      context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText(value)
      return Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
    }
    const measureIntrinsicBorderBox = (wrapper: HTMLElement) => {
      const source = wrapper.firstElementChild as HTMLElement | null
      if (!source) return wrapper.getBoundingClientRect().width
      const probe = source.cloneNode(true) as HTMLElement
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:max-content;max-width:none;visibility:hidden;pointer-events:none;contain:none;'
      probe.style.setProperty('width', 'max-content', 'important')
      probe.style.setProperty('min-width', 'max-content', 'important')
      probe.style.setProperty('max-width', 'none', 'important')
      probe.style.setProperty('flex-basis', 'auto', 'important')
      host.appendChild(probe)
      document.body.appendChild(host)
      const width = probe.getBoundingClientRect().width
      host.remove()
      return width
    }
    const paintedElement = (wrapper: Element) => wrapper.querySelector<HTMLElement>('[data-equalized-default], .quantity-stepper, .storyboard-budget, .compact-toggle, .play-tooltip-anchor, :scope > button, :scope > label') || wrapper as HTMLElement
    const validateCandidatePaint = (candidate: AllocatedMixedControlRow<Id>[]) => {
      const sharedGap = candidate[0]?.gap ?? gap
      const probe = group.cloneNode(false) as HTMLElement
      // React Flow paints nodes through a viewport transform. getBoundingClientRect()
      // reports that transformed width, while the grid allocator and CSS tracks use
      // the node's untransformed layout width. Probe in the same layout coordinate
      // space or a valid zoomed candidate is rejected and the 315px bootstrap rows
      // remain mounted outside the painted footer.
      probe.style.cssText += `;position:fixed;left:-10000px;top:-10000px;width:${group.clientWidth}px;visibility:hidden;pointer-events:none;contain:none;`
      for (const row of candidate) {
        const probeRow = document.createElement('div')
        probeRow.className = 'fluid-control-group-row'
        probeRow.style.gridTemplateColumns = row.gridTemplateColumns
        probeRow.style.columnGap = `${row.gap}px`
        for (const allocated of row.controls) {
          const source = group.querySelector<HTMLElement>(`[data-fluid-control-id="${allocated.id}"]`)
          if (!source) continue
          const clone = source.cloneNode(true) as HTMLElement
          clone.dataset.fluidLabelTier = allocated.labelTier
          clone.style.setProperty('--control-symmetric-padding', `${allocated.sidePadding}px`)
          probeRow.appendChild(clone)
        }
        probe.appendChild(probeRow)
      }
      document.body.appendChild(probe)
      const probeStyle = window.getComputedStyle(probe)
      const probeRect = probe.getBoundingClientRect()
      const usableLeft = probeRect.left + numeric(probeStyle.paddingLeft)
      const usableRight = probeRect.right - numeric(probeStyle.paddingRight)
      const paintedRows = Array.from(probe.children).map((row) => Array.from(row.children).map((wrapper) => {
        const rect = paintedElement(wrapper).getBoundingClientRect()
        return { id: (wrapper as HTMLElement).dataset.fluidControlId || 'unknown', left: rect.left, right: rect.right }
      }))
      const validation = validatePaintedControlLayout(ariaLabel, usableLeft, usableRight, sharedGap, paintedRows)
      probe.remove()
      return validation
    }
    const commitAllocation = (availableWidth: number) => {
      if (!active || !availableWidth) return
      const measuredDescriptors = descriptors.map((descriptor) => {
        const wrapper = group.querySelector<HTMLElement>(`[data-fluid-control-id="${descriptor.id}"]`)
        if (!wrapper) return descriptor
        if (descriptor.kind !== 'selector') {
          const measured = measureIntrinsicBorderBox(wrapper)
          if (descriptor.kind === 'intrinsic' || descriptor.kind === 'fixed-action') {
            const exactWidth = Math.max(descriptor.intrinsicWidth, measured)
            return { ...descriptor, intrinsicWidth: exactWidth, minimumWidth: exactWidth, compactWidth: exactWidth, preferredWidth: exactWidth }
          }
          return { ...descriptor, intrinsicWidth: Math.max(descriptor.intrinsicWidth, measured), minimumWidth: Math.max(descriptor.minimumWidth || 0, measured) }
        }
        const selector = wrapper.querySelector<HTMLElement>('[data-equalized-default]')
        if (!selector) return descriptor
        const style = window.getComputedStyle(selector)
        const hasLeadingMark = selector.dataset.equalizedLeading === 'true'
        const selectorGap = numeric(style.columnGap || style.gap) || 7
        const fixedChrome = numeric(style.paddingLeft) + numeric(style.paddingRight)
          + numeric(style.borderLeftWidth) + numeric(style.borderRightWidth)
          + 10 + selectorGap * (hasLeadingMark ? 2 : 1) + (hasLeadingMark ? 16 : 0)
        const fullLabel = selector.dataset.equalizedFull || descriptor.fullLabel || selector.dataset.equalizedDefault || descriptor.defaultLabel || ''
        const compactLabel = selector.dataset.equalizedCompact || descriptor.compactLabel || fullLabel
        const fullWidth = paintedWidth(selector, fullLabel) + fixedChrome
        const compactWidth = paintedWidth(selector, compactLabel) + fixedChrome
        if (descriptor.shrinkPriority === 'model') {
          const recognizableMinimum = Math.max(descriptor.minimumWidth || descriptor.intrinsicWidth, fixedChrome + 24)
          return { ...descriptor, fullLabel, compactLabel, minimumWidth: recognizableMinimum, compactWidth: Math.max(recognizableMinimum, compactWidth), preferredWidth: Math.max(compactWidth, fullWidth) }
        }
        const operationalWidth = Math.max(descriptor.intrinsicWidth, fullWidth)
        return { ...descriptor, fullLabel, compactLabel: fullLabel, minimumWidth: operationalWidth, compactWidth: operationalWidth, preferredWidth: operationalWidth, shrinkPriority: 'operational' as const }
      })
      const optimized = allocateMixedControlRows(measuredDescriptors, availableWidth, gap, allocation)
      const optimizedValidation = validateControlLayout(ariaLabel, measuredDescriptors, optimized, availableWidth)
      const fallback = deterministicSafeControlRows(measuredDescriptors, availableWidth, gap, allocation)
      const fallbackValidation = validateControlLayout(ariaLabel, measuredDescriptors, fallback, availableWidth)
      const arithmeticallyValid = optimizedValidation.valid ? optimized : fallbackValidation.valid ? fallback : undefined
      const paintedValidation = arithmeticallyValid ? validateCandidatePaint(arithmeticallyValid) : { valid: false, reasons: [] as string[] }
      const candidate = paintedValidation.valid ? arithmeticallyValid : undefined
      if (!candidate) {
        if (import.meta.env?.DEV) console.error(`[FluidControlGroup] ${[...optimizedValidation.reasons, ...fallbackValidation.reasons, ...paintedValidation.reasons].join('; ')}`)
        return
      }
      const next: FluidLayoutState<Id> = { descriptorSignature, availableWidth, rows: candidate }
      lastValidRows.current.set(descriptorSignature, next)
      setLayoutState((current) => {
        if (current.descriptorSignature === descriptorSignature && layoutSignature(current.rows) === layoutSignature(candidate)) return current
        group.dataset.allocationCommitCount = String(Number(group.dataset.allocationCommitCount || 0) + 1)
        return next
      })
    }
    const scheduleAllocation = (force = false) => {
      const width = usableWidth()
      if (!width || !force && !controlGroupWidthChanged(lastMeasuredWidth, width)) return
      lastMeasuredWidth = width
      pendingWidth = width
      if (allocationFrame !== null) return
      allocationFrame = window.requestAnimationFrame(() => {
        allocationFrame = null
        commitAllocation(pendingWidth)
      })
    }
    const observer = new ResizeObserver(() => scheduleAllocation())
    observer.observe(group)
    scheduleAllocation(true)
    document.fonts?.ready.then(() => { if (active) scheduleAllocation(true) })
    return () => {
      active = false
      observer.disconnect()
      if (allocationFrame !== null) window.cancelAnimationFrame(allocationFrame)
    }
  }, [allocationSignature, ariaLabel, descriptorSignature, gap, recalculationKey])

  const controlById = new Map(activeControls.map((control) => [control.id, control]))
  return <div ref={groupRef} className={`equalized-control-group ${className}`} aria-label={ariaLabel} style={{ '--control-group-gap': `${rows[0]?.gap ?? gap}px` } as CSSProperties}>
    {rows.map((row) => <div key={rowMembershipKey(row)} className="fluid-control-group-row" style={{ gridTemplateColumns: row.gridTemplateColumns, columnGap: `${row.gap}px` }}>
      {row.controls.map((allocated) => {
        const control = controlById.get(allocated.id)!
        const geometry = {
          '--control-symmetric-padding': `${allocated.sidePadding}px`,
        } as CSSProperties
        return <div key={allocated.id} data-fluid-control-id={allocated.id} data-fluid-kind={allocated.kind} data-fluid-label-tier={allocated.labelTier} style={geometry}>{control.node}</div>
      })}
    </div>)}
  </div>
}

type ImageDeliveryControlsProps = {
  format: StudioNodeData['outputFormat']
  resolution?: StudioNodeData['imageResolution']
  resolutions: readonly string[]
  webp: boolean
  onFormat: (value: StudioNodeData['outputFormat']) => void
  onResolution: (value: StudioNodeData['imageResolution']) => void
}

function canonicalImageFormat(format: StudioNodeData['outputFormat']): string {
  return format === 'jpeg' ? 'JPEG' : format === 'webp' ? 'WebP' : 'PNG'
}

function ImageFormatControl({ format, webp, onFormat }: Pick<ImageDeliveryControlsProps, 'format' | 'webp' | 'onFormat'>) {
  const canonicalFormat = canonicalImageFormat(format)
  return <SimpleMenuSelect ariaLabel={`Format: ${canonicalFormat}`} accessibleLabel={`Format: ${canonicalFormat}`} displayLabel={canonicalFormat} title="Image Output Format" fillTrack value={format || 'png'} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, ...(webp ? [{ value: 'webp', label: 'WebP' }] : [])]} onChange={(value) => onFormat(value as StudioNodeData['outputFormat'])} />
}

function ImageResolutionControl({ resolution, resolutions, onResolution }: Pick<ImageDeliveryControlsProps, 'resolution' | 'resolutions' | 'onResolution'>) {
  return <SimpleMenuSelect ariaLabel="Image Output Resolution" accessibleLabel={`Resolution: ${resolution || resolutions[0]}`} title={resolutions.length === 1 ? 'Selected model has one supported output resolution' : 'Image Output Resolution'} disabled={resolutions.length === 1} fillTrack value={resolution || resolutions[0]} options={resolutions.map((value) => ({ value, label: value }))} onChange={(value) => onResolution(value as StudioNodeData['imageResolution'])} />
}

export function ImageDeliveryControls(props: ImageDeliveryControlsProps) {
  return <><ImageFormatControl {...props} /><ImageResolutionControl {...props} /></>
}

type ImageGenerationControlGroupProps = {
  semantic?: boolean
  recalculationKey: string
  model: ReactNode
  format: ReactNode
  resolution: ReactNode
  quantity: ReactNode
  slot: ReactNode
  settings: ReactNode
  run: ReactNode
}

export function ImageGenerationControlGroup({ semantic = false, recalculationKey, model, format, resolution, quantity, slot, settings, run }: ImageGenerationControlGroupProps) {
  return <FluidControlGroup
    className="compact-image-footer-group compact-image-footer-row"
    ariaLabel={semantic ? 'Semantic Image Controls' : 'Image Controls'}
    allocation={{
      minRows: 1,
      maxRows: 3,
      enforceBalancedRows: true,
      firstId: 'model',
      terminalIds: semantic ? ['save', 'settings', 'run'] : ['ratio', 'settings', 'run'],
      preferredRows: semantic
        ? [['model', 'resolution', 'quantity'], ['format', 'save', 'settings', 'run']]
        : [['model', 'resolution', 'quantity'], ['format', 'ratio', 'settings', 'run']],
    }}
    recalculationKey={recalculationKey}
    controls={[
      { id: 'model', kind: 'selector', defaultLabel: 'Image model', fullLabel: 'Image model', compactLabel: 'Image model', minimumWidth: 80, shrinkPriority: 'model', intrinsicWidth: 112, node: model },
      { id: 'format', kind: 'selector', intrinsicWidth: 52, node: format },
      { id: 'resolution', kind: 'selector', intrinsicWidth: 48, node: resolution },
      { id: 'quantity', kind: 'bounded-elastic', intrinsicWidth: 42, maximumExtraWidth: 24, shortCharacterWidth: 5, node: quantity },
      { id: semantic ? 'save' : 'ratio', kind: semantic ? 'fixed-action' : 'selector', intrinsicWidth: semantic ? 28 : 52, node: slot },
      { id: 'settings', kind: 'fixed-action', intrinsicWidth: 28, node: settings },
      { id: 'run', kind: 'fixed-action', intrinsicWidth: 28, node: run },
    ]}
  />
}

export function PlayTooltip({ tooltip, disabled = false, persistent = false, children, className = '' }: { tooltip: string; disabled?: boolean; persistent?: boolean; children: ReactNode; className?: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()
  const [position, setPosition] = useState<{ left: number; top: number; placement: 'above' | 'below' } | null>(null)
  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const placement = rect.top > 72 ? 'above' : 'below'
    const next: NonNullable<typeof position> = {
      left: Math.max(148, Math.min(window.innerWidth - 148, rect.left + rect.width / 2)),
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement,
    }
    setPosition((current) => current
      && current.placement === next.placement
      && Math.abs(current.left - next.left) < .25
      && Math.abs(current.top - next.top) < .25
      ? current
      : next)
  }
  useEffect(() => {
    if (persistent) show()
    else setPosition(null)
  }, [persistent, tooltip])
  useEffect(() => {
    if (persistent || position === null) return
    const dismissWhenDetached = () => {
      const anchor = anchorRef.current
      if (!anchor || (!anchor.matches(':hover') && !anchor.matches(':focus-visible'))) setPosition(null)
    }
    window.addEventListener('pointermove', dismissWhenDetached, true)
    window.addEventListener('pointerdown', dismissWhenDetached, true)
    window.addEventListener('blur', dismissWhenDetached)
    document.addEventListener('visibilitychange', dismissWhenDetached)
    return () => {
      window.removeEventListener('pointermove', dismissWhenDetached, true)
      window.removeEventListener('pointerdown', dismissWhenDetached, true)
      window.removeEventListener('blur', dismissWhenDetached)
      document.removeEventListener('visibilitychange', dismissWhenDetached)
    }
  }, [persistent, position])
  useContinuousAnchor(persistent || position !== null, show)
  return <>
    <span
      ref={anchorRef}
      className={`play-tooltip-anchor nodrag ${disabled ? 'is-disabled' : ''} ${className}`}
      tabIndex={disabled ? 0 : undefined}
      aria-describedby={tooltipId}
      onPointerEnter={show}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerLeave={() => { if (!persistent) setPosition(null) }}
      onFocus={show}
      onBlur={() => { if (!persistent) setPosition(null) }}
    >{children}</span>
    {position && createPortal(<div id={tooltipId} role="tooltip" className={`play-tooltip-popover is-${position.placement}`} style={{ left: position.left, top: position.top }}>{tooltip}</div>, document.body)}
  </>
}

export function RerunIcon({ size = 14 }: { size?: number }) {
  return <RefreshCcw className="rerun-icon" size={size} strokeWidth={2.1} aria-hidden="true" />
}

export function StopIcon({ size = 14 }: { size?: number }) {
  return <svg className="stop-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
  </svg>
}

export function GlobalButtonTooltips() {
  const [tooltip, setTooltip] = useState<{ text: string; left: number; top: number; placement: 'above' | 'below' } | null>(null)

  useEffect(() => {
    let active: HTMLElement | null = null
    let hoverTimer: number | null = null
    const clearHoverTimer = () => {
      if (hoverTimer === null) return
      window.clearTimeout(hoverTimer)
      hoverTimer = null
    }
    const resolveButton = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>('button, [role="button"]') : null
    const tooltipText = (button: HTMLElement) => {
      const labelledBy = button.getAttribute('aria-labelledby')
      const labelledText = labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : ''
      const explicitHelp = button.dataset.tooltip?.trim() || button.getAttribute('title')?.trim()
      if (explicitHelp) return explicitHelp
      const visibleText = button.textContent?.replace(/\s+/g, ' ').trim()
      if (visibleText) return null
      return button.getAttribute('aria-label')?.trim() || labelledText || 'Button'
    }
    const restoreNativeTitle = (button: HTMLElement | null) => {
      if (!button?.dataset.prismNativeTitle) return
      button.setAttribute('title', button.dataset.prismNativeTitle)
      delete button.dataset.prismNativeTitle
    }
    const show = (button: HTMLElement) => {
      if (button.closest('.play-tooltip-anchor')) return
      if (active && active !== button) restoreNativeTitle(active)
      active = button
      const text = tooltipText(button)
      if (!text) { active = null; setTooltip(null); return }
      const nativeTitle = button.getAttribute('title')
      if (nativeTitle) {
        button.dataset.prismNativeTitle = nativeTitle
        button.removeAttribute('title')
      }
      const rect = button.getBoundingClientRect()
      const placement = rect.top > 72 ? 'above' : 'below'
      setTooltip({
        text,
        left: Math.max(148, Math.min(window.innerWidth - 148, rect.left + rect.width / 2)),
        top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
        placement,
      })
    }
    const hide = (button?: HTMLElement | null) => {
      clearHoverTimer()
      restoreNativeTitle(button || active)
      active = null
      setTooltip(null)
    }
    const onPointerOver = (event: PointerEvent) => {
      const button = resolveButton(event.target)
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null
      if (!button || button.contains(related)) return
      clearHoverTimer()
      const delay = Number(button.dataset.tooltipDelay || 0)
      if (Number.isFinite(delay) && delay > 0) {
        hoverTimer = window.setTimeout(() => {
          hoverTimer = null
          if (button.matches(':hover')) show(button)
        }, delay)
      } else show(button)
    }
    const onPointerOut = (event: PointerEvent) => {
      const button = resolveButton(event.target)
      const related = event.relatedTarget instanceof Node ? event.relatedTarget : null
      if (button && !button.contains(related)) hide(button)
    }
    const onFocusIn = (event: FocusEvent) => { const button = resolveButton(event.target); if (button) show(button) }
    const onFocusOut = (event: FocusEvent) => { const button = resolveButton(event.target); if (button) hide(button) }
    const reposition = () => hide()
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('pointerout', onPointerOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      clearHoverTimer()
      restoreNativeTitle(active)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerout', onPointerOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [])

  return tooltip ? createPortal(<div role="tooltip" className={`play-tooltip-popover global-button-tooltip is-${tooltip.placement}`} style={{ left: tooltip.left, top: tooltip.top }}>{tooltip.text}</div>, document.body) : null
}

function ProviderIcon({ provider }: { provider: AssistantProvider }) {
  if (provider === 'openai') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" /></svg>
  const icon = provider === 'google' ? siGooglegemini : provider === 'deepseek' ? siDeepseek : provider === 'moonshot' ? siKimi : siAnthropic
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icon.path} /></svg>
}

export function CompanyIcon({ provider }: { provider: ModelCompany }) {
  if (provider === 'fal') return <span className="fal-company-wordmark" aria-hidden="true">fal</span>
  if (provider === 'omniroute') return <span className="model-company-wordmark" aria-hidden="true">OR</span>
  if (provider === 'black-forest-labs') return <span className="model-company-wordmark" aria-hidden="true">BFL</span>
  const icon = provider === 'meta' ? siMeta : provider === 'alibaba' ? siAlibabacloud : provider === 'bytedance' || provider === 'byteplus' ? siBytedance : provider === 'kuaishou' ? siKuaishou : provider === 'elevenlabs' ? siElevenlabs : provider === 'fish' ? siFishaudio : null
  return <span className="provider-company-logo" aria-hidden="true">{icon ? <svg viewBox="0 0 24 24"><path d={icon.path} /></svg> : <ProviderIcon provider={provider as AssistantProvider} />}</span>
}

function ConnectedRuleRows({ items, onMode }: { items: ConnectedInputRule[]; onMode: (edgeId: string, mode: InputFidelity) => void }) {
  return <>{prioritizeConnectedInputRules(items).filter((item) => item.toggleable && item.edgeId).map((item) => <div key={`${item.edgeId || item.tag}-${item.label}`} title={item.rule}>
    <b>{item.tag}</b><span>{item.label}</span>
    <div className="input-fidelity-toggle" role="group" aria-label={`${item.label} fidelity`}>
      <button type="button" className={item.mode === 'guide' ? 'is-active' : ''} aria-pressed={item.mode === 'guide'} title="Guide: use the content as loose direction and allow interpretation" onClick={() => onMode(item.edgeId!, 'guide')}>Guide</button>
      <button type="button" className={!item.mode || item.mode === 'auto' ? 'is-active' : ''} aria-pressed={!item.mode || item.mode === 'auto'} title={item.rule.startsWith('AUTO → PRESERVE') ? 'Auto → Preserve: the authored prompt asks for exact or unchanged source content' : item.rule.startsWith('AUTO → GUIDE') ? 'Auto → Guide: the authored prompt explicitly allows interpretation' : 'Auto: balance fidelity with automatic quality repair'} onClick={() => onMode(item.edgeId!, 'auto')}>Auto</button>
      <button type="button" className={item.mode === 'lock' ? 'is-active' : ''} aria-pressed={item.mode === 'lock'} title="Lock: exact planar artwork uses verified post-generation placement; other imagery uses the provider’s strongest available preservation" onClick={() => onMode(item.edgeId!, 'lock')}>Lock</button>
    </div>
  </div>)}</>
}

function balancedAssetPreview(assets: ImportedAsset[], category?: 'character' | 'element' | 'location' | 'wardrobe') {
  return balancedSemanticPreview(assets, category)
}

function characterThumbnailPreview(assets: ImportedAsset[]) {
  return characterSemanticPreview(assets)
}

export function reusableEditorFingerprint(data: StudioNodeData): string {
  return JSON.stringify({
    kind: data.kind,
    characterInputMode: data.characterInputMode === 'single' ? 'single' : 'multi',
    elementInputMode: data.elementInputMode === 'single' ? 'single' : 'multi',
    referenceAssets: (data.referenceAssets || []).map((asset) => ({
      id: asset.id,
      path: asset.path,
      url: asset.url,
      mimeType: asset.mimeType,
      characterView: asset.metadata?.characterView,
      characterInputMode: asset.metadata?.characterInputMode,
      elementView: asset.metadata?.elementView,
      prompt: asset.metadata?.prompt,
      styleDescription: asset.metadata?.styleDescription,
      previewFocusX: asset.metadata?.previewFocusX,
      previewFocusY: asset.metadata?.previewFocusY,
    })),
    assetGenerationPrompt: localAssetGenerationPrompt(data),
    stylePrompt: data.stylePrompt || '',
    styleDescription: data.styleDescription || '',
    imageProvider: data.imageProvider,
    imageModelId: data.imageModelId,
    stylePromptModelId: data.stylePromptModelId,
    aspectRatio: data.aspectRatio,
    resolution: data.resolution,
    safetyTolerance: data.safetyTolerance,
  })
}

const CHARACTER_FRAMEWORK_IMAGES: Partial<Record<CharacterView, string>> = {
  front: characterFrameworkFace,
  'three-quarter': characterFrameworkThreeQuarter,
  profile: characterFrameworkProfile,
  'full-body': characterFrameworkFullBody,
  back: characterFrameworkBack,
  smile: characterFrameworkSmile,
  'left-three-quarter': characterFrameworkLeftThreeQuarter,
  'side-body': characterFrameworkSideBody,
  'full-body-back': characterFrameworkBackBody,
}

const ELEMENT_FRAMEWORK_IMAGES: Record<ElementView, string> = {
  'three-quarter': elementFrameworkThreeQuarter,
  front: elementFrameworkFront,
  side: elementFrameworkSide,
  back: elementFrameworkBack,
}

function ViewFramework({ kind, view }: { kind: 'character' | 'element'; view: CharacterView | ElementView }) {
  const source = kind === 'character'
    ? CHARACTER_FRAMEWORK_IMAGES[view as CharacterView]
    : ELEMENT_FRAMEWORK_IMAGES[view as ElementView]
  return source ? <img className={`view-framework-image is-${kind} is-${view}`} src={source} alt="" aria-hidden="true" /> : null
}

interface NodeRuntime {
  updateNode: (id: string, patch: Partial<StudioNodeData>) => void
  updatePrompt: (id: string, prompt: string) => void
  videoPromptState: (id: string) => { connected: boolean; mode: 'auto' | 'manual'; autoPrompt: string; autoError?: string; manualPrompt: string; activePrompt: string; fingerprint: string; resetDisabled: boolean } | null
  setVideoPromptMode: (id: string, mode: 'auto' | 'manual') => void
  resetManualPrompt: (id: string) => void
  connectPromptTags: (id: string, prompt: string, previousPrompt?: string) => void
  availablePromptTags: (id: string) => string[]
  adjustVoiceoverQuantity: (id: string, delta: -1 | 1) => void
  runNode: (id: string) => void
  stopNode: (id: string) => void
  runFromNode: (id: string) => void
  importAsset: (id: string, assetView?: CharacterView | ElementView) => void
  importDroppedAssets: (id: string, files: File[], assetView?: CharacterView | ElementView) => void
  importCanvasAssetIntoView: (id: string, payload: string, assetView?: CharacterView | ElementView) => void
  completeCharacterSet: (id: string) => void
  completeElementSet: (id: string) => void
  saveCharacterAsset: (id: string, name: string) => void
  buildStylePrompt: (id: string) => void
  saveStylePreset: (id: string, name: string) => void
  saveSemanticAsset: (id: string, name: string) => void
  commitSemanticAssetResult: (id: string, selectedResultId: string) => void
  inspectAssetBatch: (kind: AssetBatchKind, paths: string[]) => Promise<AssetBatchInspection[]>
  chooseAssetBatch: (kind: AssetBatchKind) => Promise<AssetBatchInspection[]>
  saveAssetBatchRow: (kind: AssetBatchKind, row: AssetBatchInspection, name: string) => Promise<void>
  renameNodeAsset: (id: string, name: string) => void
  nodeMediaLinkState: (id: string) => { assetId: string; mediaFamily: AssetMediaFamily; state: MediaOfflineVisualState; findingDots: number } | undefined
  semanticAssetAvailability?: (data: StudioNodeData) => SemanticAssetAvailability
  findOfflineAsset: (assetId: string) => void
  openGeneratedMedia: (id: string, index: number) => void
  revealGeneratedMedia: (id: string, index: number) => void
  copyGeneratedMedia: (id: string, index: number) => void
  setGeneratedMediaFavorite: (id: string, index: number, favorite: boolean) => void
  generatedMediaFavorite: (id: string, index: number) => boolean
  trashGeneratedMedia: (id: string, index: number) => void
  openQuickConnect: (id: string, clientX: number, clientY: number, sourceHandleId?: string) => void
  openInputQuickConnect: (id: string, handleId: string, clientX: number, clientY: number) => void
  inspectPort: (id: string, handleId: string, label: string, clientX: number, clientY: number) => void
  connectedReferenceTags: (id: string) => string[]
  connectedInputRules: (id: string) => ConnectedInputRule[]
  connectedInputMedia: (id: string, handleId: string) => { url?: string; path?: string; title?: string; type?: 'image' | 'video' | 'audio' } | undefined
  connectedStoryboardVideoFamily: (id: string) => string | undefined
  connectedStoryboardVideo: (id: string) => { nodeId: string; modelId: string; duration: number; durationOptions: number[] } | undefined
  setInputFidelity: (edgeId: string, mode: InputFidelity) => void
  openInspector: (id: string) => void
  resetNodeSettings: (id: string) => void
  duplicateNode: (id: string) => void
  deleteNode: (id: string) => void
  focusNode: (id: string) => void
  copyNodeLink: (id: string) => void
  importStoryboardPanel: (id: string, panelId: string) => void
  openStyleChooser: (id: string) => void
  rewriteStoryboardPanel: (id: string, panelId?: string) => void
  availableModels: (provider: ServiceProvider) => Array<{ id: string; label: string }>
  modelAvailabilityVerified: (provider: ServiceProvider) => boolean
  runAssistantNode: (id: string) => void
  estimateNode: (id: string) => Promise<GenerationCostEstimate | null>
  providerAccount: (provider: ServiceProvider) => ServiceAccountStatus | undefined
  providerConnected: (provider: ServiceProvider) => boolean
  runReadiness: (id: string) => { disabled: boolean; tooltip: string }
  openConnections: (provider: ServiceProvider, modelLabel?: string) => void
  characterLibrary: Array<{ nodeId: string; title: string; referenceTag?: string; referenceAssets: ImportedAsset[]; characterInputMode?: StudioNodeData['characterInputMode']; characterAspectRatio?: string; prompt?: string }>
  selectCharacter: (targetId: string, sourceId: string) => void
  semanticLibraries: Record<'element' | 'location' | 'wardrobe' | 'style-reference', Array<{ nodeId: string; title: string; referenceTag?: string; referenceAssets: ImportedAsset[]; prompt?: string; description?: string }>>
  selectSemanticAsset: (targetId: string, sourceId: string) => void
  setReusableFavorite: (id: string, favorite: boolean) => void
  exportReusableAsset: (id: string) => void
  deleteReusableAsset: (id: string, source?: 'preview' | 'sheet') => void

  saveStoryboard: (id: string) => void
  listBatchState: (listId: string) => { sourceCount: number; sourceId?: string; sourceTitle?: string; signal?: 'image' | 'video' | 'audio'; quantity?: number; maxQuantity?: number; adjustable: boolean }
  adjustListBatchQuantity: (listId: string, delta: -1 | 1) => void
}

export const NodeRuntimeContext = createContext<NodeRuntime | null>(null)

export const IMAGE_RATIOS = ['1:1', '2:1', '3:1', '2:3', '3:2', '3:4', '4:3', '5:4', '4:5', '16:9', '9:16', '21:9', '1:2'] as const
export const NANO_IMAGE_RATIOS = ['auto', '21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'] as const
export const VIDEO_RATIOS = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const
const CHARACTER_VIEWS = [
  ['front', 'Face'], ['three-quarter', 'Right Three-Quarter'], ['profile', 'Profile'], ['full-body', 'Full Body'],
  ['back', 'Back'], ['smile', 'Smile'], ['left-three-quarter', 'Left Three-Quarter'], ['side-body', 'Side Body'],
  ['full-body-back', 'Back Body'],
] as const
const CANVAS_ASSET_DRAG_MIME = canvasMediaDragMime('image')
export const KLING_VIDEO_RATIOS = ['1:1', '16:9', '9:16'] as const
export const WAN_VIDEO_RATIOS = ['16:9', '9:16', '1:1'] as const
const DIRECT_IMAGE_MODELS = {
  openai: [{ id: 'gpt-image-2', label: 'GPT Image 2' }],
  google: [
    { id: 'gemini-3.1-flash-image', label: 'Gemini 3.1 Flash Image' },
    { id: 'gemini-3.1-flash-lite-image', label: 'Gemini 3.1 Flash Lite Image' },
    { id: 'gemini-3-pro-image', label: 'Gemini 3 Pro Image' },
    { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  ],
} as const

function referenceCapableImageModelGroups(openAIModels: readonly { id: string; label: string }[], googleModels: readonly { id: string; label: string }[]): GroupedMenuGroup[] {
  return [
    { label: 'fal.ai', options: [
      { value: `fal::${FAL_IMAGE_MODELS.nanoBananaEdit}`, label: 'Nano Banana Pro', provider: 'google' as const },
      { value: `fal::${FAL_IMAGE_MODELS.seedream5ProEdit}`, label: 'Seedream 5.0 Pro', provider: 'bytedance' as const },
      { value: `fal::${FAL_IMAGE_MODELS.gptImage2Edit}`, label: 'GPT Image 2', provider: 'openai' as const },
      { value: `fal::${FAL_IMAGE_MODELS.fluxKontext}`, label: 'FLUX Kontext Pro', provider: 'black-forest-labs' as const },
    ].filter((model) => (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(model.value.slice('fal::'.length))) },
    { label: 'OpenAI', options: openAIModels.map((model) => ({ value: `openai::${model.id}`, label: model.label, provider: 'openai' as const })) },
    { label: 'Google', options: googleModels.map((model) => ({ value: `google::${model.id}`, label: model.label, provider: 'google' as const })) },
  ]
}

const GalleryIcon = NODE_KIND_ICONS.gallery!

export function videoRatioOptions(engine: StudioNodeData['videoEngine'] = 'wan-controlled'): readonly string[] {
  return resolveVideoModel(engine).ratios
}

export function videoDurationOptions(engine: StudioNodeData['videoEngine'] = 'wan-controlled', frameRate = 24): Array<number | 'auto'> {
  return videoModelDurationInventory(engine, frameRate)
}

export function normalizedVideoDuration(data: Pick<StudioNodeData, 'videoEngine' | 'duration' | 'autoDuration' | 'frameRate'>): number | 'auto' {
  const options = videoDurationOptions(data.videoEngine, data.frameRate)
  if (options.includes('auto') && data.autoDuration) return 'auto'
  const numeric = data.duration || 5
  const numericOptions = options.filter((value): value is number => typeof value === 'number')
  return numericOptions.reduce((nearest, value) => Math.abs(value - numeric) < Math.abs(nearest - numeric) ? value : nearest, numericOptions[0])
}

export function normalizedImageRatio(value?: string) {
  const legacy: Record<string, string> = { square_hd: '1:1', portrait_4_3: '3:4', portrait_16_9: '9:16', landscape_4_3: '4:3', landscape_16_9: '16:9' }
  return legacy[value || ''] || value || '2:3'
}

export function aspectRatioMenuOptions(ratios: readonly string[]): GroupedMenuOption[] {
  return ratios.map((ratio) => ({ value: ratio, label: ratio === 'auto' ? 'Auto' : ratio === 'fixed' ? 'Native' : ratio, aspectRatioPreview: ratio }))
}

const kindMeta = {
  prompt: { icon: NODE_KIND_ICONS.prompt!, label: 'Prompt', subtitle: 'Generation Prompt', tone: 'violet' },
  upload: { icon: NODE_KIND_ICONS.upload!, label: 'Media', subtitle: 'Local Media', tone: 'cyan' },
  'image-generator': { icon: NODE_KIND_ICONS['image-generator']!, label: 'Image Generator', subtitle: 'Generated Image', tone: 'violet' },
  'image-editor': { icon: NODE_KIND_ICONS['image-editor']!, label: 'Image Generator', subtitle: 'Generated Image', tone: 'violet' },
  upscaler: { icon: NODE_KIND_ICONS.upscaler!, label: 'Upscaler', subtitle: 'Image Or Video Enhancement', tone: 'cyan' },
  'video-generator': { icon: NODE_KIND_ICONS['video-generator']!, label: 'Video Generator', subtitle: 'Generated Video', tone: 'rose' },
  gallery: { icon: NODE_KIND_ICONS.gallery!, label: 'Gallery', subtitle: 'Media Collection', tone: 'green' },
  output: { icon: NODE_KIND_ICONS.output!, label: 'Generated Media', subtitle: 'Workflow Output', tone: 'cyan' },
  frame: { icon: NODE_KIND_ICONS.frame!, label: 'Frame', subtitle: 'Canvas Group', tone: 'violet' },
  'sticky-note': { icon: NODE_KIND_ICONS['sticky-note']!, label: 'Sticky Note', subtitle: 'Canvas Note', tone: 'amber' },
  comment: { icon: NODE_KIND_ICONS.comment!, label: 'Comment', subtitle: 'Canvas Comment', tone: 'amber' },
  sticker: { icon: NODE_KIND_ICONS.sticker!, label: 'Sticker', subtitle: 'Canvas Sticker', tone: 'violet' },
  drawing: { icon: NODE_KIND_ICONS.drawing!, label: 'Drawing', subtitle: 'Canvas Drawing', tone: 'cyan' },
  character: { icon: NODE_KIND_ICONS.character!, label: 'Character', subtitle: 'Reusable Identity', tone: 'violet' },
  location: { icon: NODE_KIND_ICONS.location!, label: 'Location', subtitle: 'Reusable Environment', tone: 'green' },
  wardrobe: { icon: NODE_KIND_ICONS.wardrobe!, label: 'Wardrobe', subtitle: 'Reusable Wardrobe', tone: 'violet' },
  element: { icon: NODE_KIND_ICONS.element!, label: 'Element', subtitle: 'Reusable Object', tone: 'amber' },
  'style-reference': { icon: NODE_KIND_ICONS['style-reference']!, label: 'Style', subtitle: 'Visual Style Library', tone: 'violet' },
  list: { icon: NODE_KIND_ICONS.list!, label: 'List', subtitle: 'Ordered Collection', tone: 'violet' },
  router: { icon: NODE_KIND_ICONS.router!, label: 'Router', subtitle: 'Pass-Through Utility', tone: 'cyan' },
  voiceover: { icon: NODE_KIND_ICONS.voiceover!, label: 'Voiceover', subtitle: 'Generated Speech', tone: 'rose' },
  'sound-effects': { icon: NODE_KIND_ICONS['sound-effects']!, label: 'Sound Effects', subtitle: 'Generated Sound', tone: 'amber' },
  'music-generator': { icon: NODE_KIND_ICONS['music-generator']!, label: 'Music Generator', subtitle: 'Generated Music', tone: 'green' },
  storyboard: { icon: NODE_KIND_ICONS.storyboard!, label: 'Storyboard', subtitle: 'Reusable Shot Sequence', tone: 'violet' },
  'storyboard-asset': { icon: NODE_KIND_ICONS['storyboard-asset']!, label: 'Storyboard', subtitle: 'Compiled Image', tone: 'violet' },
  assistant: { icon: NODE_KIND_ICONS.assistant!, label: 'Assistant', subtitle: 'Prompt Enhancement', tone: 'violet' },
} as const

function mediaPreview(data: StudioNodeData) {
  const activeResult = data.generatedResults?.[Math.min(Math.max(data.activeResultIndex || 0, 0), Math.max((data.generatedResults?.length || 1) - 1, 0))]
  const url = activeResult?.url || data.outputUrl || data.assetUrl
  if (!url) return null
  const outputType = activeResult?.type || data.outputType
  if (outputType === 'audio') return <div className="node-audio-player nodrag"><AudioLines size={16} strokeWidth={1.2} /><span className="node-audio-waveform" aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <i key={index} style={{ height: `${5 + (index * 7 % 15)}px` }} />)}</span><audio className="node-audio" src={url} controls preload="metadata" /></div>
  if (outputType === 'video' || data.kind === 'video-generator') {
    return <video className="node-media" src={url} controls preload="metadata" playsInline draggable={false} onDragStart={(event) => event.preventDefault()} />
  }
  return <img className="node-media" src={url} alt="Node media" loading="lazy" decoding="async" draggable={false} onDragStart={(event) => event.preventDefault()} />
}

export function hasMaterializedAsset(data: StudioNodeData): boolean {
  const hasOutput = Boolean(data.outputUrl || data.generatedResults?.some((result) => result.url))
  const hasImportedMedia = Boolean(data.assetUrl)
  const hasReferences = Boolean(data.referenceAssets?.length)

  switch (data.kind) {
    case 'upload':
      return hasImportedMedia
    case 'image-generator':
    case 'image-editor':
    case 'upscaler':
    case 'video-generator':
    case 'voiceover':
    case 'sound-effects':
    case 'music-generator':
    case 'output':
      return hasOutput
    case 'character':
    case 'location':
    case 'wardrobe':
    case 'element':
      return hasReferences || hasOutput
    case 'style-reference':
      return hasReferences || Boolean(data.stylePresetId || data.styleSavedAt || (data.referenceTag && (data.stylePrompt || data.prompt)))
    case 'storyboard':
      return Boolean(data.referenceTag && ((data.storyboardPanels || []).length || data.outputPath || data.outputUrl))
    case 'storyboard-asset':
      return Boolean(data.storyboardSourceId || data.storyboardPanels?.some((panel) => panel.asset))
    default:
      return false
  }
}

export function canRenameNodeAsset(data: StudioNodeData): boolean {
  if (!hasMaterializedAsset(data)) return false
  return !(data.kind === 'style-reference' && Boolean(data.stylePresetId))
}

export function fallbackAssetTag(data: StudioNodeData, fallbackLabel: string): string {
  return workflowTag(data, fallbackLabel.toLowerCase().replace(/\s+/g, '-'))
}

export const NodeCard = memo(({ id, data, selected }: NodeProps<StudioNode>) => {
  const assetGenerationPrompt = localAssetGenerationPrompt(data)
  const runtime = useContext(NodeRuntimeContext)
  const videoPrompt = data.kind === 'video-generator' ? runtime?.videoPromptState(id) : null
  const [videoPromptRovingMode, setVideoPromptRovingMode] = useState<VideoPromptMode>(videoPrompt?.mode || 'manual')
  useEffect(() => setVideoPromptRovingMode(videoPrompt?.mode || 'manual'), [videoPrompt?.mode])
  const mediaLinkState = runtime?.nodeMediaLinkState(id)
  const intrinsicSemanticRatio = shouldUseIntrinsicAssetRatio(data.kind, data.kind === 'character' ? data.characterInputMode : data.kind === 'element' ? data.elementInputMode : undefined)
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const assetSelector = useHorizontalAssetSelector<HTMLDivElement>()
  const [libraryQuery, setLibraryQuery] = useState('')
  const previousManualSeeded = useRef(Boolean(data.manualPromptSeeded))
  const [manualSeedDisclosure, setManualSeedDisclosure] = useState(false)
  useEffect(() => {
    const seededNow = Boolean(data.manualPromptSeeded)
    if (data.promptMode !== 'manual') setManualSeedDisclosure(false)
    if (!previousManualSeeded.current && seededNow && data.promptMode === 'manual') {
      setManualSeedDisclosure(true)
      const timer = window.setTimeout(() => setManualSeedDisclosure(false), 5200)
      previousManualSeeded.current = seededNow
      return () => window.clearTimeout(timer)
    }
    previousManualSeeded.current = seededNow
  }, [data.manualPromptSeeded, data.promptMode])
  const [editorSnapshot, setEditorSnapshot] = useState<StudioNodeData | null>(null)
  const [editorBaseline, setEditorBaseline] = useState<StudioNodeData | null>(null)
  const [editorSessionMode, setEditorSessionMode] = useState<'edit' | 'create' | null>(null)
  const styleCreateOpen = Boolean(data.styleEditorOpen)
  const [characterEditorSessionOpen, setCharacterEditorSessionOpen] = useState(false)
  const characterLibraryItems = runtime?.characterLibrary || []
  const semanticLibraryItems = ['element', 'location', 'wardrobe', 'style-reference'].includes(data.kind)
    ? runtime?.semanticLibraries[data.kind as 'element' | 'location' | 'wardrobe' | 'style-reference'] || []
    : []
  const characterCreateOpen = Boolean(data.kind === 'character' && data.characterEditorOpen && characterEditorSessionOpen)
  const semanticCreateOpen = Boolean(['element', 'location', 'wardrobe'].includes(data.kind) && data.semanticEditorOpen)
  // Camera Object creation reuses this owner but intentionally omits the
  // reusable asset intake mode switch; ordinary NodeCard surfaces keep it.
  const cameraObjectSurface = Boolean((data as StudioNodeData & { cameraObjectSurface?: boolean }).cameraObjectSurface)
  const generatableSemanticAsset = ['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(data.kind)
  const reusableAvailability = generatableSemanticAsset
    ? runtime?.semanticAssetAvailability?.(data) || semanticAssetAvailability(data)
    : undefined
  const reusableOffline = reusableAvailability?.state === 'offline'
  const selectorAvailability = (referenceAssets: ImportedAsset[]) => runtime?.semanticAssetAvailability?.({ ...data, referenceAssets }) || semanticAssetAvailability({ ...data, referenceAssets })
  const persistedSemanticLifecycle = generatableSemanticAsset ? migrateSemanticAssetLifecycleMetadata(data, { recoverTransient: false }).semanticAssetLifecycle : undefined
  const semanticLifecycle = persistedSemanticLifecycle ? {
    ...persistedSemanticLifecycle,
    showIntake: persistedSemanticLifecycle.status === 'EMPTY',
    canSave: persistedSemanticLifecycle.references.find((reference) => reference.id === persistedSemanticLifecycle.selectedId)?.source === 'generated' && !['SAVE_CONFIRMATION', 'SAVE_COMMITTING'].includes(persistedSemanticLifecycle.status),
  } as SemanticAssetLifecycleState : undefined
  const semanticEditorPreviewActive = styleCreateOpen || characterCreateOpen || semanticCreateOpen
  const selectedSemanticReference = semanticEditorPreviewActive
    ? semanticLifecycle?.references.find((reference) => reference.id === semanticLifecycle.selectedId)
    : undefined
  const dispatchSemanticLifecycle = (action: SemanticAssetLifecycleAction) => {
    if (!semanticLifecycle) return
    const next = semanticAssetLifecycleReducer(semanticLifecycle, action)
    const selectedResultIndex = (data.generatedResults || []).findIndex((result) => (result.id || `legacy-generated:${encodeURIComponent(result.path)}`) === next.selectedId)
    const selectedResult = selectedResultIndex >= 0 ? data.generatedResults?.[selectedResultIndex] : undefined
    runtime?.updateNode(id, {
      semanticAssetLifecycle: { version: 1, status: next.status, references: next.references, selectedId: next.selectedId, pendingSave: next.pendingSave },
      ...(selectedResult ? { activeResultIndex: selectedResultIndex, outputPath: selectedResult.path, outputUrl: selectedResult.url, outputType: selectedResult.type, modelId: selectedResult.modelId } : {}),
      error: next.error,
    })
  }
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase()
  const filteredCharacters = characterLibraryItems.filter((item) => !normalizedLibraryQuery || item.title.toLowerCase().includes(normalizedLibraryQuery))
  const filteredSemanticLibrary = ['element', 'location', 'wardrobe', 'style-reference'].includes(data.kind)
    ? semanticLibraryItems.filter((item) => !normalizedLibraryQuery || item.title.toLowerCase().includes(normalizedLibraryQuery))
    : []
  const filteredStylePresets = STYLE_PRESETS.filter((preset) => !normalizedLibraryQuery || preset.title.toLowerCase().includes(normalizedLibraryQuery))
  const selectedStylePreset = data.kind === 'style-reference'
    ? STYLE_PRESETS.find((preset) => preset.id === data.stylePresetId || preset.id === data.referenceTag?.replace(/^@+/, '') || preset.title.toLowerCase() === data.title.toLowerCase())
    : undefined
  const reusablePreviewAssets = data.kind === 'character'
    ? characterSemanticPreview(data.referenceAssets || [])
    : balancedAssetPreview(data.referenceAssets || [], data.kind === 'element' || data.kind === 'location' || data.kind === 'wardrobe' ? data.kind : undefined)
  const reusableEditorDirty = Boolean(
    editorBaseline
    && (characterCreateOpen || styleCreateOpen || semanticCreateOpen)
    && reusableEditorFingerprint(data) !== reusableEditorFingerprint(editorBaseline)
  )
  const [saveNameOpen, setSaveNameOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const saveNameInputRef = useRef<HTMLInputElement>(null)
  const [renameNameOpen, setRenameNameOpen] = useState(false)
  const [renameName, setRenameName] = useState('')
  const [mediaContextMenu, setMediaContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [assetTagDraft, setAssetTagDraft] = useState(data.referenceTag?.replace(/^@+/, '') || '')
  const [assetTagEditing, setAssetTagEditing] = useState(false)
  const [assetBatchOpen, setAssetBatchOpen] = useState(false)
  const [assetBatchRows, setAssetBatchRows] = useState<Array<AssetBatchInspection & { displayName: string }>>([])
  const [pendingAssetBatch, setPendingAssetBatch] = useState<Array<AssetBatchInspection & { displayName: string }> | null>(null)
  const [renamingBatchRowId, setRenamingBatchRowId] = useState<string | null>(null)
  const [assetBatchBusy, setAssetBatchBusy] = useState(false)
  const [activeAssetDropTarget, setActiveAssetDropTarget] = useState<string | null>(null)
  const assetBatchKind = ['character', 'element', 'location', 'wardrobe'].includes(data.kind) ? data.kind as AssetBatchKind : null
  const finishReusableEditing = () => {
    setAssetBatchOpen(false)
    setPendingAssetBatch(null)
    setCharacterEditorSessionOpen(false)
    setEditorSnapshot(null)
    setEditorBaseline(null)
    setEditorSessionMode(null)
    runtime?.updateNode(id, { characterEditorOpen: false, semanticEditorOpen: false, error: undefined })
  }
  const finishAssetBatchEditing = finishReusableEditing
  const stageAssetBatch = (inspections: AssetBatchInspection[]) => {
    if (!assetBatchKind) return
    const accepted = acceptedAssetBatch(assetBatchKind, inspections)
    if (!accepted.canInsert) {
      runtime?.updateNode(id, { error: assetBatchKind === 'character' ? 'Batch needs at least two valid Character sheets, each with two distinct views.' : 'Batch needs at least two valid image assets.' })
      return
    }
    setPendingAssetBatch(accepted.rows.map((row) => ({ ...row, displayName: assetBatchDisplayName(row.fileName) })))
    runtime?.updateNode(id, { error: undefined, progress: undefined })
  }
  const chooseBatchAssets = async () => {
    if (!assetBatchKind || assetBatchBusy) return
    setAssetBatchBusy(true)
    try {
      const inspections = await runtime!.chooseAssetBatch(assetBatchKind)
      if (inspections.length) stageAssetBatch(inspections)
    } finally { setAssetBatchBusy(false) }
  }
  const dropBatchAssets = async (files: File[]) => {
    if (!assetBatchKind || assetBatchBusy) return
    const paths = files.map((file) => window.prism.assets.pathForFile(file)).filter(Boolean)
    setAssetBatchBusy(true)
    try { stageAssetBatch(await runtime!.inspectAssetBatch(assetBatchKind, paths)) } finally { setAssetBatchBusy(false) }
  }
  const saveBatchRow = async (row: AssetBatchInspection & { displayName: string }) => {
    if (!assetBatchKind || !row.displayName.trim() || assetBatchBusy) return
    setAssetBatchBusy(true)
    try {
      await runtime!.saveAssetBatchRow(assetBatchKind, row, row.displayName)
      setAssetBatchRows((current) => removeSavedBatchRow(current, row.id))
      if (assetBatchRows.length === 1) finishAssetBatchEditing()
    } catch (error) {
      runtime?.updateNode(id, { error: error instanceof Error ? error.message : String(error) })
    } finally { setAssetBatchBusy(false) }
  }
  const saveAllBatchRows = async () => {
    if (!assetBatchKind || assetBatchBusy || assetBatchRows.some((row) => !row.displayName.trim())) return
    setAssetBatchBusy(true)
    try {
      for (const row of assetBatchRows) {
        await runtime!.saveAssetBatchRow(assetBatchKind, row, row.displayName)
        setAssetBatchRows((current) => removeSavedBatchRow(current, row.id))
      }
      finishAssetBatchEditing()
    } catch (error) {
      runtime?.updateNode(id, { error: error instanceof Error ? error.message : String(error) })
    } finally { setAssetBatchBusy(false) }
  }
  const selectGeneratedResult = (index: number) => {
    const results = data.generatedResults || []
    const result = results[index]
    if (!result) return
    runtime?.updateNode(id, { activeResultIndex: index, outputPath: result.path, outputUrl: result.url, outputType: result.type, modelId: result.modelId })
  }
  const activeGeneratedIndex = Math.min(Math.max(data.activeResultIndex || 0, 0), Math.max((data.generatedResults?.length || 1) - 1, 0))
  const activeGeneratedResult = data.generatedResults?.[activeGeneratedIndex]
  const generatedMediaOverlayFor = (index: number, onPrevious: () => void, onNext: () => void) => {
    const result = data.generatedResults?.[index]
    if (!result) return null
    const favorite = Boolean(runtime?.generatedMediaFavorite(id, index))
    return <GeneratedMediaOverlay
      activeIndex={index}
      total={data.generatedResults?.length || 0}
      favorite={favorite}
      onPrevious={onPrevious}
      onNext={onNext}
      onReveal={() => runtime?.revealGeneratedMedia(id, index)}
      onEdit={() => { setRenameName(generatedResultName(result, data.title)); setRenameNameOpen(true) }}
      onFavorite={() => runtime?.setGeneratedMediaFavorite(id, index, !favorite)}
      onDelete={() => runtime?.trashGeneratedMedia(id, index)}
    />
  }
  const generatedMediaOverlay = activeGeneratedResult
    ? generatedMediaOverlayFor(activeGeneratedIndex, () => selectGeneratedResult(activeGeneratedIndex - 1), () => selectGeneratedResult(activeGeneratedIndex + 1))
    : null
  const semanticGeneratedIndex = (data.generatedResults || []).findIndex((result) => (result.id || `legacy-generated:${encodeURIComponent(result.path)}`) === semanticLifecycle?.selectedId)
  const selectedSemanticGeneratedResult = semanticGeneratedIndex >= 0 ? data.generatedResults?.[semanticGeneratedIndex] : undefined
  const selectSemanticGeneratedResult = (index: number) => {
    const result = data.generatedResults?.[index]
    if (!result) return
    dispatchSemanticLifecycle({ type: 'SELECT', id: result.id || `legacy-generated:${encodeURIComponent(result.path)}` })
  }
  const semanticGeneratedOverlay = semanticEditorPreviewActive && selectedSemanticGeneratedResult
    ? generatedMediaOverlayFor(semanticGeneratedIndex, () => selectSemanticGeneratedResult(semanticGeneratedIndex - 1), () => selectSemanticGeneratedResult(semanticGeneratedIndex + 1))
    : null
  const generatedMediaInteraction = activeGeneratedResult ? {
    onDoubleClick: (event: ReactMouseEvent) => { event.stopPropagation(); runtime?.openGeneratedMedia(id, activeGeneratedIndex) },
    onContextMenu: (event: ReactMouseEvent) => { event.preventDefault(); event.stopPropagation(); setMediaContextMenu({ x: event.clientX, y: event.clientY }) },
  } : {}
  useEffect(() => {
    setCharacterEditorSessionOpen(Boolean(data.characterEditorOpen))
  }, [data.characterEditorOpen])
  const [costEstimate, setCostEstimate] = useState<GenerationCostEstimate | null>(null)
  const [upscaleWipe, setUpscaleWipe] = useState(50)
  const meta = kindMeta[data.kind]
  const nodeAssetTag = fallbackAssetTag(data, meta.label)
  useEffect(() => {
    setAssetTagDraft(nodeAssetTag.slice(1))
  }, [nodeAssetTag])
  const showsAssetTag = hasMaterializedAsset(data) || reusableEditorDirty
  const Icon = meta.icon
  const enhanceProvider: AssistantProvider = data.assistantProvider === 'fal' ? 'openai' : data.assistantProvider || 'openai'
  const enhanceModels = data.kind === 'prompt' ? curatedAssistantModels(enhanceProvider, runtime?.availableModels(enhanceProvider) || []) : []
  const enhanceGroups = data.kind === 'prompt' ? ([
    ['openai', 'OpenAI'], ['google', 'Gemini'], ['anthropic', 'Claude'], ['deepseek', 'DeepSeek'], ['moonshot', 'Kimi'],
  ] as const).map(([provider, label]) => ({ provider, label, models: curatedAssistantModels(provider, runtime?.availableModels(provider) || []) })) : []
  const enhanceModel = enhanceModels.some((model) => model.id === data.assistantModelId) ? data.assistantModelId || '' : enhanceModels[0]?.id || ''
  const enhanceModelLabel = enhanceModels.find((model) => model.id === enhanceModel)?.label || 'Choose Model'
  const enhanceAccount = data.kind === 'prompt' ? runtime?.providerAccount(enhanceProvider) : undefined
  const errorProvider: ServiceProvider = data.kind === 'prompt' ? enhanceProvider : generationServiceProvider(data)
  const displayError = compactProviderError(data.error, errorProvider)
  const enhanceBlocked = Boolean(enhanceAccount && ['credit-required', 'temporarily-limited', 'unavailable'].includes(enhanceAccount.state))
  const running = data.runState === 'queued' || data.runState === 'running'
  const generationAction = generationActionState(data)
  const rerun = generationAction === 'rerun'
  const generationTimeLeft = useGenerationTimeLeft(data, running, id)
  const inputPorts = nodeInputPorts(data)
  const acceptsText = inputPorts.some((port) => port.signal === 'text')
  const outputsText = data.kind === 'prompt'
  const outputsMedia = ['upload', 'image-generator', 'image-editor', 'upscaler', 'video-generator', 'output', 'character', 'location', 'wardrobe', 'element', 'style-reference', 'voiceover', 'sound-effects', 'music-generator'].includes(data.kind)
  const runnable = isRunnableNodeKind(data.kind)
  const toolbarEligible = data.kind === 'gallery' || runnable || outputsText || outputsMedia
  const isSemanticReference = ['character', 'location', 'wardrobe', 'element', 'style-reference'].includes(data.kind)
  const canRenameAsset = canRenameNodeAsset(data)
  const isImageGeneratorSurface = data.kind === 'image-generator' || data.kind === 'image-editor'
  const isCanvasGenerator = isImageGeneratorSurface || data.kind === 'video-generator'
  const activeDisplayError = data.kind === 'video-generator' && videoPrompt?.mode === 'auto' ? videoPrompt.autoError || displayError : displayError
  const handleVideoPromptModeKey = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const group = event.currentTarget.closest('.storyboard-transition-choice')
    const buttons = [...(group?.querySelectorAll<HTMLButtonElement>('[role="radio"]') || [])]
    const current = buttons.indexOf(event.currentTarget)
    const currentMode: VideoPromptMode = current === 0 ? 'auto' : 'manual'
    const nextMode = nextVideoPromptRovingMode(currentMode, event.key)
    const next = nextMode === 'auto' ? 0 : 1
    if (next < 0 || !buttons[next]) return
    event.preventDefault()
    setVideoPromptRovingMode(nextMode)
    buttons[next].focus()
    if (buttons[next].getAttribute('aria-disabled') !== 'true') runtime?.setVideoPromptMode(id, nextMode)
  }
  const isMediaTile = ['upload', 'output', 'gallery'].includes(data.kind) || isSemanticReference
  const connectedTags = acceptsText ? runtime?.connectedReferenceTags(id) || [] : []
  const connectedInputRules = runtime?.connectedInputRules(id) || []
  const fidelityInputRules = connectedInputRules.filter((rule) => rule.toggleable && rule.edgeId)
  const connectedPromptTags = [...new Set([...connectedTags, ...connectedInputRules.flatMap((rule) => [rule.tag, ...(rule.aliases || [])])])]
  const availablePromptTags = runtime?.availablePromptTags(id) || connectedPromptTags
  const upscalerIsVideo = data.kind === 'upscaler' && data.upscalerModel === 'realesrgan-video'
  const upscalerInputHandle = upscalerIsVideo ? 'video-in' : 'image-in'
  const connectedUpscalerInput = data.kind === 'upscaler' ? runtime?.connectedInputMedia(id, upscalerInputHandle) : undefined
  const upscalerBeforeUrl = connectedUpscalerInput?.url || data.assetUrl || data.referenceAssets?.[0]?.url
  const upscalerActiveResult = data.kind === 'upscaler'
    ? data.generatedResults?.[Math.min(Math.max(data.activeResultIndex || 0, 0), Math.max((data.generatedResults?.length || 1) - 1, 0))]
    : undefined
  const upscalerAfterUrl = upscalerActiveResult?.url || data.outputUrl
  const elevenVoiceValue = data.voice === undefined ? 'Rachel' : data.voice
  const usesBuiltInElevenVoice = (ELEVEN_V3_BUILT_IN_VOICES as readonly string[]).includes(elevenVoiceValue)
  const hasImageReferences = connectedInputRules.some((rule) => !['Prompt', 'Text List'].includes(rule.label)) || Boolean(data.assetUrl)
  const selectedRatio = data.kind === 'image-generator' ? normalizedImageRatio(data.aspectRatio) : data.aspectRatio || '16:9'
  const selectedVideoModel = data.kind === 'video-generator' ? resolveVideoModel(data.videoEngine) : null
  const closedVideoLabel = closedVideoModelLabel(selectedVideoModel || resolveVideoModel(data.videoEngine))
  const nativeVideoFps = selectedVideoModel ? knownOutputFrameRate(selectedVideoModel, data.frameRate) : undefined
  const effectiveMotionCadence = selectedVideoModel ? normalizedMotionCadence(selectedVideoModel, data.frameRate, data.motionCadence) : undefined
  useEffect(() => {
    if (data.kind === 'video-generator' && effectiveMotionCadence !== data.motionCadence) runtime?.updateNode(id, { motionCadence: effectiveMotionCadence })
  }, [data.kind, data.motionCadence, effectiveMotionCadence, id, runtime])
  const stageRatio = selectedRatio === 'auto' ? (data.kind === 'video-generator' ? '16:9' : '1:1') : selectedRatio
  const [stageWidth, stageHeight] = stageRatio.split(':').map(Number)
  const stageOrientation = stageHeight > stageWidth ? 'portrait' : 'landscape'
  const isImageOperation = data.kind === 'image-generator' || data.kind === 'image-editor'
  const imageProvider = data.imageProvider || 'fal'
  const selectedFalReferenceModel = imageProvider === 'fal' && (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(data.imageModelId || '')
  const usesReferenceImageCatalog = data.kind === 'image-editor' || hasImageReferences || selectedFalReferenceModel || isSemanticReference
  const falImageModels = usesReferenceImageCatalog
    ? [
      { id: FAL_IMAGE_MODELS.nanoBananaEdit, label: 'Nano Banana Pro', provider: 'google' },
      { id: FAL_IMAGE_MODELS.seedream5ProEdit, label: 'Seedream 5.0 Pro', provider: 'bytedance' },
      { id: FAL_IMAGE_MODELS.gptImage2Edit, label: 'GPT Image 2', provider: 'openai' },
      { id: FAL_IMAGE_MODELS.fluxKontext, label: 'FLUX Kontext Pro', provider: 'black-forest-labs' },
    ].filter((model) => (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(model.id))
    : [
      { id: FAL_IMAGE_MODELS.fluxSchnell, label: 'FLUX Schnell', provider: 'black-forest-labs' },
      { id: FAL_IMAGE_MODELS.nanoBanana, label: 'Nano Banana Pro', provider: 'google' },
    ]
  const connectedOpenAIImageModels = (runtime?.availableModels('openai') || []).filter((model) => /gpt-image/i.test(model.id)).map((model) => ({ ...model, label: modelDisplayName(model.id, model.label) }))
  const connectedGoogleImageModels = (runtime?.availableModels('google') || []).filter((model) => /image|imagen/i.test(model.id)).map((model) => ({ ...model, label: modelDisplayName(model.id, model.label) }))
  const openAIImageModels = [...DIRECT_IMAGE_MODELS.openai, ...connectedOpenAIImageModels].filter((model, index, models) => models.findIndex((candidate) => candidate.id === model.id) === index)
  const googleImageModels = [...DIRECT_IMAGE_MODELS.google, ...connectedGoogleImageModels].filter((model, index, models) => models.findIndex((candidate) => candidate.id === model.id) === index)
  const referenceImageModelGroups = referenceCapableImageModelGroups(openAIImageModels, googleImageModels)
  const imageModelGroups: GroupedMenuGroup[] = usesReferenceImageCatalog ? referenceImageModelGroups : [
    { label: 'fal.ai', options: falImageModels.map((model) => ({ value: `fal::${model.id}`, label: model.label, provider: model.provider as ModelCompany })) },
    { label: 'OpenAI', options: openAIImageModels.map((model) => ({ value: `openai::${model.id}`, label: model.label, provider: 'openai' as const })) },
    { label: 'Google', options: googleImageModels.map((model) => ({ value: `google::${model.id}`, label: model.label, provider: 'google' as const })) },
  ]
  const defaultImageModel = imageProvider === 'openai' ? 'gpt-image-2' : imageProvider === 'google' ? 'gemini-3.1-flash-image' : usesReferenceImageCatalog ? FAL_IMAGE_MODELS.nanoBananaEdit : FAL_IMAGE_MODELS.fluxSchnell
  const requestedImageModelId = data.imageModelId || defaultImageModel
  const imageModelId = imageProvider === 'fal' && usesReferenceImageCatalog
    ? (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(requestedImageModelId) ? requestedImageModelId : FAL_IMAGE_MODELS.nanoBananaEdit
    : requestedImageModelId === FAL_IMAGE_MODELS.nanoBananaEdit ? FAL_IMAGE_MODELS.nanoBanana : requestedImageModelId
  const usesNanoImageModel = imageProvider === 'fal' && imageModelId.includes('nano-banana')
  const supportedImageResolutions = imageResolutionOptions(imageProvider, imageModelId)
  const selectedImageResolution = supportedImageResolutions.includes(data.imageResolution || '1K') ? data.imageResolution || '1K' : supportedImageResolutions[0]
  const characterInputMode = data.kind === 'character' ? data.characterInputMode === 'single' ? 'single' : 'multi' : 'multi'
  const elementInputMode = data.kind === 'element' && data.elementInputMode === 'single' ? 'single' : 'multi'
  const locationInputMode = 'single' as const
  const claimAssetPlaceholderDragOver = (event: ReactDragEvent<HTMLButtonElement>, target: string, acceptsCanvasAsset = true) => {
    if (!event.dataTransfer.types.includes('Files') && !(acceptsCanvasAsset && event.dataTransfer.types.includes(CANVAS_ASSET_DRAG_MIME))) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    setActiveAssetDropTarget(target)
  }
  const releaseAssetPlaceholderDrag = (event: ReactDragEvent<HTMLButtonElement>, target: string) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setActiveAssetDropTarget((current) => current === target ? null : current)
  }
  const filesForAssetDrop = (event: ReactDragEvent<HTMLButtonElement>) => {
    const files = Array.from(event.dataTransfer.files)
    return files.length ? files : Array.from(event.dataTransfer.items).map((item) => item.kind === 'file' ? item.getAsFile() : null).filter((file): file is File => Boolean(file))
  }
  const claimSemanticPlaceholderDrop = (event: ReactDragEvent<HTMLButtonElement>, assetView?: CharacterView | ElementView) => {
    const payload = event.dataTransfer.getData(CANVAS_ASSET_DRAG_MIME)
    const itemFiles = filesForAssetDrop(event)
    if (!payload && !event.dataTransfer.types.includes('Files') && !itemFiles.length) return
    event.preventDefault()
    event.stopPropagation()
    setActiveAssetDropTarget(null)
    if (payload) runtime?.importCanvasAssetIntoView(id, payload, assetView)
    else if (itemFiles.length) runtime?.importDroppedAssets(id, itemFiles, assetView)
  }
  const claimLocationPlaceholderDrop = (event: ReactDragEvent<HTMLButtonElement>) => claimSemanticPlaceholderDrop(event)
  const claimBatchPlaceholderDrop = (event: ReactDragEvent<HTMLButtonElement>) => {
    const files = filesForAssetDrop(event)
    if (!event.dataTransfer.types.includes('Files') && !files.length) return
    event.preventDefault()
    event.stopPropagation()
    setActiveAssetDropTarget(null)
    if (files.length) void dropBatchAssets(files)
  }
  const characterModeAssets = characterAssetsForMode(data.referenceAssets || [], characterInputMode)
  const characterFrontFace = characterModeAssets.find((asset) => asset.metadata?.characterView === 'front')
  const characterReady = characterFrontFace && !reusableOffline
  const characterViewCount = data.kind === 'character' ? new Set(characterModeAssets.map((asset) => asset.metadata?.characterView).filter((view) => CHARACTER_VIEWS.some(([candidate]) => candidate === view))).size : 0
  const reusableRequiredLabel = data.kind === 'element' ? 'Element Required' : data.kind === 'location' ? 'Location Required' : data.kind === 'wardrobe' ? 'Wardrobe Required' : data.kind === 'style-reference' ? 'Style Required' : ''
  const reusableReady = Boolean(reusableRequiredLabel && !reusableOffline && !incompleteSemanticReason(data))
  const elementReferences = data.kind === 'element' ? (data.referenceAssets || []).filter((asset) => asset.metadata?.elementView && (asset.metadata?.elementInputMode === 'single' ? 'single' : 'multi') === elementInputMode) : []
  const elementSheet = elementInputMode === 'single' ? elementReferences.find((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW) : undefined
  const elementMissingViews = data.kind === 'element' ? missingElementViews(elementReferences) : []
  const visibleProgress = data.kind === 'video-generator' && /Kling O3 References/.test(data.progress || '') ? undefined : data.progress
  const suppressTerminal = isCanvasGenerator || data.kind === 'character' || data.kind === 'prompt' && !enhanceOpen
  const notificationCategory = nodeNotificationCategory({ ...data, error: activeDisplayError, progress: visibleProgress, suppressTerminal })
  const visibleStatus = notificationCategory === 'error' ? activeDisplayError : notificationCategory === 'running' || notificationCategory === 'transient' ? visibleProgress : undefined

  const openSaveName = () => {
    const fallback = data.kind === 'character' ? 'character' : data.kind === 'location' ? 'location' : data.kind === 'element' ? 'element' : 'style'
    const current = /^(Custom Character|Custom Style|Custom Location|Custom Element)$/i.test(data.title.trim()) ? '' : data.title.trim()
    setSaveName(normalizeLogicalAssetName(current) || fallback)
    setSaveNameOpen(true)
  }
  useEffect(() => {
    if (!saveNameOpen) return
    window.requestAnimationFrame(() => saveNameInputRef.current?.select())
  }, [saveNameOpen])
  const commitSaveName = () => {
    const name = normalizeLogicalAssetName(saveName)
    if (!name) return
    if (data.kind === 'character') {
      runtime?.saveCharacterAsset(id, name)
    }
    if (data.kind === 'style-reference') runtime?.saveStylePreset(id, name)
    if (data.kind === 'location' || data.kind === 'element' || data.kind === 'wardrobe') runtime?.saveSemanticAsset(id, name)
    setEditorSnapshot(null)
    setEditorSessionMode(null)
    setSaveNameOpen(false)
  }
  const saveReusableAssetDirectly = () => {
    const name = firstPanelAssetName(data.referenceAssets || [])
    if (!name) {
      runtime?.updateNode(id, { error: 'Add an image before saving this asset.' })
      return
    }
    if (data.kind === 'character') {
      runtime?.saveCharacterAsset(id, name)
    } else if (data.kind === 'location' || data.kind === 'element' || data.kind === 'wardrobe') runtime?.saveSemanticAsset(id, name)
    finishReusableEditing()
  }
  const saveSelectedSemanticResult = () => {
    if (!semanticLifecycle) return false
    const next = beginSemanticAssetSave(semanticLifecycle)
    if (next === semanticLifecycle) return false
    dispatchSemanticLifecycle({ type: 'SAVE_REQUESTED' })
    if (next.status === 'SAVE_COMMITTING' && next.pendingSave?.selectedResultId) runtime?.commitSemanticAssetResult(id, next.pendingSave.selectedResultId)
    return false
  }
  const openReusableEditor = () => {
    const identity = normalizeLogicalAssetName(data.referenceTag || data.title)
    const libraryCharacter = data.kind === 'character'
      ? characterLibraryItems.find((item) => normalizeLogicalAssetName(item.referenceTag || item.title) === identity)
      : undefined
    const savedData: StudioNodeData = libraryCharacter ? {
      ...data,
      referenceAssets: libraryCharacter.referenceAssets || data.referenceAssets || [],
      assetGenerationPrompt: libraryCharacter.prompt ?? assetGenerationPrompt,
      prompt: undefined,
      characterInputMode: libraryCharacter.characterInputMode || data.characterInputMode,
      characterAspectRatio: libraryCharacter.characterAspectRatio || data.characterAspectRatio,
    } : data
    const draft = reusableEditorDraft({ ...savedData, semanticAssetLifecycle: persistedSemanticLifecycle }, 'edit', crypto.randomUUID())
    setEditorSnapshot(structuredClone(savedData))
    setEditorBaseline(structuredClone(draft))
    setEditorSessionMode('edit')
    if (data.kind === 'character') setCharacterEditorSessionOpen(true)
    runtime?.updateNode(id, draft)
  }
  const openReusableCreator = () => {
    const draft = reusableEditorDraft(data, 'create')
    setEditorSnapshot(structuredClone(data))
    setEditorBaseline(structuredClone(draft))
    setEditorSessionMode('create')
    if (data.kind === 'character') setCharacterEditorSessionOpen(true)
    runtime?.updateNode(id, draft)
  }
  const cancelReusableEditor = () => {
    if (editorSnapshot) runtime?.updateNode(id, { ...editorSnapshot, semanticReplacementAuthority: undefined, characterEditorOpen: false, styleEditorOpen: false, semanticEditorOpen: false })
    else runtime?.updateNode(id, { semanticReplacementAuthority: undefined, characterEditorOpen: false, styleEditorOpen: false, semanticEditorOpen: false })
    setCharacterEditorSessionOpen(false)
    setEditorSnapshot(null)
    setEditorBaseline(null)
    setEditorSessionMode(null)
  }
  const openRenameName = () => {
    const reusable = (data.referenceAssets || []).some((asset) => ['character', 'element', 'location', 'wardrobe', 'style'].includes(asset.category || ''))
    setRenameName(reusable ? nodeAssetTag.slice(1).replace(/[-_]+/g, ' ') : activeMediaName(data))
    setRenameNameOpen(true)
  }
  const commitRenameName = () => {
    const name = renameName.trim()
    if (!name) return
    runtime?.renameNodeAsset(id, name)
    setRenameNameOpen(false)
  }
  const commitAssetTagDraft = () => {
    const typedName = assetTagDraft.replace(/^@+/, '').replace(/[-_]+/g, ' ').trim()
    if (typedName && typedName !== nodeAssetTag.slice(1).replace(/[-_]+/g, ' ').trim()) runtime?.renameNodeAsset(id, typedName)
    else setAssetTagDraft(nodeAssetTag.slice(1))
  }
  useEffect(() => {
    if (!runnable && !['character', 'element'].includes(data.kind)) return
    let active = true
    const timer = window.setTimeout(() => { void runtime?.estimateNode(id).then((estimate) => { if (active) setCostEstimate(estimate) }).catch(() => { if (active) setCostEstimate(null) }) }, 260)
    return () => { active = false; window.clearTimeout(timer) }
  }, [data.kind, data.videoEngine, data.duration, data.quantity, data.resolution, data.scale, data.imageResolution, data.voiceEngine, id, runnable, runtime])
  const costTooltip = costEstimate ? `Estimated cost: ${costEstimate.totalCost.toLocaleString(undefined, { style: 'currency', currency: costEstimate.currency })}` : 'Estimated cost unavailable'
  const billingProvider: ServiceProvider = generationServiceProvider(data)
  const providerAccount = runtime?.providerAccount(billingProvider)
  const providerBlocked = providerAccount && ['credit-required', 'temporarily-limited', 'unavailable'].includes(providerAccount.state)
  const providerDisconnected = !runtime?.providerConnected(billingProvider)
  const providerName = billingProvider === 'byteplus' ? 'BytePlus Seedance' : billingProvider === 'openai' ? 'OpenAI' : billingProvider === 'google' ? 'Google Gemini' : billingProvider === 'fish' ? 'Fish Audio' : 'fal.ai'
  const providerModelLabel = selectedVideoModel?.label || modelDisplayName(imageModelId || data.videoEngine || data.kind)
  const runReadiness = runnable || ['character', 'element'].includes(data.kind) ? runtime?.runReadiness(id) : undefined
  const runDisabled = Boolean(runReadiness?.disabled && !providerDisconnected)
  const runTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : providerDisconnected
      ? `Select or connect a ${providerName} account to run ${providerModelLabel}.`
    : runReadiness?.disabled
      ? runReadiness.tooltip
      : costTooltip
  const runButtonStateClass = running ? 'is-running' : rerun ? 'is-rerun' : 'is-ready'
  const semanticRunFailure = runReadiness?.disabled ? runReadiness.tooltip.replace(/^Cannot run:\s*/i, '').replace(/[.;]+$/g, '') : ''
  const characterCompletionFailures = [
    providerDisconnected ? `connect ${providerName}` : '',
    providerBlocked ? providerAccount?.message || `${providerName} is unavailable` : '',
    characterInputMode === 'multi' && !characterFrontFace ? 'add the required Face' : '',
    characterInputMode === 'single' && !assetGenerationPrompt.trim() ? 'describe the Character' : '',
  ].filter(Boolean)
  const characterCompletionDisabled = characterInputMode === 'multi' && characterViewCount >= CHARACTER_VIEWS.length || (!running && characterCompletionFailures.length > 0)
  const characterCompletionTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : characterInputMode === 'multi' && characterViewCount >= CHARACTER_VIEWS.length
      ? 'No completion needed: all nine Character views are already complete.'
      : characterCompletionFailures.length
        ? `Cannot complete Character: ${formatRequirementList(characterCompletionFailures)}.`
        : costTooltip
  const elementCompletionFailures = [
    semanticRunFailure,
  ].filter(Boolean)
  const elementCompletionDisabled = elementMissingViews.length === 0 || (!running && elementCompletionFailures.length > 0)
  const elementCompletionTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : elementMissingViews.length === 0
      ? 'No completion needed: Front, Three-Quarter, Side, and Back are already complete.'
      : elementCompletionFailures.length
        ? `Cannot complete Element: ${formatRequirementList(elementCompletionFailures)}.`
        : !elementReferences.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)
          ? costTooltip
          : costTooltip
  const styleBuildFailures = [
    !(data.styleDescription || '').trim() ? 'add the required short description' : '',
    !assetGenerationPrompt.trim() ? 'add custom Style wording' : '',
    providerDisconnected ? 'connect fal.ai in Connections' : '',
    providerBlocked ? providerAccount?.message || 'fal.ai is unavailable' : '',
  ].filter(Boolean)
  const styleBuildTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : styleBuildFailures.length
      ? `Cannot build Style prompt: ${formatRequirementList(styleBuildFailures)}.`
      : 'Estimated cost unavailable'

  const semanticEditorActive = data.kind === 'style-reference' && styleCreateOpen
    || data.kind === 'character' && characterCreateOpen
    || ['element', 'location', 'wardrobe'].includes(data.kind) && semanticCreateOpen
  const semanticAssetLabel = data.kind === 'style-reference' ? 'Style' : data.kind === 'character' ? 'Character' : data.kind === 'location' ? 'Location' : data.kind === 'wardrobe' ? 'Wardrobe' : 'Element'
  const semanticModelControl = <GroupedMenuSelect className="compact-engine image-engine" menuClassName="character-ai-provider-menu" ariaLabel={`${semanticAssetLabel} image model`} title="Image model" defaultLabel={modelDisplayName(imageModelId)} fillTrack value={`${imageProvider}::${imageModelId}`} groups={referenceImageModelGroups} onChange={(nextValue) => { const [provider, ...modelParts] = nextValue.split('::'); runtime?.updateNode(id, { ...imageModelSelectionPatch(provider as StudioNodeData['imageProvider'], modelParts.join('::'), data.imageResolution), error: undefined }) }} />
  const selectedSemanticResultIsGenerated = semanticLifecycle?.references.find((reference) => reference.id === semanticLifecycle.selectedId)?.source === 'generated'
  const semanticSaveDisabled = selectedSemanticResultIsGenerated
    ? !semanticLifecycle?.canSave
    : data.kind === 'character' ? !characterReady : data.kind === 'element' ? !elementReferences.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW) : data.kind === 'style-reference' ? data.runState !== 'complete' || !(data.stylePrompt || '').trim() || saveNameOpen && !saveName.trim() : !(data.referenceAssets || []).length
  const semanticSaveControl = <FooterSaveAction ariaLabel={`Save ${semanticAssetLabel}`} disabled={semanticSaveDisabled} onSave={selectedSemanticResultIsGenerated ? saveSelectedSemanticResult : data.kind === 'style-reference' ? saveNameOpen ? commitSaveName : () => { openSaveName(); return false } : saveReusableAssetDirectly} />
  const semanticRunControl = data.kind === 'character'
    ? <PlayTooltip tooltip={characterCompletionTooltip} persistent={running} disabled={!running && characterCompletionDisabled}><button className={`footer-run ${running ? 'is-running' : characterFrontFace ? 'is-rerun' : 'is-ready'} ${characterCompletionFailures.length ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop Character Generation' : characterInputMode === 'single' ? 'Generate Complete Character Sheet' : 'Complete Missing Character Views'} disabled={!running && characterCompletionDisabled} onClick={() => running ? runtime?.stopNode(id) : runtime?.completeCharacterSet(id)}>{running ? <StopIcon /> : characterFrontFace ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
    : data.kind === 'element'
      ? <PlayTooltip tooltip={elementCompletionTooltip} persistent={running} disabled={!running && elementCompletionDisabled}><button className={`footer-run ${running ? 'is-running' : 'is-ready'} ${elementCompletionFailures.length ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop Element Generation' : elementReferences.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW) ? 'Complete With AI' : 'Create Three-Quarter'} disabled={!running && elementCompletionDisabled} onClick={() => running ? runtime?.stopNode(id) : runtime?.completeElementSet(id)}>{running ? <StopIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
      : data.kind === 'style-reference'
        ? <PlayTooltip tooltip={styleBuildTooltip} persistent={running} disabled={!running && styleBuildFailures.length > 0}><button className={`footer-run ${running ? 'is-running' : 'is-ready'} ${styleBuildFailures.length ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop Style Prompt Build' : 'Build Style Prompt'} disabled={!running && styleBuildFailures.length > 0} onClick={() => running ? runtime?.stopNode(id) : runtime?.buildStylePrompt(id)}>{running ? <StopIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
        : <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''} ${providerDisconnected ? 'is-connection-required' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : `Generate ${semanticAssetLabel}`} onClick={() => running ? runtime?.stopNode(id) : providerDisconnected ? runtime?.openConnections(billingProvider, providerModelLabel) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon /> : rerun ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>

  const assetBatchGuidance = assetBatchKind === 'character' ? '2+ Character sheets' : assetBatchKind === 'element' ? '2+ Element images' : assetBatchKind === 'location' ? '2+ Location images' : '2+ Wardrobe images without faces'
  const assetBatchPanel = assetBatchOpen && assetBatchKind ? <div className="asset-batch-panel asset-intake-surface">
    {!assetBatchRows.length ? <button className={`asset-batch-drop-zone asset-intake-placeholder ${activeAssetDropTarget === 'batch' ? 'is-drag-over' : ''}`} type="button" disabled={assetBatchBusy} onClick={() => void chooseBatchAssets()} onDragEnterCapture={(event) => claimAssetPlaceholderDragOver(event, 'batch', false)} onDragOverCapture={(event) => claimAssetPlaceholderDragOver(event, 'batch', false)} onDragLeaveCapture={(event) => releaseAssetPlaceholderDrag(event, 'batch')} onDropCapture={claimBatchPlaceholderDrop}><Layers3 size={20} /><strong>{assetBatchBusy ? 'Checking images…' : `Add ${assetBatchKind === 'character' ? 'Character' : assetBatchKind === 'location' ? 'Location' : assetBatchKind === 'wardrobe' ? 'Wardrobe' : 'Element'} Batch`}</strong><small>{assetBatchGuidance}</small></button>
      : <>
        <div className="asset-batch-rows" data-overflow={assetBatchRows.length > 5 ? 'true' : 'false'}>{assetBatchRows.map((row) => <article className="asset-batch-row" key={row.id}>
          <img src={row.previewDataUrl} alt="" />
          <div className="asset-batch-name">{renamingBatchRowId === row.id || !row.displayName ? <input autoFocus value={row.displayName} placeholder="Rename asset" aria-label="Rename asset" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setAssetBatchRows((current) => current.map((item) => item.id === row.id ? { ...item, displayName: event.target.value } : item))} onBlur={() => { if (row.displayName.trim()) setRenamingBatchRowId(null) }} onKeyDown={(event) => { if (event.key === 'Enter' && row.displayName.trim()) setRenamingBatchRowId(null) }} /> : <><strong title={row.displayName}>{row.displayName}</strong><button title="Rename Asset" aria-label="Rename Asset" onClick={() => setRenamingBatchRowId(row.id)}><PencilLine size={11} /></button></>}</div>
          <button className="asset-batch-delete" title="Remove Staged Asset" aria-label="Remove Staged Asset" onClick={() => setAssetBatchRows((current) => current.filter((item) => item.id !== row.id))}><Trash2 size={12} /></button>
          <button className="asset-batch-save" title="Save Asset" aria-label="Save Asset" disabled={assetBatchBusy || !row.displayName.trim()} onClick={() => void saveBatchRow(row)}><Save size={13} /></button>
        </article>)}</div>
        <div className="asset-batch-footer"><button disabled={assetBatchBusy || assetBatchRows.some((row) => !row.displayName.trim())} onClick={() => void saveAllBatchRows()}><Save size={13} />Save All Assets</button></div>
      </>}
  </div> : null

  return (
    <article className={`studio-node kind-${data.kind} tone-${meta.tone} ${selected ? 'is-selected' : ''} ${data.locked ? 'is-locked' : ''} ${running ? 'is-generating' : ''} ${isCanvasGenerator ? 'is-canvas-generator' : ''} ${isMediaTile ? 'is-media-tile' : ''}`} aria-busy={running || undefined}>
      {toolbarEligible && <div className="node-hover-toolbar nodrag" onDoubleClick={(event) => event.stopPropagation()}>
        {runnable && <PlayTooltip className="toolbar-run-tooltip" tooltip={runTooltip} disabled={!running && runDisabled}><button type="button" className={`toolbar-run-button ${runButtonStateClass}`} aria-label={running ? 'Stop Node' : rerun ? 'Rerun Node' : 'Run Node'} onClick={() => running ? runtime?.stopNode(id) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon /> : rerun ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>}
        <button data-tooltip="Connect" aria-label="Connect Node" onClick={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY)}><Link2 size={13} /></button>
        <button data-tooltip="Duplicate [⌘D]" aria-label="Duplicate Node" aria-keyshortcuts="Meta+D" onClick={() => runtime?.duplicateNode(id)}><Copy size={13} /></button>
        <button data-tooltip={data.locked ? 'Unlock Position' : 'Lock Position'} aria-label={data.locked ? 'Unlock Node Position' : 'Lock Node Position'} aria-pressed={Boolean(data.locked)} onClick={() => runtime?.updateNode(id, { locked: !data.locked })}>{data.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
        {canRenameAsset && <button data-tooltip="Rename Asset" aria-label="Rename Asset" onClick={openRenameName}><PencilLine size={13} /></button>}
        <button data-tooltip="Delete [⌫]" aria-label="Delete Node" aria-keyshortcuts="Backspace Delete" onClick={() => runtime?.deleteNode(id)}><Trash2 size={13} /></button>
      </div>}
      {inputPorts.map((port) => <NodePort key={port.id} id={port.id} type="target" signal={port.signal} label={port.label} icon={port.icon} position={Position.Left} style={{ top: port.top }} onRoute={(event) => runtime?.openInputQuickConnect(id, port.id, event.clientX, event.clientY)} />)}
      {renameNameOpen && <div className="asset-save-name-popover node-rename-name-popover nodrag">
        <input autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Asset name" value={renameName} onChange={(event) => setRenameName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitRenameName(); if (event.key === 'Escape') setRenameNameOpen(false) }} />
        <button onClick={commitRenameName} disabled={!renameName.trim()}><Check size={11} />Rename</button>
      </div>}
      {!data.headerHidden && showsAssetTag && (canRenameAsset
        ? <label className={`node-asset-tag nodrag ${reusableEditorDirty ? 'is-unsaved' : ''}`} title={reusableEditorDirty ? 'Unsaved changes' : 'Double-click to rename asset'} onDoubleClick={(event) => { event.stopPropagation(); if (!reusableEditorDirty) setAssetTagEditing(true) }}><span>@</span>{assetTagEditing && !reusableEditorDirty ? <input autoFocus aria-label={`Rename ${data.title}`} value={assetTagDraft} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setAssetTagDraft(event.target.value)} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onBlur={() => { commitAssetTagDraft(); setAssetTagEditing(false) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } if (event.key === 'Escape') { setAssetTagDraft(nodeAssetTag.slice(1)); setAssetTagEditing(false) } }} /> : <strong>{reusableEditorDirty ? 'Unsaved' : assetTagDraft}</strong>}</label>
        : <div className="node-asset-tag is-readonly nodrag" aria-label={`Preset Asset Tag ${nodeAssetTag}`}><span>@</span><strong>{nodeAssetTag.slice(1)}</strong></div>)}
      {!data.headerHidden && <header className={`node-header ${isCanvasGenerator ? 'generator-node-header' : ''}`}>
        <span className="node-icon"><Icon size={15} /></span>
        <div>
          <strong>{meta.label}</strong>
          <small>{meta.subtitle}</small>
        </div>
        {data.kind === 'character' && (characterCreateOpen ? <button className="header-readiness-pill is-action is-cancel" aria-label="Cancel Asset Creation" onClick={cancelReusableEditor}>Cancel</button> : <span className={`header-readiness-pill ${characterReady ? 'is-ready' : 'is-required'} ${reusableOffline ? 'is-offline' : ''}`}>{reusableOffline ? 'Offline' : characterReady ? 'Ready' : 'Face Required'}</span>)}
        {['element', 'location', 'wardrobe', 'style-reference'].includes(data.kind) && ((data.kind === 'style-reference' ? styleCreateOpen : semanticCreateOpen) ? <button className="header-readiness-pill is-action is-cancel" aria-label="Cancel Asset Creation" onClick={cancelReusableEditor}>Cancel</button> : <span className={`header-readiness-pill ${reusableReady ? 'is-ready' : 'is-required'} ${reusableOffline ? 'is-offline' : ''}`}>{reusableOffline ? 'Offline' : reusableReady ? 'Ready' : reusableRequiredLabel}</span>)}
        {data.kind === 'prompt' && <button className={`prompt-enhance-switch nodrag ${enhanceOpen ? 'is-active' : ''}`} role="switch" aria-checked={enhanceOpen} title={enhanceOpen ? 'Turn Off Prompt Enhancement' : 'Turn On Prompt Enhancement'} onClick={() => { setEnhanceOpen((value) => !value); runtime?.updateNode(id, { error: undefined, progress: undefined }) }}><Sparkles className="prompt-enhance-switch-icon" size={12} /><span>Enhance</span><span className="prompt-enhance-track"><i /></span></button>}
      </header>}

      {data.kind === 'prompt' && (
        <div className="prompt-node-body nodrag">
          <TaggedPromptTextarea className="node-textarea" value={data.prompt || ''} connectedTags={connectedPromptTags} availableTags={availablePromptTags} placeholder="Describe a world, product, frame, or movement…" onValueChange={(prompt) => runtime?.updatePrompt(id, prompt)} />
          {enhanceOpen && <div className="prompt-enhance-popover prompt-enhance-inline">
            <div className="prompt-enhance-compact">
              <div className="prompt-enhance-model-picker">
                <GroupedMenuSelect className="prompt-enhance-model" menuClassName="prompt-enhance-model-menu" ariaLabel="Enhance model" value={`${enhanceProvider}::${enhanceModel || ''}`} displayLabel={enhanceModelLabel} groups={enhanceGroups.map((group) => ({ label: group.label, options: group.models.map((model) => ({ value: `${group.provider}::${model.id}`, label: model.label })) }))} onChange={(selection) => { const [provider, ...modelParts] = selection.split('::'); runtime?.updateNode(id, { assistantProvider: provider as AssistantProvider, assistantModelId: modelParts.join('::'), error: undefined, progress: undefined }) }} />
              </div>
              <button className="prompt-enhance-round" title="Connections" aria-label="Open Connections" onClick={() => runtime?.openConnections(enhanceProvider, enhanceModelLabel)}><Settings size={13} /></button>
              <button className="prompt-enhance-apply" title="Apply Enhancement" aria-label="Apply Enhancement" disabled={enhanceBlocked || !enhanceModel || !(data.prompt || '').trim() || data.runState === 'running'} onClick={() => runtime?.runAssistantNode(id)}>{data.runState === 'running' ? <LoaderCircle size={11} className="spin" /> : 'Apply'}</button>
            </div>
            {displayError && <small className="prompt-enhance-hint">{displayError}</small>}
          </div>}
        </div>
      )}

      {data.kind === 'upload' && !data.assetUrl && (
        <button className="upload-drop media-tile-empty nodrag" onClick={() => runtime?.importAsset(id)}>
          <Upload size={18} />
          <span>Choose Media</span>
          <small>A protected copy stays in your library</small>
        </button>
      )}

      {isSemanticReference && (
        <div className="semantic-reference semantic-tile nodrag">
          {!styleCreateOpen && !characterCreateOpen && !semanticCreateOpen && <label className="semantic-library-search"><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder={`Search ${data.kind === 'style-reference' ? 'Styles' : data.kind === 'character' ? 'Characters' : data.kind === 'location' ? 'Locations' : data.kind === 'wardrobe' ? 'Wardrobes' : 'Elements'}`} aria-label={`Search ${data.kind === 'style-reference' ? 'Styles' : data.kind === 'character' ? 'Characters' : data.kind === 'location' ? 'Locations' : data.kind === 'wardrobe' ? 'Wardrobes' : 'Elements'}`} />{!libraryQuery && <Search size={12} aria-hidden="true" />}</label>}
          {data.kind === 'style-reference' && !styleCreateOpen && <div className="style-preset-browser">
            <div
              ref={assetSelector.railRef}
              className={`style-preset-strip horizontal-asset-selector nowheel nodrag ${assetSelector.dragging ? 'is-dragging' : ''}`}
              aria-label="Style Presets"
              {...assetSelector.railProps}
            >
              {filteredStylePresets.map((preset) => <button key={preset.id} className={data.stylePresetId === preset.id ? 'is-active' : ''} title={preset.title} onClick={() => { if (assetSelector.shouldSuppressClick()) return; runtime?.updateNode(id, { title: preset.title, referenceTag: `@${preset.id}`, prompt: preset.prompt, stylePrompt: preset.prompt, styleDescription: preset.description, stylePresetId: preset.id, styleSavedAt: undefined, styleEditorOpen: false }) }}><span style={{ backgroundImage: `url(${preset.thumbnail})`, backgroundPosition: preset.focalPosition, backgroundSize: 'cover' }} /><strong>{preset.title}</strong></button>)}
              {filteredSemanticLibrary.map((item) => { const offline = selectorAvailability(item.referenceAssets).state === 'offline'; const previewAssets = balancedAssetPreview(item.referenceAssets); return <button key={item.nodeId} className={`semantic-selector-item ${reusableSelectorItemIsActive(data, item) ? 'is-active' : ''} ${offline ? 'is-offline' : ''}`} draggable={!offline} title={item.title} onDragStart={(event) => { if (offline) event.preventDefault() }} onClick={() => { if (assetSelector.shouldSuppressClick()) return; runtime?.selectSemanticAsset(id, item.nodeId) }}><span className="asset-sheet-thumbnail" data-preview-count={previewAssets.length}>{previewAssets.length ? previewAssets.map((asset) => <img key={asset.id} data-asset-id={asset.id} src={asset.url} alt="" loading="lazy" decoding="async" />) : <Palette size={18} />}{offline && <span className="semantic-thumbnail-offline-overlay"><MediaOfflineState mediaFamily="image" state="offline" compact showFind={false} onFind={() => undefined} /></span>}</span><strong>{item.title}</strong></button> })}
            </div>
          </div>}
          {data.kind === 'style-reference' && styleCreateOpen && <div className="style-create-panel-head"><span>Custom Style</span></div>}
          {data.kind === 'character' && !characterCreateOpen && <>
            {filteredCharacters.length ? <div className="style-preset-browser character-preset-browser">
              <div
                ref={assetSelector.railRef}
                className={`style-preset-strip character-preset-strip horizontal-asset-selector nowheel nodrag ${assetSelector.dragging ? 'is-dragging' : ''}`}
                aria-label="Character Presets"
                {...assetSelector.railProps}
              >
                {filteredCharacters.map((character) => { const previewAssets = characterThumbnailPreview(character.referenceAssets); const offline = selectorAvailability(character.referenceAssets).state === 'offline'; return <button key={character.nodeId} className={`semantic-selector-item ${reusableSelectorItemIsActive(data, character) ? 'is-active' : ''} ${offline ? 'is-offline' : ''}`} draggable={!offline} title={character.title} onDragStart={(event) => { if (offline) event.preventDefault() }} onClick={() => { if (assetSelector.shouldSuppressClick()) return; setAssetBatchOpen(false); runtime?.selectCharacter(id, character.nodeId) }}><span className="asset-sheet-thumbnail character-sheet-thumbnail" data-preview-count={previewAssets.length}>{previewAssets.length ? previewAssets.map((asset) => <img key={asset.id} data-asset-id={asset.id} src={asset.url} alt="" loading="lazy" decoding="async" style={{ objectPosition: previewFocalPosition(asset, true) }} />) : <UserRound size={18} />}{offline && <span className="semantic-thumbnail-offline-overlay"><MediaOfflineState mediaFamily="image" state="offline" compact showFind={false} onFind={() => undefined} /></span>}</span><strong>{character.title}</strong></button> })}
              </div>
            </div> : <div className="character-library-empty"><UserRound size={20} /><strong>{normalizedLibraryQuery ? 'No Matching Characters' : 'No Characters Yet'}</strong><span>{normalizedLibraryQuery ? 'Try another search.' : 'Create the first reusable identity for this project.'}</span></div>}
          </>}
          {['element', 'location', 'wardrobe'].includes(data.kind) && !semanticCreateOpen && <>
            {filteredSemanticLibrary.length ? <div className="style-preset-browser semantic-preset-browser">
              <div ref={assetSelector.railRef} className={`style-preset-strip semantic-preset-strip horizontal-asset-selector nowheel nodrag ${assetSelector.dragging ? 'is-dragging' : ''}`} aria-label={`${data.kind === 'location' ? 'Location' : data.kind === 'wardrobe' ? 'Wardrobe' : 'Element'} Presets`} {...assetSelector.railProps}>
                {filteredSemanticLibrary.map((item) => { const previewAssets = balancedAssetPreview(item.referenceAssets, data.kind === 'element' || data.kind === 'location' || data.kind === 'wardrobe' ? data.kind : undefined); const offline = selectorAvailability(item.referenceAssets).state === 'offline'; return <button key={item.nodeId} className={`semantic-selector-item ${reusableSelectorItemIsActive(data, item) ? 'is-active' : ''} ${offline ? 'is-offline' : ''}`} draggable={!offline} title={item.title} onDragStart={(event) => { if (offline) event.preventDefault() }} onClick={() => { if (assetSelector.shouldSuppressClick()) return; setAssetBatchOpen(false); runtime?.selectSemanticAsset(id, item.nodeId) }}><span className="asset-sheet-thumbnail" data-preview-count={previewAssets.length}>{previewAssets.length ? previewAssets.map((asset) => <img key={asset.id} data-asset-id={asset.id} src={asset.url} alt="" loading="lazy" decoding="async" />) : data.kind === 'location' ? <Mountain size={18} /> : data.kind === 'wardrobe' ? <Shirt size={18} /> : <Box size={18} />}{offline && <span className="semantic-thumbnail-offline-overlay"><MediaOfflineState mediaFamily="image" state="offline" compact showFind={false} onFind={() => undefined} /></span>}</span><strong>{item.title}</strong></button> })}
              </div>
            </div> : <div className="character-library-empty">{data.kind === 'location' ? <Mountain size={20} /> : data.kind === 'wardrobe' ? <Shirt size={20} /> : <Box size={20} />}<strong>{normalizedLibraryQuery ? `No Matching ${data.kind === 'location' ? 'Locations' : data.kind === 'wardrobe' ? 'Wardrobes' : 'Elements'}` : `No ${data.kind === 'location' ? 'Locations' : data.kind === 'wardrobe' ? 'Wardrobes' : 'Elements'} Yet`}</strong><span>{normalizedLibraryQuery ? 'Try another search.' : `Create the first reusable ${data.kind}.`}</span></div>}
          </>}
          {!styleCreateOpen && !characterCreateOpen && !semanticCreateOpen && hasMaterializedAsset(data) && !data.reusableDeletedAt && <div className="reusable-large-preview nodrag">
            <div className={`reusable-large-preview-media generated-media-stage ${data.kind === 'style-reference' ? 'is-style-preview' : ''} ${data.kind === 'character' ? 'is-character-preview' : ''} ${intrinsicSemanticRatio && reusablePreviewAssets.length === 1 ? 'is-intrinsic-single' : ''}`} data-preview-count={selectedSemanticGeneratedResult ? 1 : selectedStylePreset ? 1 : reusablePreviewAssets.length}>{mediaLinkState ? <MediaOfflineState mediaFamily={mediaLinkState.mediaFamily} state={mediaLinkState.state} findingDots={mediaLinkState.findingDots} onFind={() => runtime?.findOfflineAsset(mediaLinkState.assetId)} /> : selectedSemanticGeneratedResult ? <img src={selectedSemanticGeneratedResult.url} alt="Selected generated result" draggable={false} onDragStart={(event) => event.preventDefault()} /> : selectedStylePreset ? <img src={selectedStylePreset.thumbnail} alt={`${selectedStylePreset.title} preview`} style={{ objectPosition: selectedStylePreset.focalPosition }} draggable={false} onDragStart={(event) => event.preventDefault()} /> : reusablePreviewAssets.length ? reusablePreviewAssets.map((asset) => <img key={asset.id} src={asset.url} alt="" data-character-view={data.kind === 'character' ? asset.metadata?.characterView : undefined} style={{ objectPosition: previewFocalPosition(asset, data.kind === 'character') }} draggable={false} onDragStart={(event) => event.preventDefault()} />) : data.kind === 'style-reference' ? <Palette size={28} /> : data.kind === 'location' ? <Mountain size={28} /> : data.kind === 'wardrobe' ? <Shirt size={28} /> : data.kind === 'element' ? <Box size={28} /> : <UserRound size={28} />}{selectedSemanticGeneratedResult && generatedMediaOverlayFor(semanticGeneratedIndex, () => selectSemanticGeneratedResult(semanticGeneratedIndex - 1), () => selectSemanticGeneratedResult(semanticGeneratedIndex + 1))}</div>
            {data.kind === 'style-reference' && <div className="reusable-large-preview-caption"><strong>{data.title}</strong><span>{selectedStylePreset?.description || data.styleDescription || 'A custom reusable visual style for consistent generated media.'}</span></div>}
            {semanticLifecycle?.status === 'SAVE_COMPLETE' && <div className="semantic-asset-save-status" aria-live="polite">Result saved.</div>}
            {!selectedSemanticGeneratedResult && <div className="reusable-large-preview-actions"><button title={(data.referenceAssets || []).some((asset) => asset.favorite) ? 'Remove From Favorites' : 'Add To Favorites'} onClick={() => runtime?.setReusableFavorite(id, !(data.referenceAssets || []).some((asset) => asset.favorite))}><Heart size={13} fill={(data.referenceAssets || []).some((asset) => asset.favorite) ? 'currentColor' : 'none'} /></button>{!selectedStylePreset && <button title="Export" disabled={!(data.referenceAssets || []).length && !(data.kind === 'style-reference' && (data.stylePrompt || data.prompt || '').trim())} onClick={() => runtime?.exportReusableAsset(id)}><Upload size={13} /></button>}{!selectedStylePreset ? <button title="Edit" aria-label="Edit" onClick={openReusableEditor}><PencilLine size={13} /></button> : null}{!selectedStylePreset && <button title="Delete" onClick={() => runtime?.deleteReusableAsset(id)}><Trash2 size={13} /></button>}</div>}
          </div>}
          {!styleCreateOpen && !characterCreateOpen && !semanticCreateOpen && <button className={`style-create-toggle ${data.kind === 'character' ? 'character-create-toggle' : ''}`} onClick={openReusableCreator}><Plus size={12} />Create {data.kind === 'style-reference' ? 'Style' : data.kind === 'character' ? 'Character' : data.kind === 'location' ? 'Location' : data.kind === 'wardrobe' ? 'Wardrobe' : 'Element'}</button>}
          {['element', 'location', 'wardrobe'].includes(data.kind) && semanticCreateOpen && <div className="style-create-panel-head"><span>Custom {data.kind === 'location' ? 'Location' : data.kind === 'wardrobe' ? 'Wardrobe' : 'Element'}</span></div>}
          {data.kind === 'character' && characterCreateOpen && <div className="style-create-panel-head"><span>Custom Character</span></div>}
          {data.kind === 'character' && characterCreateOpen ? <>
            <div className="character-input-mode" role="group" aria-label="Character image intake mode">
              <button type="button" className={!assetBatchOpen && characterInputMode === 'multi' ? 'is-active' : ''} aria-pressed={!assetBatchOpen && characterInputMode === 'multi'} onClick={() => { setAssetBatchOpen(false); runtime?.updateNode(id, { characterInputMode: 'multi', error: undefined, progress: undefined }) }}><LayoutGrid size={13} />Multi</button>
              <button type="button" className={!assetBatchOpen && characterInputMode === 'single' ? 'is-active' : ''} aria-pressed={!assetBatchOpen && characterInputMode === 'single'} onClick={() => { setAssetBatchOpen(false); runtime?.updateNode(id, { characterInputMode: 'single', error: undefined, progress: undefined }) }}><ImageIcon size={13} />Sheets</button>
              <button type="button" className={assetBatchOpen ? 'is-active' : ''} aria-pressed={assetBatchOpen} onClick={() => { setAssetBatchOpen(true); runtime?.updateNode(id, { error: undefined, progress: undefined }) }}><Layers3 size={13} />Batch</button>
            </div>
            {assetBatchOpen ? assetBatchPanel : characterInputMode === 'single' ? <div className="character-single-mode asset-intake-surface semantic-active-preview-stage"><button className={`character-single-image-stage asset-intake-placeholder ${activeAssetDropTarget === 'character-sheet' ? 'is-drag-over' : ''}`} type="button" onClick={() => runtime?.importAsset(id, 'front')} onDragEnterCapture={(event) => claimAssetPlaceholderDragOver(event, 'character-sheet')} onDragOverCapture={(event) => claimAssetPlaceholderDragOver(event, 'character-sheet')} onDragLeaveCapture={(event) => releaseAssetPlaceholderDrag(event, 'character-sheet')} onDropCapture={(event) => claimSemanticPlaceholderDrop(event, 'front')}>
              {selectedSemanticReference?.url ? <img src={selectedSemanticReference.url} alt="Selected Character result" /> : characterFrontFace?.url ? <img src={characterFrontFace.url} alt="Character Sheets" /> : <span><Plus size={18} /><strong>Add Character Sheet or Reference</strong></span>}
              {characterFrontFace && !selectedSemanticGeneratedResult && <i className="asset-part-remove" role="button" aria-label="Remove Single Character Image" title="Remove Single Character Image" onClick={(event) => { event.preventDefault(); event.stopPropagation(); editorSessionMode === 'edit' ? runtime?.deleteReusableAsset(id, 'sheet') : runtime?.updateNode(id, { referenceAssets: (data.referenceAssets || []).filter((item) => item.id !== characterFrontFace.id) }) }}><Trash2 size={10} /></i>}
            </button>{semanticGeneratedOverlay}</div> : <div className="character-view-grid semantic-active-preview-stage">{CHARACTER_VIEWS.map(([view, label]) => {
            const asset = characterModeAssets.find((item) => item.metadata?.characterView === view)
            const locked = view !== 'front' && !characterFrontFace
            return <button key={view} disabled={locked} title={locked ? `Add Face first to unlock ${label}` : asset ? `${label}: ${asset.name}` : `Add ${label}`} onClick={() => runtime?.importAsset(id, view)} onDragOver={(event) => { if (!locked && (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes(CANVAS_ASSET_DRAG_MIME))) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={(event) => { if (locked) return; const payload = event.dataTransfer.getData(CANVAS_ASSET_DRAG_MIME); if (!payload && !event.dataTransfer.files.length) return; event.preventDefault(); event.stopPropagation(); if (payload) runtime?.importCanvasAssetIntoView(id, payload, view); else runtime?.importDroppedAssets(id, Array.from(event.dataTransfer.files), view) }}>{!asset?.url && <ViewFramework kind="character" view={view} />}{asset?.url ? <img src={asset.url} alt={label} /> : locked ? <Lock size={13} /> : <Plus size={13} />}<span>{label}</span>{asset && <i className="asset-part-remove" role="button" aria-label={`Remove ${label}`} title={`Remove ${label}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); runtime?.updateNode(id, { referenceAssets: (data.referenceAssets || []).filter((item) => item.id !== asset.id) }) }}><Trash2 size={10} /></i>}</button>
          })}</div>}
          </> : data.kind === 'element' && semanticCreateOpen ? <>
            {!cameraObjectSurface && <div className="character-input-mode" role="group" aria-label="Element image intake mode">
              <button type="button" className={!assetBatchOpen && elementInputMode === 'multi' ? 'is-active' : ''} aria-pressed={!assetBatchOpen && elementInputMode === 'multi'} onClick={() => { setAssetBatchOpen(false); runtime?.updateNode(id, { elementInputMode: 'multi', error: undefined, progress: undefined }) }}><LayoutGrid size={13} />Multi</button>
              <button type="button" className={!assetBatchOpen && elementInputMode === 'single' ? 'is-active' : ''} aria-pressed={!assetBatchOpen && elementInputMode === 'single'} onClick={() => { setAssetBatchOpen(false); runtime?.updateNode(id, { elementInputMode: 'single', error: undefined, progress: undefined }) }}><ImageIcon size={13} />Sheets</button>
              <button type="button" className={assetBatchOpen ? 'is-active' : ''} aria-pressed={assetBatchOpen} onClick={() => { setAssetBatchOpen(true); runtime?.updateNode(id, { error: undefined, progress: undefined }) }}><Layers3 size={13} />Batch</button>
            </div>}
            {assetBatchOpen ? assetBatchPanel : elementInputMode === 'single' ? <div className="character-single-mode asset-intake-surface semantic-active-preview-stage"><button className={`character-single-image-stage asset-intake-placeholder ${activeAssetDropTarget === 'element-sheet' ? 'is-drag-over' : ''}`} type="button" onClick={() => runtime?.importAsset(id, ELEMENT_ANCHOR_VIEW)} onDragEnterCapture={(event) => claimAssetPlaceholderDragOver(event, 'element-sheet')} onDragOverCapture={(event) => claimAssetPlaceholderDragOver(event, 'element-sheet')} onDragLeaveCapture={(event) => releaseAssetPlaceholderDrag(event, 'element-sheet')} onDropCapture={(event) => claimSemanticPlaceholderDrop(event, ELEMENT_ANCHOR_VIEW)}>
              {selectedSemanticReference?.url ? <img src={selectedSemanticReference.url} alt="Selected Element result" /> : elementSheet?.url ? <img src={elementSheet.url} alt="Element Sheets" /> : <span><Plus size={18} /><strong>Add Element Sheet or Reference</strong></span>}
              {elementSheet && !selectedSemanticGeneratedResult && <i className="asset-part-remove" role="button" aria-label="Remove Element Sheets" title="Remove Element Sheets" onClick={(event) => { event.preventDefault(); event.stopPropagation(); editorSessionMode === 'edit' ? runtime?.deleteReusableAsset(id, 'sheet') : runtime?.updateNode(id, { referenceAssets: (data.referenceAssets || []).filter((item) => item.id !== elementSheet.id) }) }}><Trash2 size={10} /></i>}
            </button>{semanticGeneratedOverlay}</div> : <div className="character-view-grid element-view-grid semantic-active-preview-stage">{ELEMENT_VIEWS.map(({ id: view, label }) => {
            const asset = elementReferences.find((item) => item.metadata?.elementView === view)
            const locked = view !== ELEMENT_ANCHOR_VIEW && !elementReferences.some((item) => item.metadata?.elementView === ELEMENT_ANCHOR_VIEW)
            return <button key={view} disabled={locked} title={locked ? `Add Three-Quarter first to unlock ${label}` : asset ? `${label}: ${asset.name}` : `Add ${label}`} onClick={() => runtime?.importAsset(id, view)} onDragOver={(event) => { if (!locked && (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes(CANVAS_ASSET_DRAG_MIME))) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={(event) => { if (locked) return; const payload = event.dataTransfer.getData(CANVAS_ASSET_DRAG_MIME); if (!payload && !event.dataTransfer.files.length) return; event.preventDefault(); event.stopPropagation(); if (payload) runtime?.importCanvasAssetIntoView(id, payload, view); else runtime?.importDroppedAssets(id, Array.from(event.dataTransfer.files), view) }}>{!asset?.url && <ViewFramework kind="element" view={view} />}{asset?.url ? <img src={asset.url} alt={label} /> : locked ? <Lock size={13} /> : <Plus size={13} />}<span>{label}</span>{asset && <i className="asset-part-remove" role="button" aria-label={`Remove ${label}`} title={`Remove ${label}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); runtime?.updateNode(id, { referenceAssets: (data.referenceAssets || []).filter((item) => item.id !== asset.id) }) }}><Trash2 size={10} /></i>}</button>
          })}</div>}</> : data.kind === 'location' && semanticCreateOpen ? <>
            <div className="character-input-mode location-input-mode" role="group" aria-label="Location image intake mode">
              <button type="button" className={!assetBatchOpen ? 'is-active' : ''} aria-pressed={!assetBatchOpen} onClick={() => { setAssetBatchOpen(false); runtime?.updateNode(id, { locationInputMode: 'single', error: undefined, progress: undefined }) }}><ImageIcon size={13} />Single</button>
              <button type="button" className={assetBatchOpen ? 'is-active' : ''} aria-pressed={assetBatchOpen} onClick={() => { setAssetBatchOpen(true); runtime?.updateNode(id, { error: undefined, progress: undefined }) }}><Layers3 size={13} />Batch</button>
            </div>
            {assetBatchOpen ? assetBatchPanel : <div className="character-single-mode asset-intake-surface semantic-active-preview-stage"><button className={`character-single-image-stage asset-intake-placeholder ${activeAssetDropTarget === 'location' ? 'is-drag-over' : ''}`} type="button" onClick={() => runtime?.importAsset(id)} onDragEnterCapture={(event) => claimAssetPlaceholderDragOver(event, 'location')} onDragOverCapture={(event) => claimAssetPlaceholderDragOver(event, 'location')} onDragLeaveCapture={(event) => releaseAssetPlaceholderDrag(event, 'location')} onDropCapture={claimLocationPlaceholderDrop}>
              {selectedSemanticReference?.url ? <img src={selectedSemanticReference.url} alt="Selected Location result" /> : (data.referenceAssets || []).length ? <img src={(data.referenceAssets || [])[0].url} alt={(data.referenceAssets || [])[0].name} loading="lazy" decoding="async" /> : <span><Plus size={18} /><strong>Add Location or Reference</strong></span>}
              {(data.referenceAssets || []).length > 1 && <i>{(data.referenceAssets || []).length}</i>}
            </button>{semanticGeneratedOverlay}</div>}
          </> : data.kind === 'wardrobe' && semanticCreateOpen ? <>
            <div className="character-input-mode location-input-mode" role="group" aria-label="Wardrobe image intake mode">
              <button type="button" className={!assetBatchOpen ? 'is-active' : ''} aria-pressed={!assetBatchOpen} onClick={() => { setAssetBatchOpen(false); runtime?.updateNode(id, { wardrobeInputMode: 'single', error: undefined, progress: undefined }) }}><ImageIcon size={13} />Single</button>
              <button type="button" className={assetBatchOpen ? 'is-active' : ''} aria-pressed={assetBatchOpen} onClick={() => { setAssetBatchOpen(true); runtime?.updateNode(id, { error: undefined, progress: undefined }) }}><Layers3 size={13} />Batch</button>
            </div>
            {assetBatchOpen ? assetBatchPanel : <div className="character-single-mode asset-intake-surface semantic-active-preview-stage"><button className={`character-single-image-stage asset-intake-placeholder ${activeAssetDropTarget === 'wardrobe' ? 'is-drag-over' : ''}`} type="button" onClick={() => runtime?.importAsset(id)} onDragEnterCapture={(event) => claimAssetPlaceholderDragOver(event, 'wardrobe')} onDragOverCapture={(event) => claimAssetPlaceholderDragOver(event, 'wardrobe')} onDragLeaveCapture={(event) => releaseAssetPlaceholderDrag(event, 'wardrobe')} onDropCapture={claimLocationPlaceholderDrop}>
              {selectedSemanticReference?.url ? <img src={selectedSemanticReference.url} alt="Selected Wardrobe result" /> : (data.referenceAssets || []).length ? <img src={(data.referenceAssets || [])[0].url} alt={(data.referenceAssets || [])[0].name} loading="lazy" decoding="async" /> : <span><Plus size={18} /><strong>Add Wardrobe or Reference</strong></span>}
              {(data.referenceAssets || []).length > 1 && <i>{(data.referenceAssets || []).length}</i>}
            </button>{semanticGeneratedOverlay}</div>}
          </> : data.kind === 'style-reference' && styleCreateOpen ? <div className="asset-intake-surface semantic-active-preview-stage"><button className={`semantic-tile-stage asset-intake-placeholder ${intrinsicSemanticRatio && (data.referenceAssets || []).length === 1 ? 'has-single-image' : ''} ${activeAssetDropTarget === 'style' ? 'is-drag-over' : ''}`} onClick={() => runtime?.importAsset(id)} onDragEnterCapture={(event) => claimAssetPlaceholderDragOver(event, 'style')} onDragOverCapture={(event) => claimAssetPlaceholderDragOver(event, 'style')} onDragLeaveCapture={(event) => releaseAssetPlaceholderDrag(event, 'style')} onDropCapture={(event) => claimSemanticPlaceholderDrop(event)}>
            {selectedSemanticReference?.url ? <img src={selectedSemanticReference.url} alt="Selected Style result" draggable={false} onDragStart={(event) => event.preventDefault()} /> : (data.referenceAssets || []).length ? <img src={(data.referenceAssets || [])[0].url} alt={(data.referenceAssets || [])[0].name} loading="lazy" decoding="async" /> : <span><Plus size={18} /><strong>Add Style or Reference</strong></span>}
            {(data.referenceAssets || []).length > 1 && <i>{(data.referenceAssets || []).length}</i>}
          </button>{semanticGeneratedOverlay}</div> : null}
          {semanticLifecycle && <SemanticAssetSaveFeedback state={semanticLifecycle} dispatch={dispatchSemanticLifecycle} onConfirm={(committing) => { const selectedResultId = committing.pendingSave?.selectedResultId; if (selectedResultId) runtime?.commitSemanticAssetResult(id, selectedResultId) }} />}
          {data.kind === 'style-reference' && styleCreateOpen && <div className="style-node-details">
            <input className="style-description-inline" required maxLength={140} aria-required="true" aria-label="Style short description" value={data.styleDescription || ''} placeholder="Short description (required)…" onChange={(event) => runtime?.updateNode(id, { styleDescription: event.target.value, styleSavedAt: undefined, runState: 'idle', progress: undefined, error: undefined })} />
            <TaggedPromptTextarea className="style-prompt-inline" value={assetGenerationPrompt} connectedTags={[]} availableTags={[]} placeholder="Describe the visual style to create…" onValueChange={(assetGenerationPrompt) => runtime?.updateNode(id, { assetGenerationPrompt, prompt: undefined, stylePrompt: undefined, styleSavedAt: undefined, runState: 'idle', progress: undefined })} />
          </div>}
          {!assetBatchOpen && (data.kind === 'character' && characterCreateOpen || ['element', 'location', 'wardrobe'].includes(data.kind) && semanticCreateOpen) && <div className="style-node-details semantic-node-details"><TaggedPromptTextarea className="style-prompt-inline" value={assetGenerationPrompt} connectedTags={[]} availableTags={[]} placeholder={data.kind === 'character' ? 'Describe the character to create…' : data.kind === 'location' ? 'Describe the location to create…' : data.kind === 'wardrobe' ? 'Describe the wardrobe to create…' : 'Describe the element to create…'} onValueChange={(assetGenerationPrompt) => runtime?.updateNode(id, { assetGenerationPrompt, prompt: undefined })} /></div>}
        </div>
      )}

      {!isSemanticReference && !isCanvasGenerator && data.kind !== 'upscaler' && (mediaLinkState
        ? <div className="media-tile-preview"><MediaOfflineState mediaFamily={mediaLinkState.mediaFamily} state={mediaLinkState.state} findingDots={mediaLinkState.findingDots} onFind={() => runtime?.findOfflineAsset(mediaLinkState.assetId)} /></div>
        : activeGeneratedResult
        ? <div className={`generated-media-stage nodrag ${isMediaTile ? 'media-tile-preview' : ''}`} {...generatedMediaInteraction}>{mediaPreview(data)}{generatedMediaOverlay}</div>
        : isMediaTile && mediaPreview(data)
          ? <div className="media-tile-preview">{mediaPreview(data)}</div>
          : mediaPreview(data))}

      {isCanvasGenerator && <>
        {fidelityInputRules.length > 0 && <div className="generator-connected-context nodrag">
          <div className="connected-input-rules" aria-label="Connected Input Fidelity"><ConnectedRuleRows items={fidelityInputRules} onMode={runtime!.setInputFidelity} /></div>
        </div>}
        <div className="generator-stage nodrag" style={{ aspectRatio: stageRatio.replace(':', ' / ') }} {...generatedMediaInteraction}>
          {mediaPreview(data)}
          {generatedMediaOverlay}
          {!data.outputUrl && !data.outputPath && <div className="generator-input-slots nodrag" aria-label={`Available ${isImageGeneratorSurface ? 'Image' : 'Video'} Inputs`} data-input-count={inputPorts.length} data-stage-orientation={stageOrientation} style={{ '--generator-input-columns': stageOrientation === 'portrait' ? 1 : inputPorts.length >= 6 ? 3 : Math.min(2, Math.max(1, inputPorts.length)) } as CSSProperties}>
            {inputPorts.map((port) => <button key={port.id} type="button" aria-label={`Add ${port.label}`} title={`Add ${port.label}`} onClick={(event) => runtime?.openInputQuickConnect(id, port.id, event.clientX, event.clientY)}><GeneratorInputIcon id={port.id} signal={port.signal} kind={data.kind} /><span>{generatorInputLabel(port.id, port.label)}</span></button>)}
          </div>}
        </div>
        <div className={`video-prompt-owner-shell ${videoPrompt ? `is-${videoPrompt.mode}` : ''}`}>
          <TaggedPromptTextarea
            className="node-prompt generator-prompt nodrag"
            value={videoPrompt?.activePrompt ?? data.prompt ?? ''}
            connectedTags={connectedPromptTags}
            availableTags={videoPrompt?.mode === 'auto' ? [] : availablePromptTags}
            readOnly={videoPrompt?.mode === 'auto'}
            aria-readonly={videoPrompt?.mode === 'auto'}
            aria-describedby={videoPrompt?.mode === 'auto' ? `video-prompt-owner-${id}` : undefined}
            title={videoPrompt?.mode === 'auto' ? 'Compiled from connected Storyboard. Edit panels, timing, framing, camera, and transitions in Storyboard.' : undefined}
            placeholder={isImageGeneratorSurface ? 'Describe the image you want to generate…' : 'Describe the video you want to generate…'}
            onValueChange={(prompt) => runtime?.updatePrompt(id, prompt)}
          />
          {videoPrompt?.mode === 'auto' && <span id={`video-prompt-owner-${id}`} className="storyboard-visually-hidden">Compiled from connected Storyboard. Edit panels, timing, framing, camera, and transitions in Storyboard.</span>}
          {manualSeedDisclosure && <span className="storyboard-visually-hidden" role="status" aria-live="polite">Manual draft copied once from the current Auto prompt.</span>}
          {data.kind === 'video-generator' && videoPrompt && <div className="storyboard-prompt-actions video-prompt-actions" role="radiogroup" aria-label="Video prompt mode" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setVideoPromptRovingMode(videoPrompt?.mode || 'manual') }}>
            <div className="storyboard-transition-choice">
              <button type="button" role="radio" className={`storyboard-transition-option ${videoPrompt?.mode === 'auto' ? 'is-active' : ''}`} aria-checked={videoPrompt?.mode === 'auto'} aria-disabled={!videoPrompt?.connected} aria-label="Use Locked Storyboard Prompt" data-tooltip={videoPrompt?.connected ? 'Locked · Compiled from Storyboard' : 'Connect a Storyboard to use Locked'} tabIndex={videoPromptRovingTabIndex('auto', videoPromptRovingMode)} onKeyDown={handleVideoPromptModeKey} onClick={() => { if (videoPrompt?.connected) { setVideoPromptRovingMode('auto'); runtime?.setVideoPromptMode(id, 'auto') } }}>{videoPrompt?.mode === 'auto' ? 'Locked' : 'Lock'}</button>
              <button type="button" role="radio" className={`storyboard-transition-option ${videoPrompt?.mode === 'manual' ? 'is-active' : ''}`} aria-checked={videoPrompt?.mode === 'manual'} aria-label="Use User Prompt" data-tooltip={manualSeedDisclosure ? 'User · Draft copied once from Locked' : data.manualPromptSeeded ? 'User · Edit your saved draft' : 'User · Start from the current Locked prompt'} tabIndex={videoPromptRovingTabIndex('manual', videoPromptRovingMode)} onKeyDown={handleVideoPromptModeKey} onClick={() => { setVideoPromptRovingMode('manual'); runtime?.setVideoPromptMode(id, 'manual') }}>User</button>
            </div>
            <button type="button" className="storyboard-shot-action" aria-label="Reset Manual Prompt to Auto" disabled={videoPrompt?.mode !== 'manual' || videoPrompt.resetDisabled} data-tooltip={videoPrompt.resetDisabled ? videoPrompt.connected ? videoPrompt.autoPrompt ? 'User already matches latest Locked prompt' : 'Resolve the Storyboard prompt before resetting User' : 'Connect a Storyboard to reset User' : 'Reset User to latest Locked prompt'} onClick={() => runtime?.resetManualPrompt(id)}><RefreshCcw size={11} /></button>
          </div>}
        </div>
      </>}

      {mediaContextMenu && createPortal(<div className="generated-media-context-menu" style={{ left: Math.min(mediaContextMenu.x, window.innerWidth - 190), top: Math.min(mediaContextMenu.y, window.innerHeight - 54) }} onMouseDown={(event) => event.stopPropagation()} onMouseLeave={() => setMediaContextMenu(null)}><button onClick={() => { runtime?.copyGeneratedMedia(id, activeGeneratedIndex); setMediaContextMenu(null) }}><Copy size={13} />Copy {activeGeneratedResult?.type === 'video' ? 'Video' : activeGeneratedResult?.type === 'audio' ? 'Audio' : 'Image'}</button></div>, document.body)}

      {acceptsText && !isCanvasGenerator && data.kind !== 'style-reference' && data.kind !== 'character' && (
        <>
          {fidelityInputRules.length > 0 && <div className="inline-connected-input-rules nodrag" aria-label="Connected Input Fidelity"><ConnectedRuleRows items={fidelityInputRules} onMode={runtime!.setInputFidelity} /></div>}
          <TaggedPromptTextarea
            className="node-prompt nodrag"
            value={data.prompt || ''}
            connectedTags={connectedPromptTags}
            availableTags={availablePromptTags}
            placeholder={data.kind === 'image-editor' ? 'Describe the edit…' : 'Write a prompt or connect a Prompt node…'}
            onValueChange={(prompt) => runtime?.updatePrompt(id, prompt)}
          />
        </>
      )}

      {!isCanvasGenerator && (!acceptsText || data.kind === 'style-reference') && fidelityInputRules.length > 0 && <div className="inline-connected-input-rules nodrag" aria-label="Connected Input Fidelity"><ConnectedRuleRows items={fidelityInputRules} onMode={runtime!.setInputFidelity} /></div>}

      {data.kind === 'upscaler' && (upscalerBeforeUrl ? upscalerIsVideo ? <div className="upscaler-video-stage nodrag" aria-label={upscalerAfterUrl ? 'Upscaled video result' : 'Video to upscale'}><video src={upscalerAfterUrl || upscalerBeforeUrl} controls playsInline preload="metadata" /><span>{upscalerAfterUrl ? 'After' : 'Before'}</span></div> : <div className={`upscaler-comparison-stage nodrag ${upscalerAfterUrl ? 'has-after' : 'before-only'}`} aria-label={upscalerAfterUrl ? 'Before and after upscale comparison' : 'Image to upscale'}>
        <img className="upscaler-ratio-source" src={upscalerBeforeUrl} alt="" aria-hidden="true" />
        <div className="upscaler-comparison-layer is-before" style={upscalerAfterUrl ? { clipPath: `inset(0 ${100 - upscaleWipe}% 0 0)` } : undefined}>
          <img src={upscalerBeforeUrl} alt="Before upscale" />
          <span>Before</span>
        </div>
        {upscalerAfterUrl && <div className="upscaler-comparison-layer is-after" style={{ clipPath: `inset(0 0 0 ${upscaleWipe}%)` }}>
          <img src={upscalerAfterUrl} alt="After upscale" />
          <span>After</span>
        </div>}
        {upscalerAfterUrl && <>
          <i className="upscaler-wipe-divider" style={{ left: `${upscaleWipe}%` }} aria-hidden="true"><b /></i>
          <input className="upscaler-wipe-control" type="range" min="0" max="100" step="1" value={upscaleWipe} aria-label="Compare before and after upscale" onChange={(event) => setUpscaleWipe(Number(event.target.value))} />
        </>}
      </div> : <button className="upscaler-empty-stage nodrag" type="button" onClick={(event) => runtime?.openInputQuickConnect(id, upscalerInputHandle, event.clientX, event.clientY)}>{upscalerIsVideo ? <Video size={20} strokeWidth={1.2} /> : <ImageIcon size={20} strokeWidth={1.2} />}<span>{upscalerIsVideo ? 'Add Video to Upscale' : 'Add Image to Upscale'}</span></button>)}

      {data.kind === 'gallery' && <div className="gallery-collection nodrag">
        {(data.listItems || []).length ? (data.listItems || []).map((item) => <figure key={item.id}>
          {item.type === 'video' ? <video src={item.asset?.url} controls preload="metadata" playsInline /> : item.type === 'audio' ? <span className="gallery-audio"><Volume2 size={18} /><audio src={item.asset?.url} controls preload="metadata" /></span> : <img src={item.asset?.url} alt={item.asset?.name || 'Gallery media'} loading="lazy" decoding="async" />}
          <figcaption>{item.asset?.name || item.type}</figcaption>
        </figure>) : <div className="gallery-empty"><GalleryIcon size={22} /><strong>No Media Yet</strong><span>Connect generated or uploaded image, video, or audio</span></div>}
      </div>}

      {data.kind === 'output' && (
        <div className="output-continuation">
          <ArrowUpRight size={18} />
          <div><strong>Continue this result</strong><small>Create and connect the next operation</small></div>
          <button className="nodrag" title="Add Next Node" aria-label="Add Next Node" onClick={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY)}>Add</button>
        </div>
      )}

      {visibleStatus && (
        <div className={`node-lifecycle-row node-status is-${notificationCategory} ${data.kind === 'character' && !characterReady ? 'character-needs-front' : ''}`} role={notificationCategory === 'error' ? 'alert' : 'status'} aria-live={notificationCategory === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
          {notificationCategory === 'running' && <LoaderCircle size={12} className="spin" />}
          <span>{visibleStatus}</span>
        </div>
      )}

      {data.kind === 'video-generator' && selectedVideoModel?.family === 'wan' && <FluidControlGroup
        className="primary-node-controls video-primary-controls nodrag"
        ariaLabel="Primary Video Quality Controls"
        gap={7}
        allocation={{ minRows: 1, maxRows: 2 }}
        recalculationKey={`${data.frameRate || 24}:${data.videoQuality || 'high'}:${data.videoWriteMode || 'balanced'}`}
        controls={[
          { id: 'native-fps', kind: 'selector', intrinsicWidth: 62, node: <label><span>Native FPS</span><SimpleMenuSelect ariaLabel="Native FPS" defaultLabel={`${selectedVideoModel.frameRates[0]} fps`} fillTrack value={String(data.frameRate || 24)} options={selectedVideoModel.frameRates.map((fps) => ({ value: String(fps), label: `${fps} fps` }))} onChange={(value) => runtime?.updateNode(id, { frameRate: Number(value) })} /></label> },
          { id: 'quality', kind: 'selector', intrinsicWidth: 66, node: <label><span>Quality</span><SimpleMenuSelect ariaLabel="Video Quality" defaultLabel="High" fillTrack value={data.videoQuality || 'high'} options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['maximum', 'Maximum']].map(([value, label]) => ({ value, label }))} onChange={(value) => runtime?.updateNode(id, { videoQuality: value as StudioNodeData['videoQuality'] })} /></label> },
          { id: 'file', kind: 'selector', intrinsicWidth: 76, node: <label><span>File</span><SimpleMenuSelect ariaLabel="Video File Mode" defaultLabel="Balanced" fillTrack value={data.videoWriteMode || 'balanced'} options={[['fast', 'Fast'], ['balanced', 'Balanced'], ['small', 'Small file']].map(([value, label]) => ({ value, label }))} onChange={(value) => runtime?.updateNode(id, { videoWriteMode: value as StudioNodeData['videoWriteMode'] })} /></label> },
        ]}
      />}

      {isCanvasGenerator && <div className={`compact-generator-footer ${data.kind === 'video-generator' ? 'compact-video-footer' : ''} nodrag`}>
        {isImageGeneratorSurface ? <ImageGenerationControlGroup
          recalculationKey={`${imageProvider}:${imageModelId}:${data.outputFormat || 'png'}:${selectedImageResolution}:${data.quantity || 1}:${normalizedImageRatio(data.aspectRatio)}`}
          model={<GroupedMenuSelect className="compact-engine image-engine" ariaLabel="Image engine" title="Image engine" defaultLabel={modelDisplayName(imageModelId)} fillTrack value={`${imageProvider}::${imageModelId}`} groups={imageModelGroups} onChange={(nextValue) => { const [provider, ...modelParts] = nextValue.split('::'); runtime?.updateNode(id, imageModelSelectionPatch(provider as StudioNodeData['imageProvider'], modelParts.join('::'), data.imageResolution)) }} />}
          format={<ImageFormatControl format={data.outputFormat} webp={usesNanoImageModel} onFormat={(outputFormat) => runtime?.updateNode(id, { outputFormat })} />}
          resolution={<ImageResolutionControl resolution={selectedImageResolution} resolutions={supportedImageResolutions} onResolution={(imageResolution) => runtime?.updateNode(id, { imageResolution })} />}
          quantity={<div className="quantity-stepper"><span className="quantity-stepper-inner-cluster"><button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={11} /></button><span>x{data.quantity || 1}</span><button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={11} /></button></span></div>}
          slot={<SimpleMenuSelect ariaLabel="Image Aspect Ratio" title="Image Aspect Ratio" defaultLabel={normalizedImageRatio(data.aspectRatio)} fillTrack value={normalizedImageRatio(data.aspectRatio)} options={aspectRatioMenuOptions(usesNanoImageModel ? NANO_IMAGE_RATIOS : IMAGE_RATIOS)} onChange={(value) => runtime?.updateNode(id, { aspectRatio: value })} />}
          settings={<button className="compact-settings compact-options" onClick={() => runtime?.openInspector(id)} data-tooltip="Options" aria-label="Node Settings"><Settings size={14} /></button>}
          run={<PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''} ${providerDisconnected ? 'is-connection-required' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : 'Run'} onClick={() => running ? runtime?.stopNode(id) : providerDisconnected ? runtime?.openConnections(billingProvider, providerModelLabel) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon size={14} /> : rerun ? <RerunIcon /> : <Play size={12} fill="currentColor" />}</button></PlayTooltip>}
        /> : <FluidControlGroup
          className="compact-video-footer-group"
          ariaLabel="Video Footer Controls"
          allocation={{ minRows: 2, maxRows: 2, firstId: 'model', terminalIds: ['settings', 'run'], preferredRows: [['model', 'motion', 'ratio', 'duration'], ['quantity', 'resolution', 'sound', 'settings', 'run']] }}
          gap={6}
          recalculationKey={`${selectedVideoModel?.id}:${normalizedVideoDuration(data)}:${data.resolution || ''}:${data.aspectRatio || ''}:${data.quantity || 1}:${effectiveMotionCadence}:${Boolean(data.generateAudio)}`}
          controls={([
            { id: 'model', kind: 'selector', visible: true, available: true, defaultLabel: closedVideoLabel, fullLabel: closedVideoLabel, compactLabel: closedVideoLabel, intrinsicWidth: 80, minimumWidth: 80, shrinkPriority: 'model', priority: 100, preferredRow: 0, preferredZone: 'start', fixedAnchor: 'first', node: <GroupedMenuSelect className="compact-engine video-engine" menuClassName="video-model-menu" ariaLabel="Video Model" accessibleLabel={selectedVideoModel?.label || 'WAN Controlled'} displayLabel={closedVideoLabel} compactLabel={closedVideoLabel} defaultLabel={closedVideoLabel} fillTrack value={selectedVideoModel?.id || 'wan-controlled'} groups={VIDEO_MODEL_MENU_GROUPS} onChange={(engine) => {
              const model = resolveVideoModel(engine)
              const frameRate = model.frameRates.length ? (model.frameRates.includes(data.frameRate || 24) ? data.frameRate || 24 : model.frameRates[0]) : undefined
              const durationPatch = normalizedGeneratorDurationPatch({ videoEngine: engine, duration: data.duration, frameRate })
              runtime?.updateNode(id, { videoEngine: engine, aspectRatio: defaultVideoRatio(model) || data.aspectRatio, ...durationPatch, generateAudio: model.nativeAudio ? data.generateAudio : false, resolution: model.resolutions.length ? (model.resolutions.includes(data.resolution || '') ? data.resolution : model.resolutions[0] as StudioNodeData['resolution']) : model.fourK ? '4k' : undefined, frameRate, motionCadence: normalizedMotionCadence(model, frameRate, data.motionCadence), inferenceSteps: model.family === 'wan' ? 40 : data.inferenceSteps, guidanceScale: model.family === 'wan' ? 1 : model.family === 'kling' ? 0.5 : data.guidanceScale, acceleration: model.family === 'wan' ? 'regular' : data.acceleration })
            }} title={providerBlocked ? `${providerAccount?.message || 'This provider is unavailable.'} You can still inspect another model's controls.` : 'Video Model'} /> },
            { id: 'motion', kind: 'selector', visible: true, available: true, defaultLabel: `${effectiveMotionCadence} fps`, intrinsicWidth: 54, priority: 55, preferredRow: 0, preferredZone: 'middle', node: <GroupedMenuSelect className="compact-fps" ariaLabel="Motion FPS" title="Motion FPS controls how frequently movement visibly updates without changing encoded provider Native FPS or playback speed." displayLabel={`${effectiveMotionCadence} fps`} defaultLabel={`${effectiveMotionCadence} fps`} fillTrack value={String(effectiveMotionCadence)} groups={[
              { label: 'Motion FPS', options: motionCadenceOptions(selectedVideoModel || resolveVideoModel(data.videoEngine), data.frameRate).map((fps) => ({ value: String(fps), label: `${fps} fps` })) },
            ]} onChange={(value) => runtime?.updateNode(id, { motionCadence: Number(value) })} /> },
            { id: 'ratio', kind: 'selector', visible: true, available: Boolean(selectedVideoModel?.ratios.length), defaultLabel: defaultVideoRatio(selectedVideoModel || resolveVideoModel(data.videoEngine)) || '16:9', intrinsicWidth: 44, priority: 50, preferredRow: 0, preferredZone: 'middle', node: <SimpleMenuSelect ariaLabel="Video Aspect Ratio" title="Video Aspect Ratio" defaultLabel={defaultVideoRatio(selectedVideoModel || resolveVideoModel(data.videoEngine)) || '16:9'} fillTrack value={selectedVideoModel ? resolvedVideoRatio(selectedVideoModel, data.aspectRatio) : '16:9'} options={aspectRatioMenuOptions((selectedVideoModel?.ratios || []).filter((ratio) => ratio !== 'auto'))} onChange={(value) => runtime?.updateNode(id, { aspectRatio: value })} /> },
            { id: 'duration', kind: 'selector', visible: true, available: videoDurationOptions(data.videoEngine, data.frameRate).length > 1, defaultLabel: formatDurationSeconds(Number(videoDurationOptions(data.videoEngine, data.frameRate)[0])), intrinsicWidth: 42, priority: 60, preferredRow: 0, preferredZone: 'middle', node: <SimpleMenuSelect ariaLabel="Video Duration" title="Video Duration" defaultLabel={formatDurationSeconds(Number(videoDurationOptions(data.videoEngine, data.frameRate)[0]))} fillTrack value={String(normalizedVideoDuration(data))} options={videoDurationOptions(data.videoEngine, data.frameRate).filter((seconds): seconds is number => typeof seconds === 'number').map((seconds) => ({ value: String(seconds), label: formatDurationSeconds(seconds) }))} onChange={(value) => runtime?.updateNode(id, { duration: Number(value), autoDuration: false })} /> },
            { id: 'quantity', kind: 'bounded-elastic', visible: true, available: true, defaultLabel: 'x1', intrinsicWidth: 42, maximumExtraWidth: 24, shortCharacterWidth: 5, priority: 50, preferredRow: 1, preferredZone: 'start', node: <div className="quantity-stepper"><span className="quantity-stepper-inner-cluster"><button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={11} /></button><span>x{data.quantity || 1}</span><button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={11} /></button></span></div> },
            { id: 'resolution', kind: 'selector', visible: true, available: Boolean(selectedVideoModel?.resolutions.length), defaultLabel: selectedVideoModel?.resolutions[0] || '720p', intrinsicWidth: 48, priority: 55, preferredRow: 1, preferredZone: 'middle', node: <SimpleMenuSelect className="compact-resolution" ariaLabel="Video Resolution" title="Video Resolution" defaultLabel={selectedVideoModel?.resolutions[0] || '720p'} fillTrack value={selectedVideoModel?.resolutions.includes(data.resolution || '') ? data.resolution || selectedVideoModel.resolutions[0] : selectedVideoModel?.resolutions[0] || ''} options={(selectedVideoModel?.resolutions || []).map((resolution) => ({ value: resolution, label: resolution }))} onChange={(value) => runtime?.updateNode(id, { resolution: value as StudioNodeData['resolution'] })} /> },
            { id: 'sound', kind: 'intrinsic', visible: true, available: Boolean(selectedVideoModel?.nativeAudio), defaultLabel: 'Sound', intrinsicWidth: 28, priority: 45, preferredRow: 1, preferredZone: 'middle', node: <button type="button" className={`compact-settings compact-options compact-sound ${data.generateAudio ? 'is-active' : ''}`} data-tooltip="Sound" aria-label="Generate Native Sound" aria-pressed={Boolean(data.generateAudio)} disabled={running} onClick={() => runtime?.updateNode(id, { generateAudio: !data.generateAudio })}><Volume2 size={14} /></button> },
            { id: 'settings', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 28, priority: 95, preferredRow: 1, preferredZone: 'end', fixedAnchor: 'terminal', node: <button className="compact-settings compact-options" onClick={() => runtime?.openInspector(id)} data-tooltip="Options" aria-label="Node Settings"><Settings size={14} /></button> },
            { id: 'run', kind: 'fixed-action', visible: true, available: true, intrinsicWidth: 28, priority: 100, preferredRow: 1, preferredZone: 'end', fixedAnchor: 'terminal', node: <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''} ${providerDisconnected ? 'is-connection-required' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : 'Run'} onClick={() => running ? runtime?.stopNode(id) : providerDisconnected ? runtime?.openConnections(billingProvider, providerModelLabel) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon size={14} /> : rerun ? <RerunIcon /> : <Play size={12} fill="currentColor" />}</button></PlayTooltip> },
          ]) as FluidGroupControl<VideoFooterControlId>[]}
        />}

      </div>}

      {semanticEditorActive && <div className="reusable-asset-footer-wrap nodrag">
        {saveNameOpen && <div className="asset-save-name-popover"><input ref={saveNameInputRef} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label={`${semanticAssetLabel} name`} value={saveName} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setSaveName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitSaveName(); if (event.key === 'Escape') setSaveNameOpen(false) }} /></div>}
        <div className="compact-generator-footer">
          <ImageGenerationControlGroup
            semantic
            recalculationKey={`${data.kind}:${characterInputMode}:${elementInputMode}:${assetBatchOpen}:${imageProvider}:${imageModelId}:${data.outputFormat || 'png'}:${selectedImageResolution}:${data.quantity || 1}:${semanticSaveDisabled}:${running}`}
            model={semanticModelControl}
            format={<ImageFormatControl format={data.outputFormat} webp={usesNanoImageModel} onFormat={(outputFormat) => runtime?.updateNode(id, { outputFormat })} />}
            resolution={<ImageResolutionControl resolution={selectedImageResolution} resolutions={supportedImageResolutions} onResolution={(imageResolution) => runtime?.updateNode(id, { imageResolution })} />}
            quantity={<div className="quantity-stepper"><span className="quantity-stepper-inner-cluster"><button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={11} /></button><span>x{data.quantity || 1}</span><button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={11} /></button></span></div>}
            slot={semanticSaveControl}
            settings={<button className="compact-settings compact-options" onClick={() => runtime?.openInspector(id)} data-tooltip="Options" aria-label="Node Settings"><Settings size={14} /></button>}
            run={semanticRunControl}
          />
        </div>
      </div>}

      {data.kind === 'upscaler' && <div className="primary-node-controls upscaler-primary-controls nodrag" aria-label="Primary Upscaler Controls">
        <label className="upscaler-model-field"><span>Model</span><SimpleMenuSelect ariaLabel="Upscaler model" value={data.upscalerModel || 'clarity-image'} options={[{ value: 'clarity-image', label: 'Clarity Image Upscaler' }, { value: 'realesrgan-video', label: 'RealESRGAN Video Upscaler' }]} onChange={(upscalerModel) => runtime?.updateNode(id, { upscalerModel: upscalerModel as StudioNodeData['upscalerModel'], outputPath: undefined, outputUrl: undefined, outputType: undefined, generatedResults: undefined, error: undefined })} /></label>
        <label className={upscalerIsVideo ? 'is-disabled' : ''}><span>Creativity · {(data.creativity ?? 0.35).toFixed(2)}</span><input disabled={upscalerIsVideo} type="range" min="0" max="1" step="0.05" value={data.creativity ?? 0.35} onChange={(event) => runtime?.updateNode(id, { creativity: Number(event.target.value) })} /></label>
        <label className={upscalerIsVideo ? 'is-disabled' : ''}><span>Resemblance · {(data.resemblance ?? 0.6).toFixed(2)}</span><input disabled={upscalerIsVideo} type="range" min="0" max="1" step="0.05" value={data.resemblance ?? 0.6} onChange={(event) => runtime?.updateNode(id, { resemblance: Number(event.target.value) })} /></label>
      </div>}

      {data.kind === 'voiceover' && <div className="voice-primary-controls equalized-control-group nodrag" aria-label="Primary Voice Controls">
        <FluidControlGroup
          className="voice-primary-row voice-primary-row-two"
          ariaLabel="Voice Model And Voice Controls"
          gap={7}
          allocation={{ minRows: 1, maxRows: 2, firstId: 'model' }}
          recalculationKey={`${data.voiceEngine}:${data.fishModel || ''}:${data.fishReferenceId || ''}:${data.voice || ''}`}
          controls={[
            { id: 'model', kind: 'selector', defaultLabel: 'ElevenLabs Eleven v3', fullLabel: 'ElevenLabs Eleven v3', compactLabel: 'ElevenLabs v3', minimumWidth: 80, shrinkPriority: 'model', intrinsicWidth: 138, node: <label className="voice-primary-model-field"><span>Model</span><GroupedMenuSelect className="voice-primary-model" ariaLabel="Voice provider and model" defaultLabel="ElevenLabs Eleven v3" fillTrack value={data.voiceEngine === 'fish-audio' ? `fish-audio::${data.fishModel || 's2-pro'}` : 'elevenlabs'} groups={[
              { label: 'fal.ai', options: [{ value: 'elevenlabs', label: 'ElevenLabs Eleven v3', provider: 'elevenlabs' }] },
              { label: 'Fish Audio', options: FISH_TTS_MODELS.map((model) => ({ value: `fish-audio::${model.value}`, label: `Fish Audio ${model.label}`, provider: 'fish' as const })) },
            ]} onChange={(selection) => {
              if (selection.startsWith('fish-audio::')) runtime?.updateNode(id, { voiceEngine: 'fish-audio', fishModel: selection.split('::')[1] as StudioNodeData['fishModel'], error: undefined })
              else runtime?.updateNode(id, { voiceEngine: 'elevenlabs', error: undefined })
            }} /></label> },
            data.voiceEngine === 'fish-audio'
              ? { id: 'voice', kind: 'intrinsic', intrinsicWidth: 132, node: <label className="voice-primary-voice-field"><span>Voice ID</span><input className="voice-primary-input" aria-label="Fish Audio voice Reference ID" value={data.fishReferenceId || ''} onChange={(event) => runtime?.updateNode(id, { fishReferenceId: event.target.value, error: undefined })} placeholder="Reference ID (required)" /></label> }
              : { id: 'voice', kind: 'selector', intrinsicWidth: 112, node: <label className="voice-primary-voice-field"><span>Voice</span><SimpleMenuSelect className="voice-primary-voice" ariaLabel="ElevenLabs voice" defaultLabel={ELEVEN_V3_BUILT_IN_VOICES[0]} fillTrack value={usesBuiltInElevenVoice ? elevenVoiceValue : '__custom'} options={[...ELEVEN_V3_BUILT_IN_VOICES.map((voice) => ({ value: voice, label: voice })), { value: '__custom', label: 'Custom voice name / ID' }]} onChange={(voice) => runtime?.updateNode(id, { voice: voice === '__custom' ? '' : voice, error: undefined })} /></label> },
          ] as FluidGroupControl<'model' | 'voice'>[]}
        />
        {data.voiceEngine !== 'fish-audio' && <>
          <FluidControlGroup
            className="voice-primary-row voice-primary-row-three"
            ariaLabel="Voice Language Output And Speed Controls"
            gap={7}
            allocation={{ minRows: 1, maxRows: 2 }}
            recalculationKey={`${data.languageCode || 'eng'}:${data.audioOutputFormat || 'mp3_44100_128'}:${data.speed ?? 1}`}
            controls={[
              { id: 'language', kind: 'selector', intrinsicWidth: 92, node: <label className="voice-primary-language-field"><span>Language</span><SimpleMenuSelect className="voice-primary-language" menuClassName="voice-language-menu" ariaLabel="Voice language" defaultLabel="English" fillTrack value={normalizedElevenV3LanguageCode(data.languageCode) || 'eng'} options={[...ELEVEN_V3_LANGUAGES]} onChange={(languageCode) => runtime?.updateNode(id, { languageCode })} /></label> },
              { id: 'output', kind: 'selector', intrinsicWidth: 130, node: <label className="voice-primary-output-field"><span>Output</span><SimpleMenuSelect ariaLabel="Voice Output Format" defaultLabel={audioFormatLabel(ELEVEN_AUDIO_OUTPUT_FORMATS[0])} fillTrack value={data.audioOutputFormat || 'mp3_44100_128'} options={ELEVEN_AUDIO_OUTPUT_FORMATS.map((value) => ({ value, label: audioFormatLabel(value) }))} onChange={(value) => runtime?.updateNode(id, { audioOutputFormat: value })} /></label> },
              { id: 'speed', kind: 'selector', intrinsicWidth: 52, node: <label className="voice-primary-speed-field"><span>Speed</span><SimpleMenuSelect ariaLabel="ElevenLabs speech speed" defaultLabel="1×" fillTrack value={String(Number((Math.min(1.2, Math.max(0.7, data.speed ?? 1)) * 20).toFixed(0)) / 20)} options={ELEVEN_SPEED_OPTIONS} onChange={(value) => runtime?.updateNode(id, { speed: Number(value) })} /></label> },
            ]}
          />
          {!usesBuiltInElevenVoice && <label className="voice-primary-custom"><span>Custom Voice</span><input className="voice-primary-input" aria-label="Custom ElevenLabs voice name or ID" value={data.voice || ''} onChange={(event) => runtime?.updateNode(id, { voice: event.target.value, error: undefined })} placeholder="Voice name or ID (required)" /></label>}
        </>}
        {data.voiceEngine === 'fish-audio' ? <>
          <label><span>Format</span><SimpleMenuSelect ariaLabel="Fish Audio Format" value={data.fishFormat || 'mp3'} options={FISH_AUDIO_FORMATS.map((value) => ({ value, label: value.toUpperCase() }))} onChange={(value) => runtime?.updateNode(id, { fishFormat: value as StudioNodeData['fishFormat'] })} /></label>
          <label><span>Sample Rate</span><SimpleMenuSelect ariaLabel="Fish Audio Sample Rate" value={String(data.fishSampleRate || 44100)} options={FISH_SAMPLE_RATES.map((value) => ({ value: String(value), label: `${value / 1000} kHz` }))} onChange={(value) => runtime?.updateNode(id, { fishSampleRate: Number(value) })} /></label>
          {(data.fishFormat || 'mp3') === 'mp3' && <label><span>Bitrate</span><SimpleMenuSelect ariaLabel="Fish MP3 Bitrate" value={String(data.fishMp3Bitrate || 128)} options={FISH_MP3_BITRATES.map((value) => ({ value: String(value), label: `${value} kbps` }))} onChange={(value) => runtime?.updateNode(id, { fishMp3Bitrate: Number(value) as StudioNodeData['fishMp3Bitrate'] })} /></label>}
          {data.fishFormat === 'opus' && <label><span>Bitrate</span><SimpleMenuSelect ariaLabel="Fish Opus Bitrate" value={String(data.fishOpusBitrate ?? 48)} options={FISH_OPUS_BITRATES.map((value) => ({ value: String(value), label: value === -1000 ? 'Auto' : `${value} kbps` }))} onChange={(value) => runtime?.updateNode(id, { fishOpusBitrate: Number(value) as StudioNodeData['fishOpusBitrate'] })} /></label>}
          <label><span>Volume</span><SimpleMenuSelect ariaLabel="Fish Audio Volume" value={String(Math.round(Math.min(20, Math.max(-20, data.fishVolume ?? 0))))} options={FISH_VOLUME_OPTIONS} onChange={(value) => runtime?.updateNode(id, { fishVolume: Number(value) })} /></label>
        </> : null}
      </div>}

      {runnable && !isCanvasGenerator && !['element', 'location', 'wardrobe'].includes(data.kind) && (
        <div className="compact-generator-footer compact-generic-footer nodrag">
          {!['element', 'location', 'wardrobe'].includes(data.kind) && <div className="quantity-stepper"><span className="quantity-stepper-inner-cluster">
            <button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => data.kind === 'voiceover' ? runtime?.adjustVoiceoverQuantity(id, -1) : runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={12} /></button>
            <span>x{data.quantity || 1}</span>
            <button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => data.kind === 'voiceover' ? runtime?.adjustVoiceoverQuantity(id, 1) : runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={12} /></button>
          </span></div>}
          {data.kind === 'upscaler' && <SimpleMenuSelect className="upscaler-scale-select" ariaLabel="Upscale Amount" title="Upscale Amount" value={String(data.scale || 2)} options={[2, 3, 4].map((value) => ({ value: String(value), label: `${value}×` }))} onChange={(value) => runtime?.updateNode(id, { scale: Number(value) })} />}
          {data.kind === 'sound-effects' && <div className="compact-model sound-effects-model" title="ElevenLabs Sound Effects v2"><CompanyIcon provider="elevenlabs" /><span>ElevenLabs SFX v2</span></div>}
          {data.kind === 'sound-effects' && <><SimpleMenuSelect ariaLabel="Sound Effect Duration" title="Sound Effect Duration" value={String(data.duration || 5)} options={[0.5,1,2,3,5,8,10,15,22].map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => runtime?.updateNode(id, { duration: Number(value) })} /><label className="compact-toggle compact-loop" title="Loop Sound Effect"><span>Loop</span><input aria-label="Loop Sound Effect" type="checkbox" checked={Boolean(data.loop)} onChange={(event) => runtime?.updateNode(id, { loop: event.target.checked })} /><i /></label><SimpleMenuSelect className="sound-output-format" ariaLabel="Sound Effect Output Format" title="Sound Effect Output Format" value={data.audioOutputFormat || 'mp3_44100_128'} options={ELEVEN_AUDIO_OUTPUT_FORMATS.map((value) => ({ value, label: audioFormatLabel(value) }))} onChange={(value) => runtime?.updateNode(id, { audioOutputFormat: value })} /></>}
          {data.kind === 'music-generator' && <><SimpleMenuSelect ariaLabel="Music Duration" title="Music Duration" value={String(data.duration || 30)} options={[10,30,60,120].map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => runtime?.updateNode(id, { duration: Number(value) })} /><label className="compact-audio" title="Instrumental Only"><input aria-label="Instrumental Only" type="checkbox" checked={Boolean(data.forceInstrumental)} onChange={(event) => runtime?.updateNode(id, { forceInstrumental: event.target.checked })} /><Music2 size={12} /></label></>}
          {['element', 'location', 'wardrobe'].includes(data.kind) && <GroupedMenuSelect className="compact-engine image-engine" ariaLabel={`${data.kind === 'element' ? 'Element' : data.kind === 'wardrobe' ? 'Wardrobe' : 'Location'} image model`} title="Image model" value={`${imageProvider}::${imageModelId}`} groups={[
            { label: 'fal.ai', options: falImageModels.map((model) => ({ value: `fal::${model.id}`, label: model.label, provider: model.provider })) },
            { label: 'OpenAI', options: openAIImageModels.map((model) => ({ value: `openai::${model.id}`, label: model.label })) },
            { label: 'Google', options: googleImageModels.map((model) => ({ value: `google::${model.id}`, label: model.label })) },
          ]} onChange={(nextValue) => {
            const [provider, ...modelParts] = nextValue.split('::')
            runtime?.updateNode(id, { imageProvider: provider as StudioNodeData['imageProvider'], imageModelId: modelParts.join('::') })
          }} />}
          {data.kind === 'image-editor' && <GroupedMenuSelect className="compact-engine image-engine" ariaLabel="Image editing engine" title="Image editing engine" value={`${imageProvider}::${imageModelId}`} groups={[
            { label: 'fal.ai', options: falImageModels.map((model) => ({ value: `fal::${model.id}`, label: model.label, provider: model.provider })) },
            { label: 'OpenAI', options: openAIImageModels.map((model) => ({ value: `openai::${model.id}`, label: model.label })) },
            { label: 'Google', options: googleImageModels.map((model) => ({ value: `google::${model.id}`, label: model.label })) },
          ]} onChange={(nextValue) => {
            const [provider, ...modelParts] = nextValue.split('::')
            runtime?.updateNode(id, { imageProvider: provider as StudioNodeData['imageProvider'], imageModelId: modelParts.join('::') })
          }} />}
          <button className="compact-settings compact-options" onClick={() => runtime?.openInspector(id)} data-tooltip="Options" aria-label="Node Settings"><Settings size={14} /></button>
          <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''} ${providerDisconnected ? 'is-connection-required' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : 'Run'} onClick={() => running ? runtime?.stopNode(id) : providerDisconnected ? runtime?.openConnections(billingProvider, providerModelLabel) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon size={14} /> : rerun ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
        </div>
      )}

      {outputsText && <NodePort id="text-out" type="source" signal="text" label="Text Output" position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'text-out')} />}
      {outputsMedia && <NodePort id="media-out" type="source" signal={outputSignalFor(data, 'media-out')} label="Output" position={Position.Right} available={!reusableOffline} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'media-out')} />}
      {data.outputUrl && !isCanvasGenerator && !isSemanticReference && <a className="node-open nodrag" href={data.outputUrl} title="Open Media" aria-label="Open Media"><ArrowUpRight size={13} /></a>}
      {pendingAssetBatch && assetBatchKind && createPortal(<div className="modal-backdrop asset-batch-confirm-backdrop" onMouseDown={() => setPendingAssetBatch(null)}><section className="delete-confirm-modal asset-batch-confirm" role="dialog" aria-modal="true" aria-labelledby={`asset-batch-confirm-${id}`} onMouseDown={(event) => event.stopPropagation()}><header><span><Layers3 size={18} /></span><div><strong id={`asset-batch-confirm-${id}`}>Insert {pendingAssetBatch.length} assets into {assetBatchKind[0].toUpperCase() + assetBatchKind.slice(1)} Batch?</strong><small>Files stay staged until you save them.</small></div></header><footer><button onClick={() => setPendingAssetBatch(null)}>Cancel</button><button className="is-primary" onClick={() => { setAssetBatchRows(pendingAssetBatch); setPendingAssetBatch(null); const unnamed = pendingAssetBatch.find((row) => !row.displayName); setRenamingBatchRowId(unnamed?.id || null) }}>Insert Assets</button></footer></section></div>, document.body)}
    </article>
  )
})

NodeCard.displayName = 'NodeCard'
