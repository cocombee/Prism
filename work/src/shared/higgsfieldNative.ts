import {assertHiggsfieldPublicUrl} from './higgsfieldPublicUrl'
export {assertHiggsfieldPublicUrl} from './higgsfieldPublicUrl'
import {HIGGSFIELD_SEEDANCE_INPUT_REVISION,higgsfieldSeedanceSchema,higgsfieldSeedanceFields,planHiggsfieldSeedanceInput,materializeHiggsfieldSeedanceInput,type HiggsfieldSeedanceInputPlan,type HiggsfieldSeedanceInputRequest,type HiggsfieldSeedanceSource} from './higgsfieldSeedanceInput'
import type { FalJson, FalSchemaNode } from './falSchemaBinding'
import { validateFalSchema } from './falSchemaBinding'

export const HIGGSFIELD_API = 'https://api.higgsfield.ai'
export const HIGGSFIELD_CONTRACT_REVISION = 'prism-genjutsu-2026-10-09-v1'
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
export const HIGGSFIELD_GENJUTSU_MODELS = [
  { kind:'genjutsu', id: 'higgsfield/genjutsu/motion-transfer/v1.0', label: 'Genjutsu · Motion Transfer', minImages: 1, maxImages: 8, minimumPixels: 0 },
  { kind:'genjutsu', id: 'higgsfield/genjutsu/object-swap/v1.0', label: 'Genjutsu · Object Swap', minImages: 1, maxImages: 8, minimumPixels: 409600 },
  { kind:'genjutsu', id: 'higgsfield/genjutsu/restyle/v1.0', label: 'Genjutsu · Restyle', minImages: 0, maxImages: 5, minimumPixels: 0 },
] as const
/** Adapter admission is explicit; adding an input-only schema never makes a route runnable. */
const HIGGSFIELD_SEEDANCE_RUNNABLE_ROUTES = [
  'bytedance/seedance-2.5/text-to-video',
  'bytedance/seedance-2.5/image-to-video',
  'bytedance/seedance-2.5/reference-to-video',
  'bytedance/seedance-2.5/video-extend',
  'bytedance/seedance-2.5/video-edit',
] as const
export const HIGGSFIELD_SEEDANCE_MODELS = Object.freeze(HIGGSFIELD_SEEDANCE_RUNNABLE_ROUTES.map(id=>({
  kind:'seedance' as const,id,label:`Seedance 2.5 · ${{'text-to-video':'Text to Video','image-to-video':'Image to Video','reference-to-video':'Reference to Video','video-extend':'Video Extend','video-edit':'Video Edit'}[id.split('/').at(-1)!]}`,
})))
/** Only routes with verified independent native adapters belong in selectable menus. */
export const HIGGSFIELD_RUNNABLE_MODELS = Object.freeze([...HIGGSFIELD_GENJUTSU_MODELS, ...HIGGSFIELD_SEEDANCE_MODELS])
export const HIGGSFIELD_BUNDLED_CATALOG_REVISION = `${HIGGSFIELD_CONTRACT_REVISION}|${HIGGSFIELD_SEEDANCE_INPUT_REVISION}`
export function higgsfieldBundledCatalogModels() {
  return HIGGSFIELD_RUNNABLE_MODELS.map(model => ({
    id: model.id, label: model.label, category: model.kind === 'seedance' ? 'video' : 'video-to-video',
    catalog: { service: 'Higgsfield', company: model.kind === 'seedance' ? 'ByteDance' : 'Higgsfield', release: model.kind === 'seedance' ? 'Seedance 2.5' : 'Genjutsu 1.0', mode: model.label.split(' · ')[1] },
    description: 'Retained bundled native contract; current inputs and account access require verification.',
  }))
}
export type HiggsfieldMediaSource = HiggsfieldSeedanceSource
/** Independent provider namespace; this is never a fal request or client. */
export interface HiggsfieldNativeRequest {
  endpointId: string
  contractRevision: string
  values: Record<string, FalJson>
  media: Record<string, HiggsfieldMediaSource[]>
  /** Local consent only; never a provider parameter. Unknown remote duration may also be trimmed. */
  allowSourceTrimming?: boolean
  fingerprint?: string
}
export interface HiggsfieldPreset { id: string; name: string; previewUrl?: string }
export function higgsfieldModel(endpointId: string) {
  const model = HIGGSFIELD_GENJUTSU_MODELS.find(item => item.id === endpointId) || HIGGSFIELD_SEEDANCE_MODELS.find(item=>item.id===endpointId)
  if (!model) throw new Error('The saved Higgsfield route has no verified input contract. Preserve it and refresh before generating.')
  return model
}
export function higgsfieldInputSchema(endpointId: string): FalSchemaNode {
  const model = higgsfieldModel(endpointId)
  if(model.kind==='seedance')return higgsfieldSeedanceSchema(endpointId)
  const restyle = model.minImages === 0
  return { type: 'object', additionalProperties: false, properties: {
    prompt: { type: 'string', title: 'Prompt', maxLength: 10000, default: '' },
    video_url: { type: 'string', title: 'Source Video', format: 'uri', minLength: 1, maxLength: 2083 },
    image_urls: { type: 'array', title: restyle ? 'Character References' : 'Image References', minItems: model.minImages, maxItems: model.maxImages, ...(restyle ? { default: [] } : {}), items: { type: 'string', format: 'uri', minLength: 1 } },
    resolution: { type: 'string', title: 'Resolution', enum: ['480p','720p','1080p'], default: '720p' },
    ...(restyle ? { preset_id: { type: 'string' as const, title: 'Style Preset', minLength:36,maxLength:36,pattern:UUID_PATTERN } } : {}),
  }, required: ['video_url', ...(restyle ? ['preset_id'] : ['image_urls'])] }
}
/** A fixed local UUID pattern is safe here; arbitrary provider patterns still require the existing isolated validator. */
export function validateHiggsfieldWireInput(endpointId:string,input:unknown):void {
  validateFalSchema(higgsfieldInputSchema(endpointId),input,'Input',0,(pattern,value)=>{
    if(pattern!==UUID_PATTERN)throw new Error('Higgsfield input requires a supported validation adapter.')
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
  })
}
export interface HiggsfieldInputPlan { endpointId: string; schema: FalSchemaNode; values: Record<string, FalJson>; video: HiggsfieldMediaSource; images: HiggsfieldMediaSource[]; allowSourceTrimming: boolean }
export function planHiggsfieldInput(request: HiggsfieldNativeRequest): HiggsfieldInputPlan {
  const model = higgsfieldModel(request.endpointId)
  if(model.kind!=='genjutsu')throw new Error('This is a native Seedance input; use its mode-owned planner rather than Genjutsu.')
  const schema = higgsfieldInputSchema(model.id)
  if (request.contractRevision !== HIGGSFIELD_CONTRACT_REVISION) throw new Error('Higgsfield input contract changed. Review the preserved inputs before generating.')
  if (!request.values || typeof request.values !== 'object' || Array.isArray(request.values) || !request.media || typeof request.media !== 'object' || Array.isArray(request.media)) throw new Error('Review the Higgsfield input bindings.')
  if (request.allowSourceTrimming !== undefined && typeof request.allowSourceTrimming !== 'boolean') throw new Error('Review source-video trimming consent.')
  for (const key of Object.keys(request.values)) if (!['prompt','resolution', ...(model.minImages===0?['preset_id']:[])].includes(key)) throw new Error('The selected Higgsfield mode does not accept a saved control. Review its preserved value.')
  for (const key of Object.keys(request.media)) if (!['video_url','image_urls'].includes(key)) throw new Error('The selected Higgsfield mode does not accept a saved media binding.')
  const videos = request.media.video_url, images = request.media.image_urls ?? []
  if (!Array.isArray(videos) || videos.length!==1 || !Array.isArray(images) || images.length<model.minImages || images.length>model.maxImages) throw new Error(`Genjutsu needs one source video and ${model.minImages}–${model.maxImages} image references for this mode.`)
  for (const [sources,type] of [[videos,'video'],[images,'image']] as const) for (const source of sources) {
    if (!source || typeof source!=='object' || source.mediaType!==type || Boolean(source.path)===Boolean(source.url) || source.path!==undefined && (typeof source.path!=='string'||!source.path) || source.url!==undefined && typeof source.url!=='string') throw new Error(`Genjutsu requires a bound ${type} source with one transport.`)
    if (source.url) assertHiggsfieldPublicUrl(source.url)
  }
  const values: Record<string,FalJson> = { prompt: '', resolution:'720p', ...request.values }
  const preflight = { ...values, video_url: videos[0].url ?? 'https://media.prism.example/source.mp4', image_urls: images.map(source=>source.url ?? 'https://media.prism.example/reference.png') }
  validateHiggsfieldWireInput(model.id,preflight)
  if (videos[0].url && !request.allowSourceTrimming) throw new Error('The remote video duration is unverified and Genjutsu may trim it to 30 seconds. Confirm source trimming or import a managed source for inspection.')
  return { endpointId:model.id,schema,values,video:{...videos[0]},images:images.map(source=>({...source})),allowSourceTrimming:request.allowSourceTrimming===true }
}
export function materializeHiggsfieldInput(plan: HiggsfieldInputPlan, videoUrl: string, imageUrls: string[]): Record<string,FalJson> {
  if (imageUrls.length!==plan.images.length) throw new Error('Higgsfield reference order/count changed during preparation.')
  for (const url of [videoUrl,...imageUrls]) assertHiggsfieldPublicUrl(url)
  const input = {...plan.values,video_url:videoUrl,image_urls:[...imageUrls]}
  validateHiggsfieldWireInput(plan.endpointId,input)
  return input
}

