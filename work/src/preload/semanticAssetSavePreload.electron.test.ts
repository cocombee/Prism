import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { buildSync } = require(resolve(process.cwd(), 'node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string
const temporaryDirectories: string[] = []
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('actual preload semantic result commit IPC bridge', () => {
  it('exposes the typed renderer API and invokes only the fixed main channel with the exact immutable identity request', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-preload-')); temporaryDirectories.push(directory)
    const preload = join(directory, 'preload.cjs'); const html = join(directory, 'index.html'); const main = join(directory, 'main.cjs')
    buildSync({ entryPoints: [resolve(process.cwd(), 'src/preload/index.ts')], outfile: preload, bundle: true, platform: 'node', format: 'cjs', target: 'node20', external: ['electron'], logLevel: 'silent' })
    writeFileSync(html, '<!doctype html><html><body>semantic preload fixture</body></html>')
    writeFileSync(main, `const{app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_PRELOAD_RESULT:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));ipcMain.handle('assets:commit-semantic-result',(_event,request)=>({ok:true,request}));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,webPreferences:{preload:${JSON.stringify(preload)},contextIsolation:true,sandbox:false}});await win.loadFile(${JSON.stringify(html)});const value=await win.webContents.executeJavaScript("window.prism.assets.commitSemanticResult({nodeId:'character-1',selectedResultId:'generated-2',intent:{mode:'replace-existing',targetAssetId:'saved-1',token:'edit-token'}})");finish(value)}).catch(e=>finish({error:e.stack||String(e)},1))`)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 20_000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('SEMANTIC_PRELOAD_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0); expect(marker).toBeDefined()
    expect(JSON.parse(marker!.slice('SEMANTIC_PRELOAD_RESULT:'.length))).toEqual({ ok: true, request: { nodeId: 'character-1', selectedResultId: 'generated-2', intent: { mode: 'replace-existing', targetAssetId: 'saved-1', token: 'edit-token' } } })
  }, 30_000)
})
