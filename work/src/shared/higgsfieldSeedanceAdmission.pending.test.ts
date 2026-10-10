import { describe, it, expect, vi } from 'vitest'
import { HIGGSFIELD_RUNNABLE_MODELS, higgsfieldBundledCatalogModels, higgsfieldModel } from './higgsfieldNative'
import { videoModelGroups } from '../renderer/src/NodeCardNext'
const modes=['text-to-video','image-to-video','reference-to-video','video-extend','video-edit']
describe('native Higgsfield Seedance admission baseline',()=>{
  it('admits only the eight verified native routes and keeps unknown documented routes unavailable',()=>{
    expect(HIGGSFIELD_RUNNABLE_MODELS).toHaveLength(8)
    const known=higgsfieldBundledCatalogModels(), groups=videoModelGroups(undefined,{provider:'higgsfield',verified:true,models:[...known,{id:'future/seedance-3.0/text-to-video',label:'Future Seedance',category:'video'}]})
    const options=groups.find(group=>group.service==='higgsfield')!.options
    expect(options.filter(option=>!option.disabled).map(option=>option.value)).toEqual(known.map(model=>'higgsfield-native::'+model.id))
    expect(options.find(option=>option.value.endsWith('future/seedance-3.0/text-to-video'))!.disabled).toBe(true)
    expect(known.filter(model=>model.id.startsWith('bytedance/')).every(model=>model.catalog.service==='Higgsfield'&&model.catalog.company==='ByteDance'&&model.catalog.release==='Seedance 2.5')).toBe(true)
  })
  it('does not admit a schema-only route without an explicit adapter review',async()=>{
    const future='bytedance/seedance-2.5/fixture-only-mode'
    vi.resetModules()
    vi.doMock('./higgsfieldSeedanceInput',async importOriginal=>{
      const actual=await importOriginal<typeof import('./higgsfieldSeedanceInput')>()
      return {...actual,HIGGSFIELD_SEEDANCE25_ROUTES:[...actual.HIGGSFIELD_SEEDANCE25_ROUTES,future],higgsfieldSeedanceSchema:(id:string)=>actual.higgsfieldSeedanceSchema(id===future?'bytedance/seedance-2.5/text-to-video':id)}
    })
    try {
      const input=await import('./higgsfieldSeedanceInput'),native=await import('./higgsfieldNative')
      expect(input.HIGGSFIELD_SEEDANCE25_ROUTES).toContain(future)
      expect(input.higgsfieldSeedanceSchema(future).type).toBe('object')
      expect(()=>native.higgsfieldModel(future)).toThrow('no verified input contract')
      expect(native.higgsfieldBundledCatalogModels().map(model=>model.id)).not.toContain(future)
      expect(native.HIGGSFIELD_RUNNABLE_MODELS).toHaveLength(8)
    } finally { vi.doUnmock('./higgsfieldSeedanceInput');vi.resetModules() }
  })
  it.each(modes)('has a route-owned input contract for %s',mode=>{
    expect(higgsfieldModel('bytedance/seedance-2.5/'+mode)).toBeDefined()
  })
})
