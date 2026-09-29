import { chmod, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addEntity, createCameraDocument } from '../camera3d/model'
import { cleanRenderFrame } from '../camera3d/cleanRenderer'
import { LocalRenderEngine, inspectH264File, resolveFfmpegPath, rewriteAsarUnpackedPath, type LocalRenderStart } from './localRenderEngine'
import { cameraMediaFile } from './mediaLocator'

const request = (nodeId = 'node', artifactId = 'artifact'): LocalRenderStart => ({ jobId: `job-${artifactId}`, nodeId, artifactId, width: 64, height: 36, fps: 24, startFrame: 0, endFrame: 4 })
const frame = (index: number) => { const bytes = new Uint8Array(64 * 36 * 4); for (let at = 0; at < bytes.length; at += 4) { bytes[at] = index * 40; bytes[at + 1] = 80; bytes[at + 2] = 160; bytes[at + 3] = 255 } return bytes }

describe('3D Camera thirteenth — production H264 engine', () => {
  it('keeps ordinary development FFmpeg paths unchanged', () => {
    const developmentPath = join(tmpdir(), 'ffmpeg-static', 'ffmpeg')
    expect(resolveFfmpegPath(developmentPath)).toBe(developmentPath)
  })

  it('resolves a packaged app.asar candidate to the executable app.asar.unpacked path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-ffmpeg-resolver-'))
    const unpacked = join(root, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg')
    await mkdir(join(unpacked, '..'), { recursive: true })
    await writeFile(unpacked, '#!/bin/sh\\nexit 0\\n')
    await chmod(unpacked, 0o755)
    const candidate = join(root, 'Contents', 'Resources', 'app.asar', 'node_modules', 'ffmpeg-static', 'ffmpeg')
    expect(resolveFfmpegPath(candidate)).toBe(unpacked)
  })

  it('fails truthfully when the mapped packaged executable is missing and never returns the ASAR path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-ffmpeg-missing-'))
    const candidate = join(root, 'Contents', 'Resources', 'app.asar', 'node_modules', 'ffmpeg-static', 'ffmpeg')
    expect(() => resolveFfmpegPath(candidate)).toThrow('FFMPEG_UNAVAILABLE')
    expect(() => resolveFfmpegPath(candidate)).not.toThrow(candidate)
  })

  it('rewrites app.asar segments without assuming POSIX separators', () => {
    expect(rewriteAsarUnpackedPath('C:\\\\app.asar\\\\node_modules\\\\ffmpeg-static\\\\ffmpeg')).toBe('C:\\\\app.asar.unpacked\\\\node_modules\\\\ffmpeg-static\\\\ffmpeg')
  })

  it('encodes exact sequential RGBA frames to validated H264/yuv420p MP4 with SHA256 and atomic locator', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-render-green-'))
    const engine = new LocalRenderEngine({ mediaRoot: root })
    const started = await engine.start(request())
    expect(started).toMatchObject({ jobId: 'job-artifact', total: 4 })
    for (let index = 0; index < 4; index += 1) expect(await engine.submit('job-artifact', index, frame(index))).toMatchObject({ completed: index + 1, total: 4 })
    const result = await engine.finish('job-artifact')
    expect(result).toMatchObject({ codec: 'h264', container: 'mp4', width: 64, height: 36, fps: 24, frameCount: 4, locator: 'node/artifact.mp4' })
    expect(result.mediaHash).toMatch(/^[a-f0-9]{64}$/)
    expect((await stat(cameraMediaFile(root, 'node', 'artifact'))).size).toBeGreaterThan(0)
    const probe = await inspectH264File(cameraMediaFile(root, 'node', 'artifact'), 24)
    expect(probe).toMatchObject({ codec: 'h264', width: 64, height: 36, frameCount: 4, audioStreams: 0 })
    expect(probe.pixelFormat).toMatch(/^yuv420p/)
  }, 30_000)

  it('enforces one active render per node, exact order/byte size, and idempotent cancel cleanup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-render-cancel-'))
    const engine = new LocalRenderEngine({ mediaRoot: root })
    await engine.start(request('same', 'one'))
    await expect(engine.start(request('same', 'two'))).rejects.toThrow('NODE_RENDER_ACTIVE')
    await expect(engine.submit('job-one', 1, frame(1))).rejects.toThrow('FRAME_OUT_OF_ORDER')
    await expect(engine.submit('job-one', 0, new Uint8Array(4))).rejects.toThrow('INVALID_FRAME_BYTES')
    await engine.cancel('job-one'); await engine.cancel('job-one')
    await expect(stat(cameraMediaFile(root, 'same', 'one'))).rejects.toThrow()
    expect((await readdir(root)).filter((name) => name.startsWith('.camera-render-'))).toEqual([])
  }, 30_000)

  it('truthfully rejects forced FFmpeg failure with no artifact or partial output', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-render-fail-'))
    const engine = new LocalRenderEngine({ mediaRoot: root, ffmpegPathForTest: '/definitely/missing/ffmpeg' })
    await expect(engine.start(request())).rejects.toThrow()
    await expect(stat(cameraMediaFile(root, 'node', 'artifact'))).rejects.toThrow()
    expect(await readdir(root)).toEqual([])
  })

  it('runs the clean multi-shot frame provider through the production engine without renderer payload paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-render-document-'))
    let document = addEntity(addEntity(addEntity(createCameraDocument('smoke'), 'camera', 'Left'), 'camera', 'Right'), 'block', 'Subject')
    const [left, right] = document.entities
    left.transform.position = [-4, 2, 8]; left.transform.rotation = [0, -20, 0]
    right.transform.position = [4, 2, 8]; right.transform.rotation = [0, 20, 0]
    document.shots[0].endFrame = 2
    document.shots[0].camera.activeCameraId = left.id
    const second = structuredClone(document.shots[0]); second.id = 'second'; second.startFrame = 2; second.endFrame = 4; second.boundary = 'cut'; second.camera.activeCameraId = right.id
    document.shots.push(second)
    const engine = new LocalRenderEngine({ mediaRoot: root })
    const result = await engine.renderFrames(request('smoke', 'multi'), (absoluteFrame) => cleanRenderFrame(document, absoluteFrame, { width: 64, height: 36 }).bytes)
    expect(result.frameCount).toBe(4)
    const bytes = await readFile(cameraMediaFile(root, 'smoke', 'multi'))
    expect(bytes.byteLength).toBeGreaterThan(0)
  }, 30_000)
})
