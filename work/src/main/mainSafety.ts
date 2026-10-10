import { readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path'

export function boundedPromise<T, F>(promise: Promise<T>, timeoutMs: number, fallback: F): Promise<T | F> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: T | F) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => finish(fallback), Math.max(0, timeoutMs))
    promise.then((value) => finish(value), () => finish(fallback))
  })
}

export function safeFolderName(name: string | undefined, fallback: string): string {
  const raw = (name || fallback).trim()
  if (raw === '.' || raw === '..') throw new Error('A folder name cannot be a dot path segment.')
  const cleaned = raw.replace(/[/:\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return cleaned || fallback
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.opus': 'audio/opus', '.ogg': 'audio/ogg', '.pcm': 'audio/L16',
}

export function mimeFor(path: string): string {
  return MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

export function parseByteRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header)
  if (!match || !Number.isSafeInteger(size) || size <= 0) return null
  const start = Number(match[1])
  const requestedEnd = match[2] ? Number(match[2]) : size - 1
  const end = Math.min(requestedEnd, size - 1)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= size || start > end) return null
  return { start, end }
}

export async function mediaFileResponse(path: string, rangeHeader: string | null): Promise<Response> {
  const details = await stat(path)
  if (!details.isFile()) throw new Error('The requested media path is not a file.')
  const size = details.size
  const commonHeaders = { 'Accept-Ranges': 'bytes', 'Content-Type': mimeFor(path) }
  if (rangeHeader) {
    const range = parseByteRange(rangeHeader, size)
    if (!range) return new Response(null, { status: 416, headers: { ...commonHeaders, 'Content-Range': `bytes */${size}` } })
    const body = Readable.toWeb(createReadStream(path, { start: range.start, end: range.end })) as ReadableStream<Uint8Array>
    return new Response(body, {
      status: 206,
      headers: {
        ...commonHeaders,
        'Content-Length': String(range.end - range.start + 1),
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
      },
    })
  }
  const body = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>
  return new Response(body, { status: 200, headers: { ...commonHeaders, 'Content-Length': String(size) } })
}

export async function revealDirectory(path: string, openPath: (path: string) => Promise<string>): Promise<boolean> {
  try {
    if (!(await stat(path)).isDirectory()) return false
  } catch {
    return false
  }
  const error = await openPath(path)
  if (error) throw new Error(error)
  return true
}

async function atomicJson(path: string, value: unknown): Promise<void> {
  const candidate = `${path}.${randomUUID()}.tmp`
  await writeFile(candidate, JSON.stringify(value, null, 2), { encoding: 'utf8', flag: 'wx' })
  await rename(candidate, path)
}

export class JsonMutationQueue {
  private readonly pending = new Map<string, Promise<void>>()

  run<T>(path: string, mutation: () => T | Promise<T>): Promise<T> {
    const previous = this.pending.get(path) || Promise.resolve()
    const operation = previous.catch(() => undefined).then(mutation)
    const settled = operation.then(() => undefined, () => undefined)
    this.pending.set(path, settled)
    void settled.finally(() => {
      if (this.pending.get(path) === settled) this.pending.delete(path)
    })
    return operation
  }

  mutateArray<T>(path: string, mutation: (items: T[]) => T[] | Promise<T[]>): Promise<T[]> {
    return this.run(path, async () => {
      let items: T[]
      try {
        const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown
        if (!Array.isArray(parsed)) throw new Error('expected a JSON array')
        items = parsed as T[]
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') items = []
        else throw new Error(`${dirname(path)} data could not be read; the existing file was not replaced. ${error instanceof Error ? error.message : String(error)}`)
      }
      const next = await mutation(items)
      await atomicJson(path, next)
      return next
    })
  }
}

export async function assertRealpathContained(candidate: string, roots: string[]): Promise<string> {
  const [target, ...realRoots] = await Promise.all([realpath(candidate), ...roots.map((root) => realpath(root))])
  const contained = realRoots.some((root) => {
    const child = relative(root, target)
    return child === '' || (!child.startsWith('..') && !isAbsolute(child))
  })
  if (!contained) throw new Error('The requested file is outside managed roots.')
  return target
}

export async function assertManagedPathAllowMissingLeaf(candidate: string, roots: string[]): Promise<string> {
  try {
    return await assertRealpathContained(candidate, roots)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const verifiedParent = await assertRealpathContained(dirname(candidate), roots)
    return resolve(verifiedParent, basename(candidate))
  }
}

let crcTable: number[] | undefined
function crc32(bytes: Buffer): number {
  if (!crcTable) crcTable = Array.from({ length: 256 }, (_, value) => {
    let current = value
    for (let bit = 0; bit < 8; bit += 1) current = (current & 1) ? 0xedb88320 ^ (current >>> 1) : current >>> 1
    return current >>> 0
  })
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

export function createStoredZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll('\\', '/'), 'utf8')
    const checksum = crc32(entry.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    localParts.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)
    offset += local.length + name.length + entry.data.length
  }
  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

