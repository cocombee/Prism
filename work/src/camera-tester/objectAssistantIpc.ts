export type ObjectAssistantIpcRequest = { version:1; mode:'create'|'revamp'; prompt:string; reference?:{managedPath:string;mediaFamily:'image'}; currentRecipe?:unknown }

export function validateObjectAssistantIpcRequest(input:unknown):ObjectAssistantIpcRequest{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('OBJECT_ASSISTANT_REQUEST_INVALID')
 const source=input as Record<string,unknown>
 const allowed=new Set(['version','mode','prompt','reference','currentRecipe'])
 if(Object.keys(source).some(key=>!allowed.has(key)))throw new Error('OBJECT_ASSISTANT_REQUEST_UNKNOWN_KEY')
 if(source.version!==1||(source.mode!=='create'&&source.mode!=='revamp'))throw new Error('OBJECT_ASSISTANT_REQUEST_INVALID')
 const prompt=typeof source.prompt==='string'?source.prompt.trim():''
 if(!prompt)throw new Error('OBJECT_PROMPT_REQUIRED')
 if(new TextEncoder().encode(prompt).byteLength>16000)throw new Error('OBJECT_PROMPT_TOO_LARGE')
 let reference:ObjectAssistantIpcRequest['reference']
 if(source.reference!==undefined){
  if(!source.reference||typeof source.reference!=='object'||Array.isArray(source.reference))throw new Error('OBJECT_REFERENCE_INVALID')
  const raw=source.reference as Record<string,unknown>
  if(Object.keys(raw).some(key=>key!=='managedPath'&&key!=='mediaFamily')||raw.mediaFamily!=='image')throw new Error('OBJECT_REFERENCE_IMAGE_REQUIRED')
  if(typeof raw.managedPath!=='string'||!/^managed:\/\/[a-zA-Z0-9._/-]+$/.test(raw.managedPath)||raw.managedPath.includes('..'))throw new Error('OBJECT_REFERENCE_UNMANAGED')
  reference={managedPath:raw.managedPath,mediaFamily:'image'}
 }
 if(source.currentRecipe!==undefined&&new TextEncoder().encode(JSON.stringify(source.currentRecipe)).byteLength>128000)throw new Error('OBJECT_RECIPE_TOO_LARGE')
 return {version:1,mode:source.mode,prompt,...(reference?{reference}:{}),...(source.currentRecipe!==undefined?{currentRecipe:structuredClone(source.currentRecipe)}:{})}
}
