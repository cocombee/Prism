import { useRef, useState, type DragEvent } from 'react'
import { Box, ImagePlus, WandSparkles, X } from 'lucide-react'
import { TaggedPromptTextarea } from '../renderer/src/TaggedPromptTextarea'

export type ObjectPromptTool = 'Describe This Object' | 'Ask About Object' | 'Create Similar Object' | 'Use As Reference' | 'Tutorial'
const TOOL_COPY: Record<ObjectPromptTool, { placeholder:string; terminal:string }> = {
  'Describe This Object': { placeholder:'Describe the selected Object…', terminal:'Send Description' },
  'Ask About Object': { placeholder:'Ask a question about the selected Object…', terminal:'Send Question' },
  'Create Similar Object': { placeholder:'Describe the similar Object to create…', terminal:'Send Object' },
  'Use As Reference': { placeholder:'Describe the 3D object to create…', terminal:'Send Object' },
  Tutorial: { placeholder:'Describe what you want to learn about this Object…', terminal:'Send Tutorial' },
}
export function StructuredObjectCreatePanel({ tool, busy, connected, error, onCancel, onCreate, onRevamp, onOpenConnections }: {
  tool?: ObjectPromptTool
  busy: boolean
  connected: boolean
  error?: string
  onCancel(): void
  onCreate(input:{prompt:string;reference?:File}): void
  onRevamp(input:{prompt:string;reference?:File}): string | void | Promise<string | void>
  onOpenConnections?(): void
}) {
  const [prompt,setPrompt]=useState('')
  const [reference,setReference]=useState<File|undefined>()
  const input=useRef<HTMLInputElement>(null)
  const ready=connected && !busy && Boolean(prompt.trim())
  const accept=(files:FileList|null)=>{const file=files?.[0];if(file?.type.startsWith('image/'))setReference(file)}
  const drop=(event:DragEvent)=>{event.preventDefault();accept(event.dataTransfer.files)}
  const copy=tool?TOOL_COPY[tool]:{placeholder:'Describe the 3D object to create…',terminal:'Send Object'}
  return <section className="camera3d-object-create semantic-editor-shell" aria-label={tool||'3D Object creation'}>
    <header className="style-create-panel-head"><Box size={14}/><div><strong>3D Object</strong><small>{busy?'Creating…':connected?'Ready':'Connection required'}</small></div><button type="button" aria-label="Cancel Object creation" onClick={onCancel} disabled={busy}><X size={13}/></button></header>
    <div className="camera3d-object-create-body">
      <h3>Custom 3D Object</h3>
      <button type="button" className="asset-intake-surface" onClick={()=>input.current?.click()} onDragOver={(event)=>event.preventDefault()} onDrop={drop}>
        <input ref={input} hidden type="file" accept="image/*" aria-label="Choose optional Object reference" onChange={(event)=>accept(event.target.files)}/>
        <span className="asset-intake-placeholder"><ImagePlus size={18}/>{reference?reference.name:'Optional Reference'}</span>
      </button>
      <div className="camera3d-object-prompt-wrap">
        <TaggedPromptTextarea autoFocus className="style-prompt-inline" value={prompt} connectedTags={[]} placeholder={copy.placeholder} disabled={busy} onValueChange={setPrompt}/>
        <div className="storyboard-control-reveal-zone"><div className="storyboard-prompt-actions"><button type="button" className="storyboard-shot-action" data-icon="WandSparkles" aria-label="Revamp Object" data-tooltip="Revamp Object" disabled={!ready} onClick={()=>void Promise.resolve(onRevamp({prompt:prompt.trim(),reference})).then(value=>{if(typeof value==='string')setPrompt(value)})}><WandSparkles size={11}/></button></div></div>
      </div>
      {error&&<p className="camera3d-object-create-error" role="alert">{error}</p>}
      {!connected&&<button type="button" className="camera3d-open-connections" onClick={onOpenConnections}>Open Connections</button>}
      <footer className="camera3d-object-create-actions"><button type="button" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="camera3d-object-create-terminal" disabled={!ready} onClick={()=>onCreate({prompt:prompt.trim(),reference})}>{copy.terminal}</button></footer>
    </div>
  </section>
}
