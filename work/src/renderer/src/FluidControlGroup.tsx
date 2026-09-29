import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { activeControlDescriptors, allocateMixedControlRows, controlDescriptorSignature, controlGroupWidthChanged, deterministicSafeControlRows, layoutSignature, rowMembershipKey, validateControlLayout, validatePaintedControlLayout, type AllocatedMixedControlRow, type FluidControlKind, type FluidControlPreferredZone, type MixedControlAllocationOptions } from '../../shared/controlGroupLayout'

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

