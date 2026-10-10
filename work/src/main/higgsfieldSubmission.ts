import { createHash, randomUUID } from 'node:crypto'
import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'
import { HIGGSFIELD_API } from '../shared/higgsfieldNative'

/** Main-only immutable wire receipt. Never expose its body, key or signed URLs to renderer. */
export interface HiggsfieldSubmission { endpointId: string; body: string; idempotencyKey: string; digest: string }
const route = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*){1,7}$/
const hash = (endpointId:string,body:string,key:string) => createHash('sha256').update(JSON.stringify([endpointId,body,key])).digest('hex')
export function validateHiggsfieldSubmission(value:unknown):HiggsfieldSubmission {
  const receipt=value as HiggsfieldSubmission
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||Object.keys(receipt).some(key=>!['endpointId','body','idempotencyKey','digest'].includes(key))||typeof receipt.endpointId!=='string'||receipt.endpointId.length>240||!route.test(receipt.endpointId)||typeof receipt.body!=='string'||Buffer.byteLength(receipt.body)>HIGGSFIELD_RESOURCE_LIMITS.wireBytes||typeof receipt.idempotencyKey!=='string'||!/^[\x21-\x7e]{1,255}$/.test(receipt.idempotencyKey)||typeof receipt.digest!=='string'||receipt.digest!==hash(receipt.endpointId,receipt.body,receipt.idempotencyKey))throw new Error('The protected Higgsfield submission receipt is invalid. Preserve it for review.')
  let body:unknown;try{body=JSON.parse(receipt.body)}catch{throw new Error('The protected Higgsfield submission body is invalid.')}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('The protected Higgsfield submission body is invalid.')
  return {...receipt}
}
export function createHiggsfieldSubmission(endpointId:string,input:Record<string,unknown>):HiggsfieldSubmission {
  const body=JSON.stringify(input),idempotencyKey=randomUUID()
  return validateHiggsfieldSubmission({endpointId,body,idempotencyKey,digest:hash(endpointId,body,idempotencyKey)})
}
/** Only the original request's API-origin status/cancel route may receive credentials. Query bytes remain opaque. */
export function higgsfieldRequestUrl(value:unknown,requestId:string,action:'status'|'cancel'):string {
  if(typeof value!=='string'||value.length>8192||/[\u0000-\u0020\u007f]/.test(value)||!/^[A-Za-z0-9_-]{1,128}$/.test(requestId))throw new Error('Higgsfield returned a foreign request URL.')
  let parsed:URL;try{parsed=new URL(value)}catch{throw new Error('Higgsfield returned a foreign request URL.')}
  if(parsed.origin!==HIGGSFIELD_API||parsed.username||parsed.password||parsed.hash||parsed.pathname!==`/requests/${requestId}/${action}`||value!==parsed.href)throw new Error('Higgsfield returned a foreign request URL.')
  return value
}
