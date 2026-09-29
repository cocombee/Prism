export type CanvasInteractionTool = 'select' | 'hand' | 'cut' | 'connection' | 'frame'

export const EDGE_ACTION_HOVER_DELAY_MS = 500
export const CANVAS_MIN_ZOOM = 0.2
export const CANVAS_MAX_ZOOM = 4.4

export type CanvasViewport = { x: number; y: number; zoom: number }
export type CanvasPoint = { x: number; y: number }

export function shouldZoomCanvasFromWheel(altKey: boolean): boolean {
  return altKey
}

export function optionWheelZoomViewport(
  viewport: CanvasViewport,
  pointer: CanvasPoint,
  deltaY: number,
  deltaMode = 0,
  pageHeight = 800,
): CanvasViewport {
  const normalizedDelta = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1)
  const zoom = Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, viewport.zoom * Math.exp(-normalizedDelta * 0.002)))
  if (Math.abs(zoom - viewport.zoom) < 0.0001) return viewport
  const flowX = (pointer.x - viewport.x) / viewport.zoom
  const flowY = (pointer.y - viewport.y) / viewport.zoom
  return {
    x: pointer.x - flowX * zoom,
    y: pointer.y - flowY * zoom,
    zoom,
  }
}

export function canvasPanButtons(tool: CanvasInteractionTool, temporaryGrab = false): number[] {
  return tool === 'hand' || temporaryGrab ? [0, 1] : [1]
}

export function isTextEntryTarget(target: unknown): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean; closest?: (selector: string) => unknown } | null
  if (!element) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((element.tagName || '').toUpperCase())) return true
  if (element.isContentEditable) return true
  return Boolean(element.closest?.('[contenteditable="true"], [contenteditable=""]'))
}

export function isMiddleMouseButton(button: number): boolean {
  return button === 1
}

export function isMiddleMousePressed(buttons: number): boolean {
  return (buttons & 4) === 4
}

export function shouldEndMiddleMousePan(button: number, buttons: number): boolean {
  return isMiddleMouseButton(button) || !isMiddleMousePressed(buttons)
}
