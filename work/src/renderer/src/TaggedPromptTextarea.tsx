import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { completePromptTag, promptTagRanges, promptTagSuggestions, uniquePromptTags } from '../../shared/promptTags'
import { captureTextSelection, clampTextSelection, editorOwnsDestructiveOrSelectAllKey, nativeTextHistoryAction, type TextSelection } from '../../shared/textEditorSelection'
import { createControlledTextHistory, recordControlledText, redoControlledText, undoControlledText } from '../../shared/controlledTextHistory'
import { measuredFloatingMenuWidth, selectorTriggerFontSize, useContinuousAnchor } from './useContinuousAnchor'

export function TaggedPromptTextarea({ value, connectedTags, availableTags = connectedTags, className = '', autoSize = true, onValueChange, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  connectedTags: string[]
  availableTags?: string[]
  className?: string
  autoSize?: boolean
  onValueChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightPreRef = useRef<HTMLPreElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const pendingSelection = useRef<TextSelection | null>(null)
  const pendingScroll = useRef<{ top: number; left: number } | null>(null)
  const historyRef = useRef(createControlledTextHistory({ value, start: value.length, end: value.length, direction: 'none', scrollTop: 0, scrollLeft: 0 }))
  const [caret, setCaret] = useState(value.length)
  const [focused, setFocused] = useState(false)
  const [menuDismissed, setMenuDismissed] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [scroll, setScroll] = useState({ left: 0, top: 0 })
  const [menuPosition, setMenuPosition] = useState<{ left: number; top?: number; bottom?: number; width: number; fontSize: number } | null>(null)
  useEffect(() => {
    if (historyRef.current.current.value === value) return
    const textarea = textareaRef.current
    historyRef.current = createControlledTextHistory({ value, start: textarea?.selectionStart ?? value.length, end: textarea?.selectionEnd ?? value.length, direction: textarea?.selectionDirection || 'none', scrollTop: textarea?.scrollTop || 0, scrollLeft: textarea?.scrollLeft || 0 })
  }, [value])
  const activeTags = useMemo(() => uniquePromptTags(connectedTags), [connectedTags])
  const suggestedTags = useMemo(() => uniquePromptTags(availableTags), [availableTags])
  const ranges = useMemo(() => promptTagRanges(value, activeTags), [activeTags, value])
  const suggestions = useMemo(() => props.readOnly ? [] : focused && !menuDismissed ? promptTagSuggestions(value, caret, suggestedTags) : [], [caret, focused, menuDismissed, props.readOnly, suggestedTags, value])

  const syncCaret = () => setCaret(textareaRef.current?.selectionStart ?? value.length)
  const positionMenu = () => {
    const rect = shellRef.current?.getBoundingClientRect()
    if (!rect) return
    const trigger = textareaRef.current
    if (!trigger) return
    const width = Math.min(window.innerWidth - 16, Math.max(rect.width, measuredFloatingMenuWidth(trigger, suggestions, 160, 360, 24)))
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const fontSize = selectorTriggerFontSize(trigger)
    if (rect.bottom + 132 <= window.innerHeight) setMenuPosition({ left, top: rect.bottom + 4, width, fontSize })
    else setMenuPosition({ left, bottom: window.innerHeight - rect.top + 4, width, fontSize })
  }

  useLayoutEffect(() => {
    if (!suggestions.length) { setMenuPosition(null); return }
    positionMenu()
  }, [suggestions.length])

  useContinuousAnchor(suggestions.length > 0, positionMenu)

  useEffect(() => setActiveSuggestion(0), [suggestions.join('\u0000')])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const highlight = highlightPreRef.current
    if (!textarea || !highlight) return
    let alive = true
    const pixels = (value: string) => Number.parseFloat(value) || 0
    let width = textarea.clientWidth
    const syncTextViewport = (event?: ResizeObserverEntry[] | Event | FontFaceSet) => {
      if (!alive || Array.isArray(event) && textarea.clientWidth === width) return
      width = textarea.clientWidth
      const style = window.getComputedStyle(textarea)
      if (autoSize) {
        highlight.style.borderStyle = 'solid'
        highlight.style.borderColor = 'transparent'
        for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) highlight.style[`border${side}Width`] = style[`border${side}Width`]
      }
      const preStyle = window.getComputedStyle(highlight)
      const textWidth = textarea.clientWidth - pixels(style.paddingLeft) - pixels(style.paddingRight)
      const highlightChrome = pixels(preStyle.paddingLeft) + pixels(preStyle.paddingRight) + pixels(preStyle.borderLeftWidth) + pixels(preStyle.borderRightWidth)
      highlight.style.width = `${Math.max(0, textWidth + highlightChrome)}px`
      if (autoSize && textarea.clientWidth > 0) {
        const line = pixels(style.lineHeight) || pixels(style.fontSize) * 1.5
        const chrome = pixels(style.paddingTop) + pixels(style.paddingBottom) + pixels(style.borderTopWidth) + pixels(style.borderBottomWidth)
        // Measure the natural highlight text, including a trailing empty line.
        // This avoids collapsing the live editor or moving its caret to measure it.
        const height = Math.min(line * 7 + chrome, Math.max(line * 3 + chrome, highlight.scrollHeight + pixels(style.borderTopWidth) + pixels(style.borderBottomWidth)))
        textarea.style.height = `${Math.ceil(height)}px`
      }
    }
    syncTextViewport()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncTextViewport)
    observer?.observe(textarea)
    window.addEventListener('resize', syncTextViewport)
    document.fonts?.ready.then(syncTextViewport)
    return () => { alive = false; observer?.disconnect(); window.removeEventListener('resize', syncTextViewport) }
  }, [value, autoSize])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const pending = pendingSelection.current
    if (!textarea || !pending || document.activeElement !== textarea) return
    const selection = clampTextSelection(pending, value.length)
    textarea.setSelectionRange(selection.start, selection.end, selection.direction)
    setCaret(selection.end)
    if (pendingScroll.current) { textarea.scrollTop = pendingScroll.current.top; textarea.scrollLeft = pendingScroll.current.left; pendingScroll.current = null }
    pendingSelection.current = null
  }, [value])

  const choose = (tag: string) => {
    const completed = completePromptTag(value, caret, tag)
    pendingSelection.current = null
    historyRef.current = recordControlledText(historyRef.current, { value: completed.text, start: completed.caret, end: completed.caret, direction: 'none', scrollTop: textareaRef.current?.scrollTop || 0, scrollLeft: textareaRef.current?.scrollLeft || 0 })
    onValueChange(completed.text)
    setCaret(completed.caret)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(completed.caret, completed.caret)
    })
  }

  const keyDownCapture = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDownCapture?.(event)
    if (event.defaultPrevented) return
    if (editorOwnsDestructiveOrSelectAllKey(event)) event.stopPropagation()
    const historyAction = nativeTextHistoryAction(event)
    if (historyAction) {
      event.stopPropagation()
      if (props.readOnly) return
      event.preventDefault()
      historyRef.current = historyAction === 'undo' ? undoControlledText(historyRef.current) : redoControlledText(historyRef.current)
      const snapshot = historyRef.current.current
      pendingSelection.current = { start: snapshot.start, end: snapshot.end, direction: snapshot.direction }
      pendingScroll.current = { top: snapshot.scrollTop, left: snapshot.scrollLeft }
      onValueChange(snapshot.value)
      return
    }
  }

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDown?.(event)
    if (event.defaultPrevented || !suggestions.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestion((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      choose(suggestions[activeSuggestion])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setMenuDismissed(true)
    }
  }

  let offset = 0
  const highlighted = ranges.flatMap((range, index) => {
    const before = value.slice(offset, range.start)
    offset = range.end
    return [before, <mark key={`${range.start}-${index}`} className={range.active ? 'is-active' : 'is-inactive'}>{range.text}</mark>]
  })
  highlighted.push(value.slice(offset), value.endsWith('\n') ? '\u200b' : '')

  return <div ref={shellRef} className={`tagged-prompt-shell ${className}`} data-prompt-autosize={autoSize || undefined}>
    <div className="tagged-prompt-highlight" aria-hidden="true"><pre ref={highlightPreRef} style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}>{highlighted}</pre></div>
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      onChange={(event) => {
        const selection = captureTextSelection(event.currentTarget)
        pendingSelection.current = selection
        historyRef.current = recordControlledText(historyRef.current, { value: event.currentTarget.value, ...selection, scrollTop: event.currentTarget.scrollTop, scrollLeft: event.currentTarget.scrollLeft })
        onValueChange(event.currentTarget.value)
        setCaret(selection.end)
        setMenuDismissed(false)
      }}
      onFocus={(event) => { props.onFocus?.(event); setFocused(true); setMenuDismissed(false); syncCaret() }}
      onBlur={(event) => { props.onBlur?.(event); setFocused(false) }}
      onClick={(event) => { props.onClick?.(event); setMenuDismissed(false); syncCaret() }}
      onKeyUp={(event) => { props.onKeyUp?.(event); if (event.key !== 'Escape') { setMenuDismissed(false); syncCaret() } }}
      onSelect={(event) => { props.onSelect?.(event); syncCaret() }}
      onScroll={(event) => { props.onScroll?.(event); setScroll({ left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop }) }}
      onKeyDownCapture={keyDownCapture}
      onKeyDown={keyDown}
    />
    {suggestions.length > 0 && menuPosition && createPortal(<div className="tagged-prompt-suggestions nodrag" role="listbox" aria-label="Connected asset tags" style={{ ...menuPosition, '--floating-menu-font-size': `${menuPosition.fontSize}px` } as CSSProperties}>
      {suggestions.map((tag, index) => <button key={tag} type="button" role="option" aria-selected={index === activeSuggestion} onPointerDown={(event) => { event.preventDefault(); choose(tag) }}>{tag}</button>)}
    </div>, document.body)}
  </div>
}
