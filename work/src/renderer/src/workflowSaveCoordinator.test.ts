import { describe, expect, it, vi } from 'vitest'
import { createWorkflowSaveCoordinator, type WorkflowSaveSnapshot } from './workflowSaveCoordinator'
function snapshot(project = 'A', version = 1): WorkflowSaveSnapshot {
  return { owner: { projectId: project, rootPath: `/fixture/${project}`, documentPath: `/fixture/${project}/Project.prismflow` }, activation:1, version, fingerprint: `${project}:${version}`, document: { schemaVersion: 1, id:'fixture-workflow',name:'Fixture',createdAt:'fictional',nodes: [], edges: [], viewport: { x: version, y: 0, zoom: 1 }, updatedAt: 'fictional' } }
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
describe('owned current workflow flush', () => {
  it('does not publish across a same-project reactivation with the same version and content',async()=>{
    let current=snapshot();const pending=deferred<void>(),started=deferred<void>(),saved=vi.fn()
    const coordinator=createWorkflowSaveCoordinator({snapshot:()=>current,begin:vi.fn(),saved,failed:vi.fn(),save:async()=>{started.resolve();await pending.promise}})
    const old=coordinator.flush();await started.promise;current={...snapshot(),activation:2};pending.resolve()
    expect(await old).toBe(false);expect(saved).not.toHaveBeenCalled();expect(await coordinator.flush()).toBe(true);expect(saved).toHaveBeenCalledOnce()
  })
  it('coalesces one owner but waits for newer content before reporting durable success', async () => {
    let current = snapshot(); const first = deferred<void>(), second = deferred<void>(), entered = deferred<void>(), enteredAgain = deferred<void>(), rows: WorkflowSaveSnapshot[] = []
    const saved = vi.fn(), failed = vi.fn(), coordinator = createWorkflowSaveCoordinator({ snapshot: () => current, begin: vi.fn(), saved, failed,
      save: async value => { rows.push(value); if (rows.length === 1) { entered.resolve(); return first.promise } enteredAgain.resolve(); return second.promise } })
    const one = coordinator.flush(), two = coordinator.flush(); expect(two).toBe(one)
    await entered.promise; current = snapshot('A', 2); first.resolve(); await enteredAgain.promise
    let finished = false; void one.then(() => { finished = true }); await Promise.resolve(); expect(finished).toBe(false)
    second.resolve(); expect(await one).toBe(true); expect(rows.map(row => row.version)).toEqual([1,2]); expect(saved.mock.calls.map(row => row[1])).toEqual([false,true]); expect(failed).not.toHaveBeenCalled()
  })
  it.each(['success','failure'])('does not publish late old-owner %s or consume the new owner save', async state => {
    let current = snapshot(); const old = deferred<void>(), next = deferred<void>(), started = deferred<void>(), startedNext = deferred<void>()
    const saved = vi.fn(), failed = vi.fn(), coordinator = createWorkflowSaveCoordinator({ snapshot: () => current, begin: vi.fn(), saved, failed,
      save: async value => { if (value.owner.projectId === 'A') { started.resolve(); return old.promise } startedNext.resolve(); return next.promise } })
    const one = coordinator.flush(); await started.promise; current = snapshot('B'); const two = coordinator.flush(); await startedNext.promise
    if (state === 'success') old.resolve(); else old.reject(new Error('Old write failed'))
    expect(await one).toBe(false); expect(saved).not.toHaveBeenCalled(); expect(failed).not.toHaveBeenCalled(); expect(coordinator.flush()).toBe(two)
    next.resolve(); expect(await two).toBe(true); expect(saved).toHaveBeenCalledOnce(); expect(saved.mock.calls[0][0].owner.projectId).toBe('B')
  })
  it('treats a changed document path as a different owner and refuses loading/unmounted state', async () => {
    let current: WorkflowSaveSnapshot | null = snapshot(); const pending = deferred<void>(), started = deferred<void>(), saved = vi.fn()
    const coordinator = createWorkflowSaveCoordinator({ snapshot: () => current, save: async () => { started.resolve(); return pending.promise }, begin: vi.fn(), saved, failed: vi.fn() })
    const one = coordinator.flush(); await started.promise; current = { ...current!, owner: { ...current!.owner, documentPath: '/fixture/A/Other.prismflow' } }; pending.resolve()
    expect(await one).toBe(false); expect(saved).not.toHaveBeenCalled(); current = null; expect(await coordinator.flush()).toBe(false)
  })
  it('detects changed content even before its mutation counter increments, and preserves the submitted snapshot', async () => {
    let current = snapshot(); const pending = deferred<void>(), started = deferred<void>(), rows: WorkflowSaveSnapshot[] = []
    const coordinator = createWorkflowSaveCoordinator({ snapshot: () => current, save: async value => { rows.push(value); if (rows.length === 1) { started.resolve(); return pending.promise } }, begin: vi.fn(), saved: vi.fn(), failed: vi.fn() })
    const one = coordinator.flush(); await started.promise; current.document.viewport.x = 50; current.fingerprint = 'changed-before-effect'; pending.resolve()
    expect(await one).toBe(true); expect(rows.map(row => row.document.viewport.x)).toEqual([1,50])
  })
})
