import { access, realpath } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

export type CameraMediaResolution = { ok: true; url: string } | { ok: false; reason: string }
const identity = /^[a-zA-Z0-9_-]+$/

export function cameraMediaFile(root: string, nodeId: string, artifactId: string): string {
  return join(root, nodeId, `${artifactId}.mp4`)
}

export function cameraMediaUrl(nodeId: string, artifactId: string): string {
  return `camera-media://local/${encodeURIComponent(nodeId)}/${encodeURIComponent(artifactId)}.mp4`
}

export async function resolveCameraMedia(root: string, input: { nodeId: string; artifactId: string; locator: string }): Promise<CameraMediaResolution> {
  if (!identity.test(input.nodeId) || !identity.test(input.artifactId)) return { ok: false, reason: 'Invalid artifact identity.' }
  const expectedLocator = `${input.nodeId}/${input.artifactId}.mp4`
  if (input.locator !== expectedLocator) return { ok: false, reason: 'Artifact locator does not match its node and ID.' }
  const expected = cameraMediaFile(root, input.nodeId, input.artifactId)
  try {
    await access(expected)
    const [realRoot, realFile] = await Promise.all([realpath(root), realpath(expected)])
    const contained = relative(realRoot, realFile)
    if (!contained || contained.startsWith(`..${sep}`) || contained === '..') return { ok: false, reason: 'Local media is outside the Camera media root.' }
    return { ok: true, url: cameraMediaUrl(input.nodeId, input.artifactId) }
  } catch {
    return { ok: false, reason: 'Local media is missing or unreadable.' }
  }
}
