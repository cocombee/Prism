import type { LocalRenderEngine, LocalRenderResult, LocalRenderStart } from './localRenderEngine'

const productionDimensions = new Set(['1920x1080', '1080x1920', '1080x1080', '1440x1080', '1080x1440', '1280x720', '720x1280', '720x720', '960x720', '720x960'])

type Engine = Pick<LocalRenderEngine, 'start' | 'submit' | 'finish' | 'cancel' | 'cancelAll'>

export class RenderIpcCoordinator {
  private readonly owners = new Map<string, number>()
  constructor(private readonly engine: Engine) {}

  async start(senderId: number, request: LocalRenderStart) {
    if (!productionDimensions.has(`${request.width}x${request.height}`)) throw new Error('INVALID_PRODUCTION_DIMENSIONS')
    const result = await this.engine.start({ ...request })
    this.owners.set(request.jobId, senderId)
    return result
  }

  private own(senderId: number, jobId: string) {
    if (this.owners.get(jobId) !== senderId) throw new Error('RENDER_SENDER_MISMATCH')
  }

  async submit(senderId: number, jobId: string, index: number, bytes: Uint8Array) {
    this.own(senderId, jobId)
    return await this.engine.submit(jobId, index, bytes)
  }

  async finish(senderId: number, jobId: string): Promise<LocalRenderResult> {
    this.own(senderId, jobId)
    try { return await this.engine.finish(jobId) } finally { this.owners.delete(jobId) }
  }

  async cancel(senderId: number, jobId: string) {
    this.own(senderId, jobId)
    this.owners.delete(jobId)
    await this.engine.cancel(jobId)
  }

  async cancelSender(senderId: number) {
    const jobs = [...this.owners].filter(([, owner]) => owner === senderId).map(([jobId]) => jobId)
    jobs.forEach((jobId) => this.owners.delete(jobId))
    await Promise.all(jobs.map((jobId) => this.engine.cancel(jobId)))
  }

  async cancelAll() {
    this.owners.clear()
    await this.engine.cancelAll()
  }
}
