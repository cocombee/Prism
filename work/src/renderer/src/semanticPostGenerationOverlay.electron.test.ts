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

const semanticKinds = ['character', 'wardrobe', 'element', 'location', 'style-reference']

describe('production semantic post-generation overlay reuse', () => {
  it('reuses the Image Generator overlay, keeps Save footer-only, and routes every selected-result action', () => {
    const result = runMountedProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.image).toMatchObject({ owner: 'GeneratedMediaOverlay', actions: ['Show in Folder', 'Edit', 'Favorite', 'Delete'], navigation: ['Previous', '1/2', 'Next'], deleteCount: 1, imageSaveCount: 0 })
    for (const kind of semanticKinds) {
      const initial = result.semantic[kind].initial
      expect(initial.owner, kind).toBe(result.image.owner)
      expect(initial.actions, kind).toEqual(result.image.actions)
      expect(initial.navigation, kind).toEqual(result.image.navigation)
      expect(initial.deleteCount, kind).toBe(1)
      expect(initial.imageSaveCount, kind).toBe(0)
      expect(initial.inventedRailCount, kind).toBe(0)
      expect(initial.footerSaveCount, kind).toBe(1)
      expect(result.semantic[kind].afterNext.preview, kind).toContain(`${kind}-B.png`)
      expect(result.semantic[kind].afterNext.navigation, kind).toEqual(['Previous', '2/2', 'Next'])
      expect(result.semantic[kind].afterPrevious.preview, kind).toContain(`${kind}-A.png`)
      expect(result.semantic[kind].targets.B, kind).toEqual({ folder: 1, edit: `${kind}-B`, favorite: 1, delete: 1 })
      expect(result.semantic[kind].targets.A, kind).toEqual({ folder: 0, edit: `${kind}-A`, favorite: 0, delete: 0 })
      expect(result.semantic[kind].savedResultId, kind).toBe(`${kind}-B`)
    }
  }, 45_000)
})

function runMountedProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-post-generation-overlay-'))
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
    const semanticKinds=${JSON.stringify(semanticKinds)}
    const kinds=['image-generator',...semanticKinds]
    const result=(kind,suffix)=>({id:kind+'-'+suffix,name:kind+'-'+suffix,path:'/managed/'+kind+'-'+suffix+'.png',url:kind+'-'+suffix+'.png',type:'image',modelId:'fal-ai/nano-banana-pro',createdAt:'2026-08-27T0'+(suffix==='A'?'1':'2')+':00:00Z'})
    const asset=(kind,suffix)=>({id:kind+'-asset-'+suffix,name:kind+'-'+suffix+'.png',path:'/managed/'+kind+'-'+suffix+'.png',url:kind+'-'+suffix+'.png',mimeType:'image/png',createdAt:'2026-08-27T01:00:00Z',origin:'generated',metadata:{assetName:kind+'-'+suffix,characterInputMode:'single',characterView:'front',elementInputMode:'single',elementView:'three-quarter'}})
    const base=(kind)=>{
      const results=[result(kind,'A'),result(kind,'B')]
      if(kind==='image-generator') return {kind,title:'Image Generator',prompt:'fixture',imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro',generatedResults:results,activeResultIndex:0,outputPath:results[0].path,outputUrl:results[0].url,outputType:'image',runState:'complete',quantity:2}
      return {kind,title:kind,referenceTag:'@'+kind,referenceAssets:[asset(kind,'A')],generatedResults:results,activeResultIndex:0,outputPath:results[0].path,outputUrl:results[0].url,outputType:'image',runState:'complete',quantity:2,imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro',stylePrompt:kind==='style-reference'?'approved style prompt':undefined,characterEditorOpen:kind==='character',characterInputMode:'single',elementInputMode:'single',semanticEditorOpen:['wardrobe','element','location'].includes(kind),styleEditorOpen:kind==='style-reference',semanticAssetLifecycle:{version:1,status:'RESULTS_READY',references:results.map(item=>({id:item.id,path:item.path,url:item.url,source:'generated',createdAt:item.createdAt})),selectedId:results[0].id}}
    }
    const noop=()=>undefined
    function Harness(){
      const [nodes,setNodes]=React.useState(kinds.map((kind,index)=>({id:kind,type:'studio',position:{x:0,y:index*620},style:{width:kind==='image-generator'?560:315},data:base(kind)})))
      React.useEffect(()=>{window.__nodes=nodes},[nodes])
      const updateNode=(id,patch)=>setNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node))
      const runtime=new Proxy({characterLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},updateNode,videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],generatedMediaFavorite:()=>false,revealGeneratedMedia:(id,index)=>window.__actions.push({id,type:'folder',index}),setGeneratedMediaFavorite:(id,index)=>window.__actions.push({id,type:'favorite',index}),trashGeneratedMedia:(id,index)=>window.__actions.push({id,type:'delete',index}),commitSemanticAssetResult:(id,selectedResultId)=>window.__commits.push({id,selectedResultId})},{get(target,key){return key in target?target[key]:noop}})
      return <NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><div style={{width:700,height:4300}}><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></div></ReactFlowProvider></NodeRuntimeContext.Provider>
    }
    const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    const actionNames=(owner)=>Array.from(owner?.querySelectorAll('.generated-media-actions button')||[]).map(button=>{const label=button.getAttribute('aria-label')||'';return /Finder|Folder/.test(label)?'Show in Folder':/Rename|Edit/.test(label)?'Edit':/Favorite/.test(label)?'Favorite':/Delete/.test(label)?'Delete':label})
    const nav=(owner)=>{const carousel=owner?.querySelector('.result-carousel');if(!carousel)return[];const buttons=carousel.querySelectorAll('button');return [buttons[0]?.getAttribute('aria-label')?.replace(' Result',''),carousel.querySelector('span')?.textContent?.trim(),buttons[1]?.getAttribute('aria-label')?.replace(' Result','')]}
    const inspect=(node)=>{const owner=node.querySelector('[data-overlay-owner="GeneratedMediaOverlay"]');return{owner:owner?.getAttribute('data-overlay-owner')||null,actions:actionNames(owner),navigation:nav(owner),deleteCount:owner?.querySelectorAll('.generated-media-actions [aria-label*="Delete"]').length||0,imageSaveCount:owner?.querySelectorAll('[aria-label*="Save"]').length||0,inventedRailCount:node.querySelectorAll('.semantic-active-preview-actions,.semantic-asset-result-controls').length,footerSaveCount:node.querySelectorAll('.reusable-asset-footer-wrap .footer-save-action').length,preview:node.querySelector('.semantic-active-preview-stage img')?.getAttribute('src')||''}}
    const clickActions=async(node,kind,label)=>{const owner=node.querySelector('[data-overlay-owner="GeneratedMediaOverlay"]');if(!owner)return{folder:null,edit:'',favorite:null,delete:null};const buttons=owner.querySelectorAll('.generated-media-actions button');buttons[0].click();buttons[1].click();await wait();const edit=document.querySelector('[data-id="'+kind+'"] input[aria-label="Asset name"]')?.value||'';document.querySelector('[data-id="'+kind+'"] input[aria-label="Asset name"]')?.dispatchEvent(new Event('blur',{bubbles:true}));buttons[2].click();buttons[3].click();await wait();const entries=window.__actions.filter(item=>item.id===kind).slice(-3);return{folder:entries.find(item=>item.type==='folder')?.index,edit,favorite:entries.find(item=>item.type==='favorite')?.index,delete:entries.find(item=>item.type==='delete')?.index}}
    window.__probe=async()=>{await new Promise(resolve=>setTimeout(resolve,350));const imageNode=document.querySelector('[data-id="image-generator"]');const image={...inspect(imageNode),imageSaveCount:imageNode.querySelectorAll('[data-overlay-owner="GeneratedMediaOverlay"] [aria-label*="Save"]').length};const semantic={};document.querySelector('[data-id="character"] .character-create-toggle')?.click();await wait();for(const kind of semanticKinds){let node=document.querySelector('[data-id="'+kind+'"]');const initial=inspect(node);node.querySelector('.result-carousel button:last-child')?.click();await wait();node=document.querySelector('[data-id="'+kind+'"]');const afterNext=inspect(node);const B=await clickActions(node,kind,'B');node.querySelector('.result-carousel button:first-child')?.click();await wait();node=document.querySelector('[data-id="'+kind+'"]');const afterPrevious=inspect(node);const A=await clickActions(node,kind,'A');node.querySelector('.result-carousel button:last-child')?.click();await wait();node=document.querySelector('[data-id="'+kind+'"]');node.querySelector('.reusable-asset-footer-wrap .footer-save-action')?.click();await wait();document.querySelector('[data-id="'+kind+'"] .delete-confirm-modal .is-danger')?.click();await wait();semantic[kind]={initial,afterNext,afterPrevious,targets:{A,B},savedResultId:window.__commits.findLast(item=>item.id===kind)?.selectedResultId||null}}return{image,semantic,errors:window.__errors,posts:window.__posts}}
    window.__errors=[];window.__posts=0;window.__actions=[];window.__commits=[];const originalFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{if(String(init.method||'GET').toUpperCase()==='POST')window.__posts+=1;return originalFetch(input,init)};window.addEventListener('error',event=>{if(!String(event.message).includes('ResizeObserver loop'))window.__errors.push(event.message)});window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    createRoot(document.getElementById('root')).render(<Harness/>)
  `)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'dataurl' }, logLevel: 'silent' })
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_POST_OVERLAY_RESULT:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:760,height:1000,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});finish(await win.webContents.executeJavaScript('window.__probe()'))}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 40_000 })
  const marker = run.stdout.split('\n').find((line) => line.startsWith('SEMANTIC_POST_OVERLAY_RESULT:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('SEMANTIC_POST_OVERLAY_RESULT:'.length))
}
