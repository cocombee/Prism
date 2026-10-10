export type HiggsfieldJobState = 'prepared' | 'submitting' | 'queued' | 'in_progress' | 'unknown' | 'completed' | 'persisted' | 'failed' | 'nsfw' | 'canceled' | 'reviewed'
export interface HiggsfieldJobScope { projectId: string; rootPath: string; documentPath: string; nodeId: string }
export interface HiggsfieldJobView { id: string; nodeId: string; endpointId: string; state: HiggsfieldJobState; createdAt: string; updatedAt: string; requestId?: string; recoveryRequired: boolean; ownerMatches?: boolean; canRelocate?: boolean; canReconcile?: boolean }
export type HiggsfieldJobAction = 'check' | 'cancel' | 'recover' | 'review' | 'relocate'
export function higgsfieldJobRequiresRecovery(state: HiggsfieldJobState): boolean { return ['prepared','submitting','queued','in_progress','unknown','completed'].includes(state) }

export interface HiggsfieldJobCommand { id: string; nodeId: string; action: HiggsfieldJobAction; dashboardReviewed?: boolean }

export interface HiggsfieldJobsView {jobs?:HiggsfieldJobView[];loading?:boolean;error?:string;busy?:string}
export function higgsfieldJobReadinessFailures(nodeId:string,view:HiggsfieldJobsView,selected=false):string[] {
 const pending=Boolean(view.jobs?.some(job=>job.nodeId===nodeId&&job.recoveryRequired))
 if((view.loading||!view.jobs&&!view.error)&&(selected||pending))return ['load the saved Higgsfield job status']
 if(view.error&&(selected||pending))return [view.error]
 if(view.busy===nodeId)return ['wait for the Higgsfield recovery action']
 return view.jobs?.some(job=>job.nodeId===nodeId&&job.recoveryRequired)?['resolve the prior Higgsfield job in Settings before another Run']:[]
}

/** Presentation guard only; main independently verifies the protected original intent/account. */
export function higgsfieldRecoveryActionDisabled(job:HiggsfieldJobView|undefined,action:HiggsfieldJobAction,options:{loading?:boolean;busy?:string;dashboardReviewed?:boolean}={}):boolean {
 if(options.loading||options.busy||!job)return true
 if(job.ownerMatches===false&&action!=='review'&&action!=='relocate')return true
 if(action==='relocate')return job.ownerMatches!==false||!job.canRelocate
 if(action==='review')return !job.recoveryRequired||!options.dashboardReviewed
 if(!job.requestId&&(!job.canReconcile||action==='cancel'))return true
 if(action==='cancel')return job.state==='completed'||!job.recoveryRequired
 return action==='recover'?!job.recoveryRequired&&job.state!=='persisted':!job.recoveryRequired
}
