import { modelCatalogMenu, type ModelMenuOption, type ModelMenuProvider, type ModelMenuRelease } from './modelCatalogMenu'

/** Media flat menus keep every supported release; disabled entries are removed before ranking. */
export function admittedModelCatalogMenu<T extends ModelMenuOption>(groups: readonly { label: string; options: readonly T[] }[]) {
  return modelCatalogMenu(groups.map(group => ({ ...group, options: group.options.filter(option => !option.disabled) })), 5, Date.now(), 'all')
}

export type FlatModelMenuRow<T extends ModelMenuOption> = { option: T; label: string; isNew: boolean; family: string }

type ReleaseCandidate<T extends ModelMenuOption> = { release: ModelMenuRelease<T>; option: T }
type Generation<T extends ModelMenuOption> = { label: string; candidates: ReleaseCandidate<T>[]; version?: number[]; date: number; index: number }

export type DeclaredReleaseAlias = { prefix: string; contains?: string }
export type FeaturedFamilyPriority = { family: string; version?: string; company?: string; releaseAliases?: readonly DeclaredReleaseAlias[] }
export type FlatModelCatalogMenuPolicy = {
  /** Curated allowlist and All ordering, matched against declared release/company metadata. */
  approvedFamilyPriority?: readonly FeaturedFamilyPriority[]
  /** Featured is a short popular list, independent from the larger All allowlist. */
  featuredFamilyPriority?: readonly FeaturedFamilyPriority[]
  /** Limit retained generations independently for each serving provider and model family. */
  generationLimit?: number
  /** Signals that callers should render All by serving provider. */
  groupByProvider?: boolean
  /** Two main input choices per generation; specialised tools use other workflows. */
  ordinaryVideoInputsOnly?: boolean
}

/** User-curated families; the live admitted catalog owns their available versions and routes. */
export const POPULAR_VIDEO_FEATURED_POLICY: FlatModelCatalogMenuPolicy = {
  approvedFamilyPriority: [
    { family: 'Seedance' }, { family: 'Kling' }, { family: 'Gemini Omni Flash' },
    { family: 'Wan' }, { family: 'LTX' }, { family: 'MiniMax H', company: 'MiniMax', releaseAliases: [{ prefix: 'H3' }] }, { family: 'Hailuo', company: 'MiniMax', releaseAliases: [{ prefix: 'MiniMax Hailuo' }] },
    { family: 'PixVerse' }, { family: 'Veo' },
  ],
  featuredFamilyPriority: [
    { family: 'Seedance', version: '2.5' }, { family: 'Kling' },
    { family: 'Gemini Omni Flash', version: '1.1' }, { family: 'Wan' }, { family: 'LTX' },
  ],
  generationLimit: 2,
  groupByProvider: true,
  ordinaryVideoInputsOnly: true,
}

export const POPULAR_IMAGE_MODEL_POLICY: FlatModelCatalogMenuPolicy = {
  approvedFamilyPriority: [
    { family: 'GPT Image', releaseAliases: [{ prefix: 'GPT Image' }] }, { family: 'Nano Banana' }, { family: 'Seedream' },
    { family: 'Flux', releaseAliases: [{ prefix: 'FLUX.1 Kontext' }, { prefix: 'FLUX.2 Klein' }], company: 'Black Forest Labs' },
    { family: 'Gemini Image', releaseAliases: [{ prefix: 'Gemini', contains: 'Image' }], company: 'Google' },
    { family: 'Ideogram' }, { family: 'Ray', company: 'Luma' }, { family: 'Imagen' }, { family: 'Recraft' },
  ],
  featuredFamilyPriority: [
    { family: 'GPT Image', releaseAliases: [{ prefix: 'GPT Image' }] }, { family: 'Nano Banana' }, { family: 'Seedream' },
    { family: 'Flux', releaseAliases: [{ prefix: 'FLUX.1 Kontext' }, { prefix: 'FLUX.2 Klein' }], company: 'Black Forest Labs' }, { family: 'Ideogram' },
  ],
  generationLimit: 2,
  groupByProvider: true,
}

