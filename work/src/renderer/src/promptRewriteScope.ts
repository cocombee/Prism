import type { AssistantProvider } from '../../shared/assistantModels'
import type { StudioNode } from '../../shared/types'
import type { Edge } from '@xyflow/react'

export interface PromptGraphSnapshot { project: string; canvas: string; page: string; nodes: StudioNode[]; edges: Edge[] }
function stamp(graph: PromptGraphSnapshot, nodeId: string): string {
  const included = new Set([nodeId])
  for (let changed = true; changed;) {
    changed = false
    for (const edge of graph.edges) if (included.has(edge.target) && !included.has(edge.source)) { included.add(edge.source); changed = true }
  }
  const target = graph.nodes.find(node => node.id === nodeId)
  if (!target) throw new DOMException('The prompt node no longer exists.', 'AbortError')
  return JSON.stringify([graph.project,graph.canvas,graph.page,
    graph.nodes.filter(node=>included.has(node.id)).map(node=>{const {runState,progress,error,notificationVersion,...data}=node.data;return [node.id,data]}),
    graph.edges.filter(edge=>included.has(edge.target)).map(edge=>[edge.id,edge.source,edge.target,edge.sourceHandle,edge.targetHandle]),
  ])
}

/** Prevents completed text from replacing newer authored/connected context in every Revamp caller. */
export class PromptRewriteScope {
  private readonly pending = new Map<string,{id:string;provider:AssistantProvider;invalidated:boolean;generation:number}>()
  private generation=0
  private epoch=0
  private readonly providerEpoch=new Map<AssistantProvider,number>()
  private readonly latest=new Map<string,number>()
  constructor(private readonly graph:()=>PromptGraphSnapshot, private readonly cancelRequest:(id:string)=>Promise<unknown>, private readonly createId:()=>string) {}
  begin(nodeId:string,provider:AssistantProvider) {
    if(this.pending.has(nodeId))throw new Error('This node already has a Revamp request running.')
    const origin=this.graph(),before=stamp(origin,nodeId),id=this.createId(),owner={id,provider,invalidated:false,generation:++this.generation},epoch=this.epoch,providerEpoch=this.providerEpoch.get(provider)||0
    const {project,canvas,page}=origin
    this.pending.set(nodeId,owner);this.latest.set(nodeId,owner.generation)
    const current=()=>this.pending.get(nodeId)===owner&&stamp(this.graph(),nodeId)===before
    const canReset=()=>{
      const active=this.pending.get(nodeId)
      if(owner.invalidated||active&&active!==owner||this.latest.get(nodeId)!==owner.generation||this.epoch!==epoch||(this.providerEpoch.get(provider)||0)!==providerEpoch)return false
      const graph=this.graph()
      return graph.project===project&&graph.canvas===canvas&&graph.page===page
    }
    const canApply=(nodes:StudioNode[])=>{
      if(!canReset())return false
      try{return stamp({...this.graph(),nodes},nodeId)===before}catch{return false}
    }
    return {requestId:id,current,canApply,canReset,assertCurrent:()=>{if(!current())throw new DOMException('The prompt or its connected context changed. Its rewrite was discarded.','AbortError')},finish:()=>{if(this.pending.get(nodeId)===owner)this.pending.delete(nodeId)}}
  }
  cancel(nodeId:string):boolean {
    const pending=this.pending.get(nodeId)
    if(!pending)return false
    pending.invalidated=true;this.pending.delete(nodeId)
    void this.cancelRequest(pending.id).catch(()=>undefined)
    return true
  }
  invalidate(provider?:AssistantProvider):string[] {
    if(provider)this.providerEpoch.set(provider,(this.providerEpoch.get(provider)||0)+1)
    else{this.epoch+=1;this.latest.clear()}
    const cancelled:string[]=[]
    for(const [nodeId,pending]of this.pending)if(!provider||pending.provider===provider){cancelled.push(nodeId);this.cancel(nodeId)}
    return cancelled
  }
}
