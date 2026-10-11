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

describe('semantic reusable asset offline contract', () => {
  it('switches actual production nodes Ready↔Offline for all five kinds and relinks without losing selection or output role', () => {
    const result = runProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.kinds).toHaveLength(5)
    for (const item of result.kinds) {
      expect(item.online.header, item.kind).toContain('Ready')
      expect(item.offline.header, item.kind).toContain('Offline')
      expect(item.offline.offlineSelectorClass, item.kind).toContain('is-offline')
      expect(item.offline.offlineSelectorClass, item.kind).toContain('is-active')
      expect(item.offline.draggable, item.kind).toBe('false')
      expect(item.offline.thumbnailAssetId, item.kind).toBe(`${item.kind}-B`)
      expect(item.offline.thumbnailSource, item.kind).toContain(`${item.kind}-B`)
      expect(item.offline.thumbnailOfflineBadge, item.kind).toContain('Media Offline')
      expect(item.offline.preview, item.kind).toContain('Media Offline')
      expect(item.offline.hasEdit, item.kind).toBe(true)
      expect(item.offline.outputAriaDisabled, item.kind).toBe('true')
      expect(item.offline.outputClass, item.kind).toContain('is-offline')
      expect(item.relinked.header, item.kind).toContain('Ready')
      expect(item.relinked.preview, item.kind).not.toContain('Media Offline')
      expect(item.relinked.activeTitle, item.kind).toBe(item.offlineTitle)
      expect(item.relinked.outputAriaDisabled, item.kind).toBe('false')
      expect(item.relinked.outputClass, item.kind).not.toContain('is-offline')
      expect(item.online.outputRole, item.kind).toBe(item.offline.outputRole)
      expect(item.offline.outputRole, item.kind).toBe(item.relinked.outputRole)
    }
  }, 70_000)

  it('keeps offline thumbnail overlay ownership selector-local and restores both Library renderers independently', () => {
    const owner = readFileSync(resolve(process.cwd(), 'src/renderer/src/media-offline-state.css'), 'utf8')
    const general = readFileSync(resolve(process.cwd(), 'src/renderer/src/styles-next.css'), 'utf8')
    const app = readFileSync(resolve(process.cwd(), 'src/renderer/src/AppNext.tsx'), 'utf8')
    const nodeCard = readFileSync(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'), 'utf8')
    expect(owner).toMatch(/--media-offline-border:/)
    expect(owner).toMatch(/--media-offline-background:/)
    expect(owner).toMatch(/\.semantic-selector-item\.is-offline[\s\S]*var\(--media-offline-border\)[\s\S]*var\(--media-offline-background\)/)
    expect(general).not.toMatch(/semantic-selector-item\.is-offline/)
    expect(app).not.toContain('SemanticCollectionThumbnail')
    expect(app).not.toContain('semantic-thumbnail-offline-overlay')
    expect(nodeCard.match(/data-asset-id=\{asset\.id\}/g)).toHaveLength(3)
    expect(nodeCard).not.toContain('data-preview-count={offline ? 0 : previewAssets.length}')
    expect(nodeCard.match(/semantic-thumbnail-offline-overlay/g)).toHaveLength(3)
  })

  it('mounts the production React Flow edge online → offline → relinked with the exact shared Not Ready owner', () => {
    const result = runEdgeProbe()
    expect(result.errors).toEqual([])
    expect(result.online).toMatchObject({ animated: true, stroke: 'rgb(166, 140, 255)', strokeWidth: '2' })
    expect(result.offline).toMatchObject({ animated: false, stroke: 'rgb(255, 89, 109)', strokeWidth: '2' })
    expect(result.offline.className).not.toContain('semantic-offline-edge')
    expect(result.offline.style).not.toContain('stroke-dasharray')
    expect(result.offline.style).not.toContain('opacity')
    expect(result.relinked).toEqual(result.online)
  }, 30_000)
})

function runEdgeProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-offline-edge-'))
  temporaryDirectories.push(directory)
  const entry = join(directory, 'renderer.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  writeFileSync(entry, `
    import React from 'react'
    import { createRoot } from 'react-dom/client'
    import { Handle, Position, ReactFlow, ReactFlowProvider } from '@xyflow/react'
    import { projectSemanticAssetData, semanticEdgePresentation } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/semanticAssetAvailability.ts'))}
    const asset={id:'semantic-asset',name:'semantic.png',path:'/disposable/semantic.png',url:'data:image/svg+xml,semantic',mimeType:'image/png',createdAt:'2026-08-27T00:00:00.000Z',metadata:{characterView:'front'}}
    const sourceData={kind:'character',title:'Hero',referenceAssets:[asset]}
    const edge={id:'semantic-edge',source:'semantic-source',sourceHandle:'media-out',target:'semantic-target',targetHandle:'character-in',animated:true,style:{stroke:'#a68cff',strokeWidth:2},data:{inputFidelity:'lock'}}
    function ProbeNode({id}){return <div style={{width:150,height:70,background:'#222'}}><Handle type="target" id="character-in" position={Position.Left}/><span>{id}</span><Handle type="source" id="media-out" position={Position.Right}/></div>}
    function App(){const[offline,setOffline]=React.useState(false);const projected=semanticEdgePresentation(edge,projectSemanticAssetData(sourceData,offline?['semantic-asset']:[]));window.__setOffline=setOffline;return <ReactFlowProvider><div style={{width:800,height:500}}><ReactFlow nodes={[{id:'semantic-source',type:'probe',position:{x:30,y:180},data:{}},{id:'semantic-target',type:'probe',position:{x:520,y:180},data:{}}]} edges={[projected]} nodeTypes={{probe:ProbeNode}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></div></ReactFlowProvider>}
    const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    const snap=()=>{const group=document.querySelector('.react-flow__edge');const path=group?.querySelector('.react-flow__edge-path');return{animated:Boolean(group?.classList.contains('animated')),className:group?.getAttribute('class')||'',style:path?.getAttribute('style')||'',stroke:path?.style.stroke||path?.getAttribute('stroke')||'',strokeWidth:path?.style.strokeWidth||path?.getAttribute('stroke-width')||''}}
    window.__probe=async()=>{await wait();const online=snap();window.__setOffline(true);await wait();const offline=snap();window.__setOffline(false);await wait();const relinked=snap();return{online,offline,relinked}}
    window.__errors=[];window.addEventListener('error',event=>{if(!String(event.message).includes('ResizeObserver loop'))window.__errors.push(event.message)});window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    createRoot(document.getElementById('root')).render(<App/>)
  `)
  buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', logLevel:'silent' })
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')}"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_EDGE:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:820,height:520,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(500);const result=await win.webContents.executeJavaScript('window.__probe()');const errors=await win.webContents.executeJavaScript('window.__errors');finish({...result,errors})}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:25_000})
  const marker=run.stdout.split('\n').find(line=>line.startsWith('SEMANTIC_EDGE:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('SEMANTIC_EDGE:'.length))
}

function runProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-offline-'))
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
    import { ProviderAvailabilityContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderAvailabilityContext.tsx'))}
    import { semanticAssetAvailability } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/semanticAssetAvailability.ts'))}
    const kinds=['character','wardrobe','element','location','style-reference']
    const noop=()=>undefined
    const label=kind=>kind==='style-reference'?'Style':kind[0].toUpperCase()+kind.slice(1)
    const asset=(kind,suffix)=>({id:kind+'-'+suffix,name:label(kind)+' '+suffix,path:'/disposable/'+kind+'-'+suffix+'.png',url:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="50"><title>'+kind+'-'+suffix+'</title><rect width="80" height="50" fill="%23666"/></svg>'),mimeType:'image/png',category:kind==='style-reference'?'style':kind,createdAt:'2026-08-27T00:00:00.000Z',metadata:{characterView:'front',elementView:'three-quarter',characterInputMode:'single',elementInputMode:'single',locationInputMode:'single',wardrobeInputMode:'single'}})
    const libraries=Object.fromEntries(kinds.map(kind=>[kind,['A','B'].map(suffix=>({nodeId:kind+'-'+suffix,title:label(kind)+' '+suffix,referenceTag:'@'+kind+'-'+suffix,referenceAssets:[asset(kind,suffix)],prompt:kind==='style-reference'?'Saved custom style '+suffix:undefined,description:kind==='style-reference'?'Style '+suffix:undefined}))]))
    const initial=kind=>({kind,title:label(kind)+' A',referenceTag:'@'+kind+'-A',referenceAssets:[asset(kind,'A')],characterInputMode:'single',elementInputMode:'single',locationInputMode:'single',wardrobeInputMode:'single',stylePrompt:kind==='style-reference'?'Saved custom style A':undefined,styleDescription:kind==='style-reference'?'Style A':undefined,styleSavedAt:kind==='style-reference'?'2026-08-27T00:00:00.000Z':undefined,runState:'complete'})
    function Case({kind,index}){const [data,setData]=React.useState(()=>initial(kind));const [missing,setMissing]=React.useState(()=>new Set([kind+'-B']));const select=(id)=>{const item=libraries[kind].find(value=>value.nodeId===id);setData(current=>({...current,title:item.title,referenceTag:item.referenceTag,referenceAssets:item.referenceAssets,stylePrompt:kind==='style-reference'?item.prompt:current.stylePrompt,styleDescription:kind==='style-reference'?item.description:current.styleDescription,styleSavedAt:kind==='style-reference'?'2026-08-27T00:00:00.000Z':current.styleSavedAt}))};const runtime=new Proxy({characterLibrary:kind==='character'?libraries[kind]:[],semanticLibraries:{element:kind==='element'?libraries[kind]:[],location:kind==='location'?libraries[kind]:[],wardrobe:kind==='wardrobe'?libraries[kind]:[],'style-reference':kind==='style-reference'?libraries[kind]:[]},selectCharacter:(_id,source)=>select(source),selectSemanticAsset:(_id,source)=>select(source),semanticAssetAvailability:value=>semanticAssetAvailability(value,missing),nodeMediaLinkState:()=>{const current=data.referenceAssets?.[0];return current&&missing.has(current.id)?{assetId:current.id,mediaFamily:'image',state:'offline',findingDots:1}:undefined},findOfflineAsset:()=>setMissing(new Set()),updateNode:(_id,patch)=>setData(current=>({...current,...patch})),connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,videoPromptState:()=>null,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[]},{get(target,key){return key in target?target[key]:noop}});const nodes=[{id:kind,type:'studio',position:{x:20,y:20},style:{width:315},data}];return <section data-kind={kind} style={{position:'absolute',left:(index%3)*430,top:Math.floor(index/3)*760,width:400,height:700}}><ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:0,y:0,zoom:1}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></section>}
    function App(){return <main>{kinds.map((kind,index)=><Case key={kind} kind={kind} index={index}/>)}</main>}
    const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    const snap=kind=>{const root=document.querySelector('[data-kind="'+kind+'"]');const output=root.querySelector('.node-port-source');const active=root.querySelector('.style-preset-strip > button.is-active');const offline=root.querySelector('.style-preset-strip > button[title="'+label(kind)+' B"]');const thumbnail=offline?.querySelector('img');return{header:root.querySelector('.node-header')?.textContent||'',offlineSelectorClass:offline?.className||'',draggable:offline?.getAttribute('draggable'),thumbnailAssetId:thumbnail?.getAttribute('data-asset-id'),thumbnailSource:thumbnail?.getAttribute('src')||'',thumbnailOfflineBadge:offline?.querySelector('.media-offline-state')?.textContent||'',preview:root.querySelector('.reusable-large-preview')?.textContent||'',hasEdit:Boolean(root.querySelector('[aria-label="Edit"]')),outputAriaDisabled:output?.getAttribute('aria-disabled'),outputClass:output?.className||'',outputRole:output?.getAttribute('data-semantic-role'),activeTitle:active?.getAttribute('title')}}
    window.__probe=async()=>{const result=[];for(const kind of kinds){const root=document.querySelector('[data-kind="'+kind+'"]');const online=snap(kind);root.querySelector('.style-preset-strip > button[title="'+label(kind)+' B"]').click();await wait();const offline=snap(kind);root.querySelector('[aria-label="Relink missing media"]').click();await wait();const relinked=snap(kind);result.push({kind,offlineTitle:label(kind)+' B',online,offline,relinked})}return result}
    window.__errors=[];window.__posts=0;const originalFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{if(String(init.method||'GET').toUpperCase()==='POST')window.__posts+=1;return originalFetch(input,init)};window.addEventListener('error',event=>{if(!String(event.message).includes('ResizeObserver loop'))window.__errors.push(event.message)});window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    createRoot(document.getElementById('root')).render(<App/>)
  `)
  buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader: { '.svg': 'dataurl','.png':'dataurl'}, logLevel:'silent' })
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/media-offline-state.css')}"><style>*{box-sizing:border-box}body{margin:0;background:#111;color:#ddd}main{position:relative;width:1300px;height:1500px}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_OFFLINE:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1320,height:1520,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(700);const kinds=await win.webContents.executeJavaScript('window.__probe()');const tail=await win.webContents.executeJavaScript('({errors:window.__errors,posts:window.__posts})');finish({kinds,...tail})}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:60_000})
  const marker=run.stdout.split('\n').find(line=>line.startsWith('SEMANTIC_OFFLINE:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('SEMANTIC_OFFLINE:'.length))
}