export interface StoredZipLimits {
  maxArchiveBytes: number
  maxEntries: number
  maxEntryBytes: number
  maxTotalBytes: number
}

const DEFAULT_ZIP_LIMITS: StoredZipLimits = {
  maxArchiveBytes: 512 * 1024 * 1024,
  maxEntries: 1_000,
  maxEntryBytes: 100 * 1024 * 1024,
  maxTotalBytes: 500 * 1024 * 1024,
}

export function readStoredZip(archive: Buffer, overrides: Partial<StoredZipLimits> = {}): Map<string, Buffer> {
  const limits = { ...DEFAULT_ZIP_LIMITS, ...overrides }
  if (archive.length > limits.maxArchiveBytes) throw new Error('This .prismasset archive is too large.')
  const entries = new Map<string, Buffer>()
  const normalizedNames = new Set<string>()
  let offset = 0
  let totalBytes = 0
  while (offset + 30 <= archive.length && archive.readUInt32LE(offset) === 0x04034b50) {
    if (entries.size >= limits.maxEntries) throw new Error('This .prismasset contains too many entries.')
    const flags = archive.readUInt16LE(offset + 6)
    const method = archive.readUInt16LE(offset + 8)
    const expectedCrc = archive.readUInt32LE(offset + 14)
    const compressedSize = archive.readUInt32LE(offset + 18)
    const size = archive.readUInt32LE(offset + 22)
    const nameLength = archive.readUInt16LE(offset + 26)
    const extraLength = archive.readUInt16LE(offset + 28)
    if (flags & 0x0008) throw new Error('This .prismasset uses unsupported streamed ZIP entries.')
    if (method !== 0 || compressedSize !== size) throw new Error('This .prismasset uses an unsupported compression method.')
    if (size > limits.maxEntryBytes) throw new Error('A .prismasset entry is too large.')
    totalBytes += size
    if (totalBytes > limits.maxTotalBytes) throw new Error('The .prismasset total extracted size is too large.')
    const nameStart = offset + 30
    const dataStart = nameStart + nameLength + extraLength
    const dataEnd = dataStart + size
    if (nameStart + nameLength > archive.length || dataEnd > archive.length) throw new Error('This .prismasset is incomplete or damaged.')
    const name = archive.subarray(nameStart, nameStart + nameLength).toString('utf8').replaceAll('\\', '/')
    const segments = name.split('/')
    if (!name || name.startsWith('/') || segments.some((segment) => segment === '..')) throw new Error('This .prismasset contains an unsafe path.')
    const normalized = name.normalize('NFC').toLowerCase()
    if (normalizedNames.has(normalized)) throw new Error('This .prismasset contains duplicate normalized entry names.')
    normalizedNames.add(normalized)
    const bytes = archive.subarray(dataStart, dataEnd)
    if (crc32(bytes) !== expectedCrc) throw new Error(`The CRC check failed for ${name}.`)
    entries.set(name, bytes)
    offset = dataEnd
  }
  return entries
}

export interface ProjectGenerationIdentity {
  readonly projectId: string
  readonly rootPath: string
  readonly documentPath: string
  readonly epoch: number
}

type ProjectIdentityInput = Omit<ProjectGenerationIdentity, 'epoch'>

export class GenerationLifecycle {
  private epoch = 0
  private active: ProjectGenerationIdentity | null = null
  private readonly controllers = new Map<string, AbortController>()

  activate(identity: ProjectIdentityInput | null): void {
    this.abortAll()
    this.epoch += 1
    this.active = identity ? Object.freeze({ ...identity, epoch: this.epoch }) : null
  }

  begin(nodeId: string): { identity: ProjectGenerationIdentity; controller: AbortController } {
    if (!this.active) throw new Error('Choose or open a project folder first.')
    this.controllers.get(nodeId)?.abort()
    const controller = new AbortController()
    this.controllers.set(nodeId, controller)
    return { identity: Object.freeze({ ...this.active }), controller }
  }

  assertActive(identity: ProjectGenerationIdentity): void {
    if (!this.active
      || identity.epoch !== this.active.epoch
      || identity.projectId !== this.active.projectId
      || identity.rootPath !== this.active.rootPath
      || identity.documentPath !== this.active.documentPath) {
      throw new Error('The project changed while generation was running; the result was not committed.')
    }
  }

  complete(nodeId: string, controller: AbortController): void {
    if (this.controllers.get(nodeId) === controller) this.controllers.delete(nodeId)
  }

  isRunning(nodeId: string): boolean { return this.controllers.has(nodeId) }

  cancel(nodeId: string): boolean {
    const controller = this.controllers.get(nodeId)
    if (!controller) return false
    controller.abort()
    this.controllers.delete(nodeId)
    return true
  }

  abortAll(): void {
    for (const controller of this.controllers.values()) controller.abort()
    this.controllers.clear()
  }
}

export function portableMayReplaceCanonical(portableMtimeMs: number, canonicalMtimeMs: number | undefined): boolean {
  return canonicalMtimeMs === undefined || portableMtimeMs >= canonicalMtimeMs
}
