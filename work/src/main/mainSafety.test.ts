import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { GenerationLifecycle, JsonMutationQueue, assertManagedPathAllowMissingLeaf, assertRealpathContained, boundedPromise, createStoredZip, mediaFileResponse, mimeFor, parseByteRange, portableMayReplaceCanonical, readStoredZip, revealDirectory, safeFolderName } from './mainSafety'

describe('boundedPromise', () => {
  it('returns a fallback instead of letting one stalled Recent Project block studio startup', async () => {
    vi.useFakeTimers()
    const pending = boundedPromise(new Promise<string>(() => {}), 1_000, 'unavailable')
    await vi.advanceTimersByTimeAsync(1_000)
    await expect(pending).resolves.toBe('unavailable')
    vi.useRealTimers()
  })
})

describe('safeFolderName', () => {
  it.each(['.', '..', ' . ', ' .. '])('rejects the path segment %j', (name) => {
    expect(() => safeFolderName(name, 'Fallback')).toThrow(/path segment/i)
  })

  it('still sanitizes separators and whitespace', () => {
    expect(safeFolderName('  Hero / Front\\View  ', 'Fallback')).toBe('Hero Front View')
  })
})

describe('media protocol helpers', () => {
  it.each([
    ['voice.opus', 'audio/opus'],
    ['voice.ogg', 'audio/ogg'],
    ['voice.pcm', 'audio/L16'],
  ])('recognizes %s as %s', (path, mime) => expect(mimeFor(path)).toBe(mime))

  it('parses a bounded byte range without requiring file bytes', () => {
    expect(parseByteRange('bytes=100-199', 1_000)).toEqual({ start: 100, end: 199 })
  })

  it.each(['bytes=1000-', 'bytes=200-100', 'bytes=abc-def', 'bytes=0-1,3-4'])('rejects unsatisfiable range %s', (range) => {
    expect(parseByteRange(range, 1_000)).toBeNull()
  })

  it('streams full and bounded partial responses with 200, 206, and 416 semantics', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-media-'))
    const path = join(folder, 'clip.ogg')
    await writeFile(path, Buffer.from('0123456789'))

    const full = await mediaFileResponse(path, null)
    expect(full.status).toBe(200)
    expect(full.headers.get('content-length')).toBe('10')
    expect(full.headers.get('content-type')).toBe('audio/ogg')
    expect(await full.text()).toBe('0123456789')

    const partial = await mediaFileResponse(path, 'bytes=2-5')
    expect(partial.status).toBe(206)
    expect(partial.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(await partial.text()).toBe('2345')

    const invalid = await mediaFileResponse(path, 'bytes=20-')
    expect(invalid.status).toBe(416)
    expect(invalid.headers.get('content-range')).toBe('bytes */10')
  })
})

describe('JsonMutationQueue', () => {
  it('serializes an arbitrary multi-file transaction against array mutations for the same index', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-json-'))
    const path = join(folder, 'assets.json')
    const queue = new JsonMutationQueue()
    const order: string[] = []
    const transaction = queue.run(path, async () => {
      order.push('transaction-start')
      await Promise.resolve()
      order.push('transaction-end')
    })
    const mutation = queue.mutateArray<number>(path, (items) => {
      order.push('array-mutation')
      return [...items, 1]
    })
    await Promise.all([transaction, mutation])
    expect(order).toEqual(['transaction-start', 'transaction-end', 'array-mutation'])
  })

  it('serializes concurrent read-modify-write operations without losing entries', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-json-'))
    const path = join(folder, 'assets.json')
    const queue = new JsonMutationQueue()
    await Promise.all(Array.from({ length: 40 }, (_, id) => queue.mutateArray<number>(path, (items) => [...items, id])))
    const values = JSON.parse(await readFile(path, 'utf8')) as number[]
    expect(values).toHaveLength(40)
    expect(new Set(values).size).toBe(40)
  })

  it('fails closed when existing JSON is malformed', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-json-'))
    const path = join(folder, 'history.json')
    await writeFile(path, '{broken')
    const queue = new JsonMutationQueue()
    await expect(queue.mutateArray(path, (items) => [...items, { id: 1 }])).rejects.toThrow(/could not be read/i)
    expect(await readFile(path, 'utf8')).toBe('{broken')
  })

  it('continues serializing after a failed mutation without losing later updates', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-json-'))
    const path = join(folder, 'assets.json')
    const queue = new JsonMutationQueue()
    await expect(queue.mutateArray<number>(path, () => { throw new Error('stop') })).rejects.toThrow('stop')
    await Promise.all([queue.mutateArray<number>(path, (items) => [...items, 1]), queue.mutateArray<number>(path, (items) => [...items, 2])])
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual([1, 2])
  })
})

