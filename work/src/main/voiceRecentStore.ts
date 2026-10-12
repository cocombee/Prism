import { createHash } from 'node:crypto'
import { readFile, mkdir, rename, writeFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { BrowserVoice } from '../shared/voiceBrowser'
import { voicePathId } from '../shared/voiceBrowser'
/** IDs and bounded display metadata only; project and credential ownership never cross IPC. */
export class VoiceRecentStore {
  private writes = new Map<string, Promise<unknown>>()
  constructor(private readonly root: string) {}
  path(project: string, provider: string, key: string): string {
    const identity = createHash('sha256').update(JSON.stringify([project,provider,key])).digest('hex')
    return join(this.root,`${identity}.json`)
  }
  async read(path: string): Promise<BrowserVoice[]> {
    try {
      const bytes = await readFile(path)
      if (bytes.length > 128 * 1024) throw new Error('Voice history is too large.')
      const data: unknown = JSON.parse(bytes.toString('utf8'))
      if (!Array.isArray(data) || data.length > 30) throw new Error('Invalid voice history.')
      return data.map(v => { voicePathId(v?.id); if (typeof v.label !== 'string' || v.label.length > 256) throw new Error('Invalid voice history.'); return v as BrowserVoice })
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
  }
  async remember(path: string, voice: BrowserVoice, assertCurrent: () => void): Promise<void> {
    const previous = this.writes.get(path) || Promise.resolve()
    const operation = previous.catch(() => undefined).then(async () => {
      const old = await this.read(path); assertCurrent()
      const next = [voice,...old.filter(v => v.id !== voice.id)].slice(0,30)
      await mkdir(dirname(path),{recursive:true}); assertCurrent()
      const temporary = `${path}.${createHash('sha256').update(String(Math.random())).digest('hex').slice(0,16)}.tmp`
      try { await writeFile(temporary,JSON.stringify(next),{flag:'wx',mode:0o600}); assertCurrent(); await rename(temporary,path) }
      finally { await unlink(temporary).catch(() => undefined) }
    })
    this.writes.set(path,operation)
    try { await operation } finally { if (this.writes.get(path) === operation) this.writes.delete(path) }
  }
}
