export interface SelectorSearchOption {
  value: string
  label: string
  group?: string
  aliases?: readonly string[]
  disabled?: boolean
}

export interface SelectorSearchKeyInput {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

export function normalizeSelectorSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function orderedWordPrefix(words: string[], query: string[]): boolean {
  let cursor = 0
  for (const needle of query) {
    const found = words.findIndex((word, index) => index >= cursor && word.startsWith(needle))
    if (found < 0) return false
    cursor = found + 1
  }
  return true
}

function orderedContains(text: string, query: string[]): boolean {
  let cursor = 0
  for (const needle of query) {
    const found = text.indexOf(needle, cursor)
    if (found < 0) return false
    cursor = found + needle.length
  }
  return true
}

function rank(option: SelectorSearchOption, queryText: string, queryWords: string[]): number | null {
  const label = normalizeSelectorSearchText(option.label)
  const labelWords = label.split(' ').filter(Boolean)
  const group = normalizeSelectorSearchText(option.group || '')
  const aliases = normalizeSelectorSearchText((option.aliases || []).join(' '))
  const value = normalizeSelectorSearchText(option.value)
  const searchableOptionText = `${label} ${aliases} ${value}`.trim()
  const combined = `${label} ${group} ${aliases} ${value}`.trim()
  if (!queryWords.every((word) => combined.includes(word))) return null
  if (!queryWords.some((word) => searchableOptionText.includes(word))) return null
  if (label === queryText) return 0
  if (label.startsWith(queryText)) return 1
  if (orderedWordPrefix(labelWords, queryWords)) return 2
  if (orderedContains(label, queryWords)) return 3
  const groupAliases = `${label} ${group} ${aliases}`
  if (queryWords.every((word) => groupAliases.includes(word))) return 4
  return 5
}

export function filterAndRankSelectorOptions<T extends SelectorSearchOption>(options: readonly T[], query: string): T[] {
  const normalized = normalizeSelectorSearchText(query)
  if (!normalized) return [...options]
  const words = normalized.split(' ')
  return options
    .map((option, index) => ({ option, index, rank: rank(option, normalized, words) }))
    .filter((entry): entry is { option: T; index: number; rank: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.option)
}

export function selectorSearchKeyAction(input: SelectorSearchKeyInput): { activate: boolean; firstCharacter: string } {
  const printable = input.key.length === 1 && !input.metaKey && !input.ctrlKey && !input.altKey && input.key.trim().length > 0
  return { activate: printable, firstCharacter: printable ? input.key : '' }
}

const openSelectorIds = new Set<string>()

function reflectOpenState(): void {
  if (typeof document === 'undefined') return
  if (openSelectorIds.size) document.documentElement.dataset.selectorOpen = 'true'
  else delete document.documentElement.dataset.selectorOpen
}

export function setSelectorPortalOpen(id: string, open: boolean): void {
  if (open) openSelectorIds.add(id)
  else openSelectorIds.delete(id)
  reflectOpenState()
}

export function appShortcutsSuppressed(): boolean {
  return openSelectorIds.size > 0 || typeof document !== 'undefined' && document.documentElement.dataset.selectorOpen === 'true'
}