describe('Finder directory reveal', () => {
  it('opens an existing collection directory rather than trying to reveal it as a file', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-reveal-'))
    const collection = join(folder, 'Character')
    await mkdir(collection)
    const openPath = vi.fn(async () => '')
    await expect(revealDirectory(collection, openPath)).resolves.toBe(true)
    expect(openPath).toHaveBeenCalledWith(collection)
  })

  it('does not invoke Finder for a regular file', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-reveal-'))
    const file = join(folder, 'view.png')
    await writeFile(file, 'png')
    const openPath = vi.fn(async () => '')
    await expect(revealDirectory(file, openPath)).resolves.toBe(false)
    expect(openPath).not.toHaveBeenCalled()
  })
})

describe('realpath containment', () => {
  it('accepts media inside either explicit managed root', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-roots-'))
    const project = join(folder, 'project')
    const styles = join(folder, 'styles')
    await Promise.all([import('node:fs/promises').then(({ mkdir }) => mkdir(project)), import('node:fs/promises').then(({ mkdir }) => mkdir(styles))])
    const media = join(styles, 'preview.png')
    await writeFile(media, 'png')
    await expect(assertRealpathContained(media, [project, styles])).resolves.toBe(await realpath(media))
  })

  it('rejects a symlink that escapes a managed root', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-roots-'))
    const root = join(folder, 'root')
    const outside = join(folder, 'outside.png')
    await import('node:fs/promises').then(({ mkdir }) => mkdir(root))
    await writeFile(outside, 'secret')
    const link = join(root, 'preview.png')
    await symlink(outside, link)
    await expect(assertRealpathContained(link, [root])).rejects.toThrow(/outside managed roots/i)
  })

  it('allows deletion validation for a missing leaf under a verified managed parent', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-roots-'))
    const root = join(folder, 'root')
    await mkdir(root)
    const missing = join(root, 'offline.png')
    await expect(assertManagedPathAllowMissingLeaf(missing, [root])).resolves.toBe(join(await realpath(root), 'offline.png'))
  })

  it('rejects a missing leaf whose parent symlink escapes a managed root', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'prism-roots-'))
    const root = join(folder, 'root')
    const outside = join(folder, 'outside')
    await Promise.all([mkdir(root), mkdir(outside)])
    await symlink(outside, join(root, 'escaped'))
    await expect(assertManagedPathAllowMissingLeaf(join(root, 'escaped', 'offline.png'), [root])).rejects.toThrow(/outside managed roots/i)
  })
})

describe('.prismasset archive validation', () => {
  it('round trips stored entries and verifies CRC', () => {
    const archive = createStoredZip([{ name: 'manifest.json', data: Buffer.from('{}') }, { name: 'media/a.png', data: Buffer.from('image') }])
    expect(readStoredZip(archive).get('media/a.png')?.toString()).toBe('image')
    const corrupted = Buffer.from(archive)
    const imageOffset = corrupted.indexOf(Buffer.from('image'))
    corrupted[imageOffset] ^= 0xff
    expect(() => readStoredZip(corrupted)).toThrow(/CRC/i)
  })

  it('rejects archives and entries over configured limits', () => {
    const archive = createStoredZip([{ name: 'a', data: Buffer.alloc(8) }, { name: 'b', data: Buffer.alloc(8) }])
    expect(() => readStoredZip(archive, { maxArchiveBytes: archive.length - 1 })).toThrow(/archive.*large/i)
    expect(() => readStoredZip(archive, { maxEntries: 1 })).toThrow(/too many entries/i)
    expect(() => readStoredZip(archive, { maxEntryBytes: 7 })).toThrow(/entry.*large/i)
    expect(() => readStoredZip(archive, { maxTotalBytes: 15 })).toThrow(/total.*large/i)
  })

  it('rejects duplicate normalized names before import', () => {
    const archive = createStoredZip([{ name: 'media/A.png', data: Buffer.from('a') }, { name: 'media\\a.png', data: Buffer.from('b') }])
    expect(() => readStoredZip(archive)).toThrow(/duplicate/i)
  })
})

describe('project generation lifecycle', () => {
  it('captures immutable identity, aborts jobs on transition, and rejects stale commits', () => {
    const lifecycle = new GenerationLifecycle()
    lifecycle.activate({ projectId: 'a', rootPath: '/project-a', documentPath: '/project-a/a.prismflow' })
    const job = lifecycle.begin('node-1')
    expect(Object.isFrozen(job.identity)).toBe(true)
    lifecycle.activate({ projectId: 'b', rootPath: '/project-b', documentPath: '/project-b/b.prismflow' })
    expect(job.controller.signal.aborted).toBe(true)
    expect(() => lifecycle.assertActive(job.identity)).toThrow(/project changed/i)
  })

  it('aborts an older job for the same node', () => {
    const lifecycle = new GenerationLifecycle()
    lifecycle.activate({ projectId: 'a', rootPath: '/a', documentPath: '/a/a.prismflow' })
    const first = lifecycle.begin('node')
    lifecycle.begin('node')
    expect(first.controller.signal.aborted).toBe(true)
  })
})

describe('portable document freshness', () => {
  it('does not let an older portable document replace newer canonical state', () => {
    expect(portableMayReplaceCanonical(100, 101)).toBe(false)
    expect(portableMayReplaceCanonical(101, 100)).toBe(true)
    expect(portableMayReplaceCanonical(101, undefined)).toBe(true)
  })
})
