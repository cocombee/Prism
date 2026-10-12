import { describe, expect, it } from 'vitest'
import { describeHiggsfieldInputContract, higgsfieldFieldPortId } from './higgsfieldInputContract'
import { higgsfieldInputReadinessFailures, reconcileHiggsfieldNodeBinding, resetHiggsfieldBinding, selectHiggsfieldBinding } from './higgsfieldNodeBinding'
import { HIGGSFIELD_SEEDANCE25_ROUTES, higgsfieldSeedanceSchema } from './higgsfieldSeedanceInput'
import { nodeInputPorts } from './nodePorts'
import { connectionCompatibilityError, pruneSurplusInputEdges } from './nodeConnections'
import type { StudioNode } from './types'
import { connectedInputRule } from './inputRules'

const root = 'bytedance/seedance-2.5/'
const selected = (endpoint: string) => selectHiggsfieldBinding({}, endpoint, []).higgsfieldNative
describe('Higgsfield per-route graph and saved current controls', () => {
  it.each(HIGGSFIELD_SEEDANCE25_ROUTES)('declares exact %s media sockets and source timing', endpoint => {
    const state = selected(endpoint), ports = nodeInputPorts({ kind: 'video-generator', higgsfieldNative: state })
    const expected = describeHiggsfieldInputContract(endpoint, higgsfieldSeedanceSchema(endpoint), '')
    expect(ports.filter(port => port.id.startsWith('higgsfield-input::')).map(port => port.id)).toEqual(expected.media.map(binding => binding.portId))
    expect(ports.some(port => port.id === 'storyboard-in')).toBe(!endpoint.endsWith('/video-edit'))
    expect(ports.some(port => port.id === 'video-in')).toBe(false)
    expect(state.contractRevision).toMatch(/seedance/)
    expect(state.values).not.toHaveProperty('preset_id')
    expect(state.allowSourceTrimming).toBeUndefined()
  })
  it('uses each exact media type and aggregate array capacity at connection admission', () => {
    const state = selected(root + 'reference-to-video'), target = { kind: 'video-generator' as const, higgsfieldNative: state }
    expect(connectionCompatibilityError({kind:'upload',outputType:'audio'}, target, 'media-out', higgsfieldFieldPortId('audio_urls'))).toBeNull()
    expect(connectionCompatibilityError({kind:'upload',outputType:'video'}, target, 'media-out', higgsfieldFieldPortId('video_urls'))).toBeNull()
    expect(connectionCompatibilityError({kind:'upload',outputType:'image'}, target, 'media-out', higgsfieldFieldPortId('video_urls'))).toMatch(/video assets/i)
    expect(connectionCompatibilityError({kind:'character'}, target, 'media-out', higgsfieldFieldPortId('image_urls'))).toBeNull()
    expect(nodeInputPorts(target).find(port => port.id === higgsfieldFieldPortId('image_urls'))!.maxConnections).toBe(30)
  })
  it('retains incompatible mode sockets, values and incomplete drafts through switches and JSON reopen', () => {
    const first = selected(root + 'image-to-video'); first.values.duration = 10; first.drafts = { duration: '1e' }
    const old = { id: higgsfieldFieldPortId('image_url'), label: 'Starting Image', signal: 'image' as const }
    const switched = selectHiggsfieldBinding({higgsfieldNative:first}, root + 'reference-to-video', [old])
    expect(switched.higgsfieldNative.retiredPorts).toContainEqual(old)
    expect(nodeInputPorts({kind:'video-generator',higgsfieldNative:switched.higgsfieldNative}).find(port => port.id === old.id)!.maxConnections).toBe(0)
    const reopened = JSON.parse(JSON.stringify(switched))
    const restored = selectHiggsfieldBinding(reopened, first.endpointId, []).higgsfieldNative
    expect(restored.values.duration).toBe(10); expect(restored.drafts).toEqual({duration:'1e'})
    restored.values.duration = 5
    expect(first.values.duration).toBe(10)
  })
  it('preserves authored controls and removed bindings when a current contract changes', () => {
    const endpoint = root + 'image-to-video', state = selected(endpoint)
    state.values.resolution = '1080p'; state.values.removed = 'authored'; state.values.duration = 5; state.drafts = { duration:'-' }
    const schema = higgsfieldSeedanceSchema(endpoint); delete schema.properties!.end_image_url
    schema.properties!.resolution.enum = ['720p']; schema.properties!.duration.default = 8
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'new')
    const next = reconcileHiggsfieldNodeBinding(state, contract)
    expect(next.values.resolution).toBe('1080p'); expect(next.values.removed).toBe('authored')
    expect(next.values.duration).toBe(5); expect(next.drafts).toEqual({duration:'-'})
    expect(next.repairs!.join(' ')).toMatch(/resolution/); expect(next.repairs!.join(' ')).toMatch(/removed/)
    expect(next.media!.find(field => field.key === 'end_image_url')!.retired).toBe(true)
    const ports = nodeInputPorts({kind:'video-generator',higgsfieldNative:next})
    expect(ports.find(port => port.id === higgsfieldFieldPortId('end_image_url'))!.maxConnections).toBe(0)
  })
  it('reset uses the current minimum duration but keeps saved connections and outer prompt', () => {
    const endpoint = root + 'text-to-video', state = selected(endpoint), schema = higgsfieldSeedanceSchema(endpoint)
    schema.properties!.duration.default = 8; state.values.duration = 10; state.drafts = {duration:'-'}
    state.retiredPorts = [{id:'old',label:'Old',signal:'image'}]
    const reset = resetHiggsfieldBinding(state, describeHiggsfieldInputContract(endpoint, schema, 'current'))
    expect(reset.values.duration).toBe(4); expect(reset.values).not.toHaveProperty('prompt')
    expect(reset.retiredPorts).toEqual(state.retiredPorts); expect(reset.drafts).toEqual({})
  })
  it('retains overloaded graph edges for repair instead of silently pruning them', () => {
    const state = selected(root + 'image-to-video')
    const target: StudioNode = {id:'target',type:'studio',position:{x:0,y:0},data:{kind:'video-generator',title:'Target',higgsfieldNative:state}}
    const source: StudioNode = {id:'source',type:'studio',position:{x:0,y:0},data:{kind:'upload',title:'Image',outputType:'image',assetPath:'/managed/a.png'}}
    const edges = [1,2].map(id => ({id:String(id),source:source.id,target:target.id,sourceHandle:'media-out',targetHandle:higgsfieldFieldPortId('image_url')}))
    expect(pruneSurplusInputEdges(edges,[target,source]).edges).toEqual(edges)
  })
  it('describes native reference roles without assigning every video Genjutsu source authority', () => {
    const source = {kind:'upload' as const,title:'Clip',outputType:'video' as const}
    const target = {kind:'video-generator' as const,title:'Generator',higgsfieldNative:selected(root+'reference-to-video')}
    const rule = connectedInputRule(source,target,higgsfieldFieldPortId('video_urls'))
    expect(rule.label).toBe('Video References'); expect(rule.rule).toMatch(/roles and constraints explicitly assigned/)
    expect(rule.rule).toMatch(/Other references retain/);expect(rule.toggleable).toBeUndefined();expect(rule.mode).toBeUndefined()
    const extended = {...target,higgsfieldNative:selected(root+'video-extend')}
    expect(connectedInputRule(source,extended,higgsfieldFieldPortId('video_url')).rule).toMatch(/separate from the generated extension/)
    const audio = {...source,outputType:'audio' as const}
    expect(connectedInputRule(audio,target,higgsfieldFieldPortId('audio_urls')).label).toBe('Audio References')
    const style = {kind:'style-reference' as const,title:'Style'}
    expect(connectedInputRule(style,target,'style-in').rule).toMatch(/visual-language authority/)
  })
})


