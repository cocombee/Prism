import { readFile, stat } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ImportedAsset, SemanticAssetCommitRequest, SemanticAssetCommitResult, StudioNodeData, WorkflowDocument } from '../shared/types'
import { commitSemanticAssetSave } from './semanticAssetSaveTransaction'

interface IpcRegistrar { handle(channel: string, handler: (event: unknown, request: unknown) => unknown): void }
interface SemanticAssetProjectContext { rootPath: string; workflowPath: string; assetsPath: string; projectDocumentPath?: string }
interface SemanticAssetIpcDependencies { currentProject(): SemanticAssetProjectContext | null }

function contained(path: string, root: string) {
  const rel = relative(resolve(root), resolve(path))
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..')
}
function nodesIn(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const own = Array.isArray(record.nodes) ? record.nodes.filter((node): node is Record<string, unknown> => Boolean(node && typeof node === 'object')) : []
  const nested = ['pages', 'canvases'].flatMap((key) => Array.isArray(record[key]) ? (record[key] as unknown[]).flatMap(nodesIn) : [])
  return [...own, ...nested]
}
function replaceNodeEverywhere<T>(value: T, nodeId: string, data: StudioNodeData): T {
  if (Array.isArray(value)) return value.map((item) => replaceNodeEverywhere(item, nodeId, data)) as T
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  if (record.id === nodeId && record.data && typeof record.data === 'object') return { ...record, data } as T
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, replaceNodeEverywhere(item, nodeId, data)])) as T
}
function safeName(value: string) { return value.replace(/^@+/, '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'asset' }
function categoryFolder(kind: string) {
  return kind === 'character' ? '01. Characters' : kind === 'element' ? '02. Elements' : kind === 'location' ? '03. Locations' : kind === 'style-reference' ? '04. Styles' : '04. Wardrobes'
}
function localUrl(path: string) { return `prism-asset://local/${encodeURIComponent(resolve(path))}` }
async function exists(path: string) { try { await stat(path); return true } catch { return false } }
async function createCanonicalPath(rootPath: string, kind: string, logicalName: string, extension: string) {
  const categoryRoot = join(rootPath, categoryFolder(kind))
  for (let suffix = 1; suffix < 10_000; suffix += 1) {
    const folderName = suffix === 1 ? logicalName : `${logicalName}-${suffix}`
    const candidate = join(categoryRoot, folderName, `${logicalName}${extension}`)
    if (!await exists(candidate)) return candidate
  }
  throw new Error('Could not allocate a collision-safe semantic asset path.')
}

export function registerSemanticAssetSaveIpc(ipc: IpcRegistrar, dependencies: SemanticAssetIpcDependencies) {
  ipc.handle('assets:commit-semantic-result', async (_event, rawRequest): Promise<SemanticAssetCommitResult> => {
    const context = dependencies.currentProject()
    if (!context) throw new Error('Choose or open a project folder first.')
    const request = rawRequest as Partial<SemanticAssetCommitRequest> | null
    if (!request || typeof request.nodeId !== 'string' || typeof request.selectedResultId !== 'string' || (request.intent?.mode !== 'create-new' && request.intent?.mode !== 'replace-existing')) throw new Error('Invalid semantic asset save request.')
    const intent = request.intent as SemanticAssetCommitRequest['intent']
    const workflow = JSON.parse(await readFile(context.workflowPath, 'utf8')) as WorkflowDocument
    const matches = nodesIn(workflow).filter((node) => node.id === request.nodeId)
    if (!matches.length) throw new Error('The semantic asset node is not active in this project.')
    const data = matches[0].data as StudioNodeData
    if (!['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(data.kind)) throw new Error('This node is not a generatable semantic asset.')
    const semanticKind = (data.kind === 'style-reference' ? 'style' : data.kind) as 'character' | 'element' | 'location' | 'wardrobe' | 'style'
    const generated = (data.generatedResults || []).filter((result) => result.path && result.url && result.type === 'image').map((result) => ({ id: result.id || `legacy-generated:${encodeURIComponent(result.path)}`, path: result.path }))
    const selected = generated.find((result) => result.id === request.selectedResultId)
    if (!selected) throw new Error('The selected result is not an active generated result for this semantic asset.')
    const otherSemanticPaths = new Set(nodesIn(workflow)
      .filter((node) => node.id !== request.nodeId && node.data && typeof node.data === 'object')
      .flatMap((node) => {
        const other = node.data as StudioNodeData
        if (!['character', 'element', 'location', 'wardrobe', 'style-reference'].includes(other.kind)) return []
        return [...(other.referenceAssets || []).map((asset) => asset.path), ...(other.generatedResults || []).map((result) => result.path)]
      })
      .filter(Boolean)
      .map((path) => resolve(path)))
    const referenceSourcePaths = (data.referenceAssets || []).map((asset) => asset.path).filter(Boolean)
    const protectedReferencePaths = new Set(referenceSourcePaths.map((path) => resolve(path)))
    if (generated.some((item) => otherSemanticPaths.has(resolve(item.path)) && !protectedReferencePaths.has(resolve(item.path)))) throw new Error('A generated result belongs to another semantic asset.')
    for (const item of generated) if (!contained(item.path, context.rootPath) && !(intent.mode === 'create-new' && protectedReferencePaths.has(resolve(item.path)))) throw new Error('A generated result is outside the active project managed root.')
    const assets = JSON.parse(await readFile(context.assetsPath, 'utf8')) as ImportedAsset[]
    const replacement = intent.mode === 'replace-existing'
      ? data.semanticReplacementAuthority?.targetAssetId === intent.targetAssetId && data.semanticReplacementAuthority.token === intent.token
        ? assets.find((asset) => asset.id === intent.targetAssetId)
        : undefined
      : undefined
    if (intent.mode === 'replace-existing' && !replacement) throw new Error('Edit replacement authority does not match the active target and token.')
    if (replacement && !(data.referenceAssets || []).some((asset) => asset.id === replacement.id && resolve(asset.path) === resolve(replacement.path))) throw new Error('Edit replacement authority does not match the selected saved asset.')
    const priorAsset = replacement
    const externalReferencePaths = referenceSourcePaths.filter((path) => !contained(path, context.rootPath))
    const logicalName = safeName(data.referenceTag || data.title)
    const extension = extname(selected.path).toLowerCase() || '.png'
    const canonicalPath = priorAsset?.path || await createCanonicalPath(context.rootPath, data.kind, logicalName, extension)
    const fileSize = (await stat(selected.path)).size
    const canonicalAsset: ImportedAsset = {
      id: priorAsset?.id || randomUUID(),
      name: `${logicalName}${extension}`,
      path: canonicalPath,
      url: localUrl(canonicalPath),
      mimeType: extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.webp' ? 'image/webp' : 'image/png',
      createdAt: priorAsset?.createdAt || new Date().toISOString(),
      category: semanticKind,
      origin: 'generated',
      fileSize,
      metadata: { assetName: logicalName, assetGenerationPrompt: data.assetGenerationPrompt ?? data.prompt, provider: data.imageProvider, modelId: data.imageModelId },
    }
    const deletableGeneratedPaths = new Set(generated.filter((item) => !protectedReferencePaths.has(resolve(item.path))).map((item) => item.path))
    const removedPaths = new Set([...(priorAsset ? [priorAsset.path] : []), ...deletableGeneratedPaths])
    const nextAssets = [canonicalAsset, ...assets.filter((asset) => !removedPaths.has(asset.path) && asset.id !== canonicalAsset.id)]
    const nextData: StudioNodeData = {
      ...data,
      referenceAssets: [canonicalAsset],
      outputPath: canonicalPath,
      outputUrl: canonicalAsset.url,
      outputType: 'image',
      generatedResults: undefined,
      activeResultIndex: undefined,
      semanticAssetLifecycle: { version: 1, status: 'SAVED_VIEW', references: [{ id: canonicalAsset.id, path: canonicalPath, url: canonicalAsset.url, source: 'saved', createdAt: canonicalAsset.createdAt }], selectedId: canonicalAsset.id },
      semanticReplacementAuthority: undefined,
      progress: 'Result saved.',
      error: undefined,
      characterEditorOpen: false,
      semanticEditorOpen: false,
    }
    const nextWorkflow = replaceNodeEverywhere(workflow, request.nodeId, nextData)
    const metadataWrites: Array<{ path: string; value: unknown }> = [{ path: context.assetsPath, value: nextAssets }, { path: context.workflowPath, value: nextWorkflow }]
    if (context.projectDocumentPath) {
      const projectDocument = JSON.parse(await readFile(context.projectDocumentPath, 'utf8')) as Record<string, unknown>
      metadataWrites.push({ path: context.projectDocumentPath, value: { ...projectDocument, workflow: replaceNodeEverywhere(projectDocument.workflow || nextWorkflow, request.nodeId, nextData), assets: nextAssets } })
    }
    await commitSemanticAssetSave({
      transactionId: randomUUID(), intent, managedRoot: context.rootPath, assetRoot: context.rootPath, assetId: canonicalAsset.id,
      selected, priorSaved: priorAsset ? { id: priorAsset.id, path: priorAsset.path } : undefined, generated,
      externalReferencePaths, referenceSourcePaths, canonicalPath, metadataWrites,
    })
    return { asset: canonicalAsset, deletedGeneratedResultIds: generated.filter((item) => item.id !== selected.id).map((item) => item.id) }
  })
}
