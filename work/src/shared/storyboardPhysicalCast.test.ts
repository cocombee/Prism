import { resolveStoryboardPhysicalCast } from './storyboardPhysicalCast'
import { describe, expect, it } from 'vitest'
import { buildContinuityLedger, productionShotSpecSections, positiveLocks } from './shotSpec'
import { providerPromptPreviewCompilation, providerSeedancePayloadCompilation } from './referenceInstructions'
import { generationRequirementFailures } from './generationReadiness'
import { validateSeedanceDirectorPrompt } from './seedanceDirectorValidation'
import { buildStoryboardConnectedContextManifest, storyboardTypedContinuityManifest } from './storyboardRewrite'
import type { GenerationRequest, StoryboardPanel, StudioNode } from './types'

const base = (): GenerationRequest => ({ nodeId: 'cast-qa', kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/reference-to-video', prompt: '@maya studies the cup.', duration: 5, references: [{ role: 'character', tag: '@maya', path: '/fictional/maya.png', characterAuthorityMode: 'complete-dressed-body' }], storyboardShots: [{ panelId: 'one', prompt: '@maya studies the cup.', duration: 5, camera: 'static', shotSize: 'medium', continuityGroupId: 'kitchen', characterStates: [{ characterTag: '@maya', handState: 'left hand grips cup', worldPosition: 'set-left station', visibility: 'off-camera' }] }] })
const panels = (request: GenerationRequest): StoryboardPanel[] => request.storyboardShots!.map(shot => ({ ...shot, id: shot.panelId!, shotSize: shot.shotSize as StoryboardPanel['shotSize'], camera: shot.camera as StoryboardPanel['camera'] }))
const contextNodes = (input: StoryboardPanel[]): StudioNode[] => [
  { id: 'story', type: 'studio', position: {x:0,y:0}, data: {kind:'storyboard',title:'Storyboard',storyboardPanels:input} },
  ...['maya','ben'].map(id => ({id,type:'studio',position:{x:0,y:0},data:{kind:'character',title:id,referenceTag:'@'+id}} as StudioNode)),
]
const edges = ['maya','ben'].map(source => ({id:source,source,target:'story',targetHandle:'character-in'}))

describe('authored physical cast ownership across provider and rewrite boundaries', () => {
  it('rejects orphan state in both compilers and readiness without inferring cast from a connected image', () => {
    const input=base(), frozen=JSON.stringify(input)
    expect(() => buildContinuityLedger(input)).toThrow(/physical cast.*@maya/i)
    expect(() => providerPromptPreviewCompilation(input)).toThrow(/physical cast.*@maya/i)
    expect(() => productionShotSpecSections(input)).toThrow(/physical cast.*@maya/i)
    expect(generationRequirementFailures(input)).toEqual(expect.arrayContaining([expect.stringMatching(/physical cast.*@maya/i)]))
    expect(JSON.stringify(input)).toBe(frozen)
  })
  it('returns a validation failure for orphan delta instead of accepting an empty derived ledger', () => {
    const input=base();input.storyboardShots![0].characterStateDeltas=input.storyboardShots![0].characterStates;delete input.storyboardShots![0].characterStates
    expect(validateSeedanceDirectorPrompt('NEGATIVE PROMPT\nNo resets.',input)).toMatchObject({ok:false,errors:expect.arrayContaining([expect.stringMatching(/physical cast.*@maya/i)])})
  })
  it('distinguishes explicit empty cast from absent inherited cast and carries that empty selection', () => {
    const input=base();input.storyboardShots![0].activeCharacterTags=['@maya'];input.storyboardShots!.push({panelId:'two',prompt:'The room stays empty.',duration:1,camera:'static',shotSize:'wide',continuityGroupId:'kitchen',activeCharacterTags:[]},{panelId:'three',prompt:'The doorway remains empty.',duration:1,camera:'static',shotSize:'wide',continuityGroupId:'kitchen'});input.duration=7
    const ledger=buildContinuityLedger(input)
    expect(ledger.shots.map(shot=>shot.activeCharacterTags)).toEqual([['@maya'],[],[]])
    expect(ledger.shots[1].characterStates).toEqual([])
    expect(positiveLocks(input)).not.toMatch(/Only.*person|Only.*people/)
    expect(providerPromptPreviewCompilation(input).text).toContain('PHYSICAL CAST · none')
  })
  it('retains established off-camera state and sparse prop delta within the same authored group', () => {
    const input=base();input.storyboardShots![0].activeCharacterTags=['@maya'];input.storyboardShots!.push({panelId:'two',prompt:'The cup remains beside her.',duration:1,camera:'static',shotSize:'close-up',continuityGroupId:'kitchen',characterStateDeltas:[{characterTag:'@maya',propOwnership:['same cup']}]});input.duration=6
    const second=buildContinuityLedger(input).shots[1]
    expect(positiveLocks(input)).not.toMatch(/Only.*person|Only.*people/)
    expect(second.characterStates).toEqual([expect.objectContaining({characterTag:'@maya',visibility:'off-camera',handState:'left hand grips cup',worldPosition:'set-left station',propOwnership:['same cup']})])
    expect(providerPromptPreviewCompilation(input).text).toContain('visibility=off-camera')
  })
  it('requires an owner to be re-established after an authored group change', () => {
    const input=base();input.storyboardShots![0].activeCharacterTags=['@maya'];input.storyboardShots!.push({panelId:'two',prompt:'A new location.',duration:1,camera:'static',shotSize:'wide',continuityGroupId:'outside',characterStateDeltas:[{characterTag:'@maya',worldPosition:'doorway'}]});input.duration=6
    expect(() => buildContinuityLedger(input)).toThrow(/panel 2.*physical cast.*@maya/i)
  })
  it('honors an explicit exclusion without changing the authored record', () => {
    const input=base();input.storyboardShots![0].excludedCharacterTags=['@maya'];const frozen=JSON.stringify(input)
    expect(buildContinuityLedger(input).shots[0].characterStates).toEqual([])
    expect(generationRequirementFailures(input).filter(e=>/physical cast/i.test(e))).toEqual([])
    expect(JSON.stringify(input)).toBe(frozen)
  })
  it('leaves Manual text byte-exact even when unused typed state is incomplete', () => {
    const input={...base(),providerPromptOverride:'  原文\nKeep my exact approved text.  '}
    expect(providerSeedancePayloadCompilation(input).text).toBe(input.providerPromptOverride)
    expect(generationRequirementFailures(input).filter(e=>/physical cast/i.test(e))).toEqual([])
  })
  it('rejects orphan rewrite state and preserves author omissions while resolving established physical cast', () => {
    const input=base();expect(()=>storyboardTypedContinuityManifest(panels(input))).toThrow(/physical cast.*@maya/i)
    input.storyboardShots![0].activeCharacterTags=['@maya'];input.storyboardShots!.push({panelId:'two',prompt:'She keeps holding it off camera.',duration:1,camera:'static',shotSize:'medium',continuityGroupId:'kitchen',characterStateDeltas:[{characterTag:'@maya',visibility:'off-camera'}]});const rows=panels(input),frozen=JSON.stringify(rows)
    const manifest=storyboardTypedContinuityManifest(rows)
    expect(manifest).toContain('"effectivePhysicalCast":["@maya"]')
    expect(JSON.stringify(rows)).toBe(frozen)
    expect(rows[1].activeCharacterTags).toBeUndefined()
  })
  it('scopes rewrite Character context to inherited cast and excludes all Characters for explicit empty cast', () => {
    const input=base();input.storyboardShots![0].activeCharacterTags=['@maya'];const rows=panels(input);rows.push({id:'two',prompt:'The camera keeps moving.',duration:1,continuityGroupId:'kitchen'})
    const inherited=buildStoryboardConnectedContextManifest('story',contextNodes(rows),edges,rows[1].prompt,rows[1]);expect(inherited.entries.filter(e=>e.role==='Character').map(e=>e.tag)).toEqual(['@maya'])
    rows[1].activeCharacterTags=[];const empty=buildStoryboardConnectedContextManifest('story',contextNodes(rows),edges,rows[1].prompt,rows[1]);expect(empty.entries.filter(e=>e.role==='Character')).toEqual([])
  })
  it('rejects malformed state lists and owner records with reviewable errors', () => {
    for (const characterStates of [null, {}, [null], [{ characterTag: '@Image1' }]]) {
      const shot = { activeCharacterTags: ['@maya'], characterStates } as unknown as StoryboardPanel
      const result = resolveStoryboardPhysicalCast([shot])
      expect(result.errors.length).toBeGreaterThan(0)
      expect(JSON.stringify(shot)).toBe(JSON.stringify({ activeCharacterTags: ['@maya'], characterStates }))
    }
  })
  it('removes inactive owned appearances and untagged Characters from known empty rewrite cast', () => {
    const rows: StoryboardPanel[] = [{ id: 'one', prompt: 'Empty room.', duration: 1, activeCharacterTags: [] }]
    const nodes = contextNodes(rows)
    nodes.push({ id: 'coat', type: 'studio', position: {x:0,y:0}, data: {kind:'wardrobe',title:'Coat',referenceTag:'@coat',appearanceOwnerCharacterTag:'@maya'} })
    nodes.push({ id: 'unnamed', type: 'studio', position: {x:0,y:0}, data: {kind:'character',title:''} })
    const manifest = buildStoryboardConnectedContextManifest('story', nodes, [...edges, {id:'coat',source:'coat',target:'maya'}, {id:'unnamed',source:'unnamed',target:'story'}], rows[0].prompt!, rows[0])
    expect(manifest.entries.filter(entry => entry.role === 'Character' || entry.role === 'Appearance')).toEqual([])
    rows[0].activeCharacterTags = ['@maya']
    const active = buildStoryboardConnectedContextManifest('story', nodes, [...edges, {id:'coat',source:'coat',target:'maya'}], rows[0].prompt!, rows[0])
    expect(active.entries.filter(entry => entry.role === 'Appearance').map(entry => entry.tag)).toEqual(['@coat'])
  })

  it('preserves recognized complete Auto master when unused typed metadata is orphaned', () => {
    const input = base()
    const authored = ['FORMAT MODE','one continuous shot','SHOT 1','@maya stays beside the cup.','SCENE CONTEXT','Kitchen','ACTIVE REFERENCES','@maya','CAMERA','static','LIGHTING','window light','STYLE','natural','CONTINUITY','same cup','CHARACTER ACTING','quiet','PHYSICS','grounded','AUDIO','room tone','QUALITY','clean','NEGATIVE PROMPT','resets'].join('\n')
    input.authoredPrompt = authored
    const before = JSON.stringify(input)
    expect(providerPromptPreviewCompilation(input).text).toBe(authored)
    expect(providerSeedancePayloadCompilation(input).text).toContain('@Image1 stays beside the cup.')
    expect(generationRequirementFailures(input).filter(error => /physical cast/i.test(error))).toEqual([])
    expect(JSON.stringify(input)).toBe(before)
  })
  it('does not add same-body role instructions to a beat with known empty physical cast', () => {
    const input = base();input.storyboardShots![0].activeCharacterTags = ['@maya']
    input.references![0].characterAuthorityMode = 'identity-body-with-layers';input.references![0].name = 'Maya'
    input.references!.push({role:'wardrobe',tag:'@coat',path:'/fictional/coat.png',boundCharacterTag:'@maya',appearanceScope:'wardrobe',appearanceSelection:'explicit-replacement'})
    input.storyboardShots!.push({panelId:'empty',prompt:'The empty room holds.',duration:1,camera:'static',shotSize:'wide',continuityGroupId:'kitchen',activeCharacterTags:[]});input.duration=6
    const text = providerPromptPreviewCompilation(input).text
    const beat = text.slice(text.indexOf('The empty room holds.')).split('NEGATIVE PROMPT')[0]
    expect(beat).toContain('PHYSICAL CAST · none')
    expect(beat).not.toContain('Use @maya as Maya.')
    expect(beat).not.toContain('Use @coat for @maya')
    expect(text).toContain('Use @maya as Maya.')
  })

  it('does not exempt native Auto typed state merely because it has a compiled final override', () => {
    const input = { ...base(), providerPromptOverride:'Compiled final text', providerPromptOwnership:'compiled' as const, falNative:{endpointId:'bytedance/seedance-2.5/reference-to-video',fingerprint:'a'.repeat(64),flow:'video' as const,values:{generate_audio:true},media:{}} }
    expect(generationRequirementFailures(input)).toEqual(expect.arrayContaining([expect.stringMatching(/physical cast.*@maya/i)]))
    expect(generationRequirementFailures({...input,providerPromptOwnership:'authored'}).filter(error=>/physical cast/i.test(error))).toEqual([])
  })

})
