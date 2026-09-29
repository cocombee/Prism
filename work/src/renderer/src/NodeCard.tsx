import { createContext, memo, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Position, type NodeProps } from '@xyflow/react'
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
  RotateCcw,
  RotateCw,
  Save,
  Search,
  SkipBack,
  SkipForward,
  Upload,
  Unlock,
  UserRound,
  Video,
  Volume2,
} from 'lucide-react'
import type { CharacterView, ElementView, GenerationCostEstimate, ImportedAsset, ServiceAccountStatus, ServiceProvider, StudioNode, StudioNodeData } from '../../shared/types'
import { curatedAssistantModels, type AssistantProvider } from '../../shared/assistantModels'
import { defaultVideoRatio, knownOutputFrameRate, motionCadenceOptions, normalizedMotionCadence, resolvedVideoRatio, resolveVideoModel, VIDEO_MODELS, VIDEO_MODEL_MENU_SECTIONS } from '../../shared/videoModels'
import { siAlibabacloud, siAnthropic, siBytedance, siDeepseek, siElevenlabs, siFishaudio, siGoogle, siGooglegemini, siKimi, siKuaishou, siMeta } from 'simple-icons'
import { STYLE_PRESETS } from '../../shared/stylePresets'
import { mediaRenameStem, normalizeLogicalAssetName } from '../../shared/assetNaming'
import { nodeInputPorts } from '../../shared/nodePorts'
import { NodePort } from './NodePort'
import { prioritizeConnectedInputRules, workflowTag, type ConnectedInputRule, type InputFidelity } from '../../shared/inputRules'
import { formatRequirementList } from '../../shared/generationReadiness'
import { outputSignalFor } from '../../shared/nodeConnections'
import { previewFocalPosition } from '../../shared/previewFocus'
import { FAL_CHARACTER_COMPLETION_MODELS, FAL_IMAGE_MODELS, FAL_REFERENCE_IMAGE_MODELS, imageResolutionOptions } from '../../shared/imageModels'
import { compactProviderError } from '../../shared/providerErrors'
import { activeMediaName } from '../../shared/generatedMedia'
import { ELEVEN_AUDIO_OUTPUT_FORMATS, ELEVEN_V3_BUILT_IN_VOICES, FISH_AUDIO_FORMATS, FISH_MP3_BITRATES, FISH_OPUS_BITRATES, FISH_SAMPLE_RATES, FISH_TTS_MODELS } from '../../shared/providerOptions'
import { ELEVEN_V3_LANGUAGES, normalizedElevenV3LanguageCode } from '../../shared/voiceLanguages'
import { ELEMENT_ANCHOR_VIEW, ELEMENT_VIEWS, missingElementViews } from '../../shared/elementViews'
import { incompleteSemanticReason } from '../../shared/semanticReadiness'
import { balancedSemanticPreview } from '../../shared/semanticAssetCollections'
import { TaggedPromptTextarea } from './TaggedPromptTextarea'
import { modelDisplayName } from '../../shared/modelNames'
import { generatorInputIconFor, NODE_KIND_ICONS } from './iconSystem'
import { isRunnableNodeKind } from './rendererBehavior'
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

export type ModelCompany = 'fal' | 'openai' | 'google' | 'anthropic' | 'deepseek' | 'moonshot' | 'meta' | 'black-forest-labs' | 'alibaba' | 'bytedance' | 'kuaishou' | 'elevenlabs' | 'fish'
export type GroupedMenuOption = { value: string; label: string; iconPath?: string; provider?: ModelCompany; aspectRatioPreview?: string }
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
    'element-in': 'Add Element',
    'location-in': 'Add Location',
    'style-in': 'Add Style',
    'video-in': 'Add Source Video',
    'video-reference-in': 'Add Reference Video',
    'audio-reference-in': 'Add Reference Audio',
  } as Record<string, string>)[id] || `Add ${fallback.replace(/\s*\(Optional\)\s*/g, '')}`
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
  label: section === 'wan' ? 'fal.ai · Wan' : section === 'seedance-2.5' ? 'fal.ai · Seedance 2.5' : section === 'seedance-2' ? 'fal.ai · Seedance 2' : section === 'kling' ? 'fal.ai · Kling' : 'fal.ai · Google Veo',
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

export function GroupedMenuSelect({ value, groups, ariaLabel, title, disabled = false, className = '', menuClassName = '', displayLabel, fillTrack = false, onChange }: {
  value: string
  groups: GroupedMenuGroup[]
  ariaLabel: string
  title?: string
  disabled?: boolean
  className?: string
  menuClassName?: string
  displayLabel?: string
  fillTrack?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; bottom: number; width: number; fontSize: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selected = groups.flatMap((group) => group.options).find((option) => option.value === value)
  const fallbackModelId = value.replace(/^[^:]+::/, '')
  const selectedLabel = displayLabel || selected?.label || modelDisplayName(fallbackModelId)
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

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.grouped-menu-select-menu') && !buttonRef.current?.contains(target)) setOpen(false)
    }
    window.addEventListener('pointerdown', close, true)
    return () => {
      window.removeEventListener('pointerdown', close, true)
    }
  }, [open])

  const toggle = () => {
    if (!open) positionMenu()
    setOpen((current) => !current)
  }

  return <>
    <button ref={buttonRef} type="button" className={`grouped-menu-select ${className}`} data-equalized-options={fillTrack ? JSON.stringify(equalizedLabels) : undefined} data-equalized-leading={fillTrack && hasEqualizedLeadingMark ? 'true' : undefined} style={fillTrack ? { width: '100%', minWidth: 0, maxWidth: '100%' } : { width: fittedWidth, maxWidth: '100%' }} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} title={title} disabled={disabled} onClick={toggle}>
      {selectedCompany ? <CompanyIcon provider={selectedCompany} /> : selected?.iconPath ? <svg className="model-company-logo" viewBox="0 0 24 24" aria-hidden="true"><path d={selected.iconPath} /></svg> : null}<span>{selectedLabel}</span><ChevronDown size={10} />
    </button>
    {open && position && createPortal(<div className={`grouped-menu-select-menu ${menuClassName} nodrag`} role="listbox" style={{ left: position.left, bottom: position.bottom, width: position.width, '--floating-menu-font-size': `${position.fontSize}px` } as CSSProperties}>
      {groups.map((group) => group.options.length ? <section key={group.label}>{group.label && <small>{group.label}</small>}{group.options.map((option) => { const company = option.provider || modelCompanyFor(option.value, option.label); return <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'is-active' : ''} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }}>{company ? <CompanyIcon provider={company} /> : option.iconPath ? <svg className="model-company-logo" viewBox="0 0 24 24" aria-hidden="true"><path d={option.iconPath} /></svg> : ratioPreview(option.aspectRatioPreview) || <span className="model-company-logo-placeholder" aria-hidden="true" />}<span>{option.label}</span>{option.value === value && <Check size={11} />}</button> })}</section> : null)}
    </div>, document.body)}
  </>
}

export function SimpleMenuSelect({ value, options, ariaLabel, title, disabled = false, className = '', menuClassName = '', fillTrack = false, onChange }: {
  value: string | undefined
  options: GroupedMenuOption[]
  ariaLabel: string
  title?: string
  disabled?: boolean
  className?: string
  menuClassName?: string
  fillTrack?: boolean
  onChange: (value: string) => void
}) {
  return <GroupedMenuSelect
    value={value || options[0]?.value || ''}
    groups={[{ label: '', options }]}
    ariaLabel={ariaLabel}
    title={title}
    disabled={disabled}
    className={`simple-menu-select ${className}`}
    menuClassName={`simple-menu-select-menu ${menuClassName}`}
    fillTrack={fillTrack}
    onChange={onChange}
  />
}

function EqualizedControlRow({ className = '', ariaLabel, children }: { className?: string; ariaLabel?: string; children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    let active = true
    const renderedInkWidth = (context: CanvasRenderingContext2D, value: string) => {
      const metrics = context.measureText(value)
      // actualBoundingBox* follows the pixels painted by the active browser font,
      // unlike character counts or advance width, which include invisible spacing.
      return Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
    }
    const equalize = () => {
      if (!active) return
      const labels = Array.from(row.children) as HTMLElement[]
      if (!labels.length) return
      const rowStyle = window.getComputedStyle(row)
      const numeric = (value: string) => Number.parseFloat(value) || 0
      const gap = numeric(rowStyle.columnGap)
      // clientWidth includes padding, while CSS Grid assigns tracks inside the
      // content box. Subtract both inset edges before allocating pixel tracks
      // or the final control will overflow by the row's total horizontal padding.
      const contentWidth = row.clientWidth - numeric(rowStyle.paddingLeft) - numeric(rowStyle.paddingRight)
      const availableForControls = Math.max(0, contentWidth - gap * (labels.length - 1))
      const renderedRowWidth = row.getBoundingClientRect().width
      const rowScale = row.clientWidth > 0 && renderedRowWidth > 0 ? renderedRowWidth / row.clientWidth : 1
      const measured = labels.map((label) => {
        const selectControl = label.matches('[data-equalized-options]')
          ? label as HTMLButtonElement
          : label.querySelector<HTMLButtonElement>('[data-equalized-options]')
        const numberControl = label.matches('input[data-equalized-number]')
          ? label as HTMLInputElement
          : label.querySelector<HTMLInputElement>('input[data-equalized-number]')
        let measuredSelectMin = 0
        let measuredNumberMin = 0
        if (selectControl) {
          const style = window.getComputedStyle(selectControl)
          const context = document.createElement('canvas').getContext('2d')
          if (context) {
            context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
            const optionLabels = JSON.parse(selectControl.dataset.equalizedOptions || '[]') as string[]
            const widestValue = Math.max(...optionLabels.map((value) => renderedInkWidth(context, value)), 0)
            const hasLeadingMark = selectControl.dataset.equalizedLeading === 'true'
            const controlGap = numeric(style.columnGap || style.gap) || 7
            const fixedChromeWidth = numeric(style.paddingLeft) + numeric(style.paddingRight)
              + numeric(style.borderLeftWidth) + numeric(style.borderRightWidth)
              + 10 + controlGap * (hasLeadingMark ? 2 : 1) + (hasLeadingMark ? 16 : 0)
            measuredSelectMin = Math.ceil(widestValue + fixedChromeWidth)
          }
        }
        if (numberControl) {
          const style = window.getComputedStyle(numberControl)
          const context = document.createElement('canvas').getContext('2d')
          if (context) {
            context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
            const legalValues = [numberControl.min, numberControl.max, numberControl.value].filter(Boolean)
            const widestValue = Math.max(...legalValues.map((value) => renderedInkWidth(context, value)), 0)
            const spinnerWidth = 16
            const contentAdornmentGap = 7
            const fixedChromeWidth = numeric(style.paddingLeft) + numeric(style.paddingRight)
              + numeric(style.borderLeftWidth) + numeric(style.borderRightWidth)
              + contentAdornmentGap
              + spinnerWidth
            measuredNumberMin = Math.ceil(widestValue + fixedChromeWidth)
          }
        }
        // A grid label stretches to its full track. Its heading span therefore
        // reports the track width through scrollWidth, not the visible heading
        // ink, and feeding that value back into the grid preserves bad columns.
        const base = measuredSelectMin || measuredNumberMin
        if (base) return { base, flexible: true }
        // Fixed children may deliberately fill their assigned track. Cache the
        // first intrinsic/fallback-grid width before this allocator writes new
        // tracks, otherwise ResizeObserver feeds each stretched width back into
        // the next pass and the row grows exponentially.
        const cachedFixedWidth = Number.parseFloat(label.dataset.equalizedFixedWidth || '')
        const fixedWidth = Number.isFinite(cachedFixedWidth) && cachedFixedWidth > 0
          ? cachedFixedWidth
          : label.getBoundingClientRect().width / rowScale
        if (!label.dataset.equalizedFixedWidth && fixedWidth > 0) label.dataset.equalizedFixedWidth = String(fixedWidth)
        return { base: fixedWidth, flexible: false }
      })
      const fixedTotal = measured.filter((item) => !item.flexible).reduce((sum, item) => sum + item.base, 0)
      const flexible = measured.filter((item) => item.flexible)
      const flexibleTotal = flexible.reduce((sum, item) => sum + item.base, 0)
      const flexibleAvailable = Math.max(0, availableForControls - fixedTotal)
      const scale = flexibleTotal > flexibleAvailable && flexibleTotal > 0 ? flexibleAvailable / flexibleTotal : 1
      const sharedVisualDistance = flexible.length ? Math.max(0, (flexibleAvailable - flexibleTotal * scale) / flexible.length) : 0
      const widths = measured.map((item) => item.flexible ? item.base * scale + sharedVisualDistance : item.base)
      row.style.gridTemplateColumns = widths.map((width) => `${width}px`).join(' ')
    }
    const observer = new ResizeObserver(equalize)
    observer.observe(row)
    equalize()
    document.fonts?.ready.then(() => { if (active) equalize() })
    return () => {
      active = false
      observer.disconnect()
    }
  }, [children])

  return <div ref={rowRef} className={`equalized-control-row ${className}`} aria-label={ariaLabel}>{children}</div>
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

