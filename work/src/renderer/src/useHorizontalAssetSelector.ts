import { useCallback, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'

const DRAG_THRESHOLD_PX = 8

export function horizontalSelectorWheelDelta(deltaX: number, deltaY: number): number | null {
  return Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : null
}

export function shouldStartHorizontalSelectorDrag(distance: number): boolean {
  return Math.abs(distance) > DRAG_THRESHOLD_PX
}

export function selectorGestureBelongsToCanvas(button: number, spacePanning: boolean): boolean {
  return button === 1 || spacePanning
}

export function useHorizontalAssetSelector<T extends HTMLElement>() {
  const railRef = useRef<T>(null)
  const drag = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null)
  const didDrag = useRef(false)
  const [dragging, setDragging] = useState(false)

  const onWheel = useCallback((event: ReactWheelEvent<T>) => {
    if (event.altKey) return
    const delta = horizontalSelectorWheelDelta(event.deltaX, event.deltaY)
    if (delta === null) return
    event.currentTarget.scrollLeft += delta
    event.preventDefault()
  }, [])

  const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
    const spacePanning = document.documentElement.classList.contains('is-canvas-space-panning')
    if (selectorGestureBelongsToCanvas(event.button, spacePanning) || event.button !== 0) return
    didDrag.current = false
    drag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    const distance = event.clientX - active.startX
    if (!didDrag.current && !shouldStartHorizontalSelectorDrag(distance)) return
    if (!didDrag.current) {
      didDrag.current = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    event.currentTarget.scrollLeft = active.scrollLeft - distance
  }, [])

  const finishPointer = useCallback((event: ReactPointerEvent<T>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    if (didDrag.current) window.setTimeout(() => { didDrag.current = false }, 0)
  }, [])

  const onPointerCancel = useCallback(() => {
    drag.current = null
    didDrag.current = false
    setDragging(false)
  }, [])

  const onDragStart = useCallback((event: ReactDragEvent<T>) => {
    event.preventDefault()
  }, [])

  const shouldSuppressClick = useCallback(() => {
    const suppress = didDrag.current
    didDrag.current = false
    return suppress
  }, [])

  return {
    railRef,
    dragging,
    shouldSuppressClick,
    railProps: {
      onWheel,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel,
      onDragStart,
    },
  }
}
