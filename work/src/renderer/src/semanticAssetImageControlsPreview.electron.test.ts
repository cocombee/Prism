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

describe('mounted semantic Image Generator control reuse and single-preview ownership', () => {
  it('mounts one titleless fluid group with Model first, canonical delivery controls, and exact terminal anchors', () => {
    const result = runMountedProbe()
    if (process.env.PRISM_CATALOG_REPORT === '1') console.log(JSON.stringify(result.catalogs))
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    for (const kind of ['character', 'wardrobe', 'element', 'style-reference', 'location']) {
      const controls = result.controls[kind]
      expect(controls.groupLabel, kind).toBe('Semantic Image Controls')
      expect(controls.ids[0], kind).toBe('model')
      expect(controls.ids.slice(-3), kind).toEqual(['save', 'settings', 'run'])
      expect([...controls.ids].sort(), kind).toEqual(['format', 'model', 'quantity', 'resolution', 'run', 'save', 'settings'])
      expect(controls.groupCount, kind).toBe(1)
      expect(controls.primaryGroupCount, kind).toBe(0)
      expect(controls.visibleTitles, kind).toEqual([])
      expect(controls.ratioCount, kind).toBe(0)
      expect(controls.modelCount, kind).toBe(1)
      expect(controls.saveCount, kind).toBe(1)
      expect(controls.settingsCount, kind).toBe(1)
      expect(controls.formatCount, kind).toBe(1)
      expect(controls.resolutionCount, kind).toBe(1)
      expect(controls.closedFormat, kind).toBe('PNG')
      expect(controls.formatName, kind).toBe('Format: PNG')
    }
    expect(result.image.groupLabel).toBe('Image Controls')
    expect(result.image.ids[0]).toBe('model')
    expect(result.image.lastIds).toEqual(['settings', 'run'])
    expect([...result.image.ids].sort()).toEqual(['format', 'model', 'quantity', 'ratio', 'resolution', 'run', 'settings'])
    expect(result.image.closedFormat).toBe('PNG')
    expect(result.image.menuOptions).toEqual(['PNG', 'JPEG', 'WebP'])
    expect(result.catalogs.image.options.length).toBeGreaterThanOrEqual(5)
    expect(result.catalogs.image.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'fal::openai/gpt-image-2/edit', label: 'GPT Image 2' }),
      expect.objectContaining({ value: 'fal::fal-ai/nano-banana-pro/edit', label: 'Nano Banana Pro' }),
      expect.objectContaining({ value: 'fal::bytedance/seedream/v5/pro/edit', label: 'Seedream 5.0 Pro' }),
    ]))
    for (const kind of ['character', 'wardrobe', 'element', 'style-reference', 'location']) {
      expect(result.catalogs[kind].groups, kind).toEqual(result.catalogs.image.groups)
      expect(result.catalogs[kind].options, kind).toEqual(result.catalogs.image.options)
      expect(result.catalogs[kind].resolutionOptions, kind).toEqual(result.catalogs.image.resolutionOptions)
    }
  }, 45_000)

  it('routes thumbnail B then A through production selection wiring to the sole preview metadata and actions', () => {
    const result = runMountedProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.selectionEvents).toHaveLength(10)
    for (const event of result.selectionEvents) {
      expect(event.previewCount, `${event.kind}:${event.label}`).toBe(1)
      expect(event.editorCount, `${event.kind}:${event.label}`).toBe(0)
      expect(event.title, `${event.kind}:${event.label}`).toBe(`${event.kind} ${event.label}`)
      expect(event.tag, `${event.kind}:${event.label}`).toBe(`@${event.kind}-${event.label}`)
      expect(event.assetId, `${event.kind}:${event.label}`).toBe(`${event.kind}-${event.label}`)
      expect(event.actionTarget, `${event.kind}:${event.label}`).toBe(`${event.kind}-${event.label}`)
      expect(event.urls, `${event.kind}:${event.label}`).toEqual([`${event.kind}-${event.label}.png`])
      expect(event.urls.join(' '), `${event.kind}:${event.label}`).not.toContain(`${event.kind}-${event.label === 'A' ? 'B' : 'A'}.png`)
    }
  }, 45_000)

  it('keeps exactly one large preview owner through browse edit result failure save delete and mode transitions', () => {
    const result = runMountedProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.transitions).toHaveLength(50)
    for (const transition of result.transitions) {
      expect(transition.largeOwners, `${transition.kind}:${transition.state}`).toBe(1)
      expect(transition.upperPreview && transition.editorStage, `${transition.kind}:${transition.state}`).toBe(false)
    }
  }, 45_000)

  it('opens identity-free Create intake with Browse chrome removed and Cancel restores Browse byte-for-byte for all five kinds', () => {
    const result = runMountedProbe()
    expect(result.errors).toEqual([])
    expect(result.posts).toBe(0)
    expect(result.createSessions).toHaveLength(5)
    for (const session of result.createSessions) {
      expect(session.create.search, session.kind).toBe(false)
      expect(session.create.rail, session.kind).toBe(false)
      expect(session.create.browsePreview, session.kind).toBe(false)
      expect(session.create.createButton, session.kind).toBe(false)
      expect(session.create.editorStage, session.kind).toBe(true)
      expect(session.create.identity, session.kind).toMatchObject({ tag: null, path: null, output: null, references: 0, results: 0, provider: null })
      expect(session.create.identity.model, session.kind).not.toBe('fal-ai/nano-banana-pro/edit')
      expect(session.afterCancel, session.kind).toEqual(session.before)
    }
  }, 45_000)
})

