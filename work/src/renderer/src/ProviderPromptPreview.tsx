import { Check, ChevronDown, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { GenerationRequest } from '../../shared/types'
import { klingStoryboardPrompts, providerPromptPreviewCompilation } from '../../shared/referenceInstructions'
import { redactBuiltInStylePrompts } from '../../shared/stylePresets'

export interface ProviderPromptEntry {
  label: string
  body: string
  duration?: string
  droppedBlocks?: string[]
}

export function promptWeight(entries: ProviderPromptEntry[]): { characters: number; estimatedTokens: number } {
  const characters = entries.reduce((total, entry) => total + entry.body.length, 0)
  return { characters, estimatedTokens: Math.ceil(characters / 4) }
}

export function composedProviderPromptEntries(request: GenerationRequest | null, inspectionError: string | null): ProviderPromptEntry[] {
  if (inspectionError) return [{ label: 'Request issue', body: inspectionError }]
  if (!request) return [{ label: 'Preview unavailable', body: 'A provider request could not be assembled for this node.' }]
  try {
    if (request.multiPrompt?.length) {
      return (klingStoryboardPrompts(request) || []).map((shot, index) => ({
        label: `Shot ${index + 1}`,
        body: redactBuiltInStylePrompts(shot.prompt, request.builtInStylePrompts),
        duration: shot.duration,
      }))
    }
    const compilation = providerPromptPreviewCompilation(request)
    return [{ label: 'Provider prompt', body: redactBuiltInStylePrompts(compilation.text, request.builtInStylePrompts), droppedBlocks: compilation.droppedBlocks }]
  } catch (error) {
    return [{ label: 'Preview unavailable', body: error instanceof Error ? error.message : String(error) }]
  }
}

export function ProviderPromptPreview({ request, inspectionError, defaultExpanded = false }: {
  request: GenerationRequest | null
  inspectionError: string | null
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)
  const entries = useMemo(() => composedProviderPromptEntries(request, inspectionError), [inspectionError, request])
  const weight = useMemo(() => promptWeight(entries), [entries])
  const copyText = entries.map((entry) => `${entry.label}${entry.duration ? ` · ${entry.duration}s` : ''}\n${entry.body}`).join('\n\n')
  const copyPreview = async () => {
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return <section className="provider-prompt-preview">
    <div className="provider-prompt-preview-header">
      <button className="provider-prompt-preview-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
        <ChevronDown size={14} aria-hidden="true" />
        <span>Composed Provider Prompt</span>
        <small>{entries.length > 1 ? `${entries.length} shots · ` : ''}{weight.characters.toLocaleString()} chars · ~{weight.estimatedTokens.toLocaleString()} tokens</small>
      </button>
      <button className="provider-prompt-preview-copy" type="button" onClick={() => void copyPreview()} aria-label="Copy composed provider prompt">
        {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
    {expanded && <div className="provider-prompt-preview-body">
      {entries.map((entry, index) => <article key={`${entry.label}-${index}`}>
        <header><strong>{entry.label}</strong>{entry.duration && <span>{entry.duration}s</span>}</header>
        {!!entry.droppedBlocks?.length && <p className="provider-prompt-preview-dropped">Prompt budget omitted: {entry.droppedBlocks.join(', ')}</p>}
        <pre>{entry.body}</pre>
      </article>)}
    </div>}
  </section>
}
