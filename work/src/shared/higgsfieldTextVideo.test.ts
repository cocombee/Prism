import { createHash } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import {
  HIGGSFIELD_TEXT_VIDEO_MODELS, HIGGSFIELD_TEXT_VIDEO_REVISION,
  higgsfieldTextVideoFields, higgsfieldTextVideoOmittedControls, higgsfieldTextVideoSchema,
  materializeHiggsfieldTextVideoInput, planHiggsfieldTextVideoInput,
} from './higgsfieldTextVideo'
import type { HiggsfieldNativeRequest } from './higgsfieldNative'
import type { FalJson, FalSchemaNode } from './falSchemaBinding'
import fixture from './fixtures/higgsfieldTextVideoSchemas.json'

const fixtureRows=fixture as unknown as Record<string,{sourceUrl:string;documentSha256:string;schemaSha256:string;omittedControls:string[];outputContract:{completedStatus:string;required:string[];fileProperty:string;fileRequired:boolean;fileUrlProperty:string;fileUrlFormat?:string};inputSchema:FalSchemaNode}>
const ids = Object.keys(fixtureRows)
const request = (endpointId: string, values: Record<string,FalJson> = {}, media: HiggsfieldNativeRequest['media'] = {}, fingerprint?: string): HiggsfieldNativeRequest => ({
  endpointId, contractRevision:HIGGSFIELD_TEXT_VIDEO_REVISION, values, media, ...(fingerprint ? {fingerprint} : {}),
})
const currentRequest = (endpointId: string, values: Record<string,FalJson> = {}) => request(endpointId, values, {}, 'a'.repeat(64))
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object' ? `{${Object.keys(value as object).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string,unknown>)[key])}`).join(',')}}`
    : JSON.stringify(value)