describe('current Higgsfield input review', () => {
  it('fills a new unselected route from current defaults, without changing a saved selection', () => {
    const state = selected(root + 'text-to-video'), schema = higgsfieldSeedanceSchema(state.endpointId)
    expect(state.values).toEqual({})
    schema.properties!.duration.default = 8
    const contract = describeHiggsfieldInputContract(state.endpointId, schema, 'a'.repeat(64))
    expect(reconcileHiggsfieldNodeBinding(state, contract).values.duration).toBe(4)
    expect(reconcileHiggsfieldNodeBinding({ ...state, values: { duration: 5 } }, contract).values.duration).toBe(5)
  })
  it('requires an owned current contract and exposes lookup, draft and unsupported repairs', () => {
    const state = selected(root + 'text-to-video')
    const contract = describeHiggsfieldInputContract(state.endpointId, higgsfieldSeedanceSchema(state.endpointId), 'a'.repeat(64))
    expect(higgsfieldInputReadinessFailures(state, {})).toEqual(['load current Higgsfield model inputs'])
    expect(higgsfieldInputReadinessFailures(state, { error: 'Lookup failed' })).toEqual(['Lookup failed'])
    expect(higgsfieldInputReadinessFailures(state, { contract })).toEqual(['review the refreshed Higgsfield model inputs'])
    const bound = reconcileHiggsfieldNodeBinding(state, contract)
    expect(higgsfieldInputReadinessFailures(bound, { contract })).toEqual([])
    expect(higgsfieldInputReadinessFailures({ ...bound, drafts: { duration: '-' } }, { contract })).toEqual(['finish the preserved duration edit'])
    expect(higgsfieldInputReadinessFailures({ ...bound, repairs: ['Review connections'] }, { contract })).toEqual(['Review connections'])
    expect(higgsfieldInputReadinessFailures({ ...bound, repairs: [], reviewedFingerprint: bound.fingerprint }, { contract: { ...contract, unsupportedInputs: [{ key: 'new', reason: 'Adapter review' }] } })).toEqual(['Adapter review'])
  })
  it('binds review acknowledgement only to that fingerprint and retains Genjutsu behavior', () => {
    const state = selected(root + 'text-to-video'), schema = higgsfieldSeedanceSchema(state.endpointId)
    const contract = describeHiggsfieldInputContract(state.endpointId, schema, 'a'.repeat(64))
    const bound = { ...reconcileHiggsfieldNodeBinding(state, contract), reviewedFingerprint: contract.fingerprint, values: { ...state.values, removed: 'authored' } }
    expect(reconcileHiggsfieldNodeBinding(bound, contract).repairs).toEqual([])
    const changed = reconcileHiggsfieldNodeBinding(bound, { ...contract, fingerprint: 'b'.repeat(64) })
    expect(changed.reviewedFingerprint).toBeUndefined(); expect(changed.repairs!.join(' ')).toContain('removed')
    const gen = selectHiggsfieldBinding({}, 'higgsfield/genjutsu/restyle/v1.0', []).higgsfieldNative
    expect(higgsfieldInputReadinessFailures(gen, { error: 'Seedance lookup failed' })).toEqual([])
    expect(higgsfieldInputReadinessFailures({ ...gen, endpointId: 'retired/route' }, {})).toEqual([expect.stringContaining('saved Higgsfield route')])
  })
})