function runMountedProbe() {
  const directory = mkdtempSync(join(tmpdir(), 'prism-semantic-image-controls-preview-'))
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
    const semanticKinds=['character','wardrobe','element','style-reference','location']
    const kinds=[...semanticKinds,'image-generator']
    const asset=(kind,suffix='A')=>({id:kind+'-'+suffix,name:kind+'-'+suffix+'.png',path:'/managed/'+kind+'-'+suffix+'.png',url:kind+'-'+suffix+'.png',mimeType:'image/png',createdAt:'2026-08-26T01:00:00Z',origin:'generated',category:kind==='style-reference'?'style':kind,metadata:{assetName:kind+' '+suffix,identityDescription:'approved '+kind+' '+suffix,characterInputMode:'single',characterView:'front',elementInputMode:'single',elementView:'three-quarter'}})
    const item=(kind,suffix)=>({nodeId:kind+'-library-'+suffix,title:kind+' '+suffix,referenceTag:'@'+kind+'-'+suffix,referenceAssets:[asset(kind,suffix)],prompt:'approved '+kind+' '+suffix,description:'approved '+kind+' '+suffix})
    const libraries=Object.fromEntries(semanticKinds.map(kind=>[kind,[item(kind,'A'),item(kind,'B')]]))
    const editorPatch=(kind)=>kind==='character'?{characterEditorOpen:true,characterInputMode:'single'}:kind==='style-reference'?{styleEditorOpen:true,styleDescription:'style',stylePrompt:'approved style-reference A',prompt:'generation-only style fixture',runState:'complete'}:{semanticEditorOpen:true,...(kind==='element'?{elementInputMode:'single'}:{})}
    const base=(kind)=>({kind,title:kind+' A',referenceTag:'@'+kind+'-A',referenceAssets:[asset(kind,'A')],assetUrl:kind==='image-generator'?'reference.png':undefined,prompt:'generation-only fixture',imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro/edit',quantity:2,outputFormat:'png',imageResolution:'1K',runState:'complete',semanticAssetLifecycle:{version:1,status:'RESULTS_READY',references:[{id:kind+'-stale-A',path:'/managed/'+kind+'-A.png',url:kind+'-A.png',source:'generated',createdAt:'2026-08-26T01:00:00Z'}],selectedId:kind+'-stale-A'},...editorPatch(kind)})
    const noop=()=>undefined
    function Harness(){
      const [nodes,setNodes]=React.useState(kinds.map((kind)=>({id:kind,type:'studio',position:{x:0,y:0},style:{width:315},data:base(kind)})))
      const applyLibraryItem=(id,nodeId)=>{const kind=id;const selected=libraries[kind].find(entry=>entry.nodeId===nodeId);if(!selected)return;setNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,title:selected.title,referenceTag:selected.referenceTag,referenceAssets:selected.referenceAssets,styleDescription:selected.description,...(kind==='style-reference'?{stylePrompt:selected.prompt,styleSavedAt:'2026-08-26T01:00:00Z',stylePresetId:undefined}:{})}}:node))}
      const runtime=new Proxy({characterLibrary:libraries.character,semanticLibraries:{element:libraries.element,location:libraries.location,wardrobe:libraries.wardrobe,'style-reference':libraries['style-reference']},videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],selectCharacter:applyLibraryItem,selectSemanticAsset:applyLibraryItem,exportReusableAsset:(id)=>{const data=window.__nodes.find(node=>node.id===id)?.data;window.__actionTargets.push(data?.referenceAssets?.[0]?.id)},updateNode:(id,patch)=>setNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node))},{get(target,key){return key in target?target[key]:noop}})
      React.useEffect(()=>{window.__nodes=nodes;window.__setState=async(kind,state)=>{const data=base(kind);if(state==='browse')Object.assign(data,{characterEditorOpen:false,semanticEditorOpen:false,styleEditorOpen:false});if(state==='result')data.semanticAssetLifecycle={version:1,status:'GENERATING',references:[{id:'saved',path:'/managed/saved.png',url:'saved.png',source:'saved',createdAt:'2026-08-26T01:00:00Z'},{id:'generated',path:'/managed/generated.png',url:'generated.png',source:'generated',createdAt:'2026-08-26T01:01:00Z'}],selectedId:'generated'};if(state==='failure')Object.assign(data,{semanticAssetLifecycle:{version:1,status:'SAVE_FAILED',references:[{id:'generated',path:'/managed/generated.png',url:'generated.png',source:'generated',createdAt:'2026-08-26T01:01:00Z'}],selectedId:'generated'},error:'Disk full'});if(state==='save')data.semanticAssetLifecycle={version:1,status:'SAVE_COMPLETE',references:[{id:'saved',path:'/managed/saved.png',url:'saved.png',source:'saved',createdAt:'2026-08-26T01:00:00Z'}],selectedId:'saved'};if(state==='delete')Object.assign(data,{referenceAssets:[],outputUrl:undefined,outputPath:undefined,semanticAssetLifecycle:{version:1,status:'EMPTY',references:[]}});if(state==='alternate')Object.assign(data,kind==='character'?{characterInputMode:'multi'}:kind==='element'?{elementInputMode:'multi'}:{});setNodes(current=>current.map(node=>node.id===kind?{...node,data}:node));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))}})
      return <ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><div style={{width:360,height:3800}}><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></div></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider>
    }
    const owner=(node)=>({upperPreview:Boolean(node.querySelector('.reusable-large-preview')),editorStage:Boolean(node.querySelector('.semantic-active-preview-stage')),largeOwners:node.querySelectorAll('.reusable-large-preview,.semantic-active-preview-stage').length})
    window.__probe=async()=>{await new Promise(resolve=>setTimeout(resolve,350));const controls={};for(const kind of semanticKinds){const node=document.querySelector('[data-id="'+kind+'"]');const group=node.querySelector('[aria-label="Semantic Image Controls"]');const format=node.querySelector('[title^="Image Output Format"]');controls[kind]={groupLabel:group?.getAttribute('aria-label'),ids:Array.from(group?.querySelectorAll('[data-fluid-control-id]')||[]).map(item=>item.dataset.fluidControlId),groupCount:node.querySelectorAll('.equalized-control-group').length,primaryGroupCount:node.querySelectorAll('[aria-label="Primary Image Delivery Controls"]').length,visibleTitles:Array.from(node.querySelectorAll('.adaptive-control-label > span')).map(item=>item.textContent.trim()),ratioCount:node.querySelectorAll('[aria-label="Image Aspect Ratio"]').length,modelCount:node.querySelectorAll('[aria-label$="image model"],[aria-label="Character creation AI model"],[aria-label="Element creation AI model"],[aria-label="Style prompt AI model"]').length,saveCount:group?.querySelectorAll('[data-fluid-control-id="save"] button').length||0,settingsCount:group?.querySelectorAll('[aria-label="Node Settings"]').length||0,formatCount:node.querySelectorAll('[title^="Image Output Format"]').length,resolutionCount:node.querySelectorAll('[aria-label="Image Output Resolution"]').length,closedFormat:format?.querySelector('.selected-label-full')?.textContent.trim(),formatName:format?.getAttribute('aria-label')}}
      const imageNode=document.querySelector('[data-id="image-generator"]');const imageGroup=imageNode.querySelector('[aria-label="Image Controls"]');const readCatalog=async(trigger)=>{trigger.scrollIntoView({block:'center'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));trigger.click();await new Promise(resolve=>setTimeout(resolve,50));const listbox=document.querySelector('[role="listbox"]');if(!listbox)throw new Error('No listbox for '+trigger.getAttribute('aria-label')+' expanded='+trigger.getAttribute('aria-expanded')+' rect='+JSON.stringify(trigger.getBoundingClientRect().toJSON()));const prefix=listbox.id+'-';const groups=Array.from(listbox.querySelectorAll(':scope > section')).map(section=>({label:section.querySelector(':scope > small')?.textContent.trim()||'',values:Array.from(section.querySelectorAll(':scope > button')).map(option=>option.id.slice(prefix.length))}));const options=Array.from(listbox.querySelectorAll('[role="option"]')).map(option=>({value:option.id.slice(prefix.length),label:option.querySelector(':scope > .selector-option-label')?.textContent.trim()||option.textContent.trim()}));trigger.click();await new Promise(resolve=>setTimeout(resolve,20));return{groups,options,resolutionOptions:Array.from(trigger.closest('.studio-node').querySelector('[aria-label="Image Output Resolution"]')?.dataset.equalizedOptions?JSON.parse(trigger.closest('.studio-node').querySelector('[aria-label="Image Output Resolution"]').dataset.equalizedOptions):[])}};const catalogs={image:await readCatalog(imageNode.querySelector('[aria-label="Image engine"]'))};for(const kind of semanticKinds){const node=document.querySelector('[data-id="'+kind+'"]');catalogs[kind]=await readCatalog(node.querySelector('[data-fluid-control-id="model"] button'))};const imageFormat=document.querySelector('[data-id="character"] [title^="Image Output Format"]');imageFormat.click();await new Promise(resolve=>setTimeout(resolve,50));const image={groupLabel:imageGroup?.getAttribute('aria-label'),ids:Array.from(imageGroup?.querySelectorAll('[data-fluid-control-id]')||[]).map(item=>item.dataset.fluidControlId),lastIds:Array.from(imageGroup?.querySelectorAll('.fluid-control-group-row:last-child [data-fluid-control-id]')||[]).slice(-2).map(item=>item.dataset.fluidControlId),closedFormat:imageFormat?.querySelector('.selected-label-full')?.textContent.trim(),menuOptions:JSON.parse(imageFormat?.dataset.equalizedOptions||'[]')}
      const selectionEvents=[];for(const kind of semanticKinds){await window.__setState(kind,'browse');const currentNode=()=>document.querySelector('[data-id="'+kind+'"]');const snapshot=(label)=>{const data=window.__nodes.find(item=>item.id===kind).data;const previews=Array.from(currentNode().querySelectorAll('.reusable-large-preview-media img'));return{kind,label,title:data.title,tag:data.referenceTag,assetId:data.referenceAssets?.[0]?.id,urls:previews.map(image=>image.getAttribute('src')),previewCount:currentNode().querySelectorAll('.reusable-large-preview').length,editorCount:currentNode().querySelectorAll('.semantic-active-preview-stage').length}};const click=async(suffix)=>{currentNode().querySelector('[title="'+kind+' '+suffix+'"]').click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const current=snapshot(suffix);currentNode().querySelector('.reusable-large-preview-actions [title="Export"]').click();await new Promise(resolve=>requestAnimationFrame(resolve));current.actionTarget=window.__actionTargets.at(-1);selectionEvents.push(current)};await click('B');await click('A')}
      const transitions=[];for(const kind of semanticKinds){for(const state of ['browse','edit','result','failure','save','delete','alternate','edit','browse','edit']){await window.__setState(kind,state);transitions.push({kind,state,...owner(document.querySelector('[data-id="'+kind+'"]'))})}}
      const createSessions=[];const snap=(kind)=>{const node=document.querySelector('[data-id="'+kind+'"]');const data=window.__nodes.find(item=>item.id===kind).data;return{search:Boolean(node.querySelector('.semantic-library-search')),rail:Boolean(node.querySelector('.style-preset-browser')),browsePreview:Boolean(node.querySelector('.reusable-large-preview')),createButton:Boolean(node.querySelector('.style-create-toggle')),editorStage:Boolean(node.querySelector('.semantic-active-preview-stage')),identity:{tag:data.referenceTag||null,path:data.assetPath||null,output:data.outputPath||null,references:(data.referenceAssets||[]).length,results:(data.generatedResults||[]).length,provider:data.imageProvider||null,model:data.imageModelId||null}}};for(const kind of semanticKinds){await window.__setState(kind,'browse');const before=snap(kind);const node=document.querySelector('[data-id="'+kind+'"]');node.querySelector('.style-create-toggle').click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const create=snap(kind);document.querySelector('[data-id="'+kind+'"] [aria-label="Cancel Asset Creation"]').click();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));createSessions.push({kind,before,create,afterCancel:snap(kind)})}return{controls,image,catalogs,selectionEvents,transitions,createSessions,errors:window.__errors,posts:window.__posts}}
    window.__errors=[];window.__posts=0;window.__actionTargets=[];const originalFetch=window.fetch.bind(window);window.fetch=(input,init={})=>{if(String(init.method||'GET').toUpperCase()==='POST')window.__posts+=1;return originalFetch(input,init)};window.addEventListener('error',event=>{if(!String(event.message).includes('ResizeObserver loop'))window.__errors.push(event.message)});window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)))
    createRoot(document.getElementById('root')).render(<Harness/>)
  `)
  buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.svg': 'dataurl', '.png': 'dataurl' }, logLevel: 'silent' })
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
  writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('SEMANTIC_IMAGE_CONTROLS_RESULT:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:500,height:1000,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});finish(await win.webContents.executeJavaScript('window.__probe()'))}).catch(e=>finish({error:e.stack||String(e)},1))`)
  const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 40_000 })
  const marker = run.stdout.split('\n').find((line) => line.startsWith('SEMANTIC_IMAGE_CONTROLS_RESULT:'))
  expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('SEMANTIC_IMAGE_CONTROLS_RESULT:'.length))
}