/** Electron IPC retains error text, not custom Error properties. */
export function isHiggsfieldRemoteUncertainty(message: string): boolean { return /remote work may continue|Higgsfield submission status is unknown|Higgsfield accepted an unresolved request/i.test(message) }

/** Full route recognition does not advertise a renderer selection as runnable. */
export type HiggsfieldNativeInputPlan = (HiggsfieldInputPlan & {kind:'genjutsu';preview:Record<string,FalJson>}) | (HiggsfieldSeedanceInputPlan & {kind:'seedance';schema:FalSchemaNode})
export function higgsfieldSeedanceRequest(request:HiggsfieldNativeRequest):HiggsfieldSeedanceInputRequest {
  if(request.allowSourceTrimming!==undefined||Object.keys(request).some(key=>!['endpointId','contractRevision','values','media','allowSourceTrimming','fingerprint'].includes(key)))throw new Error('Native Seedance does not accept Genjutsu trimming consent or another unsupported request field. Its inputs were preserved.')
  return {endpointId:request.endpointId,inputRevision:request.contractRevision,values:request.values,media:request.media,...(request.fingerprint!==undefined?{fingerprint:request.fingerprint}:{})}
}
export function planHiggsfieldNativeInput(request:HiggsfieldNativeRequest, inputSchema?:FalSchemaNode):HiggsfieldNativeInputPlan {
  if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).some(key=>!['endpointId','contractRevision','values','media','allowSourceTrimming','fingerprint'].includes(key)))throw new Error('Higgsfield has an unsupported request field; review the preserved request.')
  const model=higgsfieldModel(request.endpointId)
  if(model.kind==='seedance')return {...planHiggsfieldSeedanceInput(higgsfieldSeedanceRequest(request),inputSchema),kind:'seedance',schema:inputSchema || higgsfieldSeedanceSchema(request.endpointId)}
  if(request.fingerprint!==undefined)throw new Error('Genjutsu does not yet use a current-schema digest; review the preserved native selection.')
  const plan=planHiggsfieldInput(request)
  return {...plan,kind:'genjutsu',preview:materializeHiggsfieldInput(plan,plan.video.url||'https://media.prism.example/source.mp4',plan.images.map(source=>source.url||'https://media.prism.example/reference.png'))}
}
export function materializeHiggsfieldNativeInput(plan:HiggsfieldNativeInputPlan,urls:string[]):Record<string,FalJson> {
  if(plan.kind==='seedance')return materializeHiggsfieldSeedanceInput(plan,urls)
  if(urls.length!==1+plan.images.length)throw new Error('Higgsfield reference order/count changed during preparation.')
  return materializeHiggsfieldInput(plan,urls[0],urls.slice(1))
}
export function higgsfieldWireMediaUrls(endpointId:string,input:Record<string,unknown>, inputSchema?:FalSchemaNode):string[] {
  const fields=higgsfieldModel(endpointId).kind==='seedance'?higgsfieldSeedanceFields(endpointId,inputSchema).filter(field=>field.media).map(field=>({key:field.key,array:field.media!.array})):[{key:'video_url',array:false},{key:'image_urls',array:true}]
  return fields.flatMap(({key,array})=>input[key]===undefined?[]:array?input[key] as string[]:[input[key] as string])
}
export function higgsfieldContractRevision(endpointId:string):string {
  return higgsfieldModel(endpointId).kind==='seedance'?HIGGSFIELD_SEEDANCE_INPUT_REVISION:HIGGSFIELD_CONTRACT_REVISION
}

export function higgsfieldSourceOwnsTimeline(endpointId:string):boolean {
  try {return higgsfieldModel(endpointId).kind==='genjutsu'||endpointId==='bytedance/seedance-2.5/video-edit'}catch{return true /* Unavailable saved routes cannot consume a newly authored timeline. */}
}