/** Text families/efforts are already admitted by latestAssistantMenuModels; never prune them again here. */
export const LATEST_TEXT_MODEL_MENU_POLICY: FlatModelCatalogMenuPolicy = {
  groupByProvider: true,
  featuredFamilyPriority: [],
}

function normalizeFamilyName(value: string): string {
  let normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '')
  // BytePlus is the serving host prefix in some discovery display names.
  // The underlying model family still comes from the declared release name.
  if (normalized.startsWith('byteplus')) normalized = normalized.slice('byteplus'.length)
  return normalized
}

function generationIdentity<T extends ModelMenuOption>(release: ModelMenuRelease<T>): string {
  return release.version?.length
    ? `version:${versionKey(release.version)}`
    : `name:${normalizeFamilyName(release.label)}`
}

function versionKey(value: readonly number[] | string): string {
  const parts = typeof value === 'string'
    ? value.replace(/^[vV]/, '').split('.').map(Number)
    : [...value]
  while (parts.length > 1 && parts.at(-1) === 0) parts.pop()
  return parts.join('.')
}

function familyMatchesPriority(candidateFamily: string, requestedFamily: string): boolean {
  return candidateFamily === requestedFamily
    || candidateFamily === `${requestedFamily}v`
    || candidateFamily === `${requestedFamily}o`
}

function familyMatchesApproved<T extends ModelMenuOption>(release: ModelMenuRelease<T>, priority: FeaturedFamilyPriority): boolean {
  const requested = normalizeFamilyName(priority.family)
  let familyMatches = familyMatchesPriority(normalizeFamilyName(release.family), requested)
  // Some provider labels keep a named tier when the release itself is not
  // numbered (for example "Nano Banana Pro"). Strip only known tier suffixes.
  const base = normalizeFamilyName(release.family).replace(/(?:standard|prime|turbo|fast|mini|lite|pro|max|flash|preview|beta|dev|ultra|distilled|global|utility|draft)$/, '')
  familyMatches ||= Boolean(base && familyMatchesPriority(base, requested))
  familyMatches ||= Boolean(priority.releaseAliases?.some(alias => {
    const prefix = normalizeFamilyName(alias.prefix)
    const contains = alias.contains === undefined ? undefined : normalizeFamilyName(alias.contains)
    return [release.label, ...release.options.flatMap(option => [option.catalog?.release || '', option.label])].some(value => {
      const declaredRelease = normalizeFamilyName(value)
      return declaredRelease.startsWith(prefix) && (!contains || declaredRelease.includes(contains))
    })
  }))
  if (!familyMatches) return false
  if (priority.company) {
    const wanted = normalizeFamilyName(priority.company)
    const actual = normalizeFamilyName(release.company)
    return actual === wanted || actual.startsWith(wanted)
  }
  return true
}

export type FlatModelMenuGroup<T extends ModelMenuOption> = { label: string; rows: FlatModelMenuRow<T>[] }

function groupRowsByService<T extends ModelMenuOption>(rows: FlatModelMenuRow<T>[], serviceByValue: ReadonlyMap<string, string>): FlatModelMenuGroup<T>[] {
  const groups: FlatModelMenuGroup<T>[] = []
  const byService = new Map<string, FlatModelMenuGroup<T>>()
  for (const row of rows) {
    const service = serviceByValue.get(row.option.value) || row.option.catalog?.service || ''
    let group = byService.get(service)
    if (!group) {
      group = { label: service, rows: [] }
      groups.push(group)
      byService.set(service, group)
    }
    group.rows.push(row)
  }
  return groups
}

