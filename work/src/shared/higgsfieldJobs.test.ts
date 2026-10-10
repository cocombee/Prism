import {describe,expect,it} from 'vitest'
import {higgsfieldJobReadinessFailures,higgsfieldRecoveryActionDisabled,type HiggsfieldJobView} from './higgsfieldJobs'
import {resetHiggsfieldBinding,type HiggsfieldNodeState} from './higgsfieldNodeBinding'
const job:HiggsfieldJobView={id:'attempt',nodeId:'node',endpointId:'higgsfield/genjutsu/motion-transfer/v1.0',state:'unknown',createdAt:'2026-10-09T00:00:00.000Z',updatedAt:'2026-10-09T00:00:00.000Z',recoveryRequired:true}
describe('owned Higgsfield renderer readiness',()=>{
 it('blocks a native/preserved Higgsfield node until the owned journal loads',()=>{expect(higgsfieldJobReadinessFailures('node',{loading:true},true)).toHaveLength(1);expect(higgsfieldJobReadinessFailures('node',{},true)).toHaveLength(1);expect(higgsfieldJobReadinessFailures('voice',{loading:true},false)).toEqual([])})
 it('blocks owned errors and pending jobs even after another route is selected',()=>{expect(higgsfieldJobReadinessFailures('node',{error:'Malformed journal'},true)).toEqual(['Malformed journal']);expect(higgsfieldJobReadinessFailures('voice',{error:'Malformed journal'},false)).toEqual([]);expect(higgsfieldJobReadinessFailures('node',{jobs:[job]},false)).toHaveLength(1);expect(higgsfieldJobReadinessFailures('other',{jobs:[job]},false)).toEqual([])})
 it('distinguishes completed-but-unpersisted and resolved/persisted jobs',()=>{expect(higgsfieldJobReadinessFailures('node',{jobs:[{...job,state:'completed'}]},true)).toHaveLength(1);for(const state of ['persisted','reviewed','failed','nsfw','canceled'] as const)expect(higgsfieldJobReadinessFailures('node',{jobs:[{...job,state,recoveryRequired:false}]},true)).toEqual([])})
 it('blocks another Run while that node recovery is in progress',()=>{expect(higgsfieldJobReadinessFailures('node',{jobs:[],busy:'node'},true)).toHaveLength(1);expect(higgsfieldJobReadinessFailures('other',{jobs:[],busy:'node'},true)).toEqual([])})
 it('preserves unsupported saved routes/values during Reset All without inventing a contract',()=>{const state:HiggsfieldNodeState={endpointId:'higgsfield/retired-model/v0',label:'Saved unavailable route',contractRevision:'old',values:{seed:7,resolution:'4k'},allowSourceTrimming:true,retiredPorts:[{id:'old-frame',label:'Old frame',signal:'image'}]};const before=JSON.stringify(state);expect(resetHiggsfieldBinding(state)).toBe(state);expect(JSON.stringify(state)).toBe(before)})
})

describe('Higgsfield original-request recovery action availability',()=>{
 it('permits check/recover for a verified protected unknown submission, not cancellation',()=>{
  const current={...job,canReconcile:true}
  expect(higgsfieldRecoveryActionDisabled(current,'check')).toBe(false)
  expect(higgsfieldRecoveryActionDisabled(current,'recover')).toBe(false)
  expect(higgsfieldRecoveryActionDisabled(current,'cancel')).toBe(true)
 })
 it('keeps legacy unknown IDs unavailable unless explicitly reviewing the dashboard',()=>{
  for(const action of ['check','recover','cancel'] as const)expect(higgsfieldRecoveryActionDisabled(job,action)).toBe(true)
  expect(higgsfieldRecoveryActionDisabled(job,'review')).toBe(true)
  expect(higgsfieldRecoveryActionDisabled(job,'review',{dashboardReviewed:true})).toBe(false)
 })
 it('does not bypass loading, busy or original-document ownership with reconciliation',()=>{
  const current={...job,canReconcile:true}
  for(const options of [{loading:true},{busy:'node'}])expect(higgsfieldRecoveryActionDisabled(current,'check',options)).toBe(true)
  expect(higgsfieldRecoveryActionDisabled({...current,ownerMatches:false},'check')).toBe(true)
  expect(higgsfieldRecoveryActionDisabled({...current,ownerMatches:false,canRelocate:true},'relocate')).toBe(false)
 })
 it('preserves accepted/completed/persisted action semantics',()=>{
  const known={...job,requestId:'accepted'}
  expect(higgsfieldRecoveryActionDisabled(known,'check')).toBe(false)
  expect(higgsfieldRecoveryActionDisabled({...known,state:'completed'},'cancel')).toBe(true)
  expect(higgsfieldRecoveryActionDisabled({...known,state:'persisted',recoveryRequired:false},'recover')).toBe(false)
  expect(higgsfieldRecoveryActionDisabled({...known,state:'persisted',recoveryRequired:false},'check')).toBe(true)
 })
})
