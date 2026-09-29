import { describe, expect, it } from 'vitest'
import { validateObjectAssistantIpcRequest } from './objectAssistantIpc'

describe('3D Camera Eighteenth Object assistant IPC guard',()=>{
 it('accepts bounded prompt-only payloads and managed image references',()=>{
  expect(validateObjectAssistantIpcRequest({version:1,mode:'create',prompt:'A lamp'})).toMatchObject({prompt:'A lamp'})
  expect(validateObjectAssistantIpcRequest({version:1,mode:'revamp',prompt:'Change top',reference:{managedPath:'managed://object/a.png',mediaFamily:'image'},currentRecipe:{version:1}})).toMatchObject({mode:'revamp',reference:{mediaFamily:'image'}})
 })
 it('rejects oversized, malformed and unmanaged requests without logging payloads',()=>{
  expect(()=>validateObjectAssistantIpcRequest({version:1,mode:'create',prompt:'x'.repeat(16001)})).toThrow('OBJECT_PROMPT_TOO_LARGE')
  expect(()=>validateObjectAssistantIpcRequest({version:1,mode:'create',prompt:'x',reference:{managedPath:'/tmp/x.png',mediaFamily:'image'}})).toThrow('OBJECT_REFERENCE_UNMANAGED')
  expect(()=>validateObjectAssistantIpcRequest({version:1,mode:'create',prompt:'x',apiKey:'secret'})).toThrow('OBJECT_ASSISTANT_REQUEST_UNKNOWN_KEY')
 })
})
