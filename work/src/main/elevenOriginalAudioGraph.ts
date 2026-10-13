/** Main-owned main-only bridge. Never accepts a renderer path or URL as file authority. */
import type {Edge} from '@xyflow/react'
import type {StudioNode} from '../shared/types'
import {resolveWorkflowInput} from '../shared/workflowResolver'
import {readOriginalAudioSource,type MainAudioAsset,type MainAudioSourceContext} from './elevenOriginalAudioSource'

interface GraphSnapshot {nodeId:string;nodes:StudioNode[];edges:Edge[]}
export interface OriginalAudioGraphContext extends MainAudioSourceContext {
 /** Both callbacks read authoritative active-project state in main, not renderer DTOs. */
 getGraph():GraphSnapshot
 readAssets():Promise<MainAudioAsset[]>
}

function captureBinding(raw:GraphSnapshot):{path:string;route:string} {
 const graph=structuredClone(raw),target=graph.nodes.find(node=>node.id===graph.nodeId)
 if(!target||target.data.kind!=='voiceover')throw Error('The Voice Change owner is unavailable.')
 const inputs=graph.edges.filter(edge=>edge.target===graph.nodeId&&edge.targetHandle==='audio-in')
 if(inputs.length!==1)throw Error('Connect exactly one original-audio input before changing voice.')
 if(!graph.nodes.some(node=>node.id===inputs[0].source))throw Error('The connected original-audio source is unavailable.')
 const edges=graph.edges.filter(edge=>edge.target!==graph.nodeId||edge.targetHandle==='audio-in')
 const resolved=resolveWorkflowInput(graph.nodeId,graph.nodes,edges)
 if(resolved.references.some(reference=>reference.mediaType!=='audio'))throw Error('Original audio must resolve to audio only.')
 const paths=[...new Set(resolved.references.map(reference=>reference.path))]
 if(paths.length!==1||typeof paths[0]!=='string'||!paths[0])throw Error('Choose one current managed recording; audio collections cannot be selected implicitly.')
 return {path:paths[0],route:JSON.stringify(inputs.map(edge=>[edge.id,edge.source,edge.sourceHandle,edge.targetHandle]))}
}

export async function readGraphOriginalAudio(context:OriginalAudioGraphContext,signal?:AbortSignal){
 const check=()=>{signal?.throwIfAborted();context.assertCurrent()}
 check()
 const binding=captureBinding(context.getGraph()),assertBinding=()=>{
  check()
  const current=captureBinding(context.getGraph())
  if(current.path!==binding.path||current.route!==binding.route)throw Error('Original audio connection changed; resolve the current recording before submission.')
 }
 const path=await context.assertManagedPath(binding.path);assertBinding()
 // Capture registry identities before any further asynchronous path checks.
 const assets=structuredClone(await context.readAssets());assertBinding()
 const matches:MainAudioAsset[]=[]
 for(const asset of assets){
  if(asset.trashedAt||asset.category!=='audio'||!['imported','generated'].includes(asset.origin))continue
  let managed:string
  try{managed=await context.assertManagedPath(asset.path)}catch{check();continue}
  assertBinding()
  if(managed===path)matches.push(asset)
 }
 if(matches.length!==1)throw Error('Original audio must match exactly one current managed asset identity.')
 const original=await readOriginalAudioSource({...context,assertCurrent:assertBinding},matches[0].id,signal)
 assertBinding()
 if(await context.assertManagedPath(original.source.path)!==path)throw Error('Original audio asset no longer matches the connected recording.')
 assertBinding()
 return {...original,assertGraphCurrent:assertBinding,assertSourceCurrent:async()=>{assertBinding();await original.assertSourceCurrent();assertBinding()}}
}