function declaredMode(option: ModelMenuOption): string {
  return (option.catalog?.mode || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

/**
 * Edit and Extend are separate video workflows, rather than ordinary generator
 * choices. Filter only those explicit declared video modes; names such as Fast,
 * Mini, Turbo, Pro, or 4K remain independent selectable options.
 */
function isExplicitVideoEditOrExtend(option: ModelMenuOption): boolean {
  return /^(?:(?:video )?(?:edit|extend)(?: video)?|(?:edit|extend) video)$/.test(declaredMode(option))
}

function admittedByPolicy(option: ModelMenuOption, policy: FlatModelCatalogMenuPolicy): boolean {
  if (option.disabled || isExplicitVideoEditOrExtend(option)) return false
  if (!policy.ordinaryVideoInputsOnly) return true
  // The existing native Higgsfield generator list uses these input variations.
  // Keep named speed/quality tiers, but don't mix LoRA/effects/audio-only tools
  // into the ordinary generator. Exact values and saved routes stay untouched.
  return modelMenuMode(option) !== undefined
    && !/(?:^|\/)(?:lora)(?:\/|$)/i.test(option.value)
}

/** Keep each provider's exact endpoint and schema. References is a menu name,
 * not a promise that an image-only endpoint accepts video or audio references. */
function mainVideoCandidates<T extends ModelMenuOption>(candidates: ReleaseCandidate<T>[], selectedValue: string): ReleaseCandidate<T>[] {
  return (['text', 'reference'] as const).flatMap(mode => {
    const matching = candidates.filter(candidate => modelMenuMode(candidate.option) === mode)
    const selected = matching.find(candidate => candidate.option.value === selectedValue)
    const rank = (candidate: ReleaseCandidate<T>) => {
      const declared = declaredMode(candidate.option)
      const inputRank = mode === 'reference' && /^(?:references?|references? to video)$/.test(declared) ? 0 : mode === 'reference' ? 1 : 0
      const namedTier = /\b(?:fast|mini|turbo|lite|draft)\b/i.test(candidate.option.catalog?.release || candidate.release.label) ? 1 : 0
      return inputRank * 10 + namedTier
    }
    const preferred = selected || matching.map((candidate, index) => ({ candidate, index })).sort((a, b) => rank(a.candidate) - rank(b.candidate) || a.index - b.index)[0]?.candidate
    return preferred ? [preferred] : []
  })
}

function mainVideoLabel(option: ModelMenuOption): string {
  const mode = modelMenuMode(option)
  const release = option.label.split(' · ')[0]
  return `${release} · ${mode === 'text' ? 'Text' : 'References'}`
}

function compareGeneration<T extends ModelMenuOption>(left: Generation<T>, right: Generation<T>): number {
  for (let index = 0; index < Math.max(left.version?.length || 0, right.version?.length || 0); index += 1) {
    const delta = (right.version?.[index] || 0) - (left.version?.[index] || 0)
    if (delta) return delta
  }
  if (left.date && right.date && left.date !== right.date) return right.date - left.date
  return left.index - right.index
}

/**
 * Flatten the currently admitted provider catalog without collapsing routes.
 * The default menu may limit each provider upstream; the flat media menu asks
 * for all releases and keeps every exact host, tier, and mode endpoint.
 */
export function flatModelCatalogMenu<T extends ModelMenuOption>(
  providers: readonly ModelMenuProvider<T>[],
  selectedValue: string,
  featuredCount = 5,
  policy: FlatModelCatalogMenuPolicy = {},
) {
  if (policy.approvedFamilyPriority || policy.generationLimit !== undefined || policy.groupByProvider) {
    return reducedFlatModelCatalogMenu(providers, selectedValue, featuredCount, policy)
  }
  const families = new Map<string, ModelMenuRelease<T>[]>()
  let releaseIndex = 0
  const releaseOrder = new Map<ModelMenuRelease<T>, number>()
  const serviceByValue = new Map<string, string>()
  for (const provider of providers) for (const release of provider.releases) {
    const index = releaseIndex++
    releaseOrder.set(release, index)
    if (!release.options.some(option => !option.disabled && !isExplicitVideoEditOrExtend(option))) continue
    // The normalized model-name lineage owns family ranking. `service` is the
    // serving host (for example Higgsfield), while maker metadata stays attached
    // to each original option and never becomes a second model-family identity.
    const family = normalizeFamilyName(release.family)
    const siblings = families.get(family) || []
    siblings.push(release)
    families.set(family, siblings)
  }

  const seenValues = new Set<string>()
  const blocks = [...families].map(([family, releases], familyIndex) => {
    const generations = new Map<string, Generation<T>>()
    for (const release of releases) {
      const identity = generationIdentity(release)
      let generation = generations.get(identity)
      if (!generation) {
        generation = { label: release.label, candidates: [], version: release.version, date: 0, index: releaseOrder.get(release) ?? familyIndex }
        generations.set(identity, generation)
      }
      const releaseDate = release.releasedAt ? Date.parse(release.releasedAt) || 0 : 0
      generation.date = Math.max(generation.date, releaseDate)
      for (const option of release.options) {
        if (!option.disabled && !isExplicitVideoEditOrExtend(option)) generation.candidates.push({ release, option })
      }
    }

    const orderedGenerations = [...generations.values()].filter(generation => generation.candidates.length).sort(compareGeneration)
    const rowsByGeneration = orderedGenerations.map(generation => generation.candidates.flatMap(candidate => {
      // A value is the selectable route identity. Only a repeated exact value
      // is deduplicated; provider, mode, and named-tier differences stay intact.
      if (seenValues.has(candidate.option.value)) return []
      seenValues.add(candidate.option.value)
      serviceByValue.set(candidate.option.value, candidate.release.service || candidate.option.catalog?.service || '')
      return [{
        option: candidate.option,
        label: candidate.option.label,
        isNew: candidate.release.isNew,
        family,
      } satisfies FlatModelMenuRow<T>]
    }))
    const latestRows = rowsByGeneration[0] || []
    const previousRows = rowsByGeneration[1] || []
    const featured = latestRows.find(row => row.option.value === selectedValue) || latestRows[0]
    const second = previousRows.find(row => row.option.value === selectedValue) || previousRows[0]
    return {
      family,
      rows: rowsByGeneration.flat(),
      generations: orderedGenerations.map((generation, index) => ({ ...generation, rows: rowsByGeneration[index] || [] })),
      featured,
      second,
      date: orderedGenerations[0]?.date || 0,
      index: familyIndex,
    }
  }).sort((left, right) => right.date - left.date || left.index - right.index)

  const limit = Math.max(0, Math.min(7, Math.floor(featuredCount)))
  const featured = policy.featuredFamilyPriority
    ? policy.featuredFamilyPriority.flatMap(priority => {
      const requestedFamily = normalizeFamilyName(priority.family)
      const exactVersion = priority.version === undefined ? undefined : versionKey(priority.version.trim())
      const matches = blocks.flatMap(block => {
        if (!familyMatchesPriority(block.family, requestedFamily)) return []
        const generation = exactVersion
          ? block.generations.find(candidate => candidate.version && versionKey(candidate.version) === exactVersion)
          : block.generations[0]
        if (!generation) return []
        const row = generation.rows.find(item => item.option.value === selectedValue) || generation.rows[0]
        return row ? [{ row, generation }] : []
      }).sort((left, right) => compareGeneration(left.generation, right.generation))
      return matches[0] ? [matches[0].row] : []
    }).slice(0, limit)
    : blocks.slice(0, limit).flatMap(block => block.featured ? [block.featured] : [])
  const featuredValues = new Set(featured.map(row => row.option.value))
  const second = blocks.flatMap(block => block.second && !featuredValues.has(block.second.option.value) ? [block.second] : [])
  const leading = new Set([...featuredValues, ...second.map(row => row.option.value)])
  const all = [...second, ...blocks.flatMap(block => block.rows.filter(row => !leading.has(row.option.value)))]
  const allGroups = policy.groupByProvider ? groupRowsByService(all, serviceByValue) : [{ label: '', rows: all }]
  return { featured, all, rows: [...featured, ...all], allGroups }
}

type ScopedFamilyBlock<T extends ModelMenuOption> = {
  service: string
  company: string
  family: string
  familyPriority: number
  generations: Generation<T>[]
  rowsByGeneration: FlatModelMenuRow<T>[][]
  second?: FlatModelMenuRow<T>
  index: number
}

function reducedFlatModelCatalogMenu<T extends ModelMenuOption>(
  providers: readonly ModelMenuProvider<T>[], selectedValue: string, featuredCount: number, policy: FlatModelCatalogMenuPolicy,
) {
  const approved = policy.approvedFamilyPriority
  const serviceOrder = new Map<string, number>()
  let releaseIndex = 0
  for (const provider of providers) for (const release of provider.releases) {
    if (!serviceOrder.has(release.service)) serviceOrder.set(release.service, serviceOrder.size)
  }
  const scoped = new Map<string, ScopedFamilyBlock<T>>()

  for (const provider of providers) for (const release of provider.releases) {
    const usable = release.options.filter(option => admittedByPolicy(option, policy))
    if (!usable.length) continue
    const declaredFamily = normalizeFamilyName(release.family)
    const priorityIndex = approved ? approved.findIndex(priority => familyMatchesApproved(release, priority)) : -1
    if (approved && priorityIndex < 0) continue
    // Match Higgsfield's ordinary Kling family, rather than adding the separate
    // O-series workflow to fal's counterpart list.
    if (policy.ordinaryVideoInputsOnly && declaredFamily === 'klingo') continue
    // Provider spelling (H3 versus MiniMax H3, MiniMax Hailuo versus Hailuo)
    // must not create additional generation budgets for the same admitted family.
    const family = policy.ordinaryVideoInputsOnly && approved && priorityIndex >= 0
      ? normalizeFamilyName(approved[priorityIndex].family) : declaredFamily
    const service = release.service || release.options.find(option => option.catalog?.service)?.catalog?.service || provider.label
    const key = JSON.stringify([service, release.company, family])
    let block = scoped.get(key)
    if (!block) {
      block = { service, company: release.company, family, familyPriority: priorityIndex < 0 ? Number.MAX_SAFE_INTEGER : priorityIndex, generations: [], rowsByGeneration: [], index: releaseIndex }
      scoped.set(key, block)
    }
    const identity = generationIdentity(release)
    let generation = block.generations.find(item => generationIdentity({ label: item.label, version: item.version } as ModelMenuRelease<T>) === identity)
    // Generation identity uses the shared parsed version when present; keep a
    // separate map-like fallback for unversioned model names.
    if (!generation) {
      generation = { label: release.label, candidates: [], version: release.version, date: 0, index: releaseIndex }
      block.generations.push(generation)
    }
    generation.date = Math.max(generation.date, release.releasedAt ? Date.parse(release.releasedAt) || 0 : 0)
    for (const option of usable) generation.candidates.push({ release, option })
    releaseIndex++
  }

  const generationLimit = policy.generationLimit === undefined ? undefined : Math.max(0, Math.floor(policy.generationLimit))
  const seenValues = new Set<string>()
  const serviceByValue = new Map<string, string>()
  for (const block of scoped.values()) {
    block.generations.sort(compareGeneration)
    if (generationLimit !== undefined) block.generations = block.generations.slice(0, generationLimit)
    block.rowsByGeneration = block.generations.map(generation => (policy.ordinaryVideoInputsOnly ? mainVideoCandidates(generation.candidates, selectedValue) : generation.candidates).flatMap(candidate => {
      if (seenValues.has(candidate.option.value)) return []
      seenValues.add(candidate.option.value)
      serviceByValue.set(candidate.option.value, block.service)
      return [{ option: candidate.option, label: policy.ordinaryVideoInputsOnly ? mainVideoLabel(candidate.option) : candidate.option.label, isNew: candidate.release.isNew, family: block.family } satisfies FlatModelMenuRow<T>]
    }))
    block.second = block.rowsByGeneration[1]?.find(row => row.option.value === selectedValue) || block.rowsByGeneration[1]?.[0]
  }

  const blocks = [...scoped.values()].sort((left, right) => {
    const providerDelta = (serviceOrder.get(left.service) ?? Number.MAX_SAFE_INTEGER) - (serviceOrder.get(right.service) ?? Number.MAX_SAFE_INTEGER)
    if (providerDelta) return providerDelta
    return left.familyPriority - right.familyPriority || left.index - right.index
  })
  const priority = policy.featuredFamilyPriority
  const limit = Math.max(0, Math.min(7, Math.floor(featuredCount)))
  const featured: FlatModelMenuRow<T>[] = []
  const featuredValues = new Set<string>()
  if (priority) for (const requested of priority) {
    const exactVersion = requested.version === undefined ? undefined : versionKey(requested.version.trim())
    const candidates = blocks.flatMap(block => {
      const release = block.generations.flatMap(generation => generation.candidates.map(candidate => candidate.release)).find(item => familyMatchesApproved(item, requested))
      if (!release && !familyMatchesPriority(block.family, normalizeFamilyName(requested.family))) return []
      const generationIndex = exactVersion === undefined ? 0 : block.generations.findIndex(generation => generation.version && versionKey(generation.version) === exactVersion)
      if (generationIndex < 0) return []
      const generation = block.generations[generationIndex]
      const rows = block.rowsByGeneration[generationIndex] || []
      const row = rows.find(item => item.option.value === selectedValue) || rows[0]
      return generation && row ? [{ generation, row, index: block.index }] : []
    }).sort((left, right) => compareGeneration(left.generation, right.generation) || left.index - right.index)
    const selected = candidates[0]?.row
    if (selected && !featuredValues.has(selected.option.value) && featured.length < limit) {
      featured.push(selected)
      featuredValues.add(selected.option.value)
    }
  }
  else for (const block of blocks) {
    const row = block.rowsByGeneration[0]?.find(item => item.option.value === selectedValue) || block.rowsByGeneration[0]?.[0]
    if (row && !featuredValues.has(row.option.value) && featured.length < limit) {
      featured.push(row)
      featuredValues.add(row.option.value)
    }
  }

  const providerRows = new Map<string, FlatModelMenuRow<T>[]>()
  for (const block of blocks) {
    const rows = providerRows.get(block.service) || []
    if (block.second && !featuredValues.has(block.second.option.value)) rows.push(block.second)
    providerRows.set(block.service, rows)
  }
  const leadingValues = new Set([...featuredValues, ...[...providerRows.values()].flat().map(row => row.option.value)])
  for (const block of blocks) {
    const rows = providerRows.get(block.service) || []
    for (const generationRows of block.rowsByGeneration) for (const row of generationRows) {
      if (!leadingValues.has(row.option.value)) {
        rows.push(row)
        leadingValues.add(row.option.value)
      }
    }
    providerRows.set(block.service, rows)
  }

  const allGroups = policy.groupByProvider
    ? [...providerRows.entries()].filter(([, rows]) => rows.length).map(([label, rows]) => ({ label, rows }))
    : [{ label: '', rows: [...providerRows.values()].flat() }]
  const all = allGroups.flatMap(group => group.rows)
  return { featured, all, rows: [...featured, ...all], allGroups }
}

export type PrimaryModelMode = 'text' | 'reference'
export type PrimaryModelRoutes<T> = Partial<Record<PrimaryModelMode, T>>
export type PrimaryModelMenuRow<T extends ModelMenuOption> = FlatModelMenuRow<T> & { modelKey: string; routes: PrimaryModelRoutes<T> }

const normalizeMode = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

/** Classify declared catalog mode metadata only; endpoint IDs are never parsed. */
export function modelMenuMode(valueOrOption: string | ModelMenuOption | undefined): PrimaryModelMode | undefined {
  const declared = typeof valueOrOption === 'string' ? valueOrOption : valueOrOption?.catalog?.mode
  if (!declared) return undefined
  const mode = normalizeMode(declared).replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (/^(?:reference(?:s)?|reference(?:s)? to video)$/.test(mode) || mode === 'image' || mode === 'image to video') return 'reference'
  if (/^text(?: to (?:video|image))?$/.test(mode)) return 'text'
  return undefined
}

function candidatesOf<T extends ModelMenuOption>(providers: readonly ModelMenuProvider<T>[]) {
  const candidates: { option: T; release: ModelMenuRelease<T> }[] = []
  for (const provider of providers) for (const release of provider.releases) for (const option of release.options) {
    if (!option.disabled) candidates.push({ option, release })
  }
  return candidates
}

/**
 * Compatibility projection for callers that still consume primary-model row
 * metadata. Rows remain direct endpoints; mode metadata never merges routes.
 */
export function primaryModelCatalogMenu<T extends ModelMenuOption>(
  providers: readonly ModelMenuProvider<T>[], selectedValue: string, _mode: PrimaryModelMode = 'text', featuredCount = 5,
) {
  const menu = flatModelCatalogMenu(providers, selectedValue, featuredCount)
  const cache = new Map<string, PrimaryModelMenuRow<T>>()
  const convert = (row: FlatModelMenuRow<T>) => {
    let mapped = cache.get(row.option.value)
    if (!mapped) {
      const mode = modelMenuMode(row.option)
      mapped = { ...row, modelKey: row.option.value, routes: mode ? { [mode]: row.option } : {} }
      cache.set(row.option.value, mapped)
    }
    return mapped
  }
  return { featured: menu.featured.map(convert), all: menu.all.map(convert), rows: menu.rows.map(convert) }
}

/** Exact mode routes for a specific host and exact declared model release. */
export function primaryModelModeOptions<T extends ModelMenuOption>(
  providers: readonly ModelMenuProvider<T>[], selectedValue: string,
): PrimaryModelRoutes<T> {
  const candidates = candidatesOf(providers)
  const selected = candidates.find(candidate => candidate.option.value === selectedValue)
  if (!selected) return {}
  const service = selected.option.catalog?.service || selected.release.service
  const exactRelease = selected.option.catalog?.release || selected.release.label
  const siblings = candidates.filter(candidate =>
    (candidate.option.catalog?.service || candidate.release.service) === service
    && candidate.release.company.toLowerCase() === selected.release.company.toLowerCase()
    && (candidate.option.catalog?.release || candidate.release.label) === exactRelease)
  const routes: PrimaryModelRoutes<T> = {}
  for (const candidate of siblings) {
    const mode = modelMenuMode(candidate.option)
    if (mode && !routes[mode]) routes[mode] = candidate.option
  }
  const selectedMode = modelMenuMode(selected.option)
  if (selectedMode) routes[selectedMode] = selected.option
  return routes
}

export type PrimaryImageMenuRow<T extends ModelMenuOption> = FlatModelMenuRow<T> & {
  modelKey: string
  routes: Readonly<Record<string, T>>
}

/** Image catalogs also keep one selectable row for every exact provider route. */
export function primaryImageCatalogMenu<T extends ModelMenuOption>(
  providers: readonly ModelMenuProvider<T>[], selectedValue: string, featuredCount = 5,
) {
  const menu = flatModelCatalogMenu(providers, selectedValue, featuredCount)
  const cache = new Map<string, PrimaryImageMenuRow<T>>()
  const convert = (row: FlatModelMenuRow<T>) => {
    let mapped = cache.get(row.option.value)
    if (!mapped) {
      const mode = normalizeMode(row.option.catalog?.mode || '')
      mapped = { ...row, modelKey: row.option.value, routes: mode ? { [mode]: row.option } : {} }
      cache.set(row.option.value, mapped)
    }
    return mapped
  }
  return { featured: menu.featured.map(convert), all: menu.all.map(convert), rows: menu.rows.map(convert) }
}
