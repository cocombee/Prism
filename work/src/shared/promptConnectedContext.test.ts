import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode, StudioNodeData } from './types'
import { workflowTag } from './inputRules'
import { sharedPromptContext, sharedPromptRewriteInstruction, validateSharedPromptRewrite } from './promptConnectedContext'
import { promptTagRanges, promptTagSuggestions } from './promptTags'
const node = (id: string, data: Partial<StudioNodeData>): StudioNode => ({ id, type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'upload', title: id, ...data } } as StudioNode)
const edge = (source: string, target: string, targetHandle = 'reference-in', sourceHandle = 'media-out'): Edge => ({ id: `${source}-${target}`, source, target, sourceHandle, targetHandle })
function fixture() {
  const nodes = [node('prompt', {kind:'prompt',prompt:'Make the cat speak.'}),node('cat',{title:'Talking Cat',referenceTag:'@talking-cat',outputType:'image',assetPath:'/Users/private/cat.png',referenceDescription:'@talking-cat is the speaker.'}),node('video',{kind:'video-generator',videoEngine:'bytedance/seedance-2.5/reference-to-video'}),node('other',{referenceTag:'@other',outputType:'image'})]
  const edges = [edge('prompt','video','text-in','text-out'),edge('cat','video')]
  return {nodes,edges}
}
describe('shared downstream Prompt references',()=>{
  it('offers and highlights the exact sibling tag without creating a Prompt input',()=>{
    const f=fixture(),before=JSON.stringify(f),c=sharedPromptContext('prompt',f.nodes,f.edges)
    expect(c.tags).toEqual(['@talking-cat']);expect(c.assetIds).toEqual(['cat']);expect(c.consumerIds).toEqual(['video'])
    expect(promptTagSuggestions('@talk',5,c.tags)).toEqual(['@talking-cat'])
    expect(promptTagRanges('Make @talking-cat speak.',c.tags)[0].active).toBe(true)
    expect(JSON.stringify(f)).toBe(before)
    f.edges=f.edges.filter(e=>e.source!=='prompt');expect(sharedPromptContext('prompt',f.nodes,f.edges).tags).toEqual([])
  })
  it('finds assets through actual Router/List paths and nested typed owners, without wrapper tags',()=>{
    const f=fixture();f.nodes.push(node('route',{kind:'router',routeSignal:'text'}),node('images',{kind:'list',listSignal:'image'}),node('wardrobe',{kind:'wardrobe',referenceTag:'@hat'}),node('character',{kind:'character',referenceTag:'@hero'}))
    f.edges=[edge('prompt','route','input','text-out'),edge('route','video','text-in','output'),edge('cat','images','input'),edge('images','video','reference-in','mixed-out'),edge('wardrobe','character','wardrobe-in'),edge('character','video','character-in')]
    const c=sharedPromptContext('prompt',f.nodes,f.edges);expect(c.tags).toEqual(expect.arrayContaining(['@talking-cat','@hat','@hero']));expect(c.tags).not.toContain('@images');expect(c.tags).not.toContain('@route')
    expect(c.manifest).toContain('owner=@hero')
  })
  it('stops at generated media instead of leaking its creation inputs or future consumers',()=>{
    const f=fixture();f.nodes[1].data.kind='image-generator';f.nodes.push(node('previous',{kind:'upload',outputType:'image',referenceTag:'@previous'}),node('future',{kind:'video-generator',videoEngine:'bytedance/seedance-2.5/reference-to-video'}))
    f.edges.push(edge('previous','cat'),edge('video','future','video-reference-in'),edge('other','future'))
    expect(sharedPromptContext('prompt',f.nodes,f.edges).tags).toEqual(['@talking-cat'])
  })
  it('ignores incompatible/missing edges and terminates on routed cycles',()=>{
    const f=fixture();f.nodes.push(node('bad-audio',{outputType:'audio',referenceTag:'@bad-audio'}),node('route',{kind:'router',routeSignal:'text'}))
    f.edges.push(edge('bad-audio','video','reference-in'),edge('missing','video'),edge('route','route','input','output'))
    expect(sharedPromptContext('prompt',f.nodes,f.edges).tags).toEqual(['@talking-cat'])
  })
  it('handles a valid two-Router input cycle, and supports Assistant downstream context',()=>{
    const f=fixture();f.nodes[0].data.kind='assistant';f.edges[0].sourceHandle='generated_prompt';f.nodes.push(node('a',{kind:'router',routeSignal:'image'}),node('b',{kind:'router',routeSignal:'image'}))
    f.edges=[f.edges[0],edge('cat','a','input'),edge('a','b','input','output'),edge('b','a','input','output'),edge('b','video','reference-in','output')]
    expect(sharedPromptContext('prompt',f.nodes,f.edges).tags).toEqual(['@talking-cat'])
  })
  it('uses selected generated-result canonical tags and excludes duplicate identities from automatic matching',()=>{
    const f=fixture();f.nodes[1].data.referenceTag=undefined;f.nodes[1].data.generatedResults=[{id:'one',type:'image',name:'First Cat',referenceTag:'@first-cat'},{id:'two',type:'image',name:'Second Cat',referenceTag:'@second-cat'}] as any;f.nodes[1].data.activeResultIndex=1
    expect(sharedPromptContext('prompt',f.nodes,f.edges).tags).toEqual([workflowTag(f.nodes[1].data,'asset')])
    f.nodes.push(node('copy',{referenceTag:workflowTag(f.nodes[1].data,'asset'),outputType:'image'}));f.edges.push(edge('copy','video'))
    expect(sharedPromptContext('prompt',f.nodes,f.edges).tags).toEqual([])
  })
  it('passes read-only safe semantic context to selected-model Revamp, with no guessed cat dictionary',()=>{
    const f=fixture(),c=sharedPromptContext('prompt',f.nodes,f.edges),instruction=sharedPromptRewriteInstruction(c)
    expect(instruction).toContain('@talking-cat');expect(instruction).toContain('speaker');expect(instruction).toContain('any language');expect(instruction).toContain('do not guess');expect(instruction).not.toContain('/Users/private')
    f.nodes[1].data.referenceDescription='secret api key https://private.example';expect(sharedPromptContext('prompt',f.nodes,f.edges).manifest).not.toContain('private.example')
  })
  it('aggregates fan-out context without per-generator required or ambiguous anchors',()=>{
    const f=fixture();f.nodes.push(node('v2',{kind:'video-generator',videoEngine:'bytedance/seedance-2.5/reference-to-video'}),node('cat2',{title:'Another Cat',referenceTag:'@another-cat',outputType:'image'}));f.edges.push(edge('prompt','v2','text-in','text-out'),edge('cat2','v2'))
    const c=sharedPromptContext('prompt',f.nodes,f.edges);expect(c.tags).toEqual(['@talking-cat','@another-cat']);expect(c.manifest).not.toContain('required-anchor=')
  })
})
describe('shared Prompt rewrite validation',()=>{
  it('allows exact relevant tags but preserves existing authored occurrences',()=>{
    expect(validateSharedPromptRewrite('Cat speaks.','@talking-cat speaks.',['@talking-cat'])).toBe('@talking-cat speaks.')
    expect(validateSharedPromptRewrite('@manual meets @manual.','@manual quietly meets @manual.',['@talking-cat'])).toContain('@manual')
  })
  it.each([
    ['Cat speaks.','@invented speaks.'],['Cat speaks.','@Talking-Cat speaks.'],['Cat speaks.','@talking-cat meets @talking-cat.'],['@manual speaks.','Cat speaks.'],['Cat speaks.','CONNECTED CONTEXT MANIFEST anchor=@talking-cat'],['Cat speaks.','@Image1 speaks.']
  ])('rejects unrelated, wrong-case, duplicate, lost and hidden tags: %s → %s',(before,after)=>expect(()=>validateSharedPromptRewrite(before,after,['@talking-cat'])).toThrow())
})
