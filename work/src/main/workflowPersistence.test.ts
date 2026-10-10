import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ProjectCommandQueue } from './projectCommandQueue'
import { loadOwnedWorkflow, saveOwnedWorkflow } from './workflowPersistence'
import { workflowSaveOwnerKey, type WorkflowSaveOwner } from '../shared/workflowSaveOwnership'
import type { WorkflowDocument } from '../shared/types'
import { withProjectServiceProfileOverride } from '../shared/serviceProfiles'
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root,{recursive:true,force:true}) })
const source = ts.createSourceFile('index.ts',readFileSync(new URL('index.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
function actual<T>(names: string[], bindings: Record<string,unknown>): T {
  const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text))
  expect(declarations).toHaveLength(names.length)
  const code = ts.transpileModule(declarations.map(node => node.getText(source)).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  return new Function(...Object.keys(bindings),code+`\nreturn {${names.join(',')}};`)(...Object.values(bindings)) as T
}
function deferred<T>() { let resolve!: (value:T)=>void; const promise=new Promise<T>(r=>{resolve=r});return{promise,resolve} }
async function fixture() {
  const root=await mkdtemp(join(tmpdir(),'prism-workflow-owner-'));roots.push(root)
  const A:WorkflowSaveOwner={projectId:'fictional-A',rootPath:join(root,'Project A'),documentPath:join(root,'Project A','Project.prismflow')},B:WorkflowSaveOwner={projectId:'fictional-B',rootPath:join(root,'Project B'),documentPath:join(root,'Project B','Project.prismflow')}
  for(const owner of [A,B])await mkdir(join(owner.rootPath,'05. Canvas'),{recursive:true})
  const io=actual<{atomicJson(path:string,value:unknown):Promise<void>;readStrictJsonOr<T>(path:string,fallback:T,label:string):Promise<T>}>(['atomicJson','readStrictJson','readStrictJsonOr','isMissingFileError'],{writeFile,rename,readFile,randomUUID})
  let current=A
  const queue=new ProjectCommandQueue(),writes:string[]=[],document:WorkflowDocument={schemaVersion:1,id:'fixture-workflow',name:'Fixture',createdAt:'fictional',nodes:[],edges:[],viewport:{x:0,y:0,zoom:1},updatedAt:'fictional'}
  const deps={currentOwner:()=>current,runForOwner:<T>(key:string,action:()=>Promise<T>)=>queue.runForOwner(key,()=>workflowSaveOwnerKey(current),action),saveCanonical:vi.fn(async(doc:WorkflowDocument)=>{writes.push('canonical:'+current.projectId);await io.atomicJson(join(current.rootPath,'05. Canvas','workflow.json'),doc)}),savePortable:vi.fn(async()=>{writes.push('portable:'+current.projectId);const doc=await io.readStrictJsonOr(join(current.rootPath,'05. Canvas','workflow.json'),null,'Fixture workflow');await io.atomicJson(current.documentPath,{fileType:'prism-foundry-project',schemaVersion:1,workflow:doc})})}
  return{A,B,queue,deps,document,writes,current:()=>current,switchTo:(owner:WorkflowSaveOwner)=>{current=owner},io}
}
describe('actual atomic storage with owned workflow command queue',()=>{
  it('keeps the explicit document owner in the actual account-selection response',async()=>{
    const x=await fixture(),project={schemaVersion:1,id:x.A.projectId,name:'Fictional Project',rootPath:x.A.rootPath,createdAt:'fictional',updatedAt:'fictional'},writes:unknown[]=[]
    const action=actual<{selectCurrentProjectServiceProfile(provider:string):Promise<typeof project & {documentPath:string}>}>(['selectCurrentProjectServiceProfile'],{
      currentProject:project,currentProjectDocumentPath:x.A.documentPath,currentProjectOwner:()=>workflowSaveOwnerKey(x.A),projectCommands:x.queue,
      runtimeServiceFailures:{change:(_provider:string,work:()=>Promise<unknown>)=>work()},projectProfileRecovery:{recover:async()=>{},commit:async(value:unknown)=>{writes.push(value)}},
      dataRoot:()=>x.A.rootPath,projectJsonMutations:{run:(_path:string,work:()=>Promise<unknown>)=>work()},withProjectServiceProfileOverride,
      readStrictJsonOr:async()=>[],recentProjectsPath:()=>join(x.A.rootPath,'recent.json'),buildProjectDocument:async(value:unknown)=>({project:value}),projectManifestPath:()=>join(x.A.rootPath,'project.json'),workspacePointerPath:()=>join(x.A.rootPath,'pointer.json'),resolve:(value:string)=>value,
    })
    const selected=await action.selectCurrentProjectServiceProfile('higgsfield')
    expect(selected.documentPath).toBe(x.A.documentPath);expect(writes).toHaveLength(1)
  })
  it('rejects stale hydration before reads or recovery writes, and serializes valid hydration',async()=>{
    const x=await fixture(),load=vi.fn(async()=>x.document)
    x.switchTo(x.B)
    await expect(loadOwnedWorkflow(x.A,{...x.deps,load})).rejects.toMatchObject({name:'AbortError'})
    expect(load).not.toHaveBeenCalled()
    expect(await loadOwnedWorkflow(x.B,{...x.deps,load})).toEqual(x.document)
    expect(load).toHaveBeenCalledOnce()
  })
  it('rejects stale or missing owner before either disk write',async()=>{
    const x=await fixture();x.switchTo(x.B)
    await expect(saveOwnedWorkflow(x.document,x.A,x.deps)).rejects.toMatchObject({name:'AbortError'})
    await expect(saveOwnedWorkflow(x.document,undefined,x.deps)).rejects.toThrow('exact project document owner')
    expect(x.writes).toEqual([])
  })
  it('keeps project opening behind the complete canonical and portable save',async()=>{
    const x=await fixture(),entered=deferred<void>(),release=deferred<void>(),canonical=x.deps.saveCanonical
    x.deps.saveCanonical=vi.fn(async doc=>{entered.resolve();await release.promise;await canonical(doc)})
    const saving=saveOwnedWorkflow(x.document,x.A,x.deps);await entered.promise
    const switching=x.queue.run(()=>{x.writes.push('switch');x.switchTo(x.B)});await Promise.resolve();expect(x.current()).toBe(x.A)
    release.resolve();await saving;await switching
    expect(x.writes).toEqual(['canonical:fictional-A','portable:fictional-A','switch'])
    expect(JSON.parse(await readFile(x.A.documentPath,'utf8')).workflow).toEqual(x.document)
    await expect(readFile(x.B.documentPath,'utf8')).rejects.toMatchObject({code:'ENOENT'})
  })
  it('rejects a queued old-owner save if an earlier project command changes ownership',async()=>{
    const x=await fixture(),entered=deferred<void>(),release=deferred<void>()
    const opening=x.queue.run(async()=>{entered.resolve();await release.promise;x.switchTo(x.B)});await entered.promise
    const saving=saveOwnedWorkflow(x.document,x.A,x.deps),failure=expect(saving).rejects.toMatchObject({name:'AbortError'})
    release.resolve();await opening;await failure;expect(x.writes).toEqual([])
  })
  it('reports a portable-write failure without declaring success and allows an explicit same-owner retry',async()=>{
    const x=await fixture(),portable=x.deps.savePortable;x.deps.savePortable=vi.fn(async()=>{throw new Error('Fixture disk full')})
    await expect(saveOwnedWorkflow(x.document,x.A,x.deps)).rejects.toThrow('disk full')
    expect(JSON.parse(await readFile(join(x.A.rootPath,'05. Canvas','workflow.json'),'utf8'))).toEqual(x.document)
    x.deps.savePortable=portable;await saveOwnedWorkflow(x.document,x.A,x.deps)
    expect(JSON.parse(await readFile(x.A.documentPath,'utf8')).workflow).toEqual(x.document)
  })
})
