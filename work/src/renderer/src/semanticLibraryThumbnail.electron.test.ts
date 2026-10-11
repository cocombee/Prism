import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

describe('restored independent semantic Library thumbnail contracts', () => {
  it('keeps the Primary thumbnail unobstructed, preserves metadata status, and restores side Assets to its pre-regression DOM', () => {
    const app = readFileSync(resolve(process.cwd(), 'src/renderer/src/AppNext.tsx'), 'utf8')
    const offlineStyles = readFileSync(resolve(process.cwd(), 'src/renderer/src/media-offline-state.css'), 'utf8')
    expect(app).not.toContain("import { SemanticCollectionThumbnail } from './SemanticCollectionThumbnail'")
    expect(app).not.toContain('<SemanticCollectionThumbnail ')
    expect(app).not.toContain('semantic-thumbnail-offline-overlay')
    expect(offlineStyles).not.toMatch(/\.semantic-collection-preview\s*\{[^}]*position:\s*relative/)

    const primary = app.match(/<div className="asset-preview semantic-collection-preview"[\s\S]*?<i>\{collection\.assets\.length\} file/)?.[0] || ''
    expect(primary).toContain('collection.previewAssets.map((asset) => asset.mimeType.startsWith(\'image/\') && asset.url ? <img')
    expect(primary).not.toContain('<MediaOfflineState')
    expect(primary).not.toContain('missingAssetIds.includes(asset.id) ?')
    expect(app).toContain("linkState === 'offline' ? 'Media Offline'")

    const side = app.match(/<button className="canvas-asset-thumb semantic-collection-preview"[\s\S]*?<\/button>/)?.[0] || ''
    expect(side).toContain('collection.previewAssets.map((asset) => missingAssetIds.includes(asset.id) ? <MediaOfflineState')
    expect(side).toContain('showFind={false}')
    expect(side).toContain(': asset.url ? <img')
    expect(side).not.toContain('semantic-thumbnail-offline-overlay')

    const result = runProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.primary).toMatchObject({ imageCount: 1, imageSource: 'semantic-B.png', offlineDescendants: 0, metadataStatus: 'Media Offline', files: '3 files', views: '3 views', date: '27/08/2026' })
    expect(result.sideOffline).toMatchObject({ imageCount: 0, offlineDescendants: 1, status: 'Media Offline', draggable: 'false' })
    expect(result.sideOnline).toMatchObject({ imageCount: 1, imageSource: 'semantic-B.png', offlineDescendants: 0, draggable: 'true' })
  }, 30_000)
})

function runProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-library-restoration-'))
  temporaryDirectories.push(directory)
  const entry = join(directory, 'renderer.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  writeFileSync(entry, `
    import React from 'react'
    import { createRoot } from 'react-dom/client'
    import { MediaOfflineState } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/MediaOfflineState.tsx'))}
    const asset={id:'semantic-B',name:'semantic-B.png',path:'/managed/semantic-B.png',url:'semantic-B.png',mimeType:'image/png',createdAt:'2026-08-27T00:00:00Z',metadata:{characterView:'front'}}
    const noop=()=>undefined
    function Primary(){return <article data-surface="primary"><div data-preview>{[asset].map(value=>value.mimeType.startsWith('image/')&&value.url?<img key={value.id} src={value.url} alt={value.name}/>:<span key={value.id}>fallback</span>)}</div><div data-meta><small>Media Offline</small><i>3 files</i><span>3 views</span><time>27/08/2026</time></div></article>}
    function Side({offline}){return <button data-surface={offline?'side-offline':'side-online'} draggable={!offline}>{[asset].map(value=>offline?<MediaOfflineState key={value.id} compact showFind={false} mediaFamily="image" state="offline" findingDots={1} onFind={noop}/>:value.url?<img key={value.id} src={value.url} alt={value.name}/>:<span key={value.id}>fallback</span>)}</button>}
    function App(){return <><Primary/><Side offline/><Side offline={false}/></>}
    window.__errors=[];window.__posts=0;const originalFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{if(String(init.method||'GET').toUpperCase()==='POST')window.__posts+=1;return originalFetch(input,init)};window.addEventListener('error',event=>window.__errors.push(event.message));window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    window.__probe=()=>{const snap=surface=>{const root=document.querySelector('[data-surface="'+surface+'"]');return{imageCount:root.querySelectorAll('img').length,imageSource:root.querySelector('img')?.getAttribute('src'),offlineDescendants:root.querySelectorAll('.media-offline-state').length,status:root.querySelector('.media-offline-state')?.textContent?.trim(),draggable:root.getAttribute('draggable')}};const primary=document.querySelector('[data-surface="primary"]');return{primary:{...snap('primary'),metadataStatus:primary.querySelector('[data-meta] small').textContent,files:primary.querySelector('[data-meta] i').textContent,views:primary.querySelector('[data-meta] span').textContent,date:primary.querySelector('[data-meta] time').textContent},sideOffline:snap('side-offline'),sideOnline:snap('side-online'),errors:window.__errors,posts:window.__posts}}
    createRoot(document.getElementById('root')).render(<App/>)
  `)
  buildSync({ loader: { '.svg': 'dataurl' }, entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', logLevel:'silent' })
  writeFileSync(html, '<!doctype html><html><body><div id="root"></div><script src="renderer.js"></script></body></html>')
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('LIBRARY_RESTORATION:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await new Promise(r=>setTimeout(r,200));finish(await win.webContents.executeJavaScript('window.__probe()'))}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 25_000 })
  const marker = run.stdout.split('\n').find(line => line.startsWith('LIBRARY_RESTORATION:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('LIBRARY_RESTORATION:'.length))
}
