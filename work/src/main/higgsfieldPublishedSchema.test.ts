import {describe,expect,it} from 'vitest'
import {higgsfieldPublishedSchema} from './higgsfieldPublishedSchema'
const mode={enum:['std','pro'],type:'string',default:'pro'}
const broken=()=>({type:'object',properties:{mode:structuredClone(mode),duration:{type:'integer',title:'Duration',default:5,minimum:3,maximum:10,mode:structuredClone(mode)}}})
describe('guarded official Kling Omni declaration correction',()=>{
 it('removes only the duplicate duration.mode and preserves the public capture',()=>{
  const input=broken(),before=structuredClone(input)
  expect(higgsfieldPublishedSchema('kling-video/omni/video-reference',input)).toEqual({type:'object',properties:{mode,duration:{type:'integer',title:'Duration',default:5,minimum:3,maximum:10}}})
  expect(input).toEqual(before)
 })
 it('does not normalize another endpoint or an already corrected declaration',()=>{
  const input=broken();expect(higgsfieldPublishedSchema('other/model',input)).toEqual(input)
  delete (input.properties.duration as any).mode
  expect(higgsfieldPublishedSchema('kling-video/omni/video-reference',input)).toEqual(input)
 })
 it('rejects a different nested rule, changed scalar shape or nonidentical mode',()=>{
  for(const change of [(s:any)=>s.properties.duration.mode.enum.push('future'),(s:any)=>s.properties.duration.type='string',(s:any)=>s.properties.mode.default='std']){
   const input=broken();change(input);expect(()=>higgsfieldPublishedSchema('kling-video/omni/video-reference',input)).toThrow(/duplicate Mode declaration changed/)
  }
 })
})
