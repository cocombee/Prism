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

describe('mounted semantic Create/Edit mode control matrix', () => {
  it('uses the sole production semantic Image control group for every active mode', () => {
    const result = runProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.states).toHaveLength(22)
    for (const state of result.states) {
      expect(state.groupCount, state.name).toBe(1)
      expect(state.ids, state.name).toEqual(expect.arrayContaining(['model', 'format', 'resolution', 'quantity', 'save', 'settings', 'run']))
      expect(state.ids).toHaveLength(7)
      expect(state.ids[0], state.name).toBe('model')
      expect(state.ids.slice(-3), state.name).toEqual(['save', 'settings', 'run'])
      expect(state.counts, state.name).toEqual({ model: 1, format: 1, resolution: 1, quantity: 1, save: 1, settings: 1, run: 1 })
      expect(state.aspectRatioCount, state.name).toBe(0)
      expect(state.legacyFooterCount, state.name).toBe(0)
      expect(state.standaloneSaveCount, state.name).toBe(0)
      expect(state.saveClass, state.name).not.toContain('reusable-save-button')
      expect(state.format, state.name).toBe('PNG')
      expect(state.nodeRightRemainder, state.name).toBeLessThanOrEqual(10)
      expect(state.savedReferenceProtected, state.name).toBe(state.session === 'edit')
      expect(state.identityFree, state.name).toBe(state.session === 'create')
    }
  }, 70_000)
})

function runProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-edit-controls-'))
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
    const modes=[
      ['character','multi'],['character','sheets'],['character','batch'],
      ['element','multi'],['element','sheets'],['element','batch'],
      ['location','single'],['location','batch'],['wardrobe','single'],['wardrobe','batch'],
      ['style-reference','single'],
    ]
    const asset=(kind)=>({id:'saved-'+kind,name:kind+'.png',path:'/managed/'+kind+'.png',url:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="50"><rect width="80" height="50" fill="%23666"/></svg>'),mimeType:'image/png',createdAt:'2026-08-27T00:00:00Z',origin:'generated',category:kind==='style-reference'?'style':kind,metadata:{characterView:'front',characterInputMode:'multi',elementView:'three-quarter',elementInputMode:'multi'}})
    const data=(kind,mode,session)=>({kind,title:session==='edit'?'Saved '+kind:'Custom '+kind,referenceTag:session==='edit'?'@saved-'+kind:undefined,referenceAssets:session==='edit'?[asset(kind)]:[],semanticReplacementAuthority:session==='edit'?{targetAssetId:'saved-'+kind,token:'protected-'+kind}:undefined,assetGenerationPrompt:'fixture',imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro/edit',quantity:1,outputFormat:'png',imageResolution:'1K',runState:'complete',characterEditorOpen:kind==='character',semanticEditorOpen:['element','location','wardrobe'].includes(kind),styleEditorOpen:kind==='style-reference',characterInputMode:mode==='sheets'?'single':'multi',elementInputMode:mode==='sheets'?'single':'multi',locationInputMode:'single',wardrobeInputMode:'single',styleDescription:kind==='style-reference'?'fixture style':undefined,stylePrompt:kind==='style-reference'?'fixture style':undefined,semanticAssetLifecycle:{version:1,status:'EDITING_SAVED',references:session==='edit'?[{id:'saved-'+kind,path:'/managed/'+kind+'.png',url:kind+'.png',source:'saved',createdAt:'2026-08-27T00:00:00Z'}]:[],selectedId:session==='edit'?'saved-'+kind:undefined}})
    const cases=['edit','create'].flatMap(session=>modes.map(([kind,mode])=>({name:session+'-'+kind+'-'+mode,kind,mode,session,data:data(kind,mode,session)})))
    const noop=()=>undefined
    function Mount({entry,index}){const [nodeData,setNodeData]=React.useState(entry.data);const runtime=new Proxy({characterLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],updateNode:(_id,patch)=>setNodeData(current=>({...current,...patch}))},{get(target,key){return key in target?target[key]:noop}});React.useEffect(()=>{window.__data[entry.name]=nodeData},[nodeData]);return <section data-case={entry.name} data-kind={entry.kind} data-mode={entry.mode} data-session={entry.session} style={{width:350,height:760}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={[{id:entry.name,type:'studio',position:{x:0,y:0},style:{width:315},data:nodeData}]} edges={[]} nodeTypes={{studio:NodeCard}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></section>}
    function App(){return <main>{cases.map((entry,index)=><Mount key={entry.name} entry={entry} index={index}/>)}</main>}
    const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    const painted=wrapper=>wrapper?.querySelector('[data-equalized-default],.quantity-stepper,.play-tooltip-anchor,:scope > button')||wrapper
    window.__probe=async()=>{await new Promise(resolve=>setTimeout(resolve,700));for(const entry of cases.filter(entry=>entry.mode==='batch')){const section=document.querySelector('[data-case="'+entry.name+'"]');section.querySelector('[aria-label$="image intake mode"] button:last-child')?.click()}await wait();const states=cases.map(entry=>{const section=document.querySelector('[data-case="'+entry.name+'"]');const node=section.querySelector('.studio-node');const groups=node.querySelectorAll('[aria-label="Semantic Image Controls"]');const group=groups[0];const wrappers=Array.from(group?.querySelectorAll('[data-fluid-control-id]')||[]);const ids=wrappers.map(item=>item.dataset.fluidControlId);const counts=Object.fromEntries(['model','format','resolution','quantity','save','settings','run'].map(id=>[id,ids.filter(value=>value===id).length]));const run=painted(wrappers.find(item=>item.dataset.fluidControlId==='run'));const save=node.querySelector('[data-fluid-control-id="save"] .footer-save-action');const data=window.__data[entry.name];return{name:entry.name,session:entry.session,groupCount:groups.length,ids,counts,aspectRatioCount:node.querySelectorAll('[aria-label="Image Aspect Ratio"]').length,legacyFooterCount:node.querySelectorAll('.character-completion-footer').length,standaloneSaveCount:Array.from(node.querySelectorAll('.footer-save-action')).filter(button=>!button.closest('[data-fluid-control-id="save"]')).length,saveClass:save?.className||'',format:node.querySelector('[aria-label^="Format:"] .selected-label-full')?.textContent?.trim(),nodeRightRemainder:run?(node.getBoundingClientRect().right-run.getBoundingClientRect().right):999,savedReferenceProtected:Boolean(data.semanticReplacementAuthority?.targetAssetId==='saved-'+entry.kind&&(data.referenceAssets||[]).some(asset=>asset.id==='saved-'+entry.kind)),identityFree:!data.semanticReplacementAuthority&&!(data.referenceAssets||[]).length&&!data.referenceTag}});return{states,errors:window.__errors,posts:window.__posts}}
    window.__data={};window.__errors=[];window.__posts=0;const originalFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{if(String(init.method||'GET').toUpperCase()==='POST')window.__posts+=1;return originalFetch(input,init)};window.addEventListener('error',event=>{if(!String(event.message).includes('ResizeObserver loop'))window.__errors.push(event.message)});window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    createRoot(document.getElementById('root')).render(<App/>)
  `)
  buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}body{margin:0;background:#111;color:#ddd}main{display:grid;grid-template-columns:repeat(4,350px);gap:24px}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_EDIT_MATRIX:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1500,height:1400,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});finish(await win.webContents.executeJavaScript('window.__probe()'))}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:65_000})
  const marker=run.stdout.split('\n').find(line=>line.startsWith('SEMANTIC_EDIT_MATRIX:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('SEMANTIC_EDIT_MATRIX:'.length))
}
