import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { measuredFloatingMenuWidth, selectorTriggerFontSize, useContinuousAnchor } from './useContinuousAnchor'
import { normalizedStoryboardDurationOptions } from '../../shared/storyboardDurationBudget'
import { storyboardTriggerMenuKeyAction } from '../../shared/storyboardMenuInteraction'
import { filterAndRankSelectorOptions, selectorSearchKeyAction, setSelectorPortalOpen } from '../../shared/selectorSearch'

/** Production owner for the compact Cut/Continue capsule used by Storyboard and Camera. */
export function ShotBoundaryChoice({ shotId, name, value, disabled = false, onChange }: { shotId: string; name: string; value: 'cut' | 'continue'; disabled?: boolean; onChange(value: 'cut' | 'continue'): void }) {
  return <div className="storyboard-transition-choice inspector-wide" role="radiogroup" aria-label={`Boundary for ${name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>{(['cut', 'continue'] as const).map((option) => <label key={option} className={`storyboard-transition-option ${value === option ? 'is-active' : ''}`}><input type="radio" name={`boundary-${shotId}`} value={option} checked={value === option} disabled={disabled} aria-checked={value === option} onChange={() => onChange(option)} /><span>{option === 'cut' ? 'Cut' : 'Continue'}</span></label>)}</div>
}

export function durationChoices(maximum: number): number[] {
  return normalizedStoryboardDurationOptions([maximum])
}

export const STORYBOARD_SHOT_SIZE_OPTIONS = [{ value: 'wide', label: 'Wide' }, { value: 'medium', label: 'Medium' }, { value: 'close-up', label: 'Close-up' }, { value: 'detail', label: 'Detail' }] as const

export const CAMERA_MOVEMENT_GROUPS = [
  { label: 'Static & framing', options: [
    ['static', 'Static / Locked'], ['reframe-left', 'Reframe Left'], ['reframe-right', 'Reframe Right'], ['reframe-up', 'Reframe Up'], ['reframe-down', 'Reframe Down'],
  ] },
  { label: 'Pan & tilt', options: [
    ['pan-left', 'Pan Left'], ['pan-right', 'Pan Right'], ['slow-pan-left', 'Slow Pan Left'], ['slow-pan-right', 'Slow Pan Right'], ['whip-pan-left', 'Whip Pan Left'], ['whip-pan-right', 'Whip Pan Right'],
    ['tilt-up', 'Tilt Up'], ['tilt-down', 'Tilt Down'], ['slow-tilt-up', 'Slow Tilt Up'], ['slow-tilt-down', 'Slow Tilt Down'], ['whip-tilt-up', 'Whip Tilt Up'], ['whip-tilt-down', 'Whip Tilt Down'],
  ] },
  { label: 'Dolly & track', options: [
    ['dolly-in', 'Move Closer (Dolly In)'], ['dolly-out', 'Move Away (Dolly Out)'], ['slow-dolly-in', 'Slowly Move Closer'], ['slow-dolly-out', 'Slowly Move Away'], ['fast-dolly-in', 'Quickly Move Closer'], ['fast-dolly-out', 'Quickly Move Away'],
    ['dolly-left', 'Move Left On Wheels'], ['dolly-right', 'Move Right On Wheels'], ['dolly-up', 'Lift Camera On Dolly'], ['dolly-down', 'Lower Camera On Dolly'], ['dolly-down-slow', 'Dolly Down Slow'],
    ['dolly-forward-left', 'Move Closer Toward Left'], ['dolly-forward-right', 'Move Closer Toward Right'], ['dolly-back-left', 'Move Away Toward Left'], ['dolly-back-right', 'Move Away Toward Right'],
    ['dolly-circle-left', 'Circle Subject Left On Dolly'], ['dolly-circle-right', 'Circle Subject Right On Dolly'], ['dolly-arc-left', 'Curve Around Left'], ['dolly-arc-right', 'Curve Around Right'],
    ['dolly-follow', 'Follow Subject On Dolly'], ['dolly-lead', 'Move Ahead Of Subject'], ['dolly-parallel', 'Move Beside Subject'], ['dolly-pass-by', 'Move Past Subject'], ['dolly-reveal', 'Move Aside To Reveal'],
    ['dolly-zoom-in', 'Subject Holds Size, Background Expands'], ['dolly-zoom-out', 'Subject Holds Size, Background Compresses'], ['vertigo-in', 'Move Closer With Vertigo Effect'], ['vertigo-out', 'Move Away With Vertigo Effect'],
    ['truck-left', 'Move Sideways Left (Truck)'], ['truck-right', 'Move Sideways Right (Truck)'], ['crab-left', 'Slide Sideways Left'], ['crab-right', 'Slide Sideways Right'], ['track-forward', 'Move Forward On Track'], ['track-backward', 'Move Backward On Track'],
  ] },
  { label: 'Push, pull & lens', options: [
    ['push-in', 'Push In'], ['pull-out', 'Pull Out'], ['snap-push-in', 'Snap Push In'], ['snap-pull-out', 'Snap Pull Out'],
    ['zoom-in', 'Zoom In'], ['zoom-out', 'Zoom Out'], ['slow-zoom-in', 'Slow Zoom In'], ['slow-zoom-out', 'Slow Zoom Out'], ['crash-zoom-in', 'Crash Zoom In'], ['crash-zoom-out', 'Crash Zoom Out'],
  ] },
  { label: 'Vertical crane & jib', options: [
    ['pedestal-up', 'Raise Camera Straight Up'], ['pedestal-down', 'Lower Camera Straight Down'], ['boom-up', 'Lift Camera With Boom'], ['boom-down', 'Lower Camera With Boom'],
    ['crane-up', 'Rise High With Crane'], ['crane-down', 'Descend With Crane'], ['crane-forward', 'Crane Moves Forward'], ['crane-backward', 'Crane Moves Backward'], ['crane-swoop-in', 'Crane Swoops Toward Subject'], ['crane-swoop-out', 'Crane Swoops Away'],
    ['jib-up', 'Swing Up With Jib'], ['jib-down', 'Swing Down With Jib'], ['jib-left', 'Swing Left With Jib'], ['jib-right', 'Swing Right With Jib'], ['jib-arc-left', 'Curve Left With Jib'], ['jib-arc-right', 'Curve Right With Jib'],
  ] },
  { label: 'Orbit, arc & rotation', options: [
    ['orbit-left', 'Circle Around Subject Left'], ['orbit-right', 'Circle Around Subject Right'], ['half-orbit-left', 'Half Circle Left'], ['half-orbit-right', 'Half Circle Right'], ['full-orbit-left', 'Full Circle Left'], ['full-orbit-right', 'Full Circle Right'],
    ['arc-left', 'Curve Around Subject Left'], ['arc-right', 'Curve Around Subject Right'], ['spiral-in', 'Spiral Closer'], ['spiral-out', 'Spiral Away'],
    ['roll-clockwise', 'Rotate View Clockwise'], ['roll-counterclockwise', 'Rotate View Counterclockwise'], ['dutch-left', 'Slant Frame Left'], ['dutch-right', 'Slant Frame Right'],
  ] },
  { label: 'Subject tracking', options: [
    ['tracking', 'Track Subject'], ['follow', 'Follow Behind Subject'], ['lead', 'Move In Front Of Subject'], ['parallel-track', 'Move Beside Subject'], ['side-follow-left', 'Follow From Left Side'], ['side-follow-right', 'Follow From Right Side'],
    ['over-shoulder-follow', 'Follow Over The Shoulder'], ['point-of-view', 'Subject Point Of View'], ['walk-and-talk', 'Follow People Walking'], ['vehicle-mount', 'Camera Attached To Vehicle'], ['chase', 'Fast Chase Follow'],
  ] },
  { label: 'Stabilized & Handheld', options: [
    ['handheld', 'Controlled natural handheld movement with organic operator motion while preserving readable framing.'],
    ['handheld-subtle', 'Restrained handheld micro-drift and gentle breathing motion that preserves the authored framing.'],
    ['handheld-intense', 'Stronger controlled handheld irregularity with a visceral, reactive feel while keeping the subject and action readable.'],
    ['shoulder-rig', 'Shoulder-mounted operator movement with human-weighted sway and restrained body-carried bounce while preserving readability.'],
    ['steadicam', 'Smooth Walking Camera'], ['steadicam-follow', 'Smooth Follow'], ['gimbal-follow', 'Stabilized Follow'], ['gimbal-orbit', 'Stabilized Circle'], ['slider-left', 'Short Slide Left'], ['slider-right', 'Short Slide Right'],
  ] },
  { label: 'Aerial & drone', options: [
    ['drone-forward', 'Drone Forward'], ['drone-backward', 'Drone Backward'], ['drone-left', 'Drone Left'], ['drone-right', 'Drone Right'], ['drone-rise', 'Drone Rise'], ['drone-descend', 'Drone Descend'],
    ['drone-orbit-left', 'Drone Orbit Left'], ['drone-orbit-right', 'Drone Orbit Right'], ['drone-reveal', 'Drone Reveal'], ['drone-flyover', 'Drone Flyover'], ['drone-dive', 'Drone Dive'], ['drone-pull-away', 'Drone Pull Away'],
    ['top-down-forward', 'Top-Down Forward'], ['top-down-orbit', 'Top-Down Orbit'],
  ] },
  { label: 'Focus & optical', options: [
    ['rack-focus-near', 'Shift Focus To Near Subject'], ['rack-focus-far', 'Shift Focus To Far Subject'], ['focus-pull', 'Move Focus Between Subjects'], ['deep-to-shallow-focus', 'Everything Sharp To One Subject Sharp'], ['shallow-to-deep-focus', 'One Subject Sharp To Everything Sharp'],
    ['parallax-left', 'Foreground Slides Left Faster'], ['parallax-right', 'Foreground Slides Right Faster'], ['lens-breathing', 'Subtle Focus Breathing'],
  ] },
] as const


export function cameraMovementName(value: string): string {
  const special: Record<string, string> = {
    static: 'Static / Locked',
    handheld: 'Natural Handheld',
    'handheld-subtle': 'Gentle Handheld',
    'handheld-intense': 'Intense Handheld',
    'shoulder-rig': 'Shoulder-Mounted Camera',
    'point-of-view': 'Point Of View (POV)',
    'over-shoulder-follow': 'Over-The-Shoulder Follow',
    'walk-and-talk': 'Walk & talk',
    'dolly-zoom-in': 'Dolly Zoom In',
    'dolly-zoom-out': 'Dolly Zoom Out',
    'dolly-down-slow': 'Dolly Down Slow',
  }
  return special[value] || value.split('-').map((word) => word === 'pov' ? 'POV' : word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export function cameraMovementHelp(value: string): string {
  for (const group of CAMERA_MOVEMENT_GROUPS) {
    const match = group.options.find(([candidate]) => candidate === value)
    if (match) return match[1]
  }
  return 'Choose how the camera moves during this panel.'
}

export type StoryboardMenuOption = {
  value: string
  label: string
  group?: string
  title?: string
  disabled?: boolean
  disabledReason?: string
  system?: boolean
  aliases?: readonly string[]
}

export function StoryboardCompactSelect({ label, value, options, disabled, help, description, exhausted = false, triggerAriaLabel, onChange }: { label: string; value: string; options: StoryboardMenuOption[]; disabled?: boolean; help?: string; description?: string; exhausted?: boolean; triggerAriaLabel?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeValue, setActiveValue] = useState(value)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const preSearchScrollTop = useRef(0)
  const previousSearchQuery = useRef('')
  const descriptionId = useId()
  const selectorId = useId().replace(/:/g, '')
  const listboxId = `storyboard-selector-listbox-${selectorId}`
  const wasOpen = useRef(false)
  const [menuPosition, setMenuPosition] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number; fontSize: number } | null>(null)
  const selected = options.find((option) => option.value === value) || options[0]
  const filteredOptions = searchQuery ? filterAndRankSelectorOptions(options, searchQuery) : options
  const enabledOptions = filteredOptions.filter((option) => !option.disabled)
  const positionMenu = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) { setOpen(false); return }
    const desiredHeight = label === 'Camera Movement' ? 260 : 112
    const spaceAbove = Math.max(0, rect.top - 8)
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 8)
    const openBelow = spaceBelow >= Math.min(desiredHeight, spaceAbove)
    const available = openBelow ? spaceBelow : spaceAbove
    const measuredWidth = measuredFloatingMenuWidth(trigger.current!, options.flatMap((option) => [option.group || '', option.label]), rect.width, 360, 24)
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, measuredWidth))
    const fontSize = selectorTriggerFontSize(trigger.current!)
    const next: NonNullable<typeof menuPosition> = {
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      ...(openBelow ? { top: rect.bottom + 4 } : { bottom: window.innerHeight - rect.top + 4 }),
      width,
      maxHeight: Math.max(60, Math.min(desiredHeight, available)),
      fontSize,
    }
    setMenuPosition((current) => current
      && Math.abs(current.left - next.left) < .25
      && Math.abs((current.top ?? -1) - (next.top ?? -1)) < .25
      && Math.abs((current.bottom ?? -1) - (next.bottom ?? -1)) < .25
      && Math.abs(current.width - next.width) < .25
      && Math.abs(current.maxHeight - next.maxHeight) < .25
      && Math.abs(current.fontSize - next.fontSize) < .05
      ? current
      : next)
  }
  const enabledButtons = () => Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]:not([aria-disabled="true"])') || [])
  const focusEnabledOption = (preferredValue?: string) => window.requestAnimationFrame(() => {
    const buttons = enabledButtons()
    const preferred = buttons.find((button) => button.dataset.optionValue === preferredValue) || buttons[0]
    if (preferred) preferred.focus()
    else trigger.current?.focus()
  })
  const closeMenu = () => {
    setOpen(false)
    setSearchQuery('')
    setActiveValue(value)
  }
  const selectOption = (option: StoryboardMenuOption) => {
    if (option.disabled) return
    onChange(option.value)
    closeMenu()
    trigger.current?.focus()
  }
  const openMenu = () => {
    if (disabled) return
    positionMenu()
    setSearchQuery('')
    setActiveValue(value)
    setOpen(true)
  }
  const toggleMenu = () => {
    if (open) { closeMenu(); return }
    openMenu()
  }
  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const action = storyboardTriggerMenuKeyAction(open, event.key)
    if (action.preventDefault) event.preventDefault()
    if (action.close) setOpen(false)
    if (action.open && !open) openMenu()
    if (action.focusTrigger) trigger.current?.focus()
  }
  const hideSearch = () => {
    setSearchQuery('')
    setActiveValue(value)
    window.requestAnimationFrame(() => {
      if (results.current) results.current.scrollTop = preSearchScrollTop.current
      focusEnabledOption(selected?.disabled ? undefined : selected?.value)
    })
  }
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.key === 'Tab') { closeMenu(); return }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      trigger.current?.focus()
      return
    }
    if (searchQuery && event.key === 'Backspace' && searchQuery.length === 1) { event.preventDefault(); hideSearch(); return }
    if (searchQuery && event.key.length === 1 && !(event.target instanceof HTMLInputElement) && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); setSearchQuery((current) => current + event.key); return }
    const buttons = enabledButtons()
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!enabledOptions.length) return
      const activeIndex = Math.max(0, enabledOptions.findIndex((option) => option.value === activeValue))
      const nextIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? enabledOptions.length - 1
          : event.key === 'ArrowDown' ? (activeIndex + 1) % enabledOptions.length
            : (activeIndex - 1 + enabledOptions.length) % enabledOptions.length
      const next = enabledOptions[nextIndex]
      setActiveValue(next.value)
      const button = buttons.find((candidate) => candidate.dataset.optionValue === next.value)
      if (searchQuery) button?.scrollIntoView({ block: 'nearest' })
      else button?.focus()
      return
    }
    if (event.key === 'Enter' || event.key === ' ' && !searchQuery) {
      event.preventDefault()
      const option = enabledOptions.find((candidate) => candidate.value === (searchQuery ? activeValue : (document.activeElement as HTMLButtonElement)?.dataset.optionValue))
      if (option) selectOption(option)
      return
    }
    if (!searchQuery) {
      const action = selectorSearchKeyAction(event)
      if (action.activate) {
        event.preventDefault()
        preSearchScrollTop.current = results.current?.scrollTop || 0
        setSearchQuery(action.firstCharacter)
        setActiveValue(enabledOptions.find((option) => option.value === value)?.value || enabledOptions[0]?.value || '')
      }
    }
  }
  useContinuousAnchor(open, positionMenu)
  useEffect(() => {
    setSelectorPortalOpen(selectorId, open)
    return () => setSelectorPortalOpen(selectorId, false)
  }, [open, selectorId])
  useEffect(() => {
    if (!open || !searchQuery) { previousSearchQuery.current = ''; return }
    searchInput.current?.focus()
    if (previousSearchQuery.current === searchQuery) return
    previousSearchQuery.current = searchQuery
    const nextActive = enabledOptions[0]?.value || ''
    setActiveValue(nextActive)
    window.requestAnimationFrame(() => {
      if (results.current) results.current.scrollTop = 0
      enabledButtons().find((candidate) => candidate.dataset.optionValue === nextActive)?.scrollIntoView({ block: 'nearest' })
    })
  }, [activeValue, enabledOptions, open, searchQuery, value])
  useEffect(() => {
    const menuWasJustOpened = open && !wasOpen.current
    wasOpen.current = open
    if (!open) return
    const validRovedFocus = menu.current?.contains(document.activeElement) && (document.activeElement as HTMLElement).getAttribute('aria-disabled') !== 'true'
    if (menuWasJustOpened && !searchQuery && !validRovedFocus) focusEnabledOption(selected?.disabled ? undefined : selected?.value)
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as globalThis.Node) && !menu.current?.contains(event.target as globalThis.Node)) closeMenu() }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open, searchQuery, selected?.value, selected?.disabled, value])
  let previousGroup = ''
  const menuContent = open && menuPosition ? <div ref={menu} className={`storyboard-compact-menu is-floating nowheel ${label === 'Duration' ? 'is-duration-menu' : ''}`} aria-describedby={description ? descriptionId : undefined} onKeyDown={handleMenuKeyDown} style={{ left: menuPosition.left, top: menuPosition.top ?? 'auto', bottom: menuPosition.bottom ?? 'auto', width: menuPosition.width, maxHeight: menuPosition.maxHeight, '--floating-menu-font-size': `${menuPosition.fontSize}px` } as CSSProperties}>
    {searchQuery && <div className="selector-search-row"><input ref={searchInput} value={searchQuery} aria-label={`Search ${triggerAriaLabel || label} options`} aria-controls={listboxId} aria-activedescendant={activeValue ? `${listboxId}-${activeValue}` : undefined} onChange={(event) => { const next = event.target.value; if (!next) hideSearch(); else setSearchQuery(next) }} /><button type="button" aria-label="Clear selector search" onClick={hideSearch}>×</button></div>}
    <div className="selector-result-count storyboard-visually-hidden" aria-live="polite">{filteredOptions.length} result{filteredOptions.length === 1 ? '' : 's'}</div>
    <div ref={results} id={listboxId} className="selector-results" role="listbox" aria-label={label}>
      {!filteredOptions.length ? <div className="selector-empty-state" role="status">No matching options</div> : filteredOptions.map((option) => {
        const showGroup = Boolean(option.group && option.group !== previousGroup)
        if (option.group) previousGroup = option.group
        const optionTitle = option.disabledReason || option.title
        const optionClass = [option.value === value ? 'is-selected' : '', option.value === activeValue ? 'is-keyboard-active' : '', option.disabled ? 'is-disabled' : '', option.system ? 'is-system' : ''].filter(Boolean).join(' ')
        return <div key={option.value}>{showGroup && <small>{option.group}</small>}<button id={`${listboxId}-${option.value}`} type="button" role="option" data-option-value={option.value} aria-selected={option.value === value} aria-disabled={option.disabled || undefined} aria-label={optionTitle ? `${option.label}. ${optionTitle}` : option.label} title={optionTitle} tabIndex={searchQuery || option.disabled ? -1 : option.value === selected?.value ? 0 : -1} className={optionClass} onMouseMove={() => { if (!option.disabled) setActiveValue(option.value) }} onClick={() => selectOption(option)}>{option.label}</button></div>
      })}
    </div>
  </div> : null
  return <div ref={root} className={`storyboard-compact-select ${label === 'Camera Movement' ? 'is-movement' : ''} ${label === 'Duration' ? 'is-duration' : ''} ${exhausted ? 'is-exhausted' : ''} ${open ? 'is-open' : ''}`}>
    <button ref={trigger} type="button" data-equalized-options={JSON.stringify(options.map((option) => option.label))} data-equalized-default={selected?.label || options[0]?.label || value} aria-label={triggerAriaLabel || label} aria-describedby={description ? descriptionId : undefined} aria-haspopup="listbox" aria-expanded={open} title={selected?.disabledReason || selected?.title || help || label} disabled={disabled} onClick={toggleMenu} onKeyDown={handleTriggerKeyDown}><span>{selected?.label || value}</span><ChevronDown size={9} /></button>
    {description && <span id={descriptionId} className="storyboard-visually-hidden">{description}</span>}
    {menuContent && createPortal(menuContent, document.body)}
  </div>
}

