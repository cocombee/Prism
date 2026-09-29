import { createHash } from 'node:crypto'
import { accessSync, constants, createReadStream, statSync } from 'node:fs'
import { access, mkdir, mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import ffmpegStatic from 'ffmpeg-static'
import { cameraMediaFile } from './mediaLocator'

export type LocalRenderStart = { jobId: string; nodeId: string; artifactId: string; width: number; height: number; fps: number; startFrame: number; endFrame: number }
export type LocalRenderProgress = { jobId: string; completed: number; total: number }
export type LocalRenderResult = { mediaHash: string; width: number; height: number; fps: number; frameCount: number; codec: 'h264'; container: 'mp4'; durationSeconds: number; locator: string }
export type H264Inspection = { codec: 'h264'; pixelFormat: string; width: number; height: number; fps: number; frameCount: number; durationSeconds: number; audioStreams: number; raw: string }

type Job = { request: LocalRenderStart; directory: string; partial: string; destination?: string; child: ChildProcessWithoutNullStreams; exit: Promise<{ code: number | null; error?: Error }>; stderr: string; completed: number; closing: boolean }
const identity = /^[a-zA-Z0-9_-]+$/
const MAX_DIMENSION = 4096
const MAX_FRAMES = 60 * 60 * 24

export function rewriteAsarUnpackedPath(candidate: string) {
  return candidate.replace(/([\\/])app\.asar(?=[\\/])/i, '$1app.asar.unpacked')
}

export function resolveFfmpegPath(candidate: string): string {
  if (!candidate) return ''
  if (!/([\\/])app\.asar(?=[\\/])/i.test(candidate)) return candidate
  const mapped = rewriteAsarUnpackedPath(candidate)
  try {
    if (!statSync(mapped).isFile()) throw new Error('not a file')
    accessSync(mapped, constants.X_OK)
    return mapped
  } catch {
    throw new Error(`FFMPEG_UNAVAILABLE: packaged executable not found or not executable at ${mapped}`)
  }
}

function validateStart(request: LocalRenderStart) {
  for (const value of [request.jobId, request.nodeId, request.artifactId]) if (!identity.test(value)) throw new Error('INVALID_ID')
  if (!Number.isInteger(request.width) || !Number.isInteger(request.height) || request.width < 2 || request.height < 2 || request.width > MAX_DIMENSION || request.height > MAX_DIMENSION || request.width % 2 || request.height % 2) throw new Error('INVALID_DIMENSIONS')
  if (![24, 25, 30].includes(request.fps)) throw new Error('INVALID_FPS')
  if (!Number.isInteger(request.startFrame) || !Number.isInteger(request.endFrame) || request.endFrame <= request.startFrame || request.endFrame - request.startFrame > MAX_FRAMES) throw new Error('INVALID_FRAME_RANGE')
}

const fixedArguments = (request: LocalRenderStart, partial: string) => [
  '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${request.width}x${request.height}`, '-framerate', String(request.fps), '-i', 'pipe:0',
  '-frames:v', String(request.endFrame - request.startFrame), '-an', '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', partial,
]

async function sha256(path: string) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(path)) digest.update(chunk as Buffer)
  return digest.digest('hex')
}

async function waitForDrain(job: Job) {
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const cleanup = () => { job.child.stdin.off('drain', drained); job.child.stdin.off('error', failed) }
    const done = (error?: Error) => { if (settled) return; settled = true; cleanup(); error ? reject(error) : resolve() }
    const drained = () => done()
    const failed = (error: Error) => done(error)
    job.child.stdin.once('drain', drained); job.child.stdin.once('error', failed)
    void job.exit.then((result) => done(result.error || new Error(`FFMPEG_CLOSED_${result.code}`)))
  })
}

function runInspection(ffmpegPath: string, path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', path, '-map', '0:v:0', '-f', 'null', '-'], { shell: false, stdio: ['ignore', 'ignore', 'pipe'] })
    let output = ''
    child.stderr.on('data', (chunk) => { output += String(chunk) })
    child.once('error', reject)
    child.once('close', (code) => code === 0 ? resolve(output) : reject(new Error(`FFMPEG_PROBE_FAILED_${code}: ${output.slice(-500)}`)))
  })
}

