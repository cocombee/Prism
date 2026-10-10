import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Tight painted bounds for selected identity marks; external spacing belongs to the selector. */
export function SelectorLeadingIcon({ identity, children }: { identity: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const host = ref.current
    const mark = host?.firstElementChild as HTMLElement | SVGSVGElement | null
    if (!host || !mark) return
    let active = true
    const fit = () => {
      if (!active) return
      const svg = mark instanceof SVGSVGElement ? mark : mark.querySelector('svg')
      if (svg) {
        // Company marks are filled vectors. Crop only their viewport; never change paths.
        const bounds = svg.getBBox()
        const longest = Math.max(bounds.width, bounds.height)
        if (!(longest > 0)) return
        const size = parseFloat(getComputedStyle(host).getPropertyValue('--selector-leading-icon-size')) || 12
        const viewBox = `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
        if (svg.getAttribute('viewBox') !== viewBox) svg.setAttribute('viewBox', viewBox)
        svg.style.width = `${bounds.width / longest * size}px`
        svg.style.height = `${bounds.height / longest * size}px`
        return
      }
      const style = getComputedStyle(mark)
      const context = document.createElement('canvas').getContext('2d')
      if (!context) return
      context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      context.letterSpacing = style.letterSpacing
      const ink = context.measureText(mark.textContent || '')
      const width = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight
      if (!(width > 0)) return
      // Remove font side bearings from the icon box; ordinary selected text is untouched.
      mark.style.width = `${width}px`
      mark.style.textIndent = `${ink.actualBoundingBoxLeft}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(host)
    document.fonts.addEventListener('loadingdone', fit)
    void document.fonts.ready.then(fit)
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', fit) }
  }, [identity])
  return <span ref={ref} className="selector-leading-icon" aria-hidden="true">{children}</span>
}
