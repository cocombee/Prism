import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cameraMediaFile, cameraMediaUrl, resolveCameraMedia } from './mediaLocator'

describe('3D Camera twelfth local artifact boundary', () => {
  it('resolves only the exact node/artifact H.264 MP4 association inside the media root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-camera-media-'))
    const file = cameraMediaFile(root, 'node-a', 'artifact-a')
    await mkdir(join(root, 'node-a'), { recursive: true })
    await writeFile(file, Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]))

    await expect(resolveCameraMedia(root, { nodeId: 'node-a', artifactId: 'artifact-a', locator: 'node-a/artifact-a.mp4' }))
      .resolves.toEqual({ ok: true, url: cameraMediaUrl('node-a', 'artifact-a') })
    await expect(resolveCameraMedia(root, { nodeId: 'node-a', artifactId: 'artifact-a', locator: 'node-a/other.mp4' }))
      .resolves.toEqual({ ok: false, reason: 'Artifact locator does not match its node and ID.' })
    await expect(resolveCameraMedia(root, { nodeId: '../escape', artifactId: 'artifact-a', locator: '../escape/artifact-a.mp4' }))
      .resolves.toEqual({ ok: false, reason: 'Invalid artifact identity.' })
  })

  it('fails closed for missing and non-MP4 media without inventing a URL', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prism-camera-media-missing-'))
    await expect(resolveCameraMedia(root, { nodeId: 'node-b', artifactId: 'artifact-b', locator: 'node-b/artifact-b.mp4' }))
      .resolves.toEqual({ ok: false, reason: 'Local media is missing or unreadable.' })
    await expect(resolveCameraMedia(root, { nodeId: 'node-b', artifactId: 'artifact-b', locator: 'node-b/artifact-b.mov' }))
      .resolves.toEqual({ ok: false, reason: 'Artifact locator does not match its node and ID.' })
  })
})