export async function inspectH264File(path: string, expectedFps?: number, ffmpegPath?: string): Promise<H264Inspection> {
  const resolvedFfmpegPath = ffmpegPath === undefined ? resolveFfmpegPath(ffmpegStatic || '') : ffmpegPath
  if (!resolvedFfmpegPath) throw new Error('FFMPEG_UNAVAILABLE')
  const raw = await runInspection(resolvedFfmpegPath, path)
  const video = raw.match(/Video:\s*h264[^\n\r]*?\b(yuv420p\w*)\b[^\n\r]*?\b(\d{2,5})x(\d{2,5})\b[^\n\r]*?(\d+(?:\.\d+)?)\s*fps/i)
  if (!video) throw new Error(`INVALID_H264_METADATA: ${raw.slice(0, 800)}`)
  const frames = [...raw.matchAll(/frame=\s*(\d+)/g)].map((match) => Number(match[1]))
  const times = [...raw.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]))
  const fps = Number(video[4]) || expectedFps || 0
  return { codec: 'h264', pixelFormat: video[1], width: Number(video[2]), height: Number(video[3]), fps, frameCount: Math.max(0, ...frames), durationSeconds: Math.max(0, ...times), audioStreams: (raw.match(/Stream #\d+:\d+(?:\([^)]*\))?: Audio:/g) || []).length, raw }
}

export class LocalRenderEngine {
  private readonly mediaRoot: string
  private readonly ffmpegPath: string
  private readonly jobs = new Map<string, Job>()
  private readonly activeNodes = new Map<string, string>()
  constructor(options: { mediaRoot: string; ffmpegPathForTest?: string }) {
    this.mediaRoot = options.mediaRoot
    this.ffmpegPath = options.ffmpegPathForTest !== undefined ? options.ffmpegPathForTest : resolveFfmpegPath(ffmpegStatic || '')
  }

  async start(request: LocalRenderStart): Promise<{ jobId: string; total: number }> {
    validateStart(request)
    if (!this.ffmpegPath) throw new Error('FFMPEG_UNAVAILABLE')
    if (this.jobs.has(request.jobId)) throw new Error('JOB_ALREADY_EXISTS')
    if (this.activeNodes.has(request.nodeId)) throw new Error('NODE_RENDER_ACTIVE')
    await mkdir(this.mediaRoot, { recursive: true })
    const directory = await mkdtemp(join(this.mediaRoot, '.camera-render-'))
    const partial = join(directory, 'output.partial.mp4')
    const child = spawn(this.ffmpegPath, fixedArguments(request, partial), { shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
    const exit = new Promise<{ code: number | null; error?: Error }>((resolve) => { child.once('error', (error) => resolve({ code: null, error })); child.once('close', (code) => resolve({ code })) })
    const job: Job = { request: { ...request }, directory, partial, child, exit, stderr: '', completed: 0, closing: false }
    child.stdin.on('error', () => undefined)
    child.stderr.on('data', (chunk) => { job.stderr += String(chunk); if (job.stderr.length > 16_384) job.stderr = job.stderr.slice(-16_384) })
    this.jobs.set(request.jobId, job); this.activeNodes.set(request.nodeId, request.jobId)
    try {
      await new Promise<void>((resolve, reject) => { if (child.pid) { resolve(); return } child.once('spawn', resolve); exit.then((result) => result.error ? reject(result.error) : reject(new Error(`FFMPEG_CLOSED_BEFORE_SPAWN_${result.code}`))) })
    } catch (error) {
      this.jobs.delete(request.jobId); this.activeNodes.delete(request.nodeId); await rm(directory, { recursive: true, force: true }); throw error
    }
    return { jobId: request.jobId, total: request.endFrame - request.startFrame }
  }

  async submit(jobId: string, index: number, bytes: Uint8Array): Promise<LocalRenderProgress> {
    const job = this.jobs.get(jobId)
    if (!job || job.closing) throw new Error('JOB_NOT_ACTIVE')
    if (index !== job.completed) throw new Error('FRAME_OUT_OF_ORDER')
    const expectedBytes = job.request.width * job.request.height * 4
    if (!(bytes instanceof Uint8Array) || bytes.byteLength !== expectedBytes) throw new Error('INVALID_FRAME_BYTES')
    if (job.child.exitCode !== null || job.child.signalCode || job.child.stdin.destroyed) throw new Error('FFMPEG_NOT_WRITABLE')
    const accepted = job.child.stdin.write(bytes)
    if (!accepted) await waitForDrain(job)
    job.completed += 1
    return { jobId, completed: job.completed, total: job.request.endFrame - job.request.startFrame }
  }

  async finish(jobId: string): Promise<LocalRenderResult> {
    const job = this.jobs.get(jobId)
    if (!job || job.closing) throw new Error('JOB_NOT_ACTIVE')
    const total = job.request.endFrame - job.request.startFrame
    if (job.completed !== total) throw new Error('FRAME_COUNT_INCOMPLETE')
    job.closing = true
    job.child.stdin.end()
    const exited = await job.exit
    try {
      if (exited.error) throw exited.error
      if (exited.code !== 0) throw new Error(`FFMPEG_FAILED_${exited.code}: ${job.stderr.trim().slice(-500)}`)
      const info = await stat(job.partial)
      if (info.size <= 0) throw new Error('EMPTY_RENDER_OUTPUT')
      const probe = await inspectH264File(job.partial, job.request.fps, this.ffmpegPath)
      if (probe.codec !== 'h264' || !probe.pixelFormat.startsWith('yuv420p') || probe.width !== job.request.width || probe.height !== job.request.height || probe.frameCount !== total || probe.audioStreams !== 0 || Math.abs(probe.fps - job.request.fps) > .01) throw new Error('RENDER_METADATA_MISMATCH')
      const expectedDuration = total / job.request.fps
      if (Math.abs(probe.durationSeconds - expectedDuration) > Math.max(.06, 1 / job.request.fps)) throw new Error('RENDER_DURATION_MISMATCH')
      const mediaHash = await sha256(job.partial)
      const destination = cameraMediaFile(this.mediaRoot, job.request.nodeId, job.request.artifactId)
      await mkdir(join(this.mediaRoot, job.request.nodeId), { recursive: true })
      try { await access(destination); throw new Error('ARTIFACT_ALREADY_EXISTS') } catch (error) { if ((error as Error).message === 'ARTIFACT_ALREADY_EXISTS' || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
      await rename(job.partial, destination)
      job.destination = destination
      await rm(job.directory, { recursive: true, force: true }).catch(() => undefined)
      return { mediaHash, width: job.request.width, height: job.request.height, fps: job.request.fps, frameCount: total, codec: 'h264', container: 'mp4', durationSeconds: expectedDuration, locator: `${job.request.nodeId}/${job.request.artifactId}.mp4` }
    } catch (error) {
      await rm(job.directory, { recursive: true, force: true })
      throw error
    } finally {
      this.jobs.delete(jobId); this.activeNodes.delete(job.request.nodeId)
    }
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) return
    job.closing = true
    this.jobs.delete(jobId); this.activeNodes.delete(job.request.nodeId)
    job.child.stdin.destroy(); if (!job.child.killed) job.child.kill('SIGKILL')
    await new Promise<void>((resolve) => { let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => { timer = null; resolve() }, 1500); void job.exit.then(() => { if (timer) clearTimeout(timer); timer = null; resolve() }) })
    if (job.destination) await rm(job.destination, { force: true })
    await rm(job.directory, { recursive: true, force: true })
  }

  async cancelNode(nodeId: string) { const jobId = this.activeNodes.get(nodeId); if (jobId) await this.cancel(jobId) }
  async cancelAll() { await Promise.all([...this.jobs.keys()].map((jobId) => this.cancel(jobId))) }
  activeJobForNode(nodeId: string) { return this.activeNodes.get(nodeId) || null }

  async renderFrames(request: LocalRenderStart, provider: (absoluteFrame: number) => Uint8Array | Promise<Uint8Array>): Promise<LocalRenderResult> {
    await this.start(request)
    try {
      for (let index = 0; index < request.endFrame - request.startFrame; index += 1) await this.submit(request.jobId, index, await provider(request.startFrame + index))
      return await this.finish(request.jobId)
    } catch (error) { await this.cancel(request.jobId); throw error }
  }

  async temporaryEntries() { try { return (await readdir(this.mediaRoot)).filter((name) => name.startsWith('.camera-render-')) } catch { return [] } }
}
