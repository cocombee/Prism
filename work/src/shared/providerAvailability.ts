import type { ServiceProvider } from './types'

export const SERVICE_PROVIDER_IDS = ['higgsfield','elevenlabs','fal','byteplus','fish','omniroute','openai','anthropic','google','deepseek','moonshot'] as const satisfies readonly ServiceProvider[]
export type ProviderSelectionAvailability = {
  mediaConnected: Partial<Record<ServiceProvider, boolean>>
  promptConnected: Partial<Record<ServiceProvider, boolean>>
}
interface ModelOption {value:string;service?:ServiceProvider;catalog?:{service?:string}}
interface ModelGroup<O extends ModelOption>{label:string;service?:ServiceProvider;options:O[]}
const serviceNames:Record<string,ServiceProvider>={'higgsfield':'higgsfield','elevenlabs':'elevenlabs','fal.ai':'fal','fal':'fal','byteplus':'byteplus','fish audio':'fish','fish':'fish','omniroute':'omniroute','openai':'openai','anthropic':'anthropic','anthropic claude':'anthropic','google':'google','google gemini':'google','deepseek':'deepseek','kimi':'moonshot','moonshot':'moonshot'}
export function modelChoiceService(option:ModelOption,groupService?:ServiceProvider):ServiceProvider|undefined {
  // Company/brand is deliberately excluded: fal/Higgsfield can serve models from the same company.
  if(option.service)return option.service
  const catalog=option.catalog?.service?.toLowerCase()
  if(catalog&&serviceNames[catalog])return serviceNames[catalog]
  if(groupService)return groupService
  const prefix=option.value.split('::')[0]
  if(prefix==='fal-native')return'fal'
  if(prefix==='higgsfield-native')return'higgsfield'
  if(prefix==='elevenlabs-direct')return'elevenlabs'
  if(prefix==='fish-audio')return'fish'
  if(option.value.includes('::')&&SERVICE_PROVIDER_IDS.includes(prefix as ServiceProvider))return prefix as ServiceProvider
  return undefined
}
export function filterProviderModelGroups<O extends ModelOption,G extends ModelGroup<O>>(groups:G[],connected:Partial<Record<ServiceProvider,boolean>>):G[]{
  return groups.map(group=>({...group,options:group.options.filter(option=>{const service=modelChoiceService(option,group.service);return !service||connected[service]===true})})).filter(group=>group.options.length)
}
