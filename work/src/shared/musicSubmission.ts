/** Safe renderer recovery view; request, credentials and storage authority stay main-owned. */
export interface MusicSubmissionView {
 submissionId:string
 projectId:string
 nodeId:string
 state:'reserved'|'submitting'|'unknown'|'complete'|'saved'|'rejected'|'reviewed'
 modelId?:string
 requestId?:string
 saveState?:'not-indexed'|'indexed-history-pending'|'indexed-history-saved'
 recoveryRequired:boolean
 canRecover:boolean
 canReview:boolean
 outputRetained:boolean
 createdAt:string
 updatedAt:string
 message?:string
}
export interface MusicSubmissionCommand { nodeId:string;submissionId:string }
export interface MusicSubmissionReview extends MusicSubmissionCommand { confirmation:'provider-history-reviewed' }
