import { useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, type Node } from '@xyflow/react'
import { NodeCard, NodeRuntimeContext } from '../renderer/src/NodeCardNext'
import type { StudioNodeData } from '../shared/types'

type CameraObjectData = StudioNodeData & {
  cameraObjectSurface: true
  semanticEditorOpen: true
}

type Props = {
  busy: boolean
  initialPrompt?: string
  onCancel(): void
  onCommit(input: { prompt: string; reference?: File }): void
}

const noop = () => undefined

/**
 * The camera surface is an adapter around the real semantic NodeCard owner.
 * It deliberately owns only the isolated tester's draft/commit boundary; all
 * prompt, model, readiness, lifecycle and save controls remain NodeCard UI.
 */
export function CameraObjectCreationOwner({ busy, initialPrompt = '', onCancel, onCommit }: Props) {
  const [data, setData] = useState<CameraObjectData>(() => ({
    kind: 'element',
    title: 'Object',
    prompt: initialPrompt,
    assetGenerationPrompt: initialPrompt,
    semanticEditorOpen: true,
    cameraObjectSurface: true,
    referenceAssets: [],
    generatedResults: [],
    imageProvider: 'fal',
    imageModelId: 'fal-ai/nano-banana-pro/edit',
    outputFormat: 'png',
    imageResolution: '1K',
    quantity: 1,
    runState: busy ? 'running' : 'idle',
  } as CameraObjectData))
  const node = useMemo<Node>(() => ({ id: 'camera-object-creation-owner', type: 'camera-object', position: { x: 0, y: 0 }, style: { width: 315 }, data }), [data])
  const runtime = useMemo(() => {
    const updateNode = (_id: string, patch: Partial<StudioNodeData>) => {
      if (patch.semanticEditorOpen === false) onCancel()
      setData((current) => ({ ...current, ...patch } as CameraObjectData))
    }
    const runNode = () => {
      const prompt = (data.assetGenerationPrompt || data.prompt || '').trim()
      if (!busy && prompt) onCommit({ prompt })
    }
    return new Proxy({
      updateNode,
      updatePrompt: (_id: string, prompt: string) => updateNode(_id, { prompt, assetGenerationPrompt: prompt }),
      runNode,
      stopNode: noop,
      runFromNode: noop,
      importAsset: noop,
      importDroppedAssets: noop,
      importCanvasAssetIntoView: noop,
      completeElementSet: noop,
      completeCharacterSet: noop,
      saveSemanticAsset: noop,
      commitSemanticAssetResult: noop,
      saveCharacterAsset: noop,
      buildStylePrompt: noop,
      saveStylePreset: noop,
      inspectAssetBatch: async () => [],
      chooseAssetBatch: async () => [],
      saveAssetBatchRow: async () => undefined,
      renameNodeAsset: noop,
      nodeMediaLinkState: () => undefined,
      findOfflineAsset: noop,
      openGeneratedMedia: noop,
      revealGeneratedMedia: noop,
      copyGeneratedMedia: noop,
      setGeneratedMediaFavorite: noop,
      generatedMediaFavorite: () => false,
      trashGeneratedMedia: noop,
      openQuickConnect: noop,
      openInputQuickConnect: noop,
      inspectPort: noop,
      connectedReferenceTags: () => [],
      connectedInputRules: () => [],
      connectedInputMedia: () => undefined,
      connectedStoryboardVideoFamily: () => undefined,
      connectedStoryboardVideo: () => undefined,
      setInputFidelity: noop,
      openInspector: noop,
      resetNodeSettings: noop,
      duplicateNode: noop,
      deleteNode: noop,
      focusNode: noop,
      copyNodeLink: noop,
      importStoryboardPanel: noop,
      openStyleChooser: noop,
      rewriteStoryboardPanel: noop,
      availableModels: () => [],
      modelAvailabilityVerified: () => true,
      runAssistantNode: noop,
      estimateNode: async () => null,
      providerAccount: () => undefined,
      providerConnected: () => true,
      runReadiness: () => ({ disabled: busy || !(data.assetGenerationPrompt || data.prompt || '').trim(), tooltip: busy ? 'Creating preview…' : 'Ready' }),
      openConnections: noop,
      characterLibrary: [],
      selectCharacter: noop,
      semanticLibraries: { element: [], location: [], wardrobe: [], 'style-reference': [] },
      selectSemanticAsset: noop,
      setReusableFavorite: noop,
      exportReusableAsset: noop,
      deleteReusableAsset: noop,
      saveStoryboard: noop,
      listBatchState: () => ({ sourceCount: 0, adjustable: false }),
      adjustListBatchQuantity: noop,
    }, { get(target, key) { return key in target ? target[key as keyof typeof target] : noop } })
  }, [busy, data, onCancel, onCommit])

  return <div className="camera3d-object-create-owner" data-camera-object-owner="NodeCard">
    <NodeRuntimeContext.Provider value={runtime as never}>
      <ReactFlowProvider>
        <ReactFlow nodes={[node]} edges={[]} nodeTypes={{ 'camera-object': NodeCard }} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} />
      </ReactFlowProvider>
    </NodeRuntimeContext.Provider>
  </div>
}
