import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import type { Edge } from '@xyflow/react'
import { directStoryboardStyles, detachStoryboardStyleNodes } from './storyboardStyleRouting'
import { nodeInputPorts } from './nodePorts'
import { nodeConnectionError } from './nodeConnections'
const node=(id:string,kind:any):StudioNode=>({id,type:'default',position:{x:0,y:0},data:{kind,title:id,videoEngine:'bytedance/seedance-2.0/reference-to-video'}} as StudioNode)
const edge=(id:string,source:string,target:string,targetHandle:string):Edge=>({id,source,target,targetHandle})

describe('Style belongs directly to Video Generator',()=>{
 const nodes=[node('style','style-reference'),node('board','storyboard'),node('video','video-generator')]
 const original=[edge('old','style','board','style-in'),edge('plan','board','video','storyboard-in')]
 it('moves old Style wiring without changing nodes or Storyboard output and is idempotent',()=>{
   const result=directStoryboardStyles(nodes,original)
   expect(result).toContain(original[1])
   expect(result).toContainEqual({...original[0],id:'old::generator-style::video',target:'video',targetHandle:'style-in'})
   expect(directStoryboardStyles(nodes,result)).toBe(result)
   expect(original[0].target).toBe('board')
   expect(nodeInputPorts(nodes[1].data).some(port=>port.signal==='style')).toBe(false)
   expect(nodeConnectionError(nodes[0].id,nodes[1].id,nodes[0].data,nodes[1].data,undefined,'style-in')).toContain('directly to the Video Generator')
 })
 it('keeps explicit generator Style, removes only obsolete orphan links and preserves the source',()=>{
   const explicit=edge('direct','style','video','style-in')
   expect(directStoryboardStyles(nodes,[...original,explicit])).toEqual([original[1],explicit])
   expect(directStoryboardStyles(nodes,[original[0]])).toEqual([])
   const linked={...nodes[0],data:{...nodes[0].data,linkedStoryboardId:'board',stylePrompt:'Exact look.'}}
   expect(detachStoryboardStyleNodes([linked])[0]).toEqual({...linked,data:{...linked.data,linkedStoryboardId:undefined}})
 })
 it('supports a shared Storyboard through a Router and multiple generators without following video media routes',()=>{
   const router=node('route','router'),second=node('second','video-generator')
   const routes=[original[0],edge('router','board','route','input'),edge('render','route','video','storyboard-in'),edge('second','route','second','storyboard-in'),edge('media','board','second','video-in')]
   expect(directStoryboardStyles([...nodes,router,second],routes).filter(e=>e.targetHandle==='style-in').map(e=>e.target)).toEqual(['video','second'])
 })
})
