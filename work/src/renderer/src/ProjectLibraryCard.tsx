import { PencilLine, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ProjectWorkspace } from '../../shared/types'

interface ProjectLibraryCardProps {
  item: ProjectWorkspace
  onOpen: () => void
  onRenamed: (updated: ProjectWorkspace) => void
  onRequestForget: () => void
  onError: (message: string) => void
  icon: React.ReactNode
}

function projectDocumentStem(item: ProjectWorkspace) {
  const basename = item.documentPath?.split(/[\\/]/).at(-1)
  return (basename || `${item.name}.prismflow`).replace(/\.prismflow$/i, '')
}

export function ProjectLibraryCard({ item, onOpen, onRenamed, onRequestForget, onError, icon }: ProjectLibraryCardProps) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(() => projectDocumentStem(item))
  const cancelRename = useRef(false)
  const commitRename = async () => {
    const name = draft.replace(/\.prismflow$/i, '').trim()
    if (!name) return
    try {
      const updated = await window.prism.projects.renameDocument(item.rootPath, name)
      onRenamed(updated)
      setDraft(projectDocumentStem(updated))
      setRenaming(false)
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    }
  }
  const beginRename = () => { cancelRename.current = false; setDraft(projectDocumentStem(item)); setRenaming(true) }
  return <article className="project-library-card-shell" role="button" tabIndex={0} aria-label={`Open ${item.name}`} onClick={(event) => { if (!(event.target as HTMLElement).closest('button, input')) onOpen() }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !renaming) onOpen() }}>
    <div className="project-library-preview">{icon}</div>
    <div className="project-library-hover-actions"><button className="is-danger" title="Remove Project From Prism" aria-label={`Remove ${item.name} from Prism`} onClick={(event) => { event.stopPropagation(); onRequestForget() }}><Trash2 size={14} /></button></div>
    <div className="project-library-title-row">
      {renaming ? <input autoFocus aria-label={`Rename ${item.name} project document`} value={draft} onFocus={(event) => event.currentTarget.select()} onClick={(event) => event.stopPropagation()} onBlur={() => { if (!cancelRename.current) void commitRename() }} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') void commitRename(); else if (event.key === 'Escape') { cancelRename.current = true; setDraft(projectDocumentStem(item)); setRenaming(false) } }} /> : <><strong>{item.name}</strong><button title="Rename Project Document" aria-label={`Rename ${item.name} project document`} onClick={(event) => { event.stopPropagation(); beginRename() }}><PencilLine size={13} /></button></>}
    </div>
    <time>Updated {new Date(item.updatedAt).toLocaleDateString()}</time>
  </article>
}
