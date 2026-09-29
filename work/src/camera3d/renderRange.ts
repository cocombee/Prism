export type RenderMarks = { inFrame: number | null; outMarkerFrame: number | null }
export type RenderRange = { start: number; end: number; frameCount: number; scope: 'full' | 'marked-range'; name: string }
export type MarkCommand = 'in' | 'out'

const integer = (value: number) => Math.round(Number.isFinite(value) ? value : 0)
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, integer(value)))

export function sanitizeRenderMarks(input: Partial<RenderMarks> | null | undefined, sequenceStart: number, sequenceEnd: number): RenderMarks {
  const start = integer(sequenceStart)
  const end = Math.max(start + 1, integer(sequenceEnd))
  const inFrame = typeof input?.inFrame === 'number' ? clamp(input.inFrame, start, end - 1) : null
  const outMarkerFrame = typeof input?.outMarkerFrame === 'number' ? clamp(input.outMarkerFrame, start, end) : null
  if (inFrame !== null && outMarkerFrame !== null && inFrame > outMarkerFrame) return { inFrame, outMarkerFrame: null }
  return { inFrame, outMarkerFrame }
}

export function deriveRenderRange(input: RenderMarks, sequenceStart: number, sequenceEnd: number): RenderRange {
  const marks = sanitizeRenderMarks(input, sequenceStart, sequenceEnd)
  const start = marks.inFrame ?? integer(sequenceStart)
  const end = marks.outMarkerFrame === null ? integer(sequenceEnd) : Math.min(integer(sequenceEnd), marks.outMarkerFrame === sequenceEnd ? integer(sequenceEnd) : marks.outMarkerFrame + 1)
  const safeEnd = Math.max(start + 1, end)
  const scope = marks.inFrame === null && marks.outMarkerFrame === null ? 'full' : 'marked-range'
  return { start, end: safeEnd, frameCount: safeEnd - start, scope, name: `${scope === 'full' ? 'Full Sequence' : 'Marked Range'} [${start}, ${safeEnd})` }
}

export function applyRenderMark(input: RenderMarks, command: MarkCommand, playhead: number, sequenceStart: number, sequenceEnd: number) {
  const prior = sanitizeRenderMarks(input, sequenceStart, sequenceEnd)
  const frame = command === 'in' ? clamp(playhead, sequenceStart, sequenceEnd - 1) : clamp(playhead, sequenceStart, sequenceEnd)
  let marks: RenderMarks
  let crossed = false
  if (command === 'in') {
    crossed = prior.outMarkerFrame !== null && frame >= prior.outMarkerFrame
    marks = { inFrame: frame, outMarkerFrame: crossed ? null : prior.outMarkerFrame }
  } else {
    crossed = prior.inFrame !== null && frame <= prior.inFrame
    marks = { inFrame: crossed ? null : prior.inFrame, outMarkerFrame: frame }
  }
  const range = deriveRenderRange(marks, sequenceStart, sequenceEnd)
  const endInclusive = range.end - 1
  const announcement = crossed
    ? command === 'in'
      ? `Mark In set at frame ${frame}. Mark Out cleared. Render range continues through sequence end.`
      : `Mark Out set at frame ${frame}. Mark In cleared. Render range begins at sequence start.`
    : command === 'in'
      ? `Mark In set at frame ${frame}. Render range is frame ${range.start} through frame ${endInclusive}.`
      : `Mark Out set at frame ${frame}. Render range is frame ${range.start} through frame ${endInclusive}.`
  return { marks, range, announcement, changed: marks.inFrame !== prior.inFrame || marks.outMarkerFrame !== prior.outMarkerFrame }
}

export function clearRenderMarks() {
  return { marks: { inFrame: null, outMarkerFrame: null } as RenderMarks, announcement: 'In and Out cleared. Render will use the full sequence.' as const }
}
