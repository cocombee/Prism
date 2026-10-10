import schemas from './fixtures/higgsfieldSeedance25InputSchemas.json'
import { validateFalSchema, type FalSchemaNode, type FalJson } from './falSchemaBinding'
import { assertHiggsfieldPublicUrl } from './higgsfieldPublicUrl'

/** Input-only foundation. Does not admit a route to the runnable catalog. */
export const HIGGSFIELD_SEEDANCE_INPUT_REVISION = 'prism-higgsfield-seedance-inputs-2026-10-10-v1'
export const HIGGSFIELD_SEEDANCE25_ROUTES = Object.freeze(Object.keys(schemas))
export type HiggsfieldSeedanceMediaType = 'image' | 'video' | 'audio'
export interface HiggsfieldSeedanceSource { path?: string; url?: string; mediaType: HiggsfieldSeedanceMediaType }
export interface HiggsfieldSeedanceInputRequest {
  endpointId: string
  inputRevision: string
  values: Record<string, FalJson>
  media: Record<string, HiggsfieldSeedanceSource[]>
  /** Digest only. Full current schemas are supplied separately by trusted main. */
  fingerprint?: string
}
export interface HiggsfieldSeedanceSlot { field: string; index: number; source: HiggsfieldSeedanceSource }
export interface HiggsfieldSeedanceInputPlan {
  endpointId: string
  inputRevision: string
  values: Record<string, FalJson>
  slots: HiggsfieldSeedanceSlot[]
  /** Schema-valid shape preview only; placeholder URLs are never submitted. */
  preview: Record<string, FalJson>
  inputSchema?: FalSchemaNode
  fingerprint?: string
}
const MEDIA_FIELDS: Record<string,{type:HiggsfieldSeedanceMediaType;array:boolean;role:string}> = {
  image_url:{type:'image',array:false,role:'start-frame'},end_image_url:{type:'image',array:false,role:'end-frame'},
  video_url:{type:'video',array:false,role:'source-video'},image_urls:{type:'image',array:true,role:'reference-image'},
  video_urls:{type:'video',array:true,role:'reference-video'},audio_urls:{type:'audio',array:true,role:'reference-audio'},
}
const owns=(value:object,key:string)=>Object.prototype.hasOwnProperty.call(value,key)
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value)
const clone=<T>(value:T):T=>structuredClone(value)
function freeze<T>(value:T):T {
  const pending: unknown[] = [value], seen = new WeakSet<object>()
  while(pending.length) {
    const item=pending.pop()
    if(item && typeof item==='object' && !seen.has(item)) {
      seen.add(item);for(const child of Object.values(item))pending.push(child);Object.freeze(item)
    }
  }
  return value
}
function assertControlJSON(values:Record<string,unknown>):void {
  try{JSON.stringify(values)}catch{throw new Error('Higgsfield controls must be finite, acyclic JSON; their authored values were preserved.')}
  const pending:unknown[]=[values],seen=new WeakSet<object>()
  while(pending.length){
    const value=pending.pop()
    if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))continue
    if(!value||typeof value!=='object'||!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Higgsfield controls must be finite, acyclic JSON; their authored values were preserved.')
    if(seen.has(value))continue
    seen.add(value);for(const child of Array.isArray(value)?Array.from(value):Object.values(value))pending.push(child)
  }
}
export function higgsfieldSeedanceSchema(endpointId:string):FalSchemaNode {
  if(!owns(schemas,endpointId))throw new Error('This Higgsfield Seedance route has no verified input schema. Its saved state was preserved.')
  return clone((schemas as unknown as Record<string,FalSchemaNode>)[endpointId])
}
export function higgsfieldSeedanceFields(endpointId:string, inputSchema?:FalSchemaNode) {
  const schema=inputSchema || higgsfieldSeedanceSchema(endpointId)
  return Object.entries(schema.properties||{}).map(([key,field])=>({key,schema:field,required:schema.required?.includes(key)||false,...(owns(MEDIA_FIELDS,key)?{media:clone(MEDIA_FIELDS[key])}:{})}))
}
function assemble(endpointId:string,values:Record<string,FalJson>,slots:HiggsfieldSeedanceSlot[],urls:string[], current:boolean):Record<string,FalJson> {
  if(urls.length!==slots.length)throw new Error('Higgsfield Seedance materialized media cardinality changed.')
  const input=clone(values),byField=new Map<string,string[]>()
  for(const [index,slot]of slots.entries()){
    assertHiggsfieldPublicUrl(urls[index]);const current=byField.get(slot.field)||[]
    if(slot.index!==current.length)throw new Error('Higgsfield Seedance materialized media order changed.')
    current.push(urls[index]);byField.set(slot.field,current)
  }
  for(const[field,entries]of byField)input[field]=MEDIA_FIELDS[field].array?[...entries]:entries[0]
  // A current schema is validated by the bounded main worker, not on the UI thread.
  if(!current)validateFalSchema(higgsfieldSeedanceSchema(endpointId),input)
  return input
}
export function planHiggsfieldSeedanceInput(request:HiggsfieldSeedanceInputRequest, inputSchema?:FalSchemaNode):HiggsfieldSeedanceInputPlan {
  if(!record(request)||Object.keys(request).some(key=>!['endpointId','inputRevision','values','media','fingerprint'].includes(key)))throw new Error('Higgsfield Seedance has an unsupported request field; review the preserved request.')
  const baseline=higgsfieldSeedanceSchema(request.endpointId), current=request.fingerprint!==undefined
  if(current && (typeof request.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(request.fingerprint)))throw new Error('Load and review the current Higgsfield model inputs before generating.')
  const schema=inputSchema ? clone(inputSchema) : baseline
  if(request.inputRevision!==HIGGSFIELD_SEEDANCE_INPUT_REVISION)throw new Error('Higgsfield Seedance input revision changed; review the preserved values.')
  if(!record(request.values)||!record(request.media))throw new Error('Review Higgsfield Seedance controls and media bindings.')
  assertControlJSON(request.values)
  const properties=schema.properties||{},values:Record<string,FalJson>=Object.create(null),slots:HiggsfieldSeedanceSlot[]=[]
  for(const[key,value]of Object.entries(request.values)){
    if(((!current||inputSchema)&&!owns(properties,key))||owns(MEDIA_FIELDS,key))throw new Error(`The selected Higgsfield Seedance route does not accept the saved control ${key}; it was not discarded or substituted.`)
    values[key]=clone(value)
  }
  for(const[field,sources]of Object.entries(request.media)){
    const binding=owns(MEDIA_FIELDS,field)?MEDIA_FIELDS[field]:undefined
    if(!owns(properties,field)||!binding)throw new Error(`The selected Higgsfield Seedance route does not accept media binding ${field}.`)
    if(!Array.isArray(sources)||!binding.array&&sources.length>1)throw new Error(`Higgsfield Seedance ${field} needs ${binding.array?'an ordered media list':'one source'}.`)
    const fieldSchema=properties[field]
    if((!current||inputSchema)&&fieldSchema.type==='array'&&fieldSchema.maxItems!==undefined&&sources.length>fieldSchema.maxItems)throw new Error(`Higgsfield Seedance ${field} exceeds its declared item count.`)
    if(sources.length===0) {
      if(schema.required?.includes(field))throw new Error(`Higgsfield Seedance requires ${field}.`)
      continue
    }
    for(const[index,source]of sources.entries()){
      if(!record(source)||Object.keys(source).some(key=>!['path','url','mediaType'].includes(key))||source.mediaType!==binding.type||Boolean(source.path)===Boolean(source.url)||source.path!==undefined&&(typeof source.path!=='string'||!source.path)||source.url!==undefined&&(typeof source.url!=='string'||!source.url))throw new Error(`Higgsfield Seedance ${field} needs bound ${binding.type} media with exactly one transport.`)
      if(source.url)assertHiggsfieldPublicUrl(source.url)
      slots.push({field,index,source:clone(source)})
    }
  }
  // Provider-declared defaults only. Optional empty media fields are omitted.
  if(!current||inputSchema)for(const[key,field]of Object.entries(properties))if(!owns(MEDIA_FIELDS,key)&&!owns(values,key)&&owns(field,'default'))values[key]=clone(field.default!)
  const preview=assemble(request.endpointId,values,slots,slots.map((slot,index)=>slot.source.url||`https://media.prism.example/reference-${index}`),current || Boolean(inputSchema))
  return freeze({endpointId:request.endpointId,inputRevision:request.inputRevision,values,slots,preview,...(request.fingerprint!==undefined?{fingerprint:request.fingerprint}:{}),...(inputSchema?{inputSchema:clone(inputSchema)}:{})})
}
export function materializeHiggsfieldSeedanceInput(plan:HiggsfieldSeedanceInputPlan,urls:string[]) {
  if(plan.inputRevision!==HIGGSFIELD_SEEDANCE_INPUT_REVISION)throw new Error('Higgsfield Seedance input revision changed during preparation.')
  if(plan.fingerprint!==undefined&&!plan.inputSchema)throw new Error('The current Higgsfield schema must be owned by main before materialization.')
  return assemble(plan.endpointId,plan.values,plan.slots,[...urls],Boolean(plan.inputSchema))
}
