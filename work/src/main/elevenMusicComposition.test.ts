import { mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { runMusicComposition, MusicCompositionOutputFailure, type MusicCompositionOptions } from './elevenMusicComposition'
import type { MusicRequest } from './elevenMusicContract'
import { ProviderRequestState } from './providerRequestState'
import { assertManagedPathAllowMissingLeaf } from './mainSafety'

const key = 'fictional-music-composition-key'
const encoded = new Map<number, Buffer>()
const decoderBinary = ffmpeg!
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const prompt = (modelId: 'music_v1' | 'music_v2' | 'music_v2_5' = 'music_v2_5'): MusicRequest => ({
  mode: 'prompt', modelId, prompt: '  A fictional beat.\r\nKeep my spacing.  ', durationMs: 3500, forceInstrumental: false,
})
const plan = (): MusicRequest & { mode: 'plan'; modelId: 'music_v2_5' } => ({
  mode: 'plan', modelId: 'music_v2_5', seed: 0,
  plan: { chunks: [{ text: '  [Verse]\r\nKeep these words.  ', duration_ms: 3500, positive_styles: ['  gentle piano  '], context_adherence: 'low' }] },
})

beforeAll(() => {
  if (!ffmpeg) throw new Error('Music composition fixtures require the existing bundled decoder.')
  for (const rate of [44100, 48000]) {
    const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=${rate}:cl=stereo`, '-t', '0.2', '-c:a', 'libmp3lame', '-b:a', rate === 44100 ? '128k' : '192k', '-f', 'mp3', 'pipe:1'])
    expect(result.status, result.stderr?.toString()).toBe(0)
    expect(result.stdout.length).toBeGreaterThan(0)
    encoded.set(rate, result.stdout)
  }
})

async function fixture(run: (f: {
  options: MusicCompositionOptions
  state: ProviderRequestState<unknown>
  root: string
  posts: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }>
  owned: <T>(work: () => Promise<T>) => Promise<T>
}) => Promise<void>) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'prism-music-composition-')))
  const state = new ProviderRequestState<unknown>()
  state.activateProject('fictional-project/document')
  const check = () => state.assertCurrent('elevenlabs')
  const posts: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = []
  const options: MusicCompositionOptions = {
    transport: {
      key, decoderBinary, maximumResponseBytes: 1024 * 1024, assertCurrent: check,
      fetch: vi.fn(async (url, init) => {
        const body = JSON.parse(String(init?.body))
        posts.push({ url: String(url), init: init!, body })
        return new Response(new Uint8Array(encoded.get(body.model_id === 'music_v1' ? 44100 : 48000)!), { headers: { 'content-type': 'audio/mpeg', 'request-id': 'fictional-provider-request' } })
      }),
    },
    storage: {
      outputStem: join(root, 'Music'), projectId: 'fictional-project', nodeId: 'fictional-node', providerProfileId: 'fictional-profile', submissionId: 'fictional-submission',
      assertCommit: check,
      assertOutputPath: (path) => assertManagedPathAllowMissingLeaf(path, [root]),
      register: vi.fn(async (path, metadata, indexed) => { await writeFile(join(root, 'index.json'), JSON.stringify({ path, metadata })); indexed() }),
      history: vi.fn(async (entry) => { await writeFile(join(root, 'history.json'), JSON.stringify(entry)) }),
      localUrl: path => `prism-asset://fictional/${encodeURIComponent(path)}`,
    },
  }
  const owned = <T>(work: () => Promise<T>) => state.run('elevenlabs', work, { overrides: { elevenlabs: 'fictional-profile' }, validateResult: false })
  try { await run({ options, state, root, posts, owned }) }
  finally { await rm(root, { recursive: true, force: true }) }
}

describe('main-only Music composition', () => {
  it.each(['music_v1', 'music_v2', 'music_v2_5'] as const)('composes %s into exact encoded file, asset metadata and history', model => fixture(async f => {
    const result = await f.owned(() => runMusicComposition(f.options, prompt(model)))
    expect(f.posts).toHaveLength(1)
    expect(new URL(f.posts[0].url).pathname).toBe('/v1/music')
    expect(f.posts[0].init.method).toBe('POST')
    expect(f.posts[0].body).toEqual({ model_id: model, prompt: '  A fictional beat.\r\nKeep my spacing.  ', music_length_ms: 3500, force_instrumental: false })
    const bytes = encoded.get(model === 'music_v1' ? 44100 : 48000)!
    expect(await readFile(result.outputPath)).toEqual(bytes)
    const index = JSON.parse(await readFile(join(f.root, 'index.json'), 'utf8'))
    const history = JSON.parse(await readFile(join(f.root, 'history.json'), 'utf8'))
    expect(index.metadata).toMatchObject({ audioOperation: 'music', requestedOutputFormat: 'auto', providerProfileId: 'fictional-profile', submissionId: 'fictional-submission', requestedDurationMs: 3500, encoded: { sha256: sha(bytes), channels: [2], sampleRates: [model === 'music_v1' ? 44100 : 48000] } })
    expect(index.metadata.encoded.durationSeconds).toBeLessThan(1)
    expect(history).toMatchObject({ projectId: 'fictional-project', nodeId: 'fictional-node', modelId: `elevenlabs/${model}`, requestId: 'fictional-provider-request', outputPath: result.outputPath, metadata: index.metadata })
    expect(JSON.stringify(index)).not.toContain(key)
    expect(JSON.stringify(history)).not.toContain(key)
  }))

  it('preserves both model-specific plan families and conditional zero/false fields', () => fixture(async f => {
    const v1: MusicRequest = { mode: 'plan', modelId: 'music_v1', seed: 0, respectSectionsDurations: false, plan: { positive_global_styles: [' warm '], negative_global_styles: [], sections: [{ section_name: 'Verse', duration_ms: 3750, positive_local_styles: [], negative_local_styles: [], lines: ['  words  ', '', 'second line'] }] } }
    await f.owned(() => runMusicComposition(f.options, v1))
    expect(f.posts[0].body).toEqual({ model_id: 'music_v1', seed: 0, respect_sections_durations: false, composition_plan: v1.plan })
    f.options.storage.outputStem = join(f.root, 'Second')
    const v2 = plan()
    await f.owned(() => runMusicComposition(f.options, v2))
    expect(f.posts[1].body).toEqual({ model_id: 'music_v2_5', seed: 0, composition_plan: v2.plan })
    expect(f.posts[1].body).not.toHaveProperty('music_length_ms')
  }))

  it('rejects malformed and custom-prototype requests before credential inspection or service callbacks', () => fixture(async f => {
    const credential = vi.fn(() => key)
    Object.defineProperty(f.options.transport, 'key', { enumerable: true, get: credential })
    const owner = vi.fn(f.options.storage.assertCommit)
    f.options.storage.assertCommit = owner
    for (const input of [{ ...prompt(), seed: 0 }, { ...plan(), forceInstrumental: false }, Object.assign(Object.create({ custom: true }), prompt()), null]) {
      await expect(f.owned(() => runMusicComposition(f.options, input))).rejects.toMatchObject({ name: 'MusicFailure', completion: 'not-submitted' })
    }
    expect(credential).not.toHaveBeenCalled()
    expect(owner).not.toHaveBeenCalled()
    expect(f.posts).toHaveLength(0)
  }))

  it.each(['providerProfileId', 'projectId', 'nodeId', 'submissionId'] as const)('rejects missing %s before credential inspection or POST', field => fixture(async f => {
    f.options.storage[field] = ''
    const credential = vi.fn(() => key)
    Object.defineProperty(f.options.transport, 'key', { enumerable: true, get: credential })
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'not-submitted' })
    expect(credential).not.toHaveBeenCalled()
    expect(f.posts).toHaveLength(0)
  }))

  it.each(['pcm_48000', 'mp3_48000_192'] as const)('blocks unusable %s output preparation before POST', outputFormat => fixture(async f => {
    if (outputFormat.startsWith('mp3')) f.options.transport.decoderBinary = join(f.root, 'missing-decoder')
    await expect(f.owned(() => runMusicComposition(f.options, { ...prompt(), outputFormat }))).rejects.toMatchObject({ completion: 'not-submitted' })
    expect(f.posts).toHaveLength(0)
    expect(f.options.storage.register).not.toHaveBeenCalled()
  }))

  it('detaches authored request, transport bindings and storage owner identity before awaits', () => fixture(async f => {
    const input = plan()
    const expected = structuredClone(input.plan)
    const originalFetch = f.options.transport.fetch
    f.options.transport.fetch = async (url, init) => {
      input.plan.chunks[0].text = 'later lyric edit'
      input.plan.chunks[0].duration_ms = 9000
      f.options.transport.key = 'later-fictional-account-key'
      f.options.storage.providerProfileId = 'later-profile'
      f.options.storage.submissionId = 'later-submission'
      f.options.storage.projectId = 'later-project'
      f.options.storage.outputStem = join(f.root, 'Later')
      return originalFetch(url, init)
    }
    const output = await f.owned(() => runMusicComposition(f.options, input))
    expect(output.outputPath).toBe(join(f.root, 'Music.mp3'))
    expect(f.posts[0].body.composition_plan).toEqual(expected)
    expect(new Headers(f.posts[0].init.headers).get('xi-api-key')).toBe(key)
    const metadata = JSON.parse(await readFile(join(f.root, 'index.json'), 'utf8')).metadata
    expect(metadata).toMatchObject({ providerProfileId: 'fictional-profile', submissionId: 'fictional-submission', requestedDurationMs: 3500, requestSnapshot: { composition_plan: expected } })
    expect(JSON.parse(await readFile(join(f.root, 'history.json'), 'utf8')).projectId).toBe('fictional-project')
  }))

  it.each(['profile', 'project'] as const)('uses the actual %s revision lease to block stale submission', changed => fixture(async f => {
    f.options.transport.assertSubmission = () => {
      if (changed === 'project') f.state.activateProject('another-fictional-project')
      else void f.state.change('elevenlabs', async () => {})
    }
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'not-submitted' })
    expect(f.posts).toHaveLength(0)
  }))

  it.each(['profile', 'project'] as const)('rejects %s changes after POST as unknown without saving or replay', changed => fixture(async f => {
    const originalFetch = f.options.transport.fetch
    f.options.transport.fetch = async (url, init) => {
      const response = await originalFetch(url, init)
      if (changed === 'project') f.state.activateProject('another-fictional-project')
      else await f.state.change('elevenlabs', async () => {})
      return response
    }
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'unknown' })
    expect(f.posts).toHaveLength(1)
    expect(f.options.storage.register).not.toHaveBeenCalled()
  }))

  it.each([403, 500, 0])('retains completion uncertainty/rejection for status %s with one POST and redaction', status => fixture(async f => {
    const fetch = vi.fn(async () => {
      if (status === 0) throw new Error('Network failed ' + key)
      return new Response(JSON.stringify({ detail: 'Fictional provider failed ' + key }), { status, headers: { 'content-type': 'application/json' } })
    })
    f.options.transport.fetch = fetch
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toMatchObject({ name: 'MusicFailure', completion: status === 403 ? 'rejected' : 'unknown' })
    expect(error.message).not.toContain(key)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(f.options.storage.register).not.toHaveBeenCalled()
  }))

  it('blocks pre-cancellation and cancels pending output without a second POST', () => fixture(async f => {
    const controller = new AbortController()
    controller.abort(new Error('fictional cancellation'))
    f.options.transport.signal = controller.signal
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'not-submitted' })
    expect(f.posts).toHaveLength(0)
    const pending = new AbortController()
    let canceled = false
    f.options.transport.signal = pending.signal
    const fetch = vi.fn(async () => {
      setTimeout(() => pending.abort(new Error('fictional pending cancellation')), 0)
      return new Response(new ReadableStream({ cancel() { canceled = true } }), { headers: { 'content-type': 'audio/mpeg' } })
    })
    f.options.transport.fetch = fetch
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'unknown' })
    expect(canceled).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(f.options.storage.register).not.toHaveBeenCalled()
  }))

  it('preserves an existing output collision and reports completed-provider saving failure', () => fixture(async f => {
    await writeFile(join(f.root, 'Music.mp3'), 'foreign output')
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toBeInstanceOf(MusicCompositionOutputFailure)
    expect(error).toMatchObject({ providerCompletion: 'complete', saveState: 'not-indexed', requestId: 'fictional-provider-request', submissionId: 'fictional-submission' })
    expect(await readFile(join(f.root, 'Music.mp3'), 'utf8')).toBe('foreign output')
    expect(f.posts).toHaveLength(1)
    expect(f.options.storage.register).not.toHaveBeenCalled()
  }))

  it('cleans its unindexed output when registration fails and redacts the completed failure', () => fixture(async f => {
    f.options.storage.register = vi.fn(async () => { throw new Error('Index failed ' + key) })
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toMatchObject({ providerCompletion: 'complete', saveState: 'not-indexed', retainedOutputPath: undefined })
    expect(error.message).not.toContain(key)
    await expect(readFile(join(f.root, 'Music.mp3'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(f.posts).toHaveLength(1)
    expect(f.options.storage.history).not.toHaveBeenCalled()
  }))

  it.each(['register', 'history'] as const)('retains an indexed result after %s failure with honest history-pending state', failed => fixture(async f => {
    if (failed === 'register') {
      const register = f.options.storage.register
      f.options.storage.register = async (...args) => { await register(...args); throw new Error('Portable projection failed') }
    } else f.options.storage.history = vi.fn(async () => { throw new Error('History failed') })
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toMatchObject({ providerCompletion: 'complete', saveState: 'indexed-history-pending', retainedOutputPath: join(f.root, 'Music.mp3') })
    expect(await readFile(error.retainedOutputPath)).toEqual(encoded.get(48000))
    expect(JSON.parse(await readFile(join(f.root, 'index.json'), 'utf8')).metadata.audioOperation).toBe('music')
    expect(f.posts).toHaveLength(1)
  }))

  it('retains a foreign replacement after a failing registration callback', () => fixture(async f => {
    f.options.storage.register = async path => { await rename(path, path + '.original'); await writeFile(path, 'foreign replacement'); throw new Error('Index failed after replacement') }
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toMatchObject({ providerCompletion: 'complete', saveState: 'not-indexed', retainedOutputPath: join(f.root, 'Music.mp3') })
    expect(await readFile(error.retainedOutputPath, 'utf8')).toBe('foreign replacement')
    expect(await readFile(error.retainedOutputPath + '.original')).toEqual(encoded.get(48000))
    expect(f.posts).toHaveLength(1)
  }))


  it('captures verified encoded bytes before asynchronous storage callbacks', () => fixture(async f => {
    const returnedBytes = Buffer.from(encoded.get(48000)!)
    const expected = Buffer.from(returnedBytes)
    f.options.transport.fetch = async () => new Response(new Uint8Array(returnedBytes), { headers: { 'content-type': 'audio/mpeg' } })
    const assertPath = f.options.storage.assertOutputPath
    f.options.storage.assertOutputPath = async path => { returnedBytes.fill(0); return assertPath(path) }
    const output = await f.owned(() => runMusicComposition(f.options, prompt()))
    expect(await readFile(output.outputPath)).toEqual(expected)
    const metadata = JSON.parse(await readFile(join(f.root, 'index.json'), 'utf8')).metadata
    expect(metadata.encoded.sha256).toBe(sha(expected))
    expect(output.requestId).toBe('fictional-submission')
  }))

  it('rejects invalid output ownership before credential inspection', () => fixture(async f => {
    f.options.storage.outputStem = 'relative-output'
    const credential = vi.fn(() => key)
    Object.defineProperty(f.options.transport, 'key', { enumerable: true, get: credential })
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'not-submitted' })
    expect(credential).not.toHaveBeenCalled()
    expect(f.posts).toHaveLength(0)
  }))


  it('retains indexed-history-saved output if ownership changes after history commit', () => fixture(async f => {
    const history = f.options.storage.history
    f.options.storage.history = async entry => { await history(entry); await f.state.change('elevenlabs', async () => {}) }
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toMatchObject({ providerCompletion: 'complete', saveState: 'indexed-history-saved', retainedOutputPath: join(f.root, 'Music.mp3') })
    expect(await readFile(error.retainedOutputPath)).toEqual(encoded.get(48000))
    expect(JSON.parse(await readFile(join(f.root, 'history.json'), 'utf8')).outputPath).toBe(error.retainedOutputPath)
    expect(f.posts).toHaveLength(1)
  }))

  it('bounds the streamed encoded response before any output registration', () => fixture(async f => {
    f.options.transport.maximumResponseBytes = 64
    await expect(f.owned(() => runMusicComposition(f.options, prompt()))).rejects.toMatchObject({ completion: 'unknown' })
    expect(f.posts).toHaveLength(1)
    expect(f.options.storage.register).not.toHaveBeenCalled()
    await expect(readFile(join(f.root, 'Music.mp3'))).rejects.toMatchObject({ code: 'ENOENT' })
  }))

  it('blocks changed ownership during output path preparation before file creation', () => fixture(async f => {
    const assertPath = f.options.storage.assertOutputPath
    f.options.storage.assertOutputPath = async path => { const ownedPath = await assertPath(path); await f.state.change('elevenlabs', async () => {}); return ownedPath }
    const error = await f.owned(() => runMusicComposition(f.options, prompt())).catch(error => error)
    expect(error).toMatchObject({ providerCompletion: 'complete', saveState: 'not-indexed' })
    expect(f.posts).toHaveLength(1)
    expect(f.options.storage.register).not.toHaveBeenCalled()
    await expect(readFile(join(f.root, 'Music.mp3'))).rejects.toMatchObject({ code: 'ENOENT' })
  }))
})
