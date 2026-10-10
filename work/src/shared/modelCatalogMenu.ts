export interface ModelMenuMetadata {
  service: string
  company: string
  release: string
  mode?: string
  /** Provider publication date for this route; not necessarily a base model's release. */
  releasedAt?: string
}

export interface ModelMenuOption {
  value: string
  label: string
  disabled?: boolean
  aliases?: readonly string[]
  catalog?: ModelMenuMetadata
}

export interface ModelMenuRelease<T extends ModelMenuOption> {
  key: string
  label: string
  company: string
  service: string
  isNew: boolean
  /** Real provider release metadata only; absent dates remain unknown. */
  releasedAt?: string
  options: T[]
  family: string
  version?: number[]
}

export interface ModelMenuProvider<T extends ModelMenuOption> {
  label: string
  releases: ModelMenuRelease<T>[]
  featured: ModelMenuRelease<T>[]
}

/** A release badge requires a real, recent release date; ranking never invents one. */
export function isRecentModelRelease(releasedAt: string | undefined, now = Date.now()): boolean {
  const date = modelReleaseDate(releasedAt, now)
  return date !== undefined && now - date <= 30 * 86_400_000
}

function modelReleaseDate(releasedAt: string | undefined, now: number): number | undefined {
  if (!releasedAt || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(releasedAt)) return undefined
  const date = Date.parse(releasedAt)
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === releasedAt.slice(0, 10) && date <= now ? date : undefined
}

/** Infer a version only from a model name, never an endpoint or refresh timestamp.
 * Unknown names remain independent instead of losing unrelated models.
 * O/H series are separate lineages; tier words are variations of one release. */
function releaseIdentity(label: string): { family: string; label: string; version?: number[] } {
  label = label.replace(/\s*[-·:]?\s*(?:Text[ -]to[ -](?:Video|Image|Audio|Speech)|Image[ -]to[ -](?:Video|Image|Audio)|Reference[ -]to[ -]Video|Video[ -]to[ -](?:Video|Audio)|Audio[ -]to[ -](?:Video|Audio))\s*$/i, '').trim()
  const match = /^(.*?[a-z])([\s.-]*)([voh]?)(\d+(?:\.\d+)*)(.*)$/i.exec(label.trim())
  if (!match) return { family: label.toLowerCase(), label }
  const [, prefix, separator, marker, number, suffix] = match
  const tiers = /^(?:[\s-]*(?:pro|prime|fast|turbo|standard|std|mini|lite|max|flash|preview|beta|dev|ultra|utility|draft|distilled|us|global|hd|4k|\(.*\)|\[[^\[\]]+\]))*$/i
  // Dotted published names (FLUX.2 [pro]) share the ordinary version owner.
  // A named suffix (FLUX.1 Kontext, FLUX.2 Klein) is not evidence of a tier.
  if (separator.includes('.') && suffix && !tiers.test(suffix)) return { family: label.toLowerCase(), label }
  // Published future tiers need no app update. A separated suffix belongs to
  // this version; compact unknown series (for example GPT 4o) stay distinct.
  if (suffix && !/^[\s-]/.test(suffix) && !tiers.test(suffix)) return { family: label.toLowerCase(), label }
  const series = /[oh]/i.test(marker) ? marker.toUpperCase() : ''
  const base = prefix.replace(/[\s-]+$/, '').replace(/\s+video$/i, '')
  const version = number.split('.').map(Number)
  return { family: `${base.toLowerCase().replace(/[\s-]+/g, '')}${series.toLowerCase()}`,
    label: `${base} ${series || (marker ? 'V' : '')}${number}`, version }
}

function newestRelease(left: ModelMenuRelease<ModelMenuOption>, right: ModelMenuRelease<ModelMenuOption>): number {
  const a = left.version || [], b = right.version || []
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (b[index] || 0) - (a[index] || 0)
    if (difference) return difference
  }
  // A newly published variation cannot resurrect an obsolete model version.
  if (left.releasedAt && right.releasedAt) return Date.parse(right.releasedAt) - Date.parse(left.releasedAt)
  return left.label.localeCompare(right.label)
}

export function modelCatalogMenu<T extends ModelMenuOption>(
  groups: readonly { label: string; options: readonly T[] }[],
  featuredCount = 5,
  now = Date.now(),
): ModelMenuProvider<T>[] {
  const providers = new Map<string, ModelMenuProvider<T>>()
  const seen = new Set<string>()
  for (const group of groups) for (const option of group.options) {
    const metadata = option.catalog || { service: group.label, company: group.label, release: option.label }
    const identity = JSON.stringify([metadata.service, option.value])
    if (seen.has(identity)) continue
    seen.add(identity)
    let provider = providers.get(metadata.service)
    if (!provider) {
      provider = { label: metadata.service, releases: [], featured: [] }
      providers.set(metadata.service, provider)
    }
    const releaseInfo = releaseIdentity(metadata.release)
    const key = JSON.stringify([metadata.service, metadata.company, releaseInfo.label])
    let release = provider.releases.find((item) => item.key === key)
    if (!release) {
      release = { key, label: releaseInfo.label, family: releaseInfo.family, version: releaseInfo.version, company: metadata.company, service: metadata.service,
        isNew: isRecentModelRelease(metadata.releasedAt, now), options: [] }
      provider.releases.push(release)
    }
    const date = modelReleaseDate(metadata.releasedAt, now)
    if (date !== undefined && (release.releasedAt === undefined || date > Date.parse(release.releasedAt))) {
      release.releasedAt = metadata.releasedAt
      release.isNew = isRecentModelRelease(metadata.releasedAt, now)
    }
    release.options.push(option)
  }
  const limit = Math.max(0, Math.min(7, Math.floor(featuredCount)))
  for (const provider of providers.values()) {
    const families = new Map<string, ModelMenuRelease<T>[]>()
    for (const release of provider.releases) {
      const key = JSON.stringify([release.company, release.family])
      const siblings = families.get(key) || []
      siblings.push(release)
      families.set(key, siblings)
    }
    // Limit releases, not modes or tiers. Discovery retains the full catalog;
    // this menu projection cannot mutate a persisted older selection.
    provider.releases = [...families.values()].flatMap(releases => releases.sort(newestRelease).slice(0, 2))
    provider.featured = [...families.values()].flatMap(releases => releases.slice(0, 1))
      .filter(release => !release.options.every(option => option.disabled))
      .sort((a, b) => {
        if (a.releasedAt && b.releasedAt) return Date.parse(b.releasedAt) - Date.parse(a.releasedAt)
        return Number(Boolean(b.releasedAt)) - Number(Boolean(a.releasedAt)) || newestRelease(a, b)
      }).slice(0, limit)
  }
  return [...providers.values()]
}

export function visibleModelCatalogOptions<T extends ModelMenuOption>(
  providers: readonly ModelMenuProvider<T>[], expanded: ReadonlySet<string>, searching = false,
): T[] {
  return providers.flatMap(provider => provider.releases.flatMap(release =>
    searching || !modelReleaseNeedsExpansion(release) || expanded.has(release.key) ? release.options : []))
}

export function modelReleaseNeedsExpansion(release: ModelMenuRelease<ModelMenuOption>): boolean {
  return release.options.length > 1 || release.options.some((option) => Boolean(option.catalog?.mode))
}
