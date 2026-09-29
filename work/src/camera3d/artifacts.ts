import { sanitizeCameraDocument, type CameraDocument } from './model'

export type RenderScope = 'full' | 'marked-range'
export type ArtifactLocator = string
export type RenderArtifact = {
  id: string; name: string; scope: RenderScope; absoluteFrameRange: { start: number; end: number }; sourceFingerprint: string
  mediaHash: string; width: number; height: number; fps: number; frameCount: number; codec: 'h264'; container: 'mp4'; durationSeconds: number
  createdAt: string; state: 'current' | 'stale' | 'invalid'; favorite: boolean; locator: ArtifactLocator
}
export type ArtifactSnapshot = { artifacts: RenderArtifact[]; selectedArtifactId: string | null; selectedIndex: number }
export type ArtifactResolution = { ok: true; url: string } | { ok: false; reason: string }
export type CameraArtifactReadiness = { pill: 'Camera Required' | 'Render Required' | 'Ready' | 'Rerender Required' | 'Output Unavailable'; required: boolean; outputAvailable: boolean; selected: RenderArtifact | null; mediaUrl: string | null }
type Pending = { id: string; fingerprint: string; scope: RenderScope; range: { start: number; end: number }; cancelled: boolean; name: string }
let artifactCounter = 0
const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, stableValue(nested)]))
  return value
}
const stable = (value: unknown): string => JSON.stringify(stableValue(value))
function hash(text: string): string { let value = 2166136261; for (let i = 0; i < text.length; i += 1) { value ^= text.charCodeAt(i); value = Math.imul(value, 16777619) } return (value >>> 0).toString(16).padStart(8, '0') }
const clone = (artifact: RenderArtifact): RenderArtifact => ({ ...artifact, absoluteFrameRange: { ...artifact.absoluteFrameRange } })
export function renderSourceFingerprint(document: CameraDocument): string { const { name: _displayName, ...authority } = sanitizeCameraDocument(document); return hash(stable(authority)) }
export class ArtifactStore {
  private artifacts: RenderArtifact[] = []
  private pending = new Map<string, Pending>()
  private selectedArtifactId: string | null = null
  private resolutions = new Map<string, ArtifactResolution>()
  static fromSnapshot(snapshot: Partial<ArtifactSnapshot> | null | undefined) { const store = new ArtifactStore(); store.hydrate(snapshot); return store }
  hydrate(snapshot: Partial<ArtifactSnapshot> | null | undefined) {
    this.artifacts = (snapshot?.artifacts || []).filter((item): item is RenderArtifact => item?.codec === 'h264' && item.container === 'mp4' && typeof item.locator === 'string').map((item) => clone({ ...item, scope: (item.scope as string) === 'shot' ? 'marked-range' : item.scope }))
    const byId = snapshot?.selectedArtifactId && this.artifacts.some((item) => item.id === snapshot.selectedArtifactId) ? snapshot.selectedArtifactId : null
    const byIndex = typeof snapshot?.selectedIndex === 'number' ? this.artifacts[Math.max(0, Math.min(this.artifacts.length - 1, snapshot.selectedIndex))]?.id : null
    this.selectedArtifactId = byId || byIndex || this.artifacts[0]?.id || null
    this.resolutions.clear()
  }
  begin(document: CameraDocument, scope: RenderScope, range: { start: number; end: number }): Pending { artifactCounter += 1; const pending = { id: `render-${artifactCounter}`, fingerprint: renderSourceFingerprint(document), scope, range: { ...range }, cancelled: false, name: `${scope === 'full' ? 'Full Sequence' : 'Marked Range'} [${range.start}, ${range.end})` }; this.pending.set(pending.id, pending); return { ...pending } }
  cancel(id: string) { const pending = this.pending.get(id); if (pending) { pending.cancelled = true; this.pending.delete(id) } }
  async promote(id: string, media: Omit<RenderArtifact, 'id' | 'name' | 'scope' | 'absoluteFrameRange' | 'sourceFingerprint' | 'createdAt' | 'state' | 'favorite'>): Promise<RenderArtifact> { const pending = this.pending.get(id); if (!pending || pending.cancelled) throw new Error('RENDER_NOT_PROMOTABLE'); if (media.container !== 'mp4' || media.codec !== 'h264' || media.frameCount !== pending.range.end - pending.range.start || media.width <= 0 || media.height <= 0 || media.fps <= 0 || !media.locator) throw new Error('RENDER_VALIDATION_FAILED'); const artifact: RenderArtifact = { id, name: pending.name, scope: pending.scope, absoluteFrameRange: pending.range, sourceFingerprint: pending.fingerprint, createdAt: new Date().toISOString(), state: 'current', favorite: false, ...media }; this.artifacts.push(artifact); this.selectedArtifactId = artifact.id; this.pending.delete(id); return clone(artifact) }
  list(): RenderArtifact[] { return this.artifacts.map(clone) }
  snapshot(): ArtifactSnapshot { const selectedIndex = Math.max(0, this.artifacts.findIndex((item) => item.id === this.selectedArtifactId)); return { artifacts: this.list(), selectedArtifactId: this.selectedArtifactId, selectedIndex } }
  select(id: string | null) { if (id !== null && !this.artifacts.some((item) => item.id === id)) throw new Error('ARTIFACT_NOT_FOUND'); this.selectedArtifactId = id }
  selected(): RenderArtifact | null { return this.artifacts.find((item) => item.id === this.selectedArtifactId) || null }
  resolve(id: string, resolution: ArtifactResolution) { if (!this.artifacts.some((item) => item.id === id)) throw new Error('ARTIFACT_NOT_FOUND'); this.resolutions.set(id, resolution); if (!resolution.ok) { const artifact = this.artifacts.find((item) => item.id === id); if (artifact) artifact.state = 'invalid' } }
  resolution(id: string) { return this.resolutions.get(id) || null }
  readiness(document: CameraDocument) { return cameraArtifactReadiness(document, this.snapshot(), this.resolutions) }
  rename(id: string, name: string) { const artifact = this.artifacts.find((item) => item.id === id); if (artifact && name.trim()) artifact.name = name.trim() }
  favorite(id: string) { const artifact = this.artifacts.find((item) => item.id === id); if (artifact) artifact.favorite = !artifact.favorite }
  delete(id: string) { const index = this.artifacts.findIndex((item) => item.id === id); if (index < 0) return; this.artifacts.splice(index, 1); this.resolutions.delete(id); if (this.selectedArtifactId === id) this.selectedArtifactId = this.artifacts[Math.min(index, this.artifacts.length - 1)]?.id || null }
  selectReference(id: string | null) { this.select(id) }
  reference(): RenderArtifact | null { return this.selected() }
  refreshReadiness(document: CameraDocument) { const fingerprint = renderSourceFingerprint(document); this.artifacts.forEach((item) => { if (item.state !== 'invalid') item.state = item.sourceFingerprint === fingerprint ? 'current' : 'stale' }) }
}
export function cameraRenderActionLabel(document: CameraDocument, snapshot: ArtifactSnapshot, resolutions: ReadonlyMap<string, ArtifactResolution> | Record<string, ArtifactResolution>, running: boolean): 'Render' | 'Cancel Render' | 'Rerender' {
  if (running) return 'Cancel Render'
  return cameraArtifactReadiness(document, snapshot, resolutions).pill === 'Rerender Required' ? 'Rerender' : 'Render'
}

export function cameraArtifactReadiness(document: CameraDocument, snapshot: ArtifactSnapshot, resolutions: ReadonlyMap<string, ArtifactResolution> | Record<string, ArtifactResolution> = {}) : CameraArtifactReadiness {
  const camera = document.entities.find((entity) => entity.kind === 'camera')
  const selected = snapshot.artifacts.find((item) => item.id === snapshot.selectedArtifactId) || null
  const resolution = selected ? (resolutions instanceof Map ? resolutions.get(selected.id) : (resolutions as Record<string, ArtifactResolution>)[selected.id]) : null
  if (!camera) return { pill: 'Camera Required', required: true, outputAvailable: false, selected, mediaUrl: null }
  if (!selected) return { pill: 'Render Required', required: true, outputAvailable: false, selected: null, mediaUrl: null }
  if (selected.state === 'stale') return { pill: 'Rerender Required', required: true, outputAvailable: false, selected, mediaUrl: resolution?.ok ? resolution.url : null }
  if (selected.state === 'invalid' || !resolution?.ok) return { pill: 'Output Unavailable', required: true, outputAvailable: false, selected, mediaUrl: null }
  return { pill: 'Ready', required: false, outputAvailable: true, selected, mediaUrl: resolution.url }
}
