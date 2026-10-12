import { useLayoutEffect, type RefObject } from 'react'

export type PortRect = { left: number; top: number; right: number; bottom: number }

/** Visible rectangular cells form a union, so overlapping covers cannot cancel. */
export function visiblePortCells(port: PortRect, bodies: PortRect[], scale: number): PortRect[] {
  if (!Number.isFinite(scale) || scale <= 0) return []
  const bounds = { left: -224, top: -64, right: (port.right - port.left) / scale + 224, bottom: (port.bottom - port.top) / scale + 64 }
  const covers = bodies.map(body => ({ left: Math.max(bounds.left, (body.left - port.left) / scale), top: Math.max(bounds.top, (body.top - port.top) / scale), right: Math.min(bounds.right, (body.right - port.left) / scale), bottom: Math.min(bounds.bottom, (body.bottom - port.top) / scale) })).filter(r => r.right > r.left && r.bottom > r.top)
  const xs = [...new Set([bounds.left, bounds.right, ...covers.flatMap(r => [r.left, r.right])])].sort((a,b) => a-b)
  const ys = [...new Set([bounds.top, bounds.bottom, ...covers.flatMap(r => [r.top, r.bottom])])].sort((a,b) => a-b)
  const cells: PortRect[] = []
  for (let x = 1; x < xs.length; x++) for (let y = 1; y < ys.length; y++) {
    const cx = (xs[x-1]+xs[x])/2, cy = (ys[y-1]+ys[y])/2
    if (!covers.some(r => cx >= r.left && cx < r.right && cy >= r.top && cy < r.bottom)) cells.push({ left: xs[x-1], right: xs[x], top: ys[y-1], bottom: ys[y] })
  }
  return cells
}

const controllers = new WeakMap<Element, ReturnType<typeof createController>>()
function createController(viewport: Element) {
  const ports = new Set<HTMLElement>(), observed = new Set<Element>()
  let frame = 0
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
  const resize = new ResizeObserver(schedule)
  const observeBodies = () => {
    const current = new Set(viewport.querySelectorAll('.react-flow__node'))
    for (const node of observed) if (!current.has(node)) { resize.unobserve(node); observed.delete(node) }
    for (const node of current) if (!observed.has(node)) { resize.observe(node); observed.add(node) }
  }
  function update() {
    frame = 0
    // Frames and transparent drawing/sticker canvases are not opaque covers.
    const bodies = [...viewport.querySelectorAll('.react-flow__node > :is(.studio-node,.storyboard-node,.storyboard-asset-node,.canvas-list,.canvas-router,.assistant-node,.canvas-comment,.canvas-sticky)')].map(body => body.getBoundingClientRect())
    const updates = [...ports].filter(port => port.isConnected && port.offsetWidth > 0).map(port => {
      const rect = port.getBoundingClientRect(), scale = rect.width / port.offsetWidth
      const cells = visiblePortCells(rect, bodies, scale)
      const path = cells.map(r => `M${r.left},${r.top}H${r.right}V${r.bottom}H${r.left}Z`).join('') || 'M0,0Z'
      return { port, clip: `path("${path}")` }
    })
    for (const {port,clip} of updates) if (port.style.clipPath !== clip) port.style.clipPath = clip
  }
  const withoutClip = (style: string | null) => (style || '').replace(/(?:^|;)\s*clip-path:[^;]*/g, '').replace(/\s/g, '')
  const mutations = new MutationObserver(records => {
    const relevant = records.some(record => record.type === 'childList'
      ? [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('.react-flow__node') || node.querySelector('.react-flow__node')))
      : record.target instanceof HTMLElement && (record.target.matches('.react-flow__node,.react-flow__viewport') || record.target.matches('.node-port') && withoutClip(record.oldValue) !== withoutClip(record.target.getAttribute('style'))))
    if (relevant) { observeBodies(); schedule() }
  })
  mutations.observe(viewport, { subtree:true, childList:true, attributes:true, attributeFilter:['style'], attributeOldValue:true })
  observeBodies()
  window.addEventListener('resize', schedule)
  return {
    add(port: HTMLElement) { ports.add(port); schedule() },
    remove(port: HTMLElement) {
      ports.delete(port)
      if (!ports.size) { resize.disconnect(); mutations.disconnect(); window.removeEventListener('resize',schedule); if (frame) cancelAnimationFrame(frame); controllers.delete(viewport) }
    },
  }
}

/** One batched observer per viewport; no pointer-driven React state or wire moves. */
export function usePortOcclusion(handle: RefObject<HTMLDivElement | null>, rail: RefObject<HTMLSpanElement | null>) {
  useLayoutEffect(() => {
    const elements = [handle.current, rail.current].filter((element): element is HTMLDivElement | HTMLSpanElement => Boolean(element))
    const viewport = handle.current?.closest('.react-flow__viewport')
    if (!viewport || typeof ResizeObserver === 'undefined') return
    const controller = controllers.get(viewport) || createController(viewport)
    controllers.set(viewport,controller)
    elements.forEach(element => controller.add(element))
    return () => elements.forEach(element => controller.remove(element))
  }, [handle,rail])
}