export function RerunIcon({ size = 13 }: { size?: number }) {
  return <RotateCw className="rerun-icon" size={size} strokeWidth={2.1} aria-hidden="true" />
}

export function StopIcon({ size = 13 }: { size?: number }) {
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
  if (provider === 'black-forest-labs') return <span className="model-company-wordmark" aria-hidden="true">BFL</span>
  const icon = provider === 'meta' ? siMeta : provider === 'alibaba' ? siAlibabacloud : provider === 'bytedance' ? siBytedance : provider === 'kuaishou' ? siKuaishou : provider === 'elevenlabs' ? siElevenlabs : provider === 'fish' ? siFishaudio : null
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

function balancedAssetPreview(assets: ImportedAsset[], category?: 'character' | 'element' | 'location') {
  return balancedSemanticPreview(assets, category)
}

function characterThumbnailPreview(assets: ImportedAsset[]) {
  const available = assets.filter((asset) => Boolean(asset.url))
  const thumbnail = available.find((asset) => asset.metadata?.characterView === 'front') || available[0]
  return thumbnail ? [thumbnail] : []
}

export function reusableEditorFingerprint(data: StudioNodeData): string {
  return JSON.stringify({
    kind: data.kind,
    referenceAssets: (data.referenceAssets || []).map((asset) => ({
      id: asset.id,
      path: asset.path,
      url: asset.url,
      mimeType: asset.mimeType,
      characterView: asset.metadata?.characterView,
      elementView: asset.metadata?.elementView,
      prompt: asset.metadata?.prompt,
      styleDescription: asset.metadata?.styleDescription,
      previewFocusX: asset.metadata?.previewFocusX,
      previewFocusY: asset.metadata?.previewFocusY,
    })),
    prompt: data.prompt || '',
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
  connectPromptTags: (id: string, prompt: string, previousPrompt?: string) => void
  availablePromptTags: (id: string) => string[]
  adjustVoiceoverQuantity: (id: string, delta: -1 | 1) => void
  runNode: (id: string) => void
  stopNode: (id: string) => void
  runFromNode: (id: string) => void
  importAsset: (id: string, assetView?: CharacterView | ElementView) => void
  importDroppedAssets: (id: string, files: File[], assetView?: CharacterView | ElementView) => void
  importCanvasAssetIntoView: (id: string, payload: string, assetView: CharacterView | ElementView) => void
  completeCharacterSet: (id: string) => void
  completeElementSet: (id: string) => void
  saveCharacterAsset: (id: string, name: string, replaceExisting?: boolean) => void
  buildStylePrompt: (id: string) => void
  saveStylePreset: (id: string, name: string) => void
  saveSemanticAsset: (id: string, name: string) => void
  renameNodeAsset: (id: string, name: string) => void
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
  setInputFidelity: (edgeId: string, mode: InputFidelity) => void
  openInspector: (id: string) => void
  resetNodeSettings: (id: string) => void
  duplicateNode: (id: string) => void
  deleteNode: (id: string) => void
  focusNode: (id: string) => void
  copyNodeLink: (id: string) => void
  importStoryboardPanel: (id: string, panelId: string) => void
  openStyleChooser: (id: string) => void
  compileStoryboard: (id: string) => void
  rewriteStoryboardPanel: (id: string, panelId?: string) => void
  availableModels: (provider: 'fal' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot') => Array<{ id: string; label: string }>
  modelAvailabilityVerified: (provider: 'fal' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot') => boolean
  runAssistantNode: (id: string) => void
  estimateNode: (id: string) => Promise<GenerationCostEstimate | null>
  providerAccount: (provider: ServiceProvider) => ServiceAccountStatus | undefined
  providerConnected: (provider: ServiceProvider) => boolean
  runReadiness: (id: string) => { disabled: boolean; tooltip: string }
  openConnections: () => void
  characterLibrary: Array<{ nodeId: string; title: string; referenceTag?: string; referenceAssets: ImportedAsset[]; prompt?: string }>
  selectCharacter: (targetId: string, sourceId: string) => void
  semanticLibraries: Record<'element' | 'location' | 'style-reference', Array<{ nodeId: string; title: string; referenceTag?: string; referenceAssets: ImportedAsset[]; prompt?: string; description?: string }>>
  selectSemanticAsset: (targetId: string, sourceId: string) => void
  setReusableFavorite: (id: string, favorite: boolean) => void
  exportReusableAsset: (id: string) => void
  deleteReusableAsset: (id: string) => void
  storyboardLibrary: Array<{ nodeId: string; title: string; referenceTag?: string; outputUrl?: string; storyboardNeedsCompile?: boolean; storyboardPanels: NonNullable<StudioNodeData['storyboardPanels']>; storyboardDuration?: number; storyboardModelId?: string }>
  selectStoryboard: (targetId: string, sourceId: string) => void
  saveStoryboard: (id: string) => void
  exportStoryboard: (id: string) => void
  deleteStoryboard: (id: string) => void
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
const CANVAS_ASSET_DRAG_MIME = 'application/x-prism-foundry-canvas-asset'
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

const GalleryIcon = NODE_KIND_ICONS.gallery!

export function videoRatioOptions(engine: StudioNodeData['videoEngine'] = 'wan-controlled'): readonly string[] {
  return resolveVideoModel(engine).ratios
}

export function videoDurationOptions(engine: StudioNodeData['videoEngine'] = 'wan-controlled', frameRate = 24): Array<number | 'auto'> {
  const model = resolveVideoModel(engine)
  if (model.family !== 'wan') return [...model.durations]
  const fps = Math.min(Math.max(Math.round(frameRate || 24), 4), 60)
  const minimum = Math.max(1, Math.ceil(17 / fps))
  const maximum = Math.max(minimum, Math.floor(161 / fps))
  return Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index)
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
  const runtime = useContext(NodeRuntimeContext)
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const styleStripRef = useRef<HTMLDivElement>(null)
  const styleStripDrag = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null)
  const styleStripDidDrag = useRef(false)
  const styleStripLastDragAt = useRef(0)
  const styleStripDesiredScroll = useRef(0)
  const styleStripFrame = useRef<number | null>(null)
  const [styleStripDragging, setStyleStripDragging] = useState(false)
  const [libraryQuery, setLibraryQuery] = useState('')
  const [editorSnapshot, setEditorSnapshot] = useState<StudioNodeData | null>(null)
  const [editorBaseline, setEditorBaseline] = useState<StudioNodeData | null>(null)
  const [editorSessionMode, setEditorSessionMode] = useState<'edit' | 'create' | null>(null)
  const styleCreateOpen = Boolean(data.styleEditorOpen)
  const [characterEditorSessionOpen, setCharacterEditorSessionOpen] = useState(false)
  const characterLibraryItems = runtime?.characterLibrary || []
  const semanticLibraryItems = ['element', 'location', 'style-reference'].includes(data.kind)
    ? runtime?.semanticLibraries[data.kind as 'element' | 'location' | 'style-reference'] || []
    : []
  const characterCreateOpen = Boolean(data.kind === 'character' && data.characterEditorOpen && characterEditorSessionOpen)
  const semanticCreateOpen = Boolean(['element', 'location'].includes(data.kind) && data.semanticEditorOpen)
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase()
  const filteredCharacters = characterLibraryItems.filter((item) => !normalizedLibraryQuery || item.title.toLowerCase().includes(normalizedLibraryQuery))
  const filteredSemanticLibrary = ['element', 'location', 'style-reference'].includes(data.kind)
    ? semanticLibraryItems.filter((item) => !normalizedLibraryQuery || item.title.toLowerCase().includes(normalizedLibraryQuery))
    : []
  const filteredStylePresets = STYLE_PRESETS.filter((preset) => !normalizedLibraryQuery || preset.title.toLowerCase().includes(normalizedLibraryQuery))
  const selectedStylePreset = data.kind === 'style-reference'
    ? STYLE_PRESETS.find((preset) => preset.id === data.stylePresetId || preset.id === data.referenceTag?.replace(/^@+/, '') || preset.title.toLowerCase() === data.title.toLowerCase())
    : undefined
  const reusablePreviewAssets = balancedAssetPreview(data.referenceAssets || [], data.kind === 'character' || data.kind === 'element' || data.kind === 'location' ? data.kind : undefined)
  const reusableEditorDirty = Boolean(
    editorBaseline
    && (characterCreateOpen || styleCreateOpen || semanticCreateOpen)
    && reusableEditorFingerprint(data) !== reusableEditorFingerprint(editorBaseline)
  )
  const [saveNameOpen, setSaveNameOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renameNameOpen, setRenameNameOpen] = useState(false)
  const [renameName, setRenameName] = useState('')
  const [mediaContextMenu, setMediaContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [assetTagDraft, setAssetTagDraft] = useState(data.referenceTag?.replace(/^@+/, '') || '')
  const selectGeneratedResult = (index: number) => {
    const results = data.generatedResults || []
    const result = results[index]
    if (!result) return
    runtime?.updateNode(id, { activeResultIndex: index, outputPath: result.path, outputUrl: result.url, outputType: result.type, modelId: result.modelId })
  }
  const activeGeneratedIndex = Math.min(Math.max(data.activeResultIndex || 0, 0), Math.max((data.generatedResults?.length || 1) - 1, 0))
  const activeGeneratedResult = data.generatedResults?.[activeGeneratedIndex]
  const generatedMediaActions = activeGeneratedResult ? <div className="generated-media-actions nodrag" aria-label="Generated Media Actions">
    <button data-tooltip="Show In Finder" aria-label="Show Generated Media In Finder" onClick={(event) => { event.stopPropagation(); runtime?.revealGeneratedMedia(id, activeGeneratedIndex) }}><FolderOpen size={13} /></button>
    <button data-tooltip="Rename" aria-label="Rename Generated Media" onClick={(event) => { event.stopPropagation(); setRenameName(activeMediaName(data)); setRenameNameOpen(true) }}><PencilLine size={13} /></button>
    <button data-tooltip={runtime?.generatedMediaFavorite(id, activeGeneratedIndex) ? 'Remove From Favorites' : 'Add To Favorites'} aria-label={runtime?.generatedMediaFavorite(id, activeGeneratedIndex) ? 'Remove Generated Media From Favorites' : 'Add Generated Media To Favorites'} className={runtime?.generatedMediaFavorite(id, activeGeneratedIndex) ? 'is-active' : ''} onClick={(event) => { event.stopPropagation(); runtime?.setGeneratedMediaFavorite(id, activeGeneratedIndex, !runtime.generatedMediaFavorite(id, activeGeneratedIndex)) }}><Heart size={13} fill={runtime?.generatedMediaFavorite(id, activeGeneratedIndex) ? 'currentColor' : 'none'} /></button>
    <button className="is-danger" data-tooltip="Delete" aria-label="Delete Generated Media" onClick={(event) => { event.stopPropagation(); runtime?.trashGeneratedMedia(id, activeGeneratedIndex) }}><Trash2 size={13} /></button>
  </div> : null
  const generatedMediaInteraction = activeGeneratedResult ? {
    onDoubleClick: (event: ReactMouseEvent) => { event.stopPropagation(); runtime?.openGeneratedMedia(id, activeGeneratedIndex) },
    onContextMenu: (event: ReactMouseEvent) => { event.preventDefault(); event.stopPropagation(); setMediaContextMenu({ x: event.clientX, y: event.clientY }) },
  } : {}
  useEffect(() => {
    setCharacterEditorSessionOpen(Boolean(data.characterEditorOpen))
  }, [data.characterEditorOpen])
  const [enhanceModelMenuOpen, setEnhanceModelMenuOpen] = useState(false)
  const [enhanceModelMenuPosition, setEnhanceModelMenuPosition] = useState<{ left: number; bottom: number; width: number; fontSize: number } | null>(null)
  const enhanceModelButtonRef = useRef<HTMLButtonElement>(null)
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
  const errorProvider: ServiceProvider = data.kind === 'voiceover' && data.voiceEngine === 'fish-audio'
    ? 'fish'
    : ['image-generator', 'image-editor', 'character', 'element', 'location'].includes(data.kind)
      ? data.imageProvider || 'fal'
      : data.kind === 'prompt' ? enhanceProvider : 'fal'
  const displayError = compactProviderError(data.error, errorProvider)
  const enhanceBlocked = Boolean(enhanceAccount && ['credit-required', 'temporarily-limited', 'unavailable'].includes(enhanceAccount.state))
  const running = data.runState === 'queued' || data.runState === 'running'
  const generationAction = generationActionState(data)
  const rerun = generationAction === 'rerun'
  const generationTimeLeft = useGenerationTimeLeft(data, running, id)
  const inputPorts = nodeInputPorts(data)
  const acceptsText = inputPorts.some((port) => port.signal === 'text')
  const outputsText = data.kind === 'prompt'
  const outputsMedia = ['upload', 'image-generator', 'image-editor', 'upscaler', 'video-generator', 'output', 'gallery', 'character', 'location', 'element', 'style-reference', 'voiceover', 'sound-effects', 'music-generator'].includes(data.kind)
  const runnable = isRunnableNodeKind(data.kind)
  const toolbarEligible = data.kind === 'gallery' || runnable || outputsText || outputsMedia
  const isSemanticReference = ['character', 'location', 'element', 'style-reference'].includes(data.kind)
  const canRenameAsset = canRenameNodeAsset(data)
  const isImageGeneratorSurface = data.kind === 'image-generator' || data.kind === 'image-editor'
  const isCanvasGenerator = isImageGeneratorSurface || data.kind === 'video-generator'
  const isMediaTile = ['upload', 'output', 'gallery'].includes(data.kind) || isSemanticReference
  const connectedTags = acceptsText ? runtime?.connectedReferenceTags(id) || [] : []
  const connectedInputRules = runtime?.connectedInputRules(id) || []
  const fidelityInputRules = connectedInputRules.filter((rule) => rule.toggleable && rule.edgeId)
  const connectedPromptTags = [...new Set(connectedInputRules.flatMap((rule) => [rule.tag, ...(rule.aliases || [])]))]
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
  const nativeVideoFps = selectedVideoModel ? knownOutputFrameRate(selectedVideoModel, data.frameRate) : undefined
  const stageRatio = selectedRatio === 'auto' ? (data.kind === 'video-generator' ? '16:9' : '1:1') : selectedRatio
  const [stageWidth, stageHeight] = stageRatio.split(':').map(Number)
  const stageOrientation = stageHeight > stageWidth ? 'portrait' : 'landscape'
  const isImageOperation = data.kind === 'image-generator' || data.kind === 'image-editor'
  const imageProvider = data.imageProvider || 'fal'
  const selectedFalReferenceModel = imageProvider === 'fal' && (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(data.imageModelId || '')
  const falReferenceImageModels = [
    { id: FAL_IMAGE_MODELS.nanoBananaEdit, label: 'Nano Banana Pro', provider: 'google' },
    { id: FAL_IMAGE_MODELS.seedream5ProEdit, label: 'Seedream 5.0 Pro', provider: 'bytedance' },
    { id: FAL_IMAGE_MODELS.gptImage2Edit, label: 'GPT Image 2', provider: 'openai' },
    { id: FAL_IMAGE_MODELS.fluxKontext, label: 'FLUX Kontext Pro', provider: 'black-forest-labs' },
  ].filter((model) => (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(model.id))
  const falImageModels = data.kind === 'image-editor' || hasImageReferences || selectedFalReferenceModel
    ? falReferenceImageModels
    : [
      { id: FAL_IMAGE_MODELS.fluxSchnell, label: 'FLUX Schnell', provider: 'black-forest-labs' },
      { id: FAL_IMAGE_MODELS.nanoBanana, label: 'Nano Banana Pro', provider: 'google' },
    ]
  const connectedOpenAIImageModels = (runtime?.availableModels('openai') || []).filter((model) => /gpt-image/i.test(model.id)).map((model) => ({ ...model, label: modelDisplayName(model.id, model.label) }))
  const connectedGoogleImageModels = (runtime?.availableModels('google') || []).filter((model) => /image|imagen/i.test(model.id)).map((model) => ({ ...model, label: modelDisplayName(model.id, model.label) }))
  const openAIImageModels = [...DIRECT_IMAGE_MODELS.openai, ...connectedOpenAIImageModels].filter((model, index, models) => models.findIndex((candidate) => candidate.id === model.id) === index)
  const googleImageModels = [...DIRECT_IMAGE_MODELS.google, ...connectedGoogleImageModels].filter((model, index, models) => models.findIndex((candidate) => candidate.id === model.id) === index)
  const defaultImageModel = imageProvider === 'openai' ? 'gpt-image-2' : imageProvider === 'google' ? 'gemini-3.1-flash-image' : data.kind === 'image-editor' ? 'fal-ai/flux-pro/kontext' : 'fal-ai/flux/schnell'
  const requestedImageModelId = data.imageModelId || defaultImageModel
  const imageModelId = imageProvider === 'fal' && (data.kind === 'image-editor' || hasImageReferences || selectedFalReferenceModel)
    ? (FAL_REFERENCE_IMAGE_MODELS as readonly string[]).includes(requestedImageModelId) ? requestedImageModelId : FAL_IMAGE_MODELS.nanoBananaEdit
    : requestedImageModelId === FAL_IMAGE_MODELS.nanoBananaEdit ? FAL_IMAGE_MODELS.nanoBanana : requestedImageModelId
  const usesNanoImageModel = imageProvider === 'fal' && imageModelId.includes('nano-banana')
  const supportedImageResolutions = imageResolutionOptions(imageProvider, imageModelId)
  const selectedImageResolution = supportedImageResolutions.includes(data.imageResolution || '1K') ? data.imageResolution || '1K' : supportedImageResolutions[0]
  const characterFrontFace = data.kind === 'character' ? (data.referenceAssets || []).find((asset) => asset.metadata?.characterView === 'front') : undefined
  const characterViewCount = data.kind === 'character' ? new Set((data.referenceAssets || []).map((asset) => asset.metadata?.characterView).filter((view) => CHARACTER_VIEWS.some(([candidate]) => candidate === view))).size : 0
  const reusableRequiredLabel = data.kind === 'element' ? 'Element Required' : data.kind === 'location' ? 'Location Required' : data.kind === 'style-reference' ? 'Style Required' : ''
  const reusableReady = Boolean(reusableRequiredLabel && !incompleteSemanticReason(data))
  const elementReferences = data.kind === 'element' ? (data.referenceAssets || []).filter((asset) => asset.metadata?.elementView) : []
  const elementMissingViews = data.kind === 'element' ? missingElementViews(elementReferences) : []
  const visibleProgress = data.kind === 'video-generator' && /Kling O3 References/.test(data.progress || '') ? undefined : data.progress
  const visibleStatus = isCanvasGenerator
    ? displayError || (running ? visibleProgress : undefined)
    : data.kind === 'character'
    ? displayError || (running ? visibleProgress : undefined)
    : data.kind === 'prompt' && !enhanceOpen ? undefined : displayError || visibleProgress
  const semanticAnchorReady = data.kind === 'character' ? Boolean(characterFrontFace) : data.kind === 'element' ? elementReferences.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW) : true
  const falSemanticModelIds = semanticAnchorReady
    ? [...FAL_CHARACTER_COMPLETION_MODELS]
    : ['fal-ai/flux/schnell', 'fal-ai/nano-banana-pro']
  const requestedCharacterCompletionModelId = data.imageModelId || (imageProvider === 'openai' ? 'gpt-image-2' : imageProvider === 'google' ? 'gemini-3.1-flash-image' : falSemanticModelIds[0])
  const characterCompletionModelIds = imageProvider === 'openai'
    ? openAIImageModels.map((model) => model.id)
    : imageProvider === 'google'
      ? googleImageModels.map((model) => model.id)
      : falSemanticModelIds
  const characterCompletionModelId = characterCompletionModelIds.includes(requestedCharacterCompletionModelId)
    ? requestedCharacterCompletionModelId
    : characterCompletionModelIds[0] || requestedCharacterCompletionModelId
  useEffect(() => {
    if (!['character', 'element'].includes(data.kind) || data.imageModelId === characterCompletionModelId) return
    runtime?.updateNode(id, { imageModelId: characterCompletionModelId })
  }, [characterCompletionModelId, data.imageModelId, data.kind, id, runtime])
  const characterCompletionGroups: GroupedMenuGroup[] = [
    { label: 'fal.ai', options: semanticAnchorReady
      ? [
        { value: `fal::${FAL_IMAGE_MODELS.nanoBananaEdit}`, label: 'Nano Banana Pro', provider: 'google' },
        { value: `fal::${FAL_IMAGE_MODELS.seedream5ProEdit}`, label: 'Seedream 5.0 Pro', provider: 'bytedance' },
        { value: `fal::${FAL_IMAGE_MODELS.gptImage2Edit}`, label: 'GPT Image 2', provider: 'openai' },
        { value: `fal::${FAL_IMAGE_MODELS.fluxKontext}`, label: 'FLUX Kontext Pro', provider: 'black-forest-labs' },
      ]
      : [{ value: 'fal::fal-ai/flux/schnell', label: 'FLUX Schnell', provider: 'black-forest-labs' }, { value: 'fal::fal-ai/nano-banana-pro', label: 'Nano Banana Pro', provider: 'google' }] },
    { label: 'OpenAI', options: openAIImageModels.map((model) => ({ value: `openai::${model.id}`, label: model.label, provider: 'openai' as const })) },
    { label: 'Google', options: googleImageModels.map((model) => ({ value: `google::${model.id}`, label: model.label, provider: 'google' as const })) },
  ]
  const stylePromptModelId = data.stylePromptModelId || 'google/gemini-pro-1.5'
  const stylePromptModelGroups: GroupedMenuGroup[] = [{ label: 'fal.ai', options: [
    { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5', provider: 'google' },
    { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'openai' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', provider: 'deepseek' },
    { value: 'meta-llama/llama-3.2-3b-instruct', label: 'Llama 3.2 3B', iconPath: siMeta.path },
  ] }]
  const currentSavedCharacterName = data.kind === 'character' && data.referenceTag
    ? normalizeLogicalAssetName(data.referenceTag)
    : ''
  const editingSavedCharacter = Boolean(currentSavedCharacterName && characterLibraryItems.some((item) => normalizeLogicalAssetName(item.referenceTag || item.title) === currentSavedCharacterName))
  const openSaveName = () => {
    if (data.kind === 'character' && editingSavedCharacter) {
      runtime?.saveCharacterAsset(id, currentSavedCharacterName, false)
      return
    }
    const fallback = data.kind === 'character' ? 'character' : data.kind === 'location' ? 'location' : data.kind === 'element' ? 'element' : 'style'
    const current = /^(Custom Character|Custom Style|Custom Location|Custom Element)$/i.test(data.title.trim()) ? '' : data.title.trim()
    setSaveName(normalizeLogicalAssetName(current) || fallback)
    setSaveNameOpen(true)
  }
  const commitSaveName = () => {
    const name = normalizeLogicalAssetName(saveName)
    if (!name) return
    if (data.kind === 'character') {
      const collision = characterLibraryItems.find((item) => normalizeLogicalAssetName(item.referenceTag || item.title) === name)
      const editingSameCharacter = editorSessionMode === 'edit' && normalizeLogicalAssetName(editorSnapshot?.referenceTag || editorSnapshot?.title || data.referenceTag || data.title) === name
      const replaceExisting = Boolean(collision && !editingSameCharacter)
      if (replaceExisting && !window.confirm(`A Character named “${name}” already exists. Replace the existing Character?`)) return
      runtime?.saveCharacterAsset(id, name, replaceExisting)
    }
    if (data.kind === 'style-reference') runtime?.saveStylePreset(id, name)
    if (data.kind === 'location' || data.kind === 'element') runtime?.saveSemanticAsset(id, name)
    setEditorSnapshot(null)
    setEditorSessionMode(null)
    setSaveNameOpen(false)
  }
  const openReusableEditor = () => {
    if (data.kind === 'character') {
      const identity = normalizeLogicalAssetName(data.referenceTag || data.title)
      const libraryCharacter = characterLibraryItems.find((item) => normalizeLogicalAssetName(item.referenceTag || item.title) === identity)
      const hydratedData = { ...data, referenceAssets: libraryCharacter?.referenceAssets || data.referenceAssets || [], prompt: data.prompt || libraryCharacter?.prompt || '' }
      setEditorSnapshot(structuredClone(hydratedData))
      setEditorBaseline(structuredClone(hydratedData))
      setEditorSessionMode('edit')
      setCharacterEditorSessionOpen(true)
      runtime?.updateNode(id, { referenceAssets: hydratedData.referenceAssets, prompt: hydratedData.prompt, characterEditorOpen: true, error: undefined })
    }
    else {
      setEditorSnapshot(structuredClone(data))
      setEditorBaseline(structuredClone(data))
      setEditorSessionMode('edit')
      if (data.kind === 'style-reference') runtime?.updateNode(id, { styleEditorOpen: true })
      else runtime?.updateNode(id, { semanticEditorOpen: true })
    }
  }
  const openReusableCreator = () => {
    setEditorSnapshot(structuredClone(data))
    setEditorSessionMode('create')
    if (data.kind === 'character') {
      const patch: Partial<StudioNodeData> = { title: 'Custom Character', referenceTag: undefined, referenceAssets: [], characterSheetPath: undefined, characterSheetUrl: undefined, characterSheetViews: undefined, prompt: '', characterRole: undefined, characterEditorOpen: true, imageProvider: 'fal', imageModelId: 'fal-ai/nano-banana-pro/edit' }
      setEditorBaseline(structuredClone({ ...data, ...patch }))
      setCharacterEditorSessionOpen(true)
      runtime?.updateNode(id, patch)
    } else if (data.kind === 'style-reference') {
      const patch: Partial<StudioNodeData> = { title: 'Custom Style', referenceTag: undefined, referenceAssets: [], stylePresetId: undefined, styleDescription: '', prompt: '', stylePrompt: '', styleSavedAt: undefined, styleEditorOpen: true }
      setEditorBaseline(structuredClone({ ...data, ...patch }))
      runtime?.updateNode(id, patch)
    } else {
      const patch: Partial<StudioNodeData> = { title: data.kind === 'location' ? 'Custom Location' : 'Custom Element', referenceTag: undefined, referenceAssets: [], prompt: '', semanticEditorOpen: true, imageProvider: 'fal', imageModelId: data.kind === 'element' ? 'fal-ai/nano-banana-pro/edit' : 'fal-ai/flux/schnell' }
      setEditorBaseline(structuredClone({ ...data, ...patch }))
      runtime?.updateNode(id, patch)
    }
  }
  const cancelReusableEditor = () => {
    if (editorSnapshot) runtime?.updateNode(id, { ...editorSnapshot, characterEditorOpen: false, styleEditorOpen: false, semanticEditorOpen: false })
    else runtime?.updateNode(id, { characterEditorOpen: false, styleEditorOpen: false, semanticEditorOpen: false })
    setCharacterEditorSessionOpen(false)
    setEditorSnapshot(null)
    setEditorBaseline(null)
    setEditorSessionMode(null)
  }
  const openRenameName = () => {
    const reusable = (data.referenceAssets || []).some((asset) => ['character', 'element', 'location', 'style'].includes(asset.category || ''))
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
  const positionEnhanceModelMenu = () => {
    const rect = enhanceModelButtonRef.current?.getBoundingClientRect()
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      setEnhanceModelMenuOpen(false)
      return
    }
    const width = Math.min(window.innerWidth - 16, measuredFloatingMenuWidth(enhanceModelButtonRef.current!, enhanceGroups.flatMap((group) => [group.label, ...group.models.map((model) => model.label)]), 216, 360, 44))
    const fontSize = selectorTriggerFontSize(enhanceModelButtonRef.current!)
    const next = { left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), bottom: window.innerHeight - rect.top + 6, width, fontSize }
    setEnhanceModelMenuPosition((current) => current && Math.abs(current.left - next.left) < .25 && Math.abs(current.bottom - next.bottom) < .25 && Math.abs(current.width - next.width) < .25 && Math.abs(current.fontSize - next.fontSize) < .05 ? current : next)
  }
  useContinuousAnchor(enhanceModelMenuOpen, positionEnhanceModelMenu)
  const costTooltip = costEstimate ? `Estimated cost: ${costEstimate.totalCost.toLocaleString(undefined, { style: 'currency', currency: costEstimate.currency })}` : 'Estimated cost unavailable'
  const billingProvider: ServiceProvider = data.kind === 'voiceover' && data.voiceEngine === 'fish-audio' ? 'fish' : isImageOperation || ['character', 'element', 'location'].includes(data.kind) ? imageProvider : 'fal'
  const providerAccount = runtime?.providerAccount(billingProvider)
  const providerBlocked = providerAccount && ['credit-required', 'temporarily-limited', 'unavailable'].includes(providerAccount.state)
  const providerDisconnected = !runtime?.providerConnected(billingProvider)
  const providerName = billingProvider === 'openai' ? 'OpenAI' : billingProvider === 'google' ? 'Google Gemini' : billingProvider === 'fish' ? 'Fish Audio' : 'fal.ai'
  const runReadiness = runnable || ['character', 'element'].includes(data.kind) ? runtime?.runReadiness(id) : undefined
  const runDisabled = Boolean(runReadiness?.disabled)
  const runTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : runReadiness?.disabled
      ? runReadiness.tooltip
      : costTooltip
  const runButtonStateClass = running ? 'is-running' : rerun ? 'is-rerun' : 'is-ready'
  const semanticRunFailure = runReadiness?.disabled ? runReadiness.tooltip.replace(/^Cannot run:\s*/i, '').replace(/[.;]+$/g, '') : ''
  const characterCompletionFailures = [semanticRunFailure].filter(Boolean)
  const characterCompletionDisabled = characterViewCount >= CHARACTER_VIEWS.length || (!running && characterCompletionFailures.length > 0)
  const characterCompletionTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : characterViewCount >= CHARACTER_VIEWS.length
      ? 'No completion needed: all nine Character views are already complete.'
      : characterCompletionFailures.length
        ? `Cannot complete Character: ${formatRequirementList(characterCompletionFailures)}.`
        : !characterFrontFace
          ? costTooltip
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
    !(data.stylePrompt || data.prompt || '').trim() ? 'add custom Style wording' : '',
    providerDisconnected ? 'connect fal.ai in Connections' : '',
    providerBlocked ? providerAccount?.message || 'fal.ai is unavailable' : '',
  ].filter(Boolean)
  const styleBuildTooltip = running
    ? generationTimeLeft || 'Estimating time left…'
    : styleBuildFailures.length
      ? `Cannot build Style prompt: ${formatRequirementList(styleBuildFailures)}.`
      : 'Estimated cost unavailable'
  const toggleEnhanceModelMenu = () => {
    if (enhanceModelMenuOpen) {
      setEnhanceModelMenuOpen(false)
      return
    }
    positionEnhanceModelMenu()
    setEnhanceModelMenuOpen(true)
  }

  return (
    <article className={`studio-node kind-${data.kind} tone-${meta.tone} ${selected ? 'is-selected' : ''} ${data.locked ? 'is-locked' : ''} ${running ? 'is-generating' : ''} ${isCanvasGenerator ? 'is-canvas-generator' : ''} ${isMediaTile ? 'is-media-tile' : ''}`}>
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
        ? <label className={`node-asset-tag nodrag ${reusableEditorDirty ? 'is-unsaved' : ''}`} title={reusableEditorDirty ? 'Unsaved changes' : 'Rename Asset'} onDoubleClick={(event) => event.stopPropagation()}><span>@</span><input aria-label={reusableEditorDirty ? 'Unsaved asset changes' : `Rename ${data.title}`} value={reusableEditorDirty ? 'Unsaved' : assetTagDraft} readOnly={reusableEditorDirty} onChange={(event) => setAssetTagDraft(event.target.value)} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onBlur={() => { if (!reusableEditorDirty) commitAssetTagDraft() }} onKeyDown={(event) => { if (reusableEditorDirty) return; if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } if (event.key === 'Escape') { setAssetTagDraft(nodeAssetTag.slice(1)); event.currentTarget.blur() } }} /></label>
        : <div className="node-asset-tag is-readonly nodrag" aria-label={`Preset Asset Tag ${nodeAssetTag}`}><span>@</span><strong>{nodeAssetTag.slice(1)}</strong></div>)}
      {!data.headerHidden && <header className={`node-header ${isCanvasGenerator ? 'generator-node-header' : ''}`}>
        <span className="node-icon"><Icon size={15} /></span>
        <div>
          <strong>{meta.label}</strong>
          <small>{meta.subtitle}</small>
        </div>
        {data.kind === 'character' && (characterCreateOpen ? <button className="header-readiness-pill is-action is-cancel" onClick={cancelReusableEditor}>Cancel</button> : <span className={`header-readiness-pill ${characterFrontFace ? 'is-ready' : 'is-required'}`}>{characterFrontFace ? 'Ready' : 'Face Required'}</span>)}
        {['element', 'location', 'style-reference'].includes(data.kind) && ((data.kind === 'style-reference' ? styleCreateOpen : semanticCreateOpen) ? <button className="header-readiness-pill is-action is-cancel" onClick={cancelReusableEditor}>Cancel</button> : <span className={`header-readiness-pill ${reusableReady ? 'is-ready' : 'is-required'}`}>{reusableReady ? 'Ready' : reusableRequiredLabel}</span>)}
        {data.kind === 'prompt' && <button className={`prompt-enhance-switch nodrag ${enhanceOpen ? 'is-active' : ''}`} role="switch" aria-checked={enhanceOpen} title={enhanceOpen ? 'Turn Off Prompt Enhancement' : 'Turn On Prompt Enhancement'} onClick={() => { setEnhanceOpen((value) => !value); setEnhanceModelMenuOpen(false); runtime?.updateNode(id, { error: undefined, progress: undefined }) }}><Sparkles className="prompt-enhance-switch-icon" size={12} /><span>Enhance</span><span className="prompt-enhance-track"><i /></span></button>}
      </header>}

      {data.kind === 'prompt' && (
        <div className="prompt-node-body nodrag">
          <textarea className="node-textarea" value={data.prompt || ''} placeholder="Describe a world, product, frame, or movement…" onChange={(event) => runtime?.updateNode(id, { prompt: event.target.value })} />
          {enhanceOpen && <div className="prompt-enhance-popover prompt-enhance-inline">
            <div className="prompt-enhance-compact">
              <div className="prompt-enhance-model-picker">
                <button ref={enhanceModelButtonRef} className="prompt-enhance-model" type="button" aria-label="Enhance model" aria-haspopup="listbox" aria-expanded={enhanceModelMenuOpen} onClick={toggleEnhanceModelMenu}><ProviderIcon provider={enhanceProvider} /><span>{enhanceModelLabel}</span><ChevronDown className="prompt-enhance-chevron" size={10} /></button>
              </div>
              <button className="prompt-enhance-round" title="Connections" aria-label="Open Connections" onClick={() => runtime?.openConnections()}><Settings size={13} /></button>
              <button className="prompt-enhance-apply" title="Apply Enhancement" aria-label="Apply Enhancement" disabled={enhanceBlocked || !enhanceModel || !(data.prompt || '').trim() || data.runState === 'running'} onClick={() => runtime?.runAssistantNode(id)}>{data.runState === 'running' ? <LoaderCircle size={11} className="spin" /> : 'Apply'}</button>
            </div>
            {displayError && <small className="prompt-enhance-hint">{displayError}</small>}
          </div>}
        </div>
      )}
      {enhanceModelMenuOpen && enhanceModelMenuPosition && createPortal(<div className="prompt-enhance-model-menu nodrag" role="listbox" style={{ left: enhanceModelMenuPosition.left, bottom: enhanceModelMenuPosition.bottom, width: enhanceModelMenuPosition.width, '--floating-menu-font-size': `${enhanceModelMenuPosition.fontSize}px` } as CSSProperties}>{enhanceGroups.some((group) => group.models.length) ? enhanceGroups.map((group) => group.models.length ? <section key={group.provider}><small>{group.label}</small>{group.models.map((model) => { const active = group.provider === enhanceProvider && model.id === enhanceModel; return <button key={`${group.provider}-${model.id}`} type="button" role="option" aria-selected={active} className={active ? 'is-active' : ''} onClick={() => { runtime?.updateNode(id, { assistantProvider: group.provider as AssistantProvider, assistantModelId: model.id, error: undefined, progress: undefined }); setEnhanceModelMenuOpen(false) }}><ProviderIcon provider={group.provider} /><span>{model.label}</span>{active && <Check className="prompt-enhance-selected-check" size={11} />}</button> })}</section> : null) : <div className="prompt-enhance-model-empty">No Curated Model Available</div>}</div>, document.body)}

      {data.kind === 'upload' && !data.assetUrl && (
        <button className="upload-drop media-tile-empty nodrag" onClick={() => runtime?.importAsset(id)}>
          <Upload size={18} />
          <span>Choose Media</span>
          <small>A protected copy stays in your library</small>
        </button>
      )}

      {isSemanticReference && (
        <div className="semantic-reference semantic-tile nodrag">
          <label className="semantic-library-search"><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder={`Search ${data.kind === 'style-reference' ? 'Styles' : data.kind === 'character' ? 'Characters' : data.kind === 'location' ? 'Locations' : 'Elements'}`} aria-label={`Search ${data.kind === 'style-reference' ? 'Styles' : data.kind === 'character' ? 'Characters' : data.kind === 'location' ? 'Locations' : 'Elements'}`} />{!libraryQuery && <Search size={12} aria-hidden="true" />}</label>
          {data.kind === 'style-reference' && <div className="style-preset-browser">
            <div
              ref={styleStripRef}
              className={`style-preset-strip nowheel nodrag ${styleStripDragging ? 'is-dragging' : ''}`}
              aria-label="Style Presets"
              onWheelCapture={(event) => {
                event.stopPropagation()
                event.preventDefault()
                event.currentTarget.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                styleStripDidDrag.current = false
                styleStripDrag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
                styleStripDesiredScroll.current = event.currentTarget.scrollLeft
              }}
              onPointerMove={(event) => {
                const drag = styleStripDrag.current
                if (!drag || drag.pointerId !== event.pointerId) return
                const distance = event.clientX - drag.startX
                if (Math.abs(distance) > 3) {
                  styleStripDidDrag.current = true
                  styleStripLastDragAt.current = Date.now()
                  setStyleStripDragging(true)
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
                }
                styleStripDesiredScroll.current = drag.scrollLeft - distance
                if (styleStripFrame.current === null) styleStripFrame.current = window.requestAnimationFrame(() => {
                  if (styleStripRef.current) styleStripRef.current.scrollLeft = styleStripDesiredScroll.current
                  styleStripFrame.current = null
                })
              }}
              onPointerUp={(event) => {
                if (styleStripDrag.current?.pointerId === event.pointerId) styleStripDrag.current = null
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
                setStyleStripDragging(false)
              }}
              onPointerCancel={() => { styleStripDrag.current = null; setStyleStripDragging(false) }}
            >
              {filteredStylePresets.map((preset) => <button key={preset.id} className={data.stylePresetId === preset.id ? 'is-active' : ''} title={preset.title} onClick={() => { if (Date.now() - styleStripLastDragAt.current < 250) return; runtime?.updateNode(id, { title: preset.title, referenceTag: `@${preset.id}`, prompt: preset.prompt, stylePrompt: preset.prompt, styleDescription: preset.description, stylePresetId: preset.id, styleSavedAt: undefined, styleEditorOpen: false }) }}><span style={{ backgroundImage: `url(${preset.thumbnail})`, backgroundPosition: preset.focalPosition, backgroundSize: 'cover' }} /><strong>{preset.title}</strong></button>)}
              {filteredSemanticLibrary.map((item) => <button key={item.nodeId} className={data.referenceTag && data.referenceTag === item.referenceTag ? 'is-active' : ''} title={item.title} onClick={() => { if (Date.now() - styleStripLastDragAt.current < 250) return; runtime?.selectSemanticAsset(id, item.nodeId) }}><span>{item.referenceAssets[0]?.url ? <img src={item.referenceAssets[0].url} alt="" loading="lazy" decoding="async" /> : <Palette size={18} />}</span><strong>{item.title}</strong></button>)}
            </div>
          </div>}
          {data.kind === 'style-reference' && styleCreateOpen && <div className="style-create-panel-head"><span>Custom Style</span></div>}
          {data.kind === 'character' && <>
            {filteredCharacters.length ? <div className="style-preset-browser character-preset-browser">
              <div
                ref={styleStripRef}
                className={`style-preset-strip character-preset-strip nowheel nodrag ${styleStripDragging ? 'is-dragging' : ''}`}
                aria-label="Character Presets"
                onWheelCapture={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  event.currentTarget.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  styleStripDidDrag.current = false
                  styleStripDrag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
                  styleStripDesiredScroll.current = event.currentTarget.scrollLeft
                }}
                onPointerMove={(event) => {
                  const drag = styleStripDrag.current
                  if (!drag || drag.pointerId !== event.pointerId) return
                  const distance = event.clientX - drag.startX
                  if (Math.abs(distance) > 3) {
                    styleStripDidDrag.current = true
                    styleStripLastDragAt.current = Date.now()
                    setStyleStripDragging(true)
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
                  }
                  styleStripDesiredScroll.current = drag.scrollLeft - distance
                  if (styleStripFrame.current === null) styleStripFrame.current = window.requestAnimationFrame(() => {
                    if (styleStripRef.current) styleStripRef.current.scrollLeft = styleStripDesiredScroll.current
                    styleStripFrame.current = null
                  })
                }}
                onPointerUp={(event) => {
                  if (styleStripDrag.current?.pointerId === event.pointerId) styleStripDrag.current = null
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
                  setStyleStripDragging(false)
                }}
                onPointerCancel={() => { styleStripDrag.current = null; setStyleStripDragging(false) }}
              >
                {filteredCharacters.map((character) => { const previewAssets = characterThumbnailPreview(character.referenceAssets); return <button key={character.nodeId} className={data.referenceTag && data.referenceTag === character.referenceTag ? 'is-active' : ''} title={character.title} onClick={() => { if (Date.now() - styleStripLastDragAt.current < 250) return; runtime?.selectCharacter(id, character.nodeId) }}><span className="asset-sheet-thumbnail character-sheet-thumbnail" data-preview-count={previewAssets.length}>{previewAssets.length ? previewAssets.map((asset) => <img key={asset.id} src={asset.url} alt="" loading="lazy" decoding="async" data-character-view={asset.metadata?.characterView} style={{ objectPosition: previewFocalPosition(asset, true) }} />) : <UserRound size={18} />}</span><strong>{character.title}</strong></button> })}
              </div>
            </div> : <div className="character-library-empty"><UserRound size={20} /><strong>{normalizedLibraryQuery ? 'No Matching Characters' : 'No Characters Yet'}</strong><span>{normalizedLibraryQuery ? 'Try another search.' : 'Create the first reusable identity for this project.'}</span></div>}
          </>}
          {['element', 'location'].includes(data.kind) && !semanticCreateOpen && <>
            {filteredSemanticLibrary.length ? <div className="style-preset-browser semantic-preset-browser">
              <div ref={styleStripRef} className={`style-preset-strip semantic-preset-strip nowheel nodrag ${styleStripDragging ? 'is-dragging' : ''}`} aria-label={`${data.kind === 'location' ? 'Location' : 'Element'} Presets`} onWheelCapture={(event) => { event.stopPropagation(); event.preventDefault(); event.currentTarget.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY }} onPointerDown={(event) => { if (event.button !== 0) return; styleStripDidDrag.current = false; styleStripDrag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft }; styleStripDesiredScroll.current = event.currentTarget.scrollLeft }} onPointerMove={(event) => { const drag = styleStripDrag.current; if (!drag || drag.pointerId !== event.pointerId) return; const distance = event.clientX - drag.startX; if (Math.abs(distance) > 3) { styleStripDidDrag.current = true; styleStripLastDragAt.current = Date.now(); setStyleStripDragging(true); if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId) } styleStripDesiredScroll.current = drag.scrollLeft - distance; if (styleStripFrame.current === null) styleStripFrame.current = window.requestAnimationFrame(() => { if (styleStripRef.current) styleStripRef.current.scrollLeft = styleStripDesiredScroll.current; styleStripFrame.current = null }) }} onPointerUp={(event) => { if (styleStripDrag.current?.pointerId === event.pointerId) styleStripDrag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setStyleStripDragging(false) }} onPointerCancel={() => { styleStripDrag.current = null; setStyleStripDragging(false) }}>
                {filteredSemanticLibrary.map((item) => { const previewAssets = balancedAssetPreview(item.referenceAssets, data.kind === 'element' || data.kind === 'location' ? data.kind : undefined); return <button key={item.nodeId} className={data.referenceTag && data.referenceTag === item.referenceTag ? 'is-active' : ''} title={item.title} onClick={() => { if (Date.now() - styleStripLastDragAt.current < 250) return; runtime?.selectSemanticAsset(id, item.nodeId) }}><span className="asset-sheet-thumbnail" data-preview-count={previewAssets.length}>{previewAssets.length ? previewAssets.map((asset) => <img key={asset.id} src={asset.url} alt="" loading="lazy" decoding="async" />) : data.kind === 'location' ? <Mountain size={18} /> : <Box size={18} />}</span><strong>{item.title}</strong></button> })}
              </div>
            </div> : <div className="character-library-empty">{data.kind === 'location' ? <Mountain size={20} /> : <Box size={20} />}<strong>{normalizedLibraryQuery ? `No Matching ${data.kind === 'location' ? 'Locations' : 'Elements'}` : `No ${data.kind === 'location' ? 'Locations' : 'Elements'} Yet`}</strong><span>{normalizedLibraryQuery ? 'Try another search.' : `Create the first reusable ${data.kind}.`}</span></div>}
          </>}
          {!styleCreateOpen && !characterCreateOpen && !semanticCreateOpen && hasMaterializedAsset(data) && !data.reusableDeletedAt && <div className="reusable-large-preview">
            <div className={`reusable-large-preview-media ${data.kind === 'style-reference' ? 'is-style-preview' : ''} ${data.kind === 'character' ? 'is-character-preview' : ''}`} data-preview-count={selectedStylePreset ? 1 : reusablePreviewAssets.length}>{selectedStylePreset ? <img src={selectedStylePreset.thumbnail} alt={`${selectedStylePreset.title} preview`} style={{ objectPosition: selectedStylePreset.focalPosition }} /> : reusablePreviewAssets.length ? reusablePreviewAssets.map((asset) => <img key={asset.id} src={asset.url} alt="" data-character-view={data.kind === 'character' ? asset.metadata?.characterView : undefined} style={{ objectPosition: previewFocalPosition(asset, data.kind === 'character') }} />) : data.kind === 'style-reference' ? <Palette size={28} /> : data.kind === 'location' ? <Mountain size={28} /> : data.kind === 'element' ? <Box size={28} /> : <UserRound size={28} />}</div>
            {data.kind === 'style-reference' && <div className="reusable-large-preview-caption"><strong>{data.title}</strong><span>{selectedStylePreset?.description || data.styleDescription || 'A custom reusable visual style for consistent generated media.'}</span></div>}
            <div className="reusable-large-preview-actions"><button title={(data.referenceAssets || []).some((asset) => asset.favorite) ? 'Remove From Favorites' : 'Add To Favorites'} onClick={() => runtime?.setReusableFavorite(id, !(data.referenceAssets || []).some((asset) => asset.favorite))}><Heart size={13} fill={(data.referenceAssets || []).some((asset) => asset.favorite) ? 'currentColor' : 'none'} /></button>{!selectedStylePreset && <button title="Export" disabled={!(data.referenceAssets || []).length && !(data.kind === 'style-reference' && (data.stylePrompt || data.prompt || '').trim())} onClick={() => runtime?.exportReusableAsset(id)}><Upload size={13} /></button>}{!selectedStylePreset && <button title="Edit" onClick={openReusableEditor}><PencilLine size={13} /></button>}{!selectedStylePreset && <button title="Delete" onClick={() => runtime?.deleteReusableAsset(id)}><Trash2 size={13} /></button>}</div>
          </div>}
          {!styleCreateOpen && !characterCreateOpen && !semanticCreateOpen && <button className={`style-create-toggle ${data.kind === 'character' ? 'character-create-toggle' : ''}`} onClick={openReusableCreator}><Plus size={12} />Create {data.kind === 'style-reference' ? 'Style' : data.kind === 'character' ? 'Character' : data.kind === 'location' ? 'Location' : 'Element'}</button>}
          {['element', 'location'].includes(data.kind) && semanticCreateOpen && <div className="style-create-panel-head"><span>Custom {data.kind === 'location' ? 'Location' : 'Element'}</span></div>}
          {data.kind === 'character' && characterCreateOpen && <div className="style-create-panel-head"><span>Custom Character</span></div>}
          {data.kind === 'character' && characterCreateOpen ? <div className="character-view-grid">{CHARACTER_VIEWS.map(([view, label]) => {
            const asset = (data.referenceAssets || []).find((item) => item.metadata?.characterView === view)
            const locked = view !== 'front' && !characterFrontFace
            return <button key={view} disabled={locked} title={locked ? `Add Face first to unlock ${label}` : asset ? `${label}: ${asset.name}` : `Add ${label}`} onClick={() => runtime?.importAsset(id, view)} onDragOver={(event) => { if (!locked && (event.dataTransfer.types.includes('Files') || event.dataTransfer.types.includes(CANVAS_ASSET_DRAG_MIME))) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={(event) => { if (locked) return; const payload = event.dataTransfer.getData(CANVAS_ASSET_DRAG_MIME); if (!payload && !event.dataTransfer.files.length) return; event.preventDefault(); event.stopPropagation(); if (payload) runtime?.importCanvasAssetIntoView(id, payload, view); else runtime?.importDroppedAssets(id, Array.from(event.dataTransfer.files), view) }}>{!asset?.url && <ViewFramework kind="character" view={view} />}{asset?.url ? <img src={asset.url} alt={label} /> : locked ? <Lock size={13} /> : <Plus size={13} />}<span>{label}</span>{asset && <i className="asset-part-remove" role="button" aria-label={`Remove ${label}`} title={`Remove ${label}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); runtime?.updateNode(id, { referenceAssets: (data.referenceAssets || []).filter((item) => item.id !== asset.id) }) }}><Trash2 size={10} /></i>}</button>
          })}</div> : data.kind === 'element' && semanticCreateOpen ? <div className="character-view-grid element-view-grid">{ELEMENT_VIEWS.map(({ id: view, label }) => {
            const asset = elementReferences.find((item) => item.metadata?.elementView === view)
            const locked = view !== ELEMENT_ANCHOR_VIEW && !elementReferences.some((item) => item.metadata?.elementView === ELEMENT_ANCHOR_VIEW)
            return <button key={view} disabled={locked} title={locked ? `Add Three-Quarter first to unlock ${label}` : asset ? `${label}: ${asset.name}` : `Add ${label}`} onClick={() => runtime?.importAsset(id, view)} onDragOver={(event) => { if (!locked && event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={(event) => { if (locked || !event.dataTransfer.files.length) return; event.preventDefault(); event.stopPropagation(); runtime?.importDroppedAssets(id, Array.from(event.dataTransfer.files), view) }}>{!asset?.url && <ViewFramework kind="element" view={view} />}{asset?.url ? <img src={asset.url} alt={label} /> : locked ? <Lock size={13} /> : <Plus size={13} />}<span>{label}</span>{asset && <i className="asset-part-remove" role="button" aria-label={`Remove ${label}`} title={`Remove ${label}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); runtime?.updateNode(id, { referenceAssets: (data.referenceAssets || []).filter((item) => item.id !== asset.id) }) }}><Trash2 size={10} /></i>}</button>
          })}</div> : data.kind !== 'character' && data.kind !== 'element' && (data.kind === 'style-reference' ? styleCreateOpen : semanticCreateOpen) ? <button className="semantic-tile-stage" onClick={() => runtime?.importAsset(id)} onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'copy' } }} onDrop={(event) => { if (!event.dataTransfer.files.length) return; event.preventDefault(); event.stopPropagation(); runtime?.importDroppedAssets(id, Array.from(event.dataTransfer.files)) }}>
            {(data.referenceAssets || []).length ? <img src={(data.referenceAssets || [])[0].url} alt={(data.referenceAssets || [])[0].name} loading="lazy" decoding="async" /> : <span><Plus size={18} /><small>Add reference</small></span>}
            {(data.referenceAssets || []).length > 1 && <i>{(data.referenceAssets || []).length}</i>}
          </button> : null}
          {data.kind === 'style-reference' && styleCreateOpen && <div className="style-node-details">
            <input className="style-description-inline" required maxLength={140} aria-required="true" aria-label="Style short description" value={data.styleDescription || ''} placeholder="Short description (required)…" onChange={(event) => runtime?.updateNode(id, { styleDescription: event.target.value, styleSavedAt: undefined, runState: 'idle', progress: undefined, error: undefined })} />
            <textarea className="style-prompt-inline" value={data.stylePrompt || data.prompt || ''} placeholder="Describe the visual style…" onChange={(event) => runtime?.updateNode(id, { stylePrompt: event.target.value, prompt: event.target.value, styleSavedAt: undefined, runState: 'idle', progress: undefined })} />
          </div>}
          {(data.kind === 'character' && characterCreateOpen || ['element', 'location'].includes(data.kind) && semanticCreateOpen) && <div className="style-node-details semantic-node-details"><TaggedPromptTextarea className="style-prompt-inline" value={data.prompt || ''} connectedTags={connectedPromptTags} availableTags={availablePromptTags} placeholder={data.kind === 'character' ? 'Describe the character to create…' : data.kind === 'location' ? 'Describe the location to create…' : 'Describe the element to create…'} onValueChange={(prompt) => runtime?.updatePrompt(id, prompt)} /></div>}
        </div>
      )}

      {!isSemanticReference && !isCanvasGenerator && data.kind !== 'upscaler' && (activeGeneratedResult
        ? <div className={`generated-media-stage ${isMediaTile ? 'media-tile-preview' : ''}`} {...generatedMediaInteraction}>{mediaPreview(data)}{generatedMediaActions}</div>
        : isMediaTile && mediaPreview(data)
          ? <div className="media-tile-preview">{mediaPreview(data)}</div>
          : mediaPreview(data))}

      {isCanvasGenerator && <>
        {fidelityInputRules.length > 0 && <div className="generator-connected-context nodrag">
          <div className="connected-input-rules" aria-label="Connected Input Fidelity"><ConnectedRuleRows items={fidelityInputRules} onMode={runtime!.setInputFidelity} /></div>
        </div>}
        <div className="generator-stage" style={{ aspectRatio: stageRatio.replace(':', ' / ') }} {...generatedMediaInteraction}>
          {mediaPreview(data)}
          {generatedMediaActions}
          {(data.generatedResults?.length || 0) > 1 && <div className="result-carousel nodrag" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><button data-tooltip="Previous Result" aria-label="Previous Result" disabled={activeGeneratedIndex === 0} onClick={() => selectGeneratedResult(activeGeneratedIndex - 1)}><ChevronLeft size={11} /></button><span>{activeGeneratedIndex + 1}/{data.generatedResults?.length}</span><button data-tooltip="Next Result" aria-label="Next Result" disabled={activeGeneratedIndex === (data.generatedResults?.length || 1) - 1} onClick={() => selectGeneratedResult(activeGeneratedIndex + 1)}><ChevronRight size={11} /></button></div>}
          {!data.outputUrl && !data.outputPath && <div className="generator-input-slots nodrag" aria-label={`Available ${isImageGeneratorSurface ? 'Image' : 'Video'} Inputs`} data-input-count={inputPorts.length} data-stage-orientation={stageOrientation} style={{ '--generator-input-columns': stageOrientation === 'portrait' ? 1 : inputPorts.length >= 6 ? 3 : Math.min(2, Math.max(1, inputPorts.length)) } as CSSProperties}>
            {inputPorts.map((port) => <button key={port.id} type="button" aria-label={`Add ${port.label}`} title={`Add ${port.label}`} onClick={(event) => runtime?.openInputQuickConnect(id, port.id, event.clientX, event.clientY)}><GeneratorInputIcon id={port.id} signal={port.signal} kind={data.kind} /><span>{generatorInputLabel(port.id, port.label)}</span></button>)}
          </div>}
        </div>
        <TaggedPromptTextarea
          className="node-prompt generator-prompt nodrag"
          value={data.prompt || ''}
          connectedTags={connectedPromptTags}
          availableTags={availablePromptTags}
          placeholder={isImageGeneratorSurface ? 'Describe the image you want to generate…' : 'Describe the video you want to generate…'}
          onValueChange={(prompt) => runtime?.updatePrompt(id, prompt)}
        />
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
        <div className={`node-status ${displayError ? 'is-error' : ''} ${data.kind === 'character' && !characterFrontFace ? 'character-needs-front' : ''}`}>
          {running && <LoaderCircle size={12} className="spin" />}
          <span>{visibleStatus}</span>
        </div>
      )}

      {isImageGeneratorSurface && <div className="primary-node-controls image-primary-controls nodrag" aria-label="Primary Image Delivery Controls">
        <label className="adaptive-control-label"><span>Format</span><SimpleMenuSelect ariaLabel="Image Output Format" title="Image Output Format" fillTrack value={data.outputFormat || 'png'} options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, ...(usesNanoImageModel ? [{ value: 'webp', label: 'WebP' }] : [])]} onChange={(value) => runtime?.updateNode(id, { outputFormat: value as StudioNodeData['outputFormat'] })} /></label>
        <label className="adaptive-control-label"><span>Resolution</span><SimpleMenuSelect ariaLabel="Image Output Resolution" title={supportedImageResolutions.length === 1 ? `${imageModelId} has one supported output resolution` : 'Image Output Resolution'} disabled={supportedImageResolutions.length === 1} fillTrack value={selectedImageResolution} options={supportedImageResolutions.map((value) => ({ value, label: value }))} onChange={(value) => runtime?.updateNode(id, { imageResolution: value as StudioNodeData['imageResolution'] })} /></label>
      </div>}

      {data.kind === 'video-generator' && selectedVideoModel?.family === 'wan' && <EqualizedControlRow className="primary-node-controls video-primary-controls nodrag" ariaLabel="Primary Video Quality Controls">
        <label><span>Native FPS</span><SimpleMenuSelect ariaLabel="Native FPS" fillTrack value={String(data.frameRate || 24)} options={selectedVideoModel.frameRates.map((fps) => ({ value: String(fps), label: `${fps} fps` }))} onChange={(value) => runtime?.updateNode(id, { frameRate: Number(value) })} /></label>
        <label><span>Quality</span><SimpleMenuSelect ariaLabel="Video Quality" fillTrack value={data.videoQuality || 'high'} options={[['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['maximum', 'Maximum']].map(([value, label]) => ({ value, label }))} onChange={(value) => runtime?.updateNode(id, { videoQuality: value as StudioNodeData['videoQuality'] })} /></label>
        <label><span>File</span><SimpleMenuSelect ariaLabel="Video File Mode" fillTrack value={data.videoWriteMode || 'balanced'} options={[['fast', 'Fast'], ['balanced', 'Balanced'], ['small', 'Small file']].map(([value, label]) => ({ value, label }))} onChange={(value) => runtime?.updateNode(id, { videoWriteMode: value as StudioNodeData['videoWriteMode'] })} /></label>
      </EqualizedControlRow>}

      {isCanvasGenerator && <div className={`compact-generator-footer ${data.kind === 'video-generator' ? 'compact-video-footer' : ''} nodrag`}>
        {isImageGeneratorSurface ? <EqualizedControlRow className="compact-image-footer-row">
          <div className="quantity-stepper"><button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={11} /></button><span>x{data.quantity || 1}</span><button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={11} /></button></div>
          <GroupedMenuSelect className="compact-engine image-engine" ariaLabel="Image engine" title="Image engine" fillTrack value={`${imageProvider}::${imageModelId}`} groups={[
            { label: 'fal.ai', options: falImageModels.map((model) => ({ value: `fal::${model.id}`, label: model.label, provider: model.provider })) },
            { label: 'OpenAI', options: openAIImageModels.map((model) => ({ value: `openai::${model.id}`, label: model.label })) },
            { label: 'Google', options: googleImageModels.map((model) => ({ value: `google::${model.id}`, label: model.label })) },
          ]} onChange={(nextValue) => {
            const [provider, ...modelParts] = nextValue.split('::')
            const imageModelId = modelParts.join('::')
            const resolutions = imageResolutionOptions(provider as StudioNodeData['imageProvider'], imageModelId)
            runtime?.updateNode(id, { imageProvider: provider as StudioNodeData['imageProvider'], imageModelId, imageResolution: resolutions.includes(data.imageResolution || '1K') ? data.imageResolution || '1K' : resolutions[0] })
          }} />
          <SimpleMenuSelect ariaLabel="Image Aspect Ratio" title="Image Aspect Ratio" fillTrack value={normalizedImageRatio(data.aspectRatio)} options={aspectRatioMenuOptions(usesNanoImageModel ? NANO_IMAGE_RATIOS : IMAGE_RATIOS)} onChange={(value) => runtime?.updateNode(id, { aspectRatio: value })} />
          <button className="compact-settings compact-options" onClick={() => runtime?.openInspector(id)} data-tooltip="Options" aria-label="Node Settings"><Settings size={14} /></button>
          <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : 'Run'} onClick={() => running ? runtime?.stopNode(id) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon size={14} /> : rerun ? <RerunIcon /> : <Play size={12} fill="currentColor" />}</button></PlayTooltip>
        </EqualizedControlRow> : <>
          <div className="compact-video-footer-row compact-video-footer-top">
          <GroupedMenuSelect className="compact-engine video-engine" menuClassName="video-model-menu" ariaLabel="Video Model" displayLabel={selectedVideoModel?.label} fillTrack value={selectedVideoModel?.id || 'wan-controlled'} groups={VIDEO_MODEL_MENU_GROUPS} onChange={(engine) => {
            const model = resolveVideoModel(engine)
            const frameRate = model.frameRates.length ? (model.frameRates.includes(data.frameRate || 24) ? data.frameRate || 24 : model.frameRates[0]) : undefined
            const duration = videoDurationOptions(engine, frameRate).filter((value): value is number => typeof value === 'number')[0]
            runtime?.updateNode(id, { videoEngine: engine, aspectRatio: defaultVideoRatio(model) || data.aspectRatio, duration, autoDuration: false, generateAudio: model.nativeAudio ? data.generateAudio : false, resolution: model.resolutions.length ? (model.resolutions.includes(data.resolution || '') ? data.resolution : model.resolutions[0] as StudioNodeData['resolution']) : model.fourK ? '4k' : undefined, frameRate, motionCadence: normalizedMotionCadence(model, frameRate, data.motionCadence), inferenceSteps: model.family === 'wan' ? 40 : data.inferenceSteps, guidanceScale: model.family === 'wan' ? 1 : model.family === 'kling' ? 0.5 : data.guidanceScale, acceleration: model.family === 'wan' ? 'regular' : data.acceleration })
          }} title={providerBlocked ? `${providerAccount?.message || 'This provider is unavailable.'} You can still inspect another model's controls.` : 'Video Model'} />
          <SimpleMenuSelect ariaLabel="Video Duration" title="Video Duration" fillTrack value={String(normalizedVideoDuration(data))} options={videoDurationOptions(data.videoEngine, data.frameRate).map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => runtime?.updateNode(id, { duration: Number(value), autoDuration: false })} />
          <SimpleMenuSelect className="compact-resolution" ariaLabel="Video Resolution" title={selectedVideoModel?.resolutions.length ? 'Video Resolution' : 'Resolution is fixed by this model endpoint'} disabled={!selectedVideoModel?.resolutions.length} fillTrack value={selectedVideoModel?.resolutions.length ? (selectedVideoModel.resolutions.includes(data.resolution || '') ? data.resolution || selectedVideoModel.resolutions[0] : selectedVideoModel.resolutions[0]) : 'fixed'} options={selectedVideoModel?.resolutions.length ? selectedVideoModel.resolutions.map((resolution) => ({ value: resolution, label: resolution })) : [{ value: 'fixed', label: selectedVideoModel?.fixedResolutionLabel || 'Native' }]} onChange={(value) => runtime?.updateNode(id, { resolution: value as StudioNodeData['resolution'] })} />
          <SimpleMenuSelect ariaLabel="Video Aspect Ratio" title={selectedVideoModel?.ratios.length ? 'Video Aspect Ratio' : 'Aspect ratio follows the connected start image'} disabled={!selectedVideoModel?.ratios.length} fillTrack value={selectedVideoModel?.ratios.length ? resolvedVideoRatio(selectedVideoModel, data.aspectRatio) : 'fixed'} options={selectedVideoModel?.ratios.length ? aspectRatioMenuOptions(selectedVideoModel.ratios.filter((ratio) => ratio !== 'auto')) : [{ value: 'fixed', label: selectedVideoModel?.fixedAspectRatioLabel || 'Native' }]} onChange={(value) => runtime?.updateNode(id, { aspectRatio: value })} />
          </div>
          <div className="compact-video-footer-row compact-video-footer-bottom">
          <div className="quantity-stepper"><button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={11} /></button><span>x{data.quantity || 1}</span><button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={11} /></button></div>
          <GroupedMenuSelect className="compact-fps" ariaLabel="Motion FPS" title="Motion FPS controls how frequently movement visibly updates without changing Native FPS or playback speed. Native means the provider determines the encoded FPS." displayLabel={data.motionCadence ? `${data.motionCadence} fps` : nativeVideoFps ? `${nativeVideoFps} fps` : 'Native'} fillTrack value={data.motionCadence ? String(data.motionCadence) : 'native'} groups={[
            { label: 'Native FPS', options: [{ value: 'native', label: nativeVideoFps ? `${nativeVideoFps} fps` : 'Native' }] },
            { label: 'Motion FPS', options: motionCadenceOptions(selectedVideoModel || resolveVideoModel(data.videoEngine), data.frameRate).map((fps) => ({ value: String(fps), label: `${fps} fps` })) },
          ]} onChange={(value) => runtime?.updateNode(id, { motionCadence: value === 'native' ? undefined : Number(value) })} />
          {selectedVideoModel?.supportsBitrateMode && <SimpleMenuSelect className="compact-bitrate" ariaLabel="Video Bitrate" title="Video Bitrate" fillTrack value={data.bitrateMode || 'standard'} options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High' }]} onChange={(value) => runtime?.updateNode(id, { bitrateMode: value as StudioNodeData['bitrateMode'] })} />}
          <label className="compact-toggle compact-sound" title={selectedVideoModel?.nativeAudio ? 'Generate native sound with the video' : 'This model does not generate native sound'}><span>Sound</span><input aria-label="Generate Native Sound" type="checkbox" disabled={!selectedVideoModel?.nativeAudio} checked={Boolean(data.generateAudio)} onChange={(event) => runtime?.updateNode(id, { generateAudio: event.target.checked })} /><i /></label>
          <button className="compact-settings compact-options" onClick={() => runtime?.openInspector(id)} data-tooltip="Options" aria-label="Node Settings"><Settings size={14} /></button>
          <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : 'Run'} onClick={() => running ? runtime?.stopNode(id) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon size={14} /> : rerun ? <RerunIcon /> : <Play size={12} fill="currentColor" />}</button></PlayTooltip>
          </div>
        </>}
      </div>}

      {(data.kind === 'character' && characterCreateOpen || data.kind === 'style-reference' && styleCreateOpen || ['element', 'location'].includes(data.kind) && semanticCreateOpen) && <div className="reusable-asset-footer-wrap nodrag">
        {saveNameOpen && <div className="asset-save-name-popover">
          <input autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label={`${data.kind === 'character' ? 'Character' : data.kind === 'location' ? 'Location' : data.kind === 'element' ? 'Element' : 'Style'} name`} value={saveName} onChange={(event) => setSaveName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitSaveName(); if (event.key === 'Escape') setSaveNameOpen(false) }} />
          <button onClick={commitSaveName} disabled={!saveName.trim()}><Check size={11} />Save</button>
        </div>}
        <div className="compact-generator-footer character-completion-footer reusable-asset-footer">
          {data.kind === 'character' ? <>
            <GroupedMenuSelect className="character-ai-provider" menuClassName="character-ai-provider-menu" ariaLabel="Character creation AI model" title="AI model used to create the Face or complete missing Character views" value={`${imageProvider}::${characterCompletionModelId}`} groups={characterCompletionGroups} onChange={(nextValue) => {
              const [provider, ...modelParts] = nextValue.split('::')
              runtime?.updateNode(id, { imageProvider: provider as StudioNodeData['imageProvider'], imageModelId: modelParts.join('::'), error: undefined })
            }} />
            <button className={`reusable-save-button ${reusableEditorDirty ? 'is-unsaved' : ''}`} title="Save Character To This Project" aria-label="Save Character" disabled={!characterFrontFace} onClick={openSaveName}><Save size={11} /><span>Save</span></button>
            <PlayTooltip tooltip={characterCompletionTooltip} persistent={running} disabled={!running && characterCompletionDisabled}><button className={`footer-run ${running ? 'is-running' : characterFrontFace ? 'is-rerun' : 'is-ready'} ${characterCompletionFailures.length ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop Character Generation' : characterFrontFace ? 'Complete With AI' : 'Create Face'} disabled={!running && characterCompletionDisabled} onClick={() => running ? runtime?.stopNode(id) : runtime?.completeCharacterSet(id)}>{running ? <StopIcon /> : characterFrontFace ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
          </> : data.kind === 'style-reference' ? <>
            <GroupedMenuSelect className="character-ai-provider" menuClassName="character-ai-provider-menu" ariaLabel="Style prompt AI model" title="fal.ai model used to build the private reusable Style prompt" value={stylePromptModelId} groups={stylePromptModelGroups} onChange={(modelId) => runtime?.updateNode(id, { stylePromptModelId: modelId, error: undefined })} />
            <button className={`reusable-save-button ${reusableEditorDirty ? 'is-unsaved' : ''}`} title={data.runState === 'complete' ? 'Save To My Preset Styles' : 'Build the finalized Style prompt before saving'} aria-label="Save Style" disabled={data.runState !== 'complete' || !(data.stylePrompt || data.prompt || '').trim()} onClick={openSaveName}><Save size={11} /><span>Save</span></button>
            <PlayTooltip tooltip={styleBuildTooltip} persistent={running} disabled={!running && styleBuildFailures.length > 0}><button className={`footer-run ${running ? 'is-running' : 'is-ready'} ${styleBuildFailures.length ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop Style Prompt Build' : 'Build Style Prompt'} disabled={!running && styleBuildFailures.length > 0} onClick={() => running ? runtime?.stopNode(id) : runtime?.buildStylePrompt(id)}>{running ? <StopIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
          </> : data.kind === 'element' ? <>
            <GroupedMenuSelect className="character-ai-provider" menuClassName="character-ai-provider-menu" ariaLabel="Element creation AI model" title="AI model used to create the Three-Quarter anchor or complete missing Element views" value={`${imageProvider}::${characterCompletionModelId}`} groups={characterCompletionGroups} onChange={(nextValue) => {
              const [provider, ...modelParts] = nextValue.split('::')
              runtime?.updateNode(id, { imageProvider: provider as StudioNodeData['imageProvider'], imageModelId: modelParts.join('::'), error: undefined })
            }} />
            <button className={`reusable-save-button ${reusableEditorDirty ? 'is-unsaved' : ''}`} title="Save Element To This Project" aria-label="Save Element" disabled={!elementReferences.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW)} onClick={openSaveName}><Save size={11} /><span>Save</span></button>
            <PlayTooltip tooltip={elementCompletionTooltip} persistent={running} disabled={!running && elementCompletionDisabled}><button className={`footer-run ${running ? 'is-running' : 'is-ready'} ${elementCompletionFailures.length ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop Element Generation' : elementReferences.some((asset) => asset.metadata?.elementView === ELEMENT_ANCHOR_VIEW) ? 'Complete With AI' : 'Create Three-Quarter'} disabled={!running && elementCompletionDisabled} onClick={() => running ? runtime?.stopNode(id) : runtime?.completeElementSet(id)}>{running ? <StopIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
          </> : <>
            <GroupedMenuSelect className="character-ai-provider" ariaLabel={`${data.kind === 'location' ? 'Location' : 'Element'} image model`} title="Image model" value={`${imageProvider}::${imageModelId}`} groups={[
              { label: 'fal.ai', options: falImageModels.map((model) => ({ value: `fal::${model.id}`, label: model.label, provider: model.provider })) },
              { label: 'OpenAI', options: openAIImageModels.map((model) => ({ value: `openai::${model.id}`, label: model.label })) },
              { label: 'Google', options: googleImageModels.map((model) => ({ value: `google::${model.id}`, label: model.label })) },
            ]} onChange={(nextValue) => { const [provider, ...modelParts] = nextValue.split('::'); runtime?.updateNode(id, { imageProvider: provider as StudioNodeData['imageProvider'], imageModelId: modelParts.join('::'), error: undefined }) }} />
            <button className={`reusable-save-button ${reusableEditorDirty ? 'is-unsaved' : ''}`} title={`Save ${data.kind === 'location' ? 'Location' : 'Element'} To This Project`} aria-label={`Save ${data.kind === 'location' ? 'Location' : 'Element'}`} disabled={!(data.referenceAssets || []).length} onClick={openSaveName}><Save size={11} /><span>Save</span></button>
            <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : `Generate ${data.kind === 'location' ? 'Location' : 'Element'}`} onClick={() => running ? runtime?.stopNode(id) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon /> : rerun ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
          </>}
        </div>
      </div>}

      {data.kind === 'upscaler' && <div className="primary-node-controls upscaler-primary-controls nodrag" aria-label="Primary Upscaler Controls">
        <label className="upscaler-model-field"><span>Model</span><SimpleMenuSelect ariaLabel="Upscaler model" value={data.upscalerModel || 'clarity-image'} options={[{ value: 'clarity-image', label: 'Clarity Image Upscaler' }, { value: 'realesrgan-video', label: 'RealESRGAN Video Upscaler' }]} onChange={(upscalerModel) => runtime?.updateNode(id, { upscalerModel: upscalerModel as StudioNodeData['upscalerModel'], outputPath: undefined, outputUrl: undefined, outputType: undefined, generatedResults: undefined, error: undefined })} /></label>
        <label className={upscalerIsVideo ? 'is-disabled' : ''}><span>Creativity · {(data.creativity ?? 0.35).toFixed(2)}</span><input disabled={upscalerIsVideo} type="range" min="0" max="1" step="0.05" value={data.creativity ?? 0.35} onChange={(event) => runtime?.updateNode(id, { creativity: Number(event.target.value) })} /></label>
        <label className={upscalerIsVideo ? 'is-disabled' : ''}><span>Resemblance · {(data.resemblance ?? 0.6).toFixed(2)}</span><input disabled={upscalerIsVideo} type="range" min="0" max="1" step="0.05" value={data.resemblance ?? 0.6} onChange={(event) => runtime?.updateNode(id, { resemblance: Number(event.target.value) })} /></label>
      </div>}

      {data.kind === 'voiceover' && <div className="voice-primary-controls nodrag" aria-label="Primary Voice Controls">
        <EqualizedControlRow className="voice-primary-row voice-primary-row-two">
        <label className="voice-primary-model-field"><span>Model</span><GroupedMenuSelect className="voice-primary-model" ariaLabel="Voice provider and model" fillTrack value={data.voiceEngine === 'fish-audio' ? `fish-audio::${data.fishModel || 's2-pro'}` : 'elevenlabs'} groups={[
          { label: 'fal.ai', options: [{ value: 'elevenlabs', label: 'ElevenLabs Eleven v3', provider: 'elevenlabs' }] },
          { label: 'Fish Audio', options: FISH_TTS_MODELS.map((model) => ({ value: `fish-audio::${model.value}`, label: `Fish Audio ${model.label}`, provider: 'fish' as const })) },
        ]} onChange={(selection) => {
          if (selection.startsWith('fish-audio::')) runtime?.updateNode(id, { voiceEngine: 'fish-audio', fishModel: selection.split('::')[1] as StudioNodeData['fishModel'], error: undefined })
          else runtime?.updateNode(id, { voiceEngine: 'elevenlabs', error: undefined })
        }} /></label>
        {data.voiceEngine === 'fish-audio' ? <label className="voice-primary-voice-field"><span>Voice ID</span><input className="voice-primary-input" aria-label="Fish Audio voice Reference ID" value={data.fishReferenceId || ''} onChange={(event) => runtime?.updateNode(id, { fishReferenceId: event.target.value, error: undefined })} placeholder="Reference ID (required)" /></label> : <label className="voice-primary-voice-field"><span>Voice</span><SimpleMenuSelect className="voice-primary-voice" ariaLabel="ElevenLabs voice" fillTrack value={usesBuiltInElevenVoice ? elevenVoiceValue : '__custom'} options={[...ELEVEN_V3_BUILT_IN_VOICES.map((voice) => ({ value: voice, label: voice })), { value: '__custom', label: 'Custom voice name / ID' }]} onChange={(voice) => runtime?.updateNode(id, { voice: voice === '__custom' ? '' : voice, error: undefined })} /></label>}
        </EqualizedControlRow>
        {data.voiceEngine !== 'fish-audio' && <>
          <EqualizedControlRow className="voice-primary-row voice-primary-row-three">
          <label className="voice-primary-language-field"><span>Language</span><SimpleMenuSelect className="voice-primary-language" menuClassName="voice-language-menu" ariaLabel="Voice language" fillTrack value={normalizedElevenV3LanguageCode(data.languageCode) || 'eng'} options={[...ELEVEN_V3_LANGUAGES]} onChange={(languageCode) => runtime?.updateNode(id, { languageCode })} /></label>
          <label className="voice-primary-output-field"><span>Output</span><SimpleMenuSelect ariaLabel="Voice Output Format" fillTrack value={data.audioOutputFormat || 'mp3_44100_128'} options={ELEVEN_AUDIO_OUTPUT_FORMATS.map((value) => ({ value, label: audioFormatLabel(value) }))} onChange={(value) => runtime?.updateNode(id, { audioOutputFormat: value })} /></label>
          <label className="voice-primary-speed-field"><span>Speed</span><SimpleMenuSelect ariaLabel="ElevenLabs speech speed" fillTrack value={String(Number((Math.min(1.2, Math.max(0.7, data.speed ?? 1)) * 20).toFixed(0)) / 20)} options={ELEVEN_SPEED_OPTIONS} onChange={(value) => runtime?.updateNode(id, { speed: Number(value) })} /></label>
          </EqualizedControlRow>
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

      {runnable && !isCanvasGenerator && !['element', 'location'].includes(data.kind) && (
        <div className="compact-generator-footer compact-generic-footer nodrag">
          {!['element', 'location'].includes(data.kind) && <div className="quantity-stepper">
            <button title="Decrease Outputs" aria-label="Decrease Outputs" disabled={(data.quantity || 1) <= 1} onClick={() => data.kind === 'voiceover' ? runtime?.adjustVoiceoverQuantity(id, -1) : runtime?.updateNode(id, { quantity: Math.max(1, (data.quantity || 1) - 1) })}><Minus size={12} /></button>
            <span>x{data.quantity || 1}</span>
            <button title="Increase Outputs" aria-label="Increase Outputs" disabled={(data.quantity || 1) >= 4} onClick={() => data.kind === 'voiceover' ? runtime?.adjustVoiceoverQuantity(id, 1) : runtime?.updateNode(id, { quantity: Math.min(4, (data.quantity || 1) + 1) })}><Plus size={12} /></button>
          </div>}
          {data.kind === 'upscaler' && <SimpleMenuSelect className="upscaler-scale-select" ariaLabel="Upscale Amount" title="Upscale Amount" value={String(data.scale || 2)} options={[2, 3, 4].map((value) => ({ value: String(value), label: `${value}×` }))} onChange={(value) => runtime?.updateNode(id, { scale: Number(value) })} />}
          {data.kind === 'sound-effects' && <div className="compact-model sound-effects-model" title="ElevenLabs Sound Effects v2"><CompanyIcon provider="elevenlabs" /><span>ElevenLabs SFX v2</span></div>}
          {data.kind === 'sound-effects' && <><SimpleMenuSelect ariaLabel="Sound Effect Duration" title="Sound Effect Duration" value={String(data.duration || 5)} options={[0.5,1,2,3,5,8,10,15,22].map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => runtime?.updateNode(id, { duration: Number(value) })} /><label className="compact-toggle compact-loop" title="Loop Sound Effect"><span>Loop</span><input aria-label="Loop Sound Effect" type="checkbox" checked={Boolean(data.loop)} onChange={(event) => runtime?.updateNode(id, { loop: event.target.checked })} /><i /></label><SimpleMenuSelect className="sound-output-format" ariaLabel="Sound Effect Output Format" title="Sound Effect Output Format" value={data.audioOutputFormat || 'mp3_44100_128'} options={ELEVEN_AUDIO_OUTPUT_FORMATS.map((value) => ({ value, label: audioFormatLabel(value) }))} onChange={(value) => runtime?.updateNode(id, { audioOutputFormat: value })} /></>}
          {data.kind === 'music-generator' && <><SimpleMenuSelect ariaLabel="Music Duration" title="Music Duration" value={String(data.duration || 30)} options={[10,30,60,120].map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))} onChange={(value) => runtime?.updateNode(id, { duration: Number(value) })} /><label className="compact-audio" title="Instrumental Only"><input aria-label="Instrumental Only" type="checkbox" checked={Boolean(data.forceInstrumental)} onChange={(event) => runtime?.updateNode(id, { forceInstrumental: event.target.checked })} /><Music2 size={12} /></label></>}
          {['element', 'location'].includes(data.kind) && <GroupedMenuSelect className="compact-engine image-engine" ariaLabel={`${data.kind === 'element' ? 'Element' : 'Location'} image model`} title="Image model" value={`${imageProvider}::${imageModelId}`} groups={[
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
          <PlayTooltip tooltip={runTooltip} persistent={running} disabled={!running && runDisabled}><button type="button" className={`footer-run ${runButtonStateClass} ${runDisabled ? 'is-access-blocked' : ''}`} aria-label={running ? 'Stop' : rerun ? 'Rerun' : 'Run'} onClick={() => running ? runtime?.stopNode(id) : runtime?.runNode(id)} disabled={!running && runDisabled}>{running ? <StopIcon size={14} /> : rerun ? <RerunIcon /> : <Play size={13} fill="currentColor" />}</button></PlayTooltip>
        </div>
      )}

      {outputsText && <NodePort id="text-out" type="source" signal="text" label="Text Output" position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'text-out')} />}
      {outputsMedia && <NodePort id="media-out" type="source" signal={outputSignalFor(data, 'media-out')} label="Output" position={Position.Right} onRoute={(event) => runtime?.openQuickConnect(id, event.clientX, event.clientY, 'media-out')} />}
      {data.outputUrl && <a className="node-open nodrag" href={data.outputUrl} title="Open Media" aria-label="Open Media"><ArrowUpRight size={13} /></a>}
    </article>
  )
})

NodeCard.displayName = 'NodeCard'
