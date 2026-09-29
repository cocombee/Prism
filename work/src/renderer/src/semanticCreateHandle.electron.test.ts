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

describe('mounted reusable Create control and physical output handle geometry', () => {
  it('keeps Plus/text-only Create anatomy disjoint from the real React Flow handle at rest, hover, Create-open, and 1.0/0.8 zoom', () => {
    const result = runProbe()
    if (process.env.PRISM_HANDLE_REPORT === '1') console.log(JSON.stringify(result.snapshots))
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.snapshots).toHaveLength(30)
    for (const snapshot of result.snapshots) {
      expect(snapshot.createSvgCount, snapshot.name).toBe(snapshot.state === 'open' ? 0 : 1)
      expect(snapshot.createText, snapshot.name).toBe(snapshot.state === 'open' ? '' : `Create ${snapshot.label}`)
      expect(snapshot.handleIsReactFlowTarget, snapshot.name).toBe(true)
      expect(snapshot.handlePointerEvents, snapshot.name).toBe('auto')
      expect(snapshot.visualPointerEvents, snapshot.name).toBe('none')
      expect(snapshot.inlineOpenAction, snapshot.name).toBeNull()
      if (snapshot.create) expect(snapshot.intersects, JSON.stringify(snapshot)).toBe(false)
      expect(snapshot.handle.left, JSON.stringify(snapshot)).toBeGreaterThanOrEqual(snapshot.node.right - 1)
    }
  }, 60_000)
})

function runProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-create-handle-'))
  temporaryDirectories.push(directory)
  const entry = join(directory, 'renderer.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  writeFileSync(entry, `
    import React from 'react'
    import { createRoot } from 'react-dom/client'
    import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
    import { NodeCard, NodeRuntimeContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
    const kinds=['character','wardrobe','element','style-reference','location']
    const label=kind=>kind==='style-reference'?'Style':kind[0].toUpperCase()+kind.slice(1)
    const noop=()=>undefined
    const data=kind=>({kind,title:label(kind),prompt:'',outputUrl:'https://example.invalid/stale-output.png',imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro/edit',outputFormat:'png',imageResolution:'1K',quantity:1,characterEditorOpen:false,styleEditorOpen:false,semanticEditorOpen:false,referenceAssets:[],semanticAssetLifecycle:{version:1,status:'EMPTY',references:[]},runState:'idle'})
    const cases=kinds.flatMap(kind=>[1,.8].map(zoom=>({name:kind+'-'+zoom,kind,zoom})))
    function Mount({item,index,nodeData,runtime}){const nodes=[{id:item.name,type:'studio',position:{x:0,y:0},style:{width:315},data:nodeData}];return <section data-case={item.name} data-kind={item.kind} data-zoom={item.zoom} style={{position:'absolute',left:(index%5)*340,top:Math.floor(index/5)*430,width:330,height:410}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:0,y:0,zoom:item.zoom}} nodesDraggable={false} nodesConnectable panOnDrag={false} zoomOnScroll={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></section>}
    function App(){const [state,setState]=React.useState(()=>Object.fromEntries(cases.map(item=>[item.name,data(item.kind)])));const runtime=new Proxy({characterLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],updateNode:(id,patch)=>setState(current=>({...current,[id]:{...current[id],...patch}}))},{get(target,key){return key in target?target[key]:noop}});return <main>{cases.map((item,index)=><Mount key={item.name} item={item} index={index} nodeData={state[item.name]} runtime={runtime}/>)}</main>}
    const box=element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
    const snapshot=(name,state)=>{const section=document.querySelector('[data-case="'+name+'"]');const node=section.querySelector('.studio-node');const create=node.querySelector('.style-create-toggle');const handle=node.querySelector('.node-port-source.react-flow__handle');const inlineOpen=node.querySelector('.node-open');const visual=handle.querySelector('.node-port-visual');const n=box(node),h=box(handle),c=create?box(create):null;return{name,state,label:label(section.dataset.kind),node:n,handle:h,create:c,inlineOpenAction:inlineOpen?box(inlineOpen):null,createSvgCount:create?.querySelectorAll(':scope > svg').length||0,createText:create?.textContent.trim()||'',intersects:Boolean(c&&h.left<c.right&&h.right>c.left&&h.top<c.bottom&&h.bottom>c.top),handleIsReactFlowTarget:handle.classList.contains('react-flow__handle'),handlePointerEvents:getComputedStyle(handle).pointerEvents,visualPointerEvents:getComputedStyle(visual).pointerEvents}}
    window.__caseNames=cases.map(item=>item.name)
    window.__centers=()=>window.__caseNames.map(name=>{const r=document.querySelector('[data-case="'+name+'"] .studio-node').getBoundingClientRect();return{name,x:r.left+r.width/2,y:r.top+r.height/2}})
    window.__snapshot=snapshot
    window.__open=async name=>{document.querySelector('[data-case="'+name+'"] .style-create-toggle').click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return snapshot(name,'open')}
    window.__errors=[];window.__posts=0;const originalFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{if(String(init.method||'GET').toUpperCase()==='POST')window.__posts+=1;return originalFetch(input,init)};window.addEventListener('error',event=>{if(!String(event.message).includes('ResizeObserver loop'))window.__errors.push(event.message)});window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    createRoot(document.getElementById('root')).render(<App/>)
  `)
  buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}body{margin:0;background:#111;color:#ddd}main{position:relative;width:1700px;height:900px}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_CREATE_HANDLE:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1720,height:940,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(500);const names=await win.webContents.executeJavaScript('window.__caseNames');const snapshots=[];for(const name of names)snapshots.push(await win.webContents.executeJavaScript('window.__snapshot('+JSON.stringify(name)+',"rest")'));const centers=await win.webContents.executeJavaScript('window.__centers()');for(const center of centers){win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(center.x),y:Math.round(center.y)});await wait(30);snapshots.push(await win.webContents.executeJavaScript('window.__snapshot('+JSON.stringify(center.name)+',"hover")'))}win.webContents.sendInputEvent({type:'mouseMove',x:1,y:1});for(const name of names)snapshots.push(await win.webContents.executeJavaScript('window.__open('+JSON.stringify(name)+')'));const tail=await win.webContents.executeJavaScript('({errors:window.__errors,posts:window.__posts})');finish({snapshots,...tail})}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:55_000})
  const marker=run.stdout.split('\n').find(line=>line.startsWith('SEMANTIC_CREATE_HANDLE:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('SEMANTIC_CREATE_HANDLE:'.length))
}

declare global { interface Window { __caseNames: string[]; __centers: () => unknown; __snapshot: (name: string, state: string) => unknown; __open: (name: string) => unknown; __errors: unknown[]; __posts: number } }
