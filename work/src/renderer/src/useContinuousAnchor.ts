import { useEffect, useRef } from 'react'

/** Keeps every portalled selector/autocomplete attached to its live trigger. */
export function useContinuousAnchor(open: boolean, updatePosition: () => void) {
  const updateRef = useRef(updatePosition)
  updateRef.current = updatePosition

  useEffect(() => {
    if (!open) return
    let frame = 0
    const follow = () => {
      updateRef.current()
      frame = window.requestAnimationFrame(follow)
    }
    updateRef.current()
    frame = window.requestAnimationFrame(follow)
    return () => window.cancelAnimationFrame(frame)
  }, [open])
}

export function measuredFloatingMenuWidth(
  trigger: HTMLElement,
  labels: string[],
  minimum: number,
  maximum: number,
  fixedChrome = 32,
): number {
  const style = window.getComputedStyle(trigger)
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return minimum
  context.font = `${style.fontWeight} ${selectorTriggerFontSize(trigger)}px ${style.fontFamily}`
  const widestInk = Math.max(...labels.map((label) => {
    const metrics = context.measureText(label)
    return Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
  }), 0)
  return Math.min(maximum, Math.max(minimum, widestInk + fixedChrome))
}

/** Matches a portalled menu to the selected value's visible size on the canvas. */
export function selectorTriggerFontSize(trigger: HTMLElement): number {
  const style = window.getComputedStyle(trigger)
  const baseSize = Number.parseFloat(style.fontSize) || 8
  const viewport = trigger.closest<HTMLElement>('.react-flow__viewport')
  if (!viewport) return Math.max(1, baseSize)
  const transform = window.getComputedStyle(viewport).transform
  if (!transform || transform === 'none') return Math.max(1, baseSize)
  const matrix = new DOMMatrixReadOnly(transform)
  return Math.max(1, baseSize * Math.hypot(matrix.a, matrix.b))
}
