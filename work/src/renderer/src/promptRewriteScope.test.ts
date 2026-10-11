import {describe,expect,it,vi}from'vitest'
import type{StudioNode}from'../../shared/types'
import{PromptRewriteScope,type PromptGraphSnapshot}from'./promptRewriteScope'
function fixture(){
  const node=(id:string,prompt:string)=>({id,type:'studio',position:{x:0,y:0},data:{kind:'prompt',title:id,prompt}}as StudioNode)
  const graph:PromptGraphSnapshot={project:'project-a',canvas:'canvas-a',page:'page-a',nodes:[node('target','Original'),node('source','Connected reference'),node('other','Other prompt')],edges:[{id:'input',source:'source',target:'target',sourceHandle:'text-out',targetHandle:'text-in'}]}
  const cancel=vi.fn(async()=>true),scope=new PromptRewriteScope(()=>graph,cancel,()=> 'request-11111111111111')
  return{graph,scope,cancel}
}
describe('late prompt reply ownership',()=>{
  it('allows only the owned busy state to reset after an authored edit, without resetting a new request or page',()=>{
    const f=fixture(),request=f.scope.begin('target','anthropic');f.graph.nodes[0].data.prompt='New authored text'
    expect(request.current()).toBe(false);expect(request.canReset()).toBe(true);request.finish();expect(request.canReset()).toBe(true)
    f.scope.begin('target','anthropic');expect(request.canReset()).toBe(false)
    const g=fixture(),other=g.scope.begin('target','anthropic');g.graph.page='other';expect(other.canReset()).toBe(false)
  })
  it('finished queued updates are rejected after provider invalidation or a newer request',()=>{
    const f=fixture(),old=f.scope.begin('target','anthropic');old.finish();expect(old.canApply(f.graph.nodes)).toBe(true)
    f.scope.invalidate('anthropic');expect(old.canApply(f.graph.nodes)).toBe(false)
    const g=fixture(),first=g.scope.begin('target','anthropic');first.finish();const newer=g.scope.begin('target','anthropic');newer.finish()
    expect(first.canApply(g.graph.nodes)).toBe(false);expect(newer.canApply(g.graph.nodes)).toBe(true)
    g.scope.invalidate();expect(newer.canApply(g.graph.nodes)).toBe(false)
  })
  it('retains ownership through progress/position updates and unrelated edits',()=>{
    const f=fixture(),request=f.scope.begin('target','anthropic');f.graph.nodes[0].data.runState='running';f.graph.nodes[0].data.progress='Revamping';f.graph.nodes[0].position.x=200;f.graph.nodes[2].data.prompt='An unrelated new draft'
    expect(request.current()).toBe(true);request.finish();expect(request.current()).toBe(false)
  })
  it.each(['project','canvas','page']as const)('invalidates a changed %s without applying text',field=>{
    const f=fixture(),request=f.scope.begin('target','anthropic');f.graph[field]='other';expect(()=>request.assertCurrent()).toThrow('discarded')
  })
  it('protects edits to the target and every connected ancestor',()=>{
    for(const index of[0,1]){const f=fixture(),r=f.scope.begin('target','anthropic');f.graph.nodes[index].data.prompt='New authored text';expect(r.current()).toBe(false)}
  })
  it('protects panel locks and selected model from a late batch response',()=>{
    const f=fixture();f.graph.nodes[0].data.storyboardPanels=[{id:'panel',prompt:'Panel',locked:false}as any];const r=f.scope.begin('target','anthropic');f.graph.nodes[0].data.storyboardPanels[0].locked=true;expect(r.current()).toBe(false)
    const g=fixture(),s=g.scope.begin('target','anthropic');g.graph.nodes[0].data.assistantModelId='another';expect(s.current()).toBe(false)
  })
  it('protects topology changes including a replaced input',()=>{
    const f=fixture(),r=f.scope.begin('target','anthropic');f.graph.edges[0].source='other';expect(r.current()).toBe(false)
  })
  it('rejects duplicate clicks before a second paid request can begin',()=>{
    const f=fixture();f.scope.begin('target','anthropic');expect(()=>f.scope.begin('target','anthropic')).toThrow('already');expect(f.cancel).not.toHaveBeenCalled()
  })
  it('cancels only the selected provider and invalidates its output immediately',()=>{
    const f=fixture(),a=f.scope.begin('target','anthropic'),b=f.scope.begin('other','openai');expect(f.scope.invalidate('anthropic')).toEqual(['target']);expect(a.current()).toBe(false);expect(b.current()).toBe(true);expect(f.cancel).toHaveBeenCalledTimes(1)
  })
  it('cancelled or removed targets cannot accept a response',()=>{
    const f=fixture(),r=f.scope.begin('target','anthropic');expect(f.scope.cancel('target')).toBe(true);expect(r.current()).toBe(false);expect(f.scope.cancel('target')).toBe(false)
    const g=fixture(),s=g.scope.begin('target','anthropic');g.graph.nodes=g.graph.nodes.filter(n=>n.id!=='target');expect(()=>s.assertCurrent()).toThrow('no longer exists')
  })
})
