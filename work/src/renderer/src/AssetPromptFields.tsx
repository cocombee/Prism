import type { ReactNode } from 'react'
import type { StudioNodeData } from '../../shared/types'
import { assetReferenceDescription, localAssetGenerationPrompt } from '../../shared/semanticAssetPromptBoundary'
import { TaggedPromptTextarea } from './TaggedPromptTextarea'
import { activeGeneratedResult } from '../../shared/generatedMedia'

const generationPlaceholders: Partial<Record<StudioNodeData['kind'], string>> = {
  character: 'Describe the character to create…', location: 'Describe the location to create…',
  wardrobe: 'Describe the wardrobe to create…', element: 'Describe the element to create…',
  'style-reference': 'Describe the visual style to create…',
}

export function showsAssetDescription(data: StudioNodeData, connectedToGenerator: boolean): boolean {
  const selected = activeGeneratedResult(data)
  if (selected && !selected.path && !selected.url) return false
  return connectedToGenerator && Boolean(data.referenceAssets?.some(asset => asset.path || asset.url) || data.assetUrl || data.assetPath || data.outputUrl || data.outputPath || data.generatedResults?.some(result => result.path || result.url))
}

/** Imported canvas media share the editable field without gaining generation controls. */
export function PlacedMediaDescription({ data, connectedToGenerator, children }: { data: StudioNodeData; connectedToGenerator: boolean; children: ReactNode }) {
  return showsAssetDescription(data, connectedToGenerator) ? children : null
}

export function AssetDescriptionField({ id, value, placeholder, readOnly, connectedTags, availableTags, onChange }: {
  id: string; value: string; placeholder: string; readOnly?: boolean
  connectedTags: string[]; availableTags: string[]; onChange: (value: string) => void
}) {
  return <section className="asset-reference-description nodrag" aria-label="Asset Description">
    <div className="asset-reference-description-header">
      <label className="adaptive-control-label" htmlFor={`asset-description-${id}`}><span>Description<span className="required-marker"> *</span></span></label>
    </div>
    <TaggedPromptTextarea id={`asset-description-${id}`} className="style-prompt-inline asset-reference-description-field" autoSize={false} aria-label="Asset Description" aria-required="true" required readOnly={readOnly} value={value} connectedTags={connectedTags} availableTags={availableTags} placeholder={placeholder} onValueChange={onChange} />
  </section>
}

export function AssetPromptFields({ id, data, connectedToGenerator, showPrompt, description = assetReferenceDescription(data), descriptionPlaceholder = 'Describe what this reference represents…', descriptionTags, connectedTags, availableTags, onDescriptionChange, onPromptChange, footer }: {
  id: string; data: StudioNodeData; editing: boolean; connectedToGenerator: boolean; showPrompt: boolean; description?: string; descriptionPlaceholder?: string
  descriptionTags?: string[]; connectedTags: string[]; availableTags: string[]
  onDescriptionChange: (value: string) => void; onPromptChange: (value: string) => void; footer?: ReactNode
}) {
  return <div className="asset-prompt-fields">
    {showsAssetDescription(data, connectedToGenerator) && <AssetDescriptionField id={id} value={description} placeholder={descriptionPlaceholder} connectedTags={descriptionTags || connectedTags} availableTags={descriptionTags || availableTags} onChange={onDescriptionChange} />}
    {showPrompt && <div className="asset-generation-prompt-area">
      <TaggedPromptTextarea className="node-prompt generator-prompt media-generator-prompt nodrag" aria-label="Generation Prompt" value={localAssetGenerationPrompt(data)} connectedTags={connectedTags} availableTags={availableTags} placeholder={generationPlaceholders[data.kind] || 'Describe the media to create…'} onValueChange={onPromptChange} />
    </div>}
    {footer}
  </div>
}
