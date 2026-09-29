export interface PromptTagRange {
  start: number
  end: number
  text: string
  active: boolean
}

export interface PromptTagQuery {
  start: number
  end: number
  query: string
}

const TAG_PATTERN = /@[\p{L}\p{N}_-]+/gu
const TAG_QUERY_PATTERN = /(?:^|[^\p{L}\p{N}_-])(@[\p{L}\p{N}_-]*)$/u

export function uniquePromptTags(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags.flatMap((raw) => {
    const tag = raw.trim().replace(/^@*/, '@')
    if (tag === '@' || !/^@[\p{L}\p{N}_-]+$/u.test(tag)) return []
    const key = tag.toLocaleLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [tag]
  })
}

export function promptTagRanges(text: string, connectedTags: string[]): PromptTagRange[] {
  const active = new Set(uniquePromptTags(connectedTags).map((tag) => tag.toLocaleLowerCase()))
  return [...text.matchAll(TAG_PATTERN)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0],
    active: active.has(match[0].toLocaleLowerCase()),
  }))
}

export function promptTagTokens(text: string): string[] {
  return uniquePromptTags([...text.matchAll(TAG_PATTERN)].map((match) => match[0]))
}

export function sourcePromptTags(data: Pick<StudioNodeData, 'title' | 'referenceAssets'> & Partial<Pick<StudioNodeData, 'kind' | 'referenceTag' | 'generatedResults' | 'activeResultIndex'>>): string[] {
  if (data.generatedResults?.length && data.kind && !['character', 'location', 'element', 'style-reference'].includes(data.kind)) {
    return uniquePromptTags([workflowTag(data, 'asset')])
  }
  return uniquePromptTags([
    workflowTag(data, 'asset'),
    data.title ? workflowTag({ title: data.title }, 'asset') : '',
    ...(data.referenceAssets || []).map((asset) => asset.metadata?.assetName ? `@${normalizeLogicalAssetName(asset.metadata.assetName)}` : ''),
  ])
}

export function promptTagQueryAtCaret(text: string, caret: number): PromptTagQuery | null {
  const safeCaret = Math.max(0, Math.min(text.length, caret))
  const match = text.slice(0, safeCaret).match(TAG_QUERY_PATTERN)
  if (!match) return null
  return { start: safeCaret - match[1].length, end: safeCaret, query: match[1] }
}

export function promptTagSuggestions(text: string, caret: number, connectedTags: string[]): string[] {
  const query = promptTagQueryAtCaret(text, caret)
  if (!query) return []
  const needle = query.query.toLocaleLowerCase()
  return uniquePromptTags(connectedTags).filter((tag) => tag.toLocaleLowerCase().startsWith(needle) && tag.toLocaleLowerCase() !== needle)
}

export function completePromptTag(text: string, caret: number, tag: string): { text: string; caret: number } {
  const canonical = uniquePromptTags([tag])[0]
  if (!canonical) return { text, caret }
  const query = promptTagQueryAtCaret(text, caret)
  const start = query?.start ?? Math.max(0, Math.min(text.length, caret))
  const end = query?.end ?? start
  const needsSpace = end >= text.length || !/\s/u.test(text[end])
  const insertion = `${canonical}${needsSpace ? ' ' : ''}`
  return { text: `${text.slice(0, start)}${insertion}${text.slice(end)}`, caret: start + insertion.length }
}
import type { StudioNodeData } from './types'
import { normalizeLogicalAssetName } from './assetNaming'
import { workflowTag } from './inputRules'