describe('Higgsfield text-to-video fixture and planner',()=>{
  it('retains the established eight primary Text identities and all reviewed schema evidence',()=>{
    expect(HIGGSFIELD_TEXT_VIDEO_MODELS.slice(0,8).map(({id})=>id)).toEqual([
      'kling-video/v3.0/std/text-to-video','kling-video/v2.6/pro/text-to-video','alibaba/wan-3.0/text-to-video',
      'minimax/h3/text-to-video','minimax/hailuo-2.3/standard/text-to-video','lightricks/ltx-2.5/text-to-video/pro','pixverse/v6/text-to-video',
      'wan/v2.7/text-to-video',
    ])
    for (const [id,row] of Object.entries(fixtureRows)) {
      expect(row.sourceUrl).toBe(`https://dash.higgsfield.ai/models/${id}/llms.txt`)
      expect(row.documentSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(createHash('sha256').update(canonical(row.inputSchema)).digest('hex')).toBe(row.schemaSha256)
      expect(row.inputSchema.properties?.prompt?.type).toBe('string')
      expect((row.inputSchema.required||[]).every(key=>key==='prompt'||key==='duration')).toBe(true)
      expect(higgsfieldTextVideoOmittedControls(id)).toEqual(row.omittedControls)
      expect(row.outputContract).toMatchObject({completedStatus:'completed',required:['status','request_id','video'],fileProperty:'video',fileRequired:true,fileUrlProperty:'url',fileUrlFormat:'uri'})
    }
    expect(()=>higgsfieldTextVideoSchema('wan/v2.6/text-to-video')).toThrow(/no verified input schema/)
    const first=higgsfieldTextVideoSchema(ids[0]);first.properties!.duration!.maximum=1
    expect(higgsfieldTextVideoSchema(ids[0]).properties!.duration!.maximum).toBe(15)
  })

  it('exposes supported scalar controls only and leaves structured Kling3 controls unbound',()=>{
    expect(higgsfieldTextVideoFields(ids[0]).map(field=>field.key)).toEqual(['sound','prompt','duration','cfg_scale','multi_shots','aspect_ratio'])
    expect(higgsfieldTextVideoFields(ids[0]).some(field=>field.key==='multi_prompt'||field.key==='elements')).toBe(false)
    expect(higgsfieldTextVideoFields(ids[2]).map(field=>field.key)).toEqual(['seed','prompt','duration','resolution','aspect_ratio','generate_audio','enable_thinking'])
    expect(higgsfieldTextVideoFields(ids[5]).map(field=>field.key)).toEqual(['fps','prompt','duration','resolution','aspect_ratio','generate_audio','camera_movement'])
    expect(higgsfieldTextVideoFields(ids[7]).map(field=>field.key)).toEqual(['seed','prompt','duration','resolution','aspect_ratio','prompt_extend','negative_prompt'])
    expect(higgsfieldTextVideoOmittedControls(ids[7])).toEqual(['audio_url'])
    expect(higgsfieldTextVideoSchema(ids[7]).required).toEqual(['prompt'])
    expect(higgsfieldTextVideoSchema(ids[7]).properties?.audio_url).toMatchObject({type:'string',format:'uri'})
  })

  it('uses declared provider scalar defaults and preserves exact text and supported authored values',()=>{
    const prompt='  Keep this exact prompt.\r\nNo trimming.  '
    const plan=planHiggsfieldTextVideoInput(currentRequest(ids[2],{prompt,duration:9,seed:7}),higgsfieldTextVideoSchema(ids[2]))
    expect(plan.preview).toMatchObject({prompt,duration:9,seed:7,resolution:'1080p',aspect_ratio:'adaptive',generate_audio:true,enable_thinking:false})
    expect(plan.slots).toEqual([]);expect(plan.inputSchema).toEqual(higgsfieldTextVideoSchema(ids[2]))
    expect(materializeHiggsfieldTextVideoInput(plan)).toEqual(plan.preview)
    expect(()=>materializeHiggsfieldTextVideoInput(plan,['https://cdn.example/media.png'])).toThrow(/no media transport/)
    const kling=planHiggsfieldTextVideoInput(currentRequest(ids[0],{prompt:'One authored shot.'}),higgsfieldTextVideoSchema(ids[0]))
    expect(kling.preview).toMatchObject({prompt:'One authored shot.',sound:'on',duration:5,cfg_scale:0.5,multi_shots:false,aspect_ratio:'16:9'})
    expect(kling.preview).not.toHaveProperty('multi_prompt')
    expect(kling.preview).not.toHaveProperty('elements')
    expect(planHiggsfieldTextVideoInput(currentRequest(ids[4],{prompt:'Hailuo action.'}),higgsfieldTextVideoSchema(ids[4])).preview.duration).toBe(6)
  })

  it('accepts current scalar range/default changes under the request fingerprint',()=>{
    const id=ids[1],schema=higgsfieldTextVideoSchema(id)
    schema.properties!.duration!.enum=undefined;schema.properties!.duration!.maximum=20;schema.properties!.duration!.default=10
    const plan=planHiggsfieldTextVideoInput(currentRequest(id,{prompt:'Current schema range.',duration:15}),schema)
    expect(plan.preview.duration).toBe(15)
    const defaults=planHiggsfieldTextVideoInput(currentRequest(id,{prompt:'Provider current default.'}),schema)
    expect(defaults.preview.duration).toBe(10)
  })

  it('allows schema-less immutable capture but requires a main-owned schema and digest to materialize',()=>{
    const source=currentRequest(ids[0],{prompt:'Captured.',multi_prompt:[{prompt:'Later',duration:4}]})
    const plan=planHiggsfieldTextVideoInput(source)
    expect(plan.preview).toEqual(source.values)
    expect(()=>materializeHiggsfieldTextVideoInput(plan)).toThrow(/main-owned Higgsfield schema/)
    expect(()=>planHiggsfieldTextVideoInput(source,higgsfieldTextVideoSchema(ids[0]))).toThrow(/does not support/)
    expect(()=>planHiggsfieldTextVideoInput(request(ids[0],{prompt:'No digest.'}),higgsfieldTextVideoSchema(ids[0]))).toThrow(/fingerprint is required/)
  })

  it('rejects every media binding, media-looking control, extra authored key and non-JSON value',()=>{
    for (const media of [{image_url:[]},{image_urls:[]},{audio_url:[]},{source_video:[]}]) {
      expect(()=>planHiggsfieldTextVideoInput(request(ids[2],{prompt:'No media.'},media as unknown as HiggsfieldNativeRequest['media']))).toThrow(/no media bindings/)
    }
    for (const key of ['image_url','reference_urls','audio_url','output_format','unreviewed']) {
      expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[2],{prompt:'Preserve.',[key]:'https://cdn.example/file'}),higgsfieldTextVideoSchema(ids[2]))).toThrow()
    }
    expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[0],{prompt:'Structured',multi_prompt:[]}),higgsfieldTextVideoSchema(ids[0]))).toThrow(/does not support multi_prompt/)
    expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[0],{prompt:'Structured',elements:[]}),higgsfieldTextVideoSchema(ids[0]))).toThrow(/does not support elements/)
    expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[7],{prompt:'No audio URI.',audio_url:'https://cdn.example/audio.wav'}),higgsfieldTextVideoSchema(ids[7]))).toThrow(/does not support audio_url/)
    const cyclic:Record<string,unknown>={prompt:'Cycle'};cyclic.self=cyclic
    expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[0],cyclic as Record<string,FalJson>))).toThrow(/acyclic JSON/)
  })

  it('fails closed on media URIs, output drift, conditionals, unsafe patterns and required unknown structure',()=>{
    const cases:[string,(schema:FalSchemaNode)=>void,RegExp][]=[
      ['URI media',(schema)=>{schema.properties!.image_url={type:'string',format:'uri'}},/media input/],
      ['URI annotation',(schema)=>{schema.properties!.upload={type:'string',format:'uri'}},/declares a format/],
      ['output control',(schema)=>{schema.properties!.output_format={type:'string',enum:['mp4']}},/output contract/],
      ['conditional',(schema)=>{schema.properties!.prompt.if={const:'x'}},/conditional/],
      ['pattern',(schema)=>{schema.properties!.prompt.pattern='.*'},/pattern/],
      ['required unknown structure',(schema)=>{schema.required=['prompt','multi_prompt']},/unsupported structured/],
      ['changed prompt type',(schema)=>{schema.properties!.prompt.type='array'},/prompt must remain a string/],
    ]
    for (const [label,mutate,matcher] of cases) {
      const schema=higgsfieldTextVideoSchema(ids[0]);mutate(schema)
      expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[0],{prompt:'Review.'}),schema),label).toThrow(matcher)
    }
    const wan=higgsfieldTextVideoSchema(ids[7]);wan.required=['prompt','audio_url']
    expect(()=>planHiggsfieldTextVideoInput(currentRequest(ids[7],{prompt:'Review Wan.'}),wan)).toThrow(/requires omitted control/)
  })

  it('rejects stale route revisions and preserves immutable request, plan and schema snapshots',()=>{
    const original=currentRequest(ids[6],{prompt:'Original PixVerse action.',duration:5}),before=JSON.stringify(original)
    const plan=planHiggsfieldTextVideoInput(original)
    original.values.prompt='Later edit.'
    expect(JSON.stringify(original)).not.toBe(before);expect(plan.preview.prompt).toBe('Original PixVerse action.')
    expect(()=>{plan.values.prompt='Changed.'}).toThrow()
    expect(()=>{plan.preview.prompt='Changed.'}).toThrow()
    expect(()=>planHiggsfieldTextVideoInput({...currentRequest(ids[0],{prompt:'Old.'}),contractRevision:'old'})).toThrow(/contract changed/)
    expect(()=>planHiggsfieldTextVideoInput({...currentRequest(ids[0],{prompt:'Extra.'}),inputSchema:{} as never} as HiggsfieldNativeRequest)).toThrow(/unsupported request field/)
  })
})
