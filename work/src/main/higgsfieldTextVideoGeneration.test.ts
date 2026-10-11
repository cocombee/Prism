import { describe, it, expect, vi } from 'vitest'
import { executeHiggsfieldTextVideoGeneration } from './higgsfieldTextVideoGeneration'
import { HIGGSFIELD_TEXT_VIDEO_REVISION, higgsfieldTextVideoSchema } from '../shared/higgsfieldTextVideo'
import type { HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import type { FalJson } from '../shared/falSchemaBinding'
import type { FalSchemaNode } from '../shared/falSchemaBinding'

const endpoint='kling-video/v2.6/pro/text-to-video'
const request=(values:Record<string,FalJson>={prompt:'Keep the original authored prompt.'},media:HiggsfieldNativeRequest['media']={}):HiggsfieldNativeRequest=>({
  endpointId:endpoint,contractRevision:HIGGSFIELD_TEXT_VIDEO_REVISION,values,media,fingerprint:'a'.repeat(64),
})
function dependencies() {
  const events:string[]=[]
  const generate=vi.fn(async(_endpointId:string,_input:Record<string,unknown>,_signal?:AbortSignal,_schema?:FalSchemaNode)=>{
    events.push('generate');return {requestId:'fixture-job',url:'https://cdn.example/Output.mp4',contentType:'video/mp4'}
  })
  const api=vi.fn(async()=>{events.push('api');return {generate}})
  const validateInput=vi.fn(async(_input:unknown)=>{events.push('validate')})
  const persist=vi.fn(async()=>{events.push('persist');return {path:'/fixture/Output.mp4',url:'prism-asset://fixture/Output.mp4'}})
  const assertCurrent=vi.fn(()=>events.push('current'))
  return {events,generate,api,validateInput,persist,assertCurrent,inputSchema:higgsfieldTextVideoSchema(endpoint)}
}

describe('Higgsfield independent text-to-video execution lane',()=>{
  it('validates the current body before lazy API creation, revalidates before exact-route submission and persists output',async()=>{
    const deps=dependencies(),original=request({prompt:'  Exact text.\r\n',duration:10})
    const result=await executeHiggsfieldTextVideoGeneration(original,deps)
    expect(deps.events.indexOf('validate')).toBeLessThan(deps.events.indexOf('api'))
    expect(deps.events.indexOf('generate')).toBeGreaterThan(deps.events.lastIndexOf('validate'))
    expect(deps.events.indexOf('persist')).toBeGreaterThan(deps.events.indexOf('generate'))
    expect(deps.generate).toHaveBeenCalledOnce()
    const [route,body,,schema]=deps.generate.mock.calls[0]
    expect(route).toBe(endpoint)
    expect(body).toMatchObject({prompt:original.values.prompt,duration:10,sound:'on',cfg_scale:0.5,aspect_ratio:'16:9'})
    expect(body).not.toHaveProperty('image_url');expect(body).not.toHaveProperty('video_url');expect(body).not.toHaveProperty('output_format')
    expect(schema).toEqual(deps.inputSchema)
    expect(result).toMatchObject({modelId:endpoint,outputType:'video',outputPath:'/fixture/Output.mp4'})
    expect(deps.persist).toHaveBeenCalledOnce()
  })

  it('submits Wan2.7 text-only fields and never forwards its optional audio URI',async()=>{
    const route='wan/v2.7/text-to-video',deps=dependencies();deps.inputSchema=higgsfieldTextVideoSchema(route)
    const native={...request({prompt:'Text only.'}),endpointId:route}
    await executeHiggsfieldTextVideoGeneration(native,deps)
    const [submitted,body]=deps.generate.mock.calls[0]
    expect(submitted).toBe(route);expect(body).toMatchObject({prompt:'Text only.',duration:5,resolution:'720p',aspect_ratio:'16:9',prompt_extend:false,negative_prompt:''})
    expect(body).not.toHaveProperty('audio_url')
  })

  it('rejects media, missing current schema or fingerprint before credentials and submission',async()=>{
    const media=dependencies()
    await expect(executeHiggsfieldTextVideoGeneration(request({prompt:'No media.'},{image_url:[]} as unknown as HiggsfieldNativeRequest['media']),media)).rejects.toThrow(/no media bindings/)
    expect(media.validateInput).not.toHaveBeenCalled();expect(media.api).not.toHaveBeenCalled()
    const noSchema=dependencies();noSchema.inputSchema=undefined as never
    await expect(executeHiggsfieldTextVideoGeneration(request(),noSchema)).rejects.toThrow(/main-owned.*schema/)
    expect(noSchema.validateInput).not.toHaveBeenCalled();expect(noSchema.api).not.toHaveBeenCalled()
    const noFingerprint=dependencies()
    await expect(executeHiggsfieldTextVideoGeneration({...request(),fingerprint:undefined},noFingerprint)).rejects.toThrow(/fingerprint is required/)
    expect(noFingerprint.api).not.toHaveBeenCalled()
  })

  it('stops before opening the API when current schema validation fails',async()=>{
    const deps=dependencies();deps.validateInput.mockRejectedValue(Error('Current contract removed duration.'))
    await expect(executeHiggsfieldTextVideoGeneration(request({prompt:'Review.'}),deps)).rejects.toThrow(/Current contract/)
    expect(deps.events).not.toContain('api');expect(deps.generate).not.toHaveBeenCalled();expect(deps.persist).not.toHaveBeenCalled()
  })

  it('does not submit a body that exceeds protected request capacity',async()=>{
    const deps=dependencies()
    await expect(executeHiggsfieldTextVideoGeneration(request({prompt:'x'.repeat(1024*1024+1)}),deps)).rejects.toThrow(/protected request capacity/)
    expect(deps.validateInput).not.toHaveBeenCalled();expect(deps.api).not.toHaveBeenCalled()
  })

  it('keeps the executor snapshot when caller values change during current validation',async()=>{
    const deps=dependencies(),native=request({prompt:'Original before validation.'})
    deps.validateInput.mockImplementationOnce(async()=>{native.values.prompt='Mutated after the call started.';deps.events.push('validate')})
    await executeHiggsfieldTextVideoGeneration(native,deps)
    expect(deps.generate.mock.calls[0][1].prompt).toBe('Original before validation.')
  })

  it('checks the active owner and cancellation after each async boundary',async()=>{
    const controller=new AbortController(),deps=dependencies()
    deps.api.mockImplementationOnce(async()=>{controller.abort(Error('Stopped.'));return {generate:deps.generate}})
    await expect(executeHiggsfieldTextVideoGeneration(request(),deps,controller.signal)).rejects.toThrow(/Stopped/)
    expect(deps.generate).not.toHaveBeenCalled();expect(deps.persist).not.toHaveBeenCalled()
    const stale=dependencies();stale.assertCurrent.mockImplementationOnce(()=>{throw Error('Owner changed.')})
    await expect(executeHiggsfieldTextVideoGeneration(request(),stale)).rejects.toThrow(/Owner changed/)
    expect(stale.validateInput).not.toHaveBeenCalled();expect(stale.api).not.toHaveBeenCalled()
  })

  it('does not persist malformed or non-public video receipts',async()=>{
    const deps=dependencies();deps.generate.mockResolvedValueOnce({requestId:'bad id',url:'https://cdn.example/video.mp4'} as never)
    await expect(executeHiggsfieldTextVideoGeneration(request(),deps)).rejects.toThrow(/receipt/)
    expect(deps.persist).not.toHaveBeenCalled()
    const privateResult=dependencies();privateResult.generate.mockResolvedValueOnce({requestId:'fixture-job',url:'https://127.0.0.1/video.mp4'} as never)
    await expect(executeHiggsfieldTextVideoGeneration(request(),privateResult)).rejects.toThrow(/private/)
    expect(privateResult.persist).not.toHaveBeenCalled()
  })
})
