import {describe,it,expect} from 'vitest'
import {mkdtemp,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {createHiggsfieldSubmission,validateHiggsfieldSubmission} from './higgsfieldSubmission'
import {HiggsfieldJobStore} from './higgsfieldJobStore'
import {HIGGSFIELD_RESOURCE_LIMITS} from './higgsfieldResourceLimits'

describe('Higgsfield bounded multimodal wire and recovery capacity',()=>{
  it('retains exact50long URLs and a55000character prompt in a validated immutable receipt',()=>{
    const url='https://cdn.prism.example/'+ 'x'.repeat(8000)
    const input={prompt:'x'.repeat(55000),image_urls:Array(30).fill(url),video_urls:Array(10).fill(url),audio_urls:Array(10).fill(url),duration:30}
    const receipt=createHiggsfieldSubmission('bytedance/seedance-2.5/reference-to-video',input)
    expect(Buffer.byteLength(receipt.body)).toBeGreaterThan(64*1024)
    expect(receipt.body).toBe(JSON.stringify(input))
    expect(validateHiggsfieldSubmission(receipt)).toEqual(receipt)
    expect(JSON.parse(receipt.body).audio_urls).toHaveLength(10)
  })
  it('rejects an oversized wire without shortening text or dropping references',()=>{
    const input={prompt:'x'.repeat(HIGGSFIELD_RESOURCE_LIMITS.wireBytes+1)},before=JSON.stringify(input)
    expect(()=>createHiggsfieldSubmission('bytedance/seedance-2.5/text-to-video',input)).toThrow(/receipt is invalid/)
    expect(JSON.stringify(input)).toBe(before)
  })
  it('retains the old short receipt representation, digest and key across readback',()=>{
    const receipt=createHiggsfieldSubmission('higgsfield/genjutsu/restyle/v1.0',{prompt:'Exact old body.'})
    expect(validateHiggsfieldSubmission(JSON.parse(JSON.stringify(receipt)))).toEqual(receipt)
    expect(()=>validateHiggsfieldSubmission({...receipt,body:receipt.body+' '})).toThrow()
  })
  it('writes and reopens a protected record larger than the previous256KiB cap without changing its owner',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'prism-higgs-resource-'))
    const scope={projectId:'fictional-project',rootPath:'/fixture/project',documentPath:'/fixture/project/Fixture.prismflow',nodeId:'fictional-node'}
    // Clearly fictional reversible adapter; actual OS secure storage is not exercised.
    const protection={encrypt:(value:string)=>Buffer.from(value),decrypt:(value:Buffer)=>value.toString()}
    const sealedRequest=Buffer.from('x'.repeat(900000)).toString('base64')
    try{
      const store=new HiggsfieldJobStore(directory,undefined,undefined,protection)
      const job=await store.prepare(scope,{endpointId:'higgsfield/genjutsu/motion-transfer/v1.0',profileId:'fictional-profile',fingerprint:'a'.repeat(64),sealedRequest})
      const reopened=new HiggsfieldJobStore(directory,undefined,undefined,protection)
      expect(await reopened.get(scope,job.id)).toEqual(job)
      await expect(reopened.get({...scope,projectId:'another-project'},job.id)).rejects.toThrow(/does not belong/)
    }finally{await rm(directory,{recursive:true,force:true})}
  })
})
