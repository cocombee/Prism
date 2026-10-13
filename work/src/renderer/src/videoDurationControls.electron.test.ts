import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const { buildSync } = require(resolve(process.cwd(), 'node_modules/esbuild')) as typeof import('esbuild')
const electronPath = require('electron') as string

describe('actual model duration controls', () => {
  it('renders current native limits and authored timing, changes selection and reopens without substitutions', () => {
    const source = process.env.PRISM_DURATION_UI_SOURCE || process.cwd()
    const directory = mkdtempSync(join(tmpdir(), 'prism-video-duration-controls-'))
    try {
      const entry=join(directory,'renderer.tsx'),bundle=join(directory,'renderer.js'),html=join(directory,'index.html'),main=join(directory,'main.cjs')
      writeFileSync(entry, `
        import React,{useState} from 'react'
        import {createRoot} from 'react-dom/client'
        import {ReactFlow,ReactFlowProvider} from '@xyflow/react'
        import {NodeCard,NodeRuntimeContext} from ${JSON.stringify(resolve(source,'src/renderer/src/NodeCardNext.tsx'))}
    import { ProviderAvailabilityContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderAvailabilityContext.tsx'))}
        import {StoryboardNode} from ${JSON.stringify(resolve(source,'src/renderer/src/UtilityNodes.tsx'))}
        import {connectedStoryboardVideo} from ${JSON.stringify(resolve(source,'src/shared/storyboardVideoSync.ts'))}
        import {describeFalRuntimeInputs} from ${JSON.stringify(resolve(source,'src/shared/falRuntimeInputs.ts'))}
        const contract={endpointId:'fixture/current/text-to-video',schemaPath:'/fixture',category:'text-to-video',input:{type:'object',properties:{duration:{type:'integer',minimum:4,maximum:30,description:'Duration of the generated video in seconds.'}}},output:{type:'object'}}
        contract.runtime={...describeFalRuntimeInputs(contract),fingerprint:'fixture'}
        const board=(id,durations,x,y)=>({id,type:'storyboard',position:{x,y},data:{kind:'storyboard',title:id,storyboardEditorOpen:true,storyboardPanels:durations.map((duration,index)=>({id:id+'-'+index,prompt:'Authored '+index,duration,shotSize:'medium',camera:'static',locked:false}))}})
        const native=(id,duration,x,y)=>({id,type:'studio',position:{x,y},data:{kind:'video-generator',title:id,videoEngine:'wan-controlled',duration:5,prompt:'Preserve action',runState:'idle',falNative:{endpointId:contract.endpointId,label:'Current Native Model',flow:'video',fingerprint:'fixture',values:{duration},media:[],promptField:null}}})
        const initialNodes=[native('native',16,0,0),board('native-board',[1.5,2.5],360,0),native('invalid-native',31,720,0),board('invalid-board',[1,1],1080,0),board('legacy-board',[.5,1.5],0,700),{id:'veo',type:'studio',position:{x:360,y:700},data:{kind:'video-generator',title:'Veo',videoEngine:'fal-ai/veo3.1',duration:5,prompt:'Exact action',runState:'idle',aspectRatio:'16:9',resolution:'720p',quantity:1}},{id:'wan',type:'studio',position:{x:720,y:700},data:{kind:'video-generator',title:'Wan',videoEngine:'wan-controlled',duration:5,frameRate:24,prompt:'Exact action',runState:'idle',aspectRatio:'16:9',resolution:'720p',quantity:1}}]
        const edges=[{id:'native-edge',source:'native-board',target:'native',sourceHandle:'storyboard-out',targetHandle:'storyboard-in'},{id:'invalid-edge',source:'invalid-board',target:'invalid-native',sourceHandle:'storyboard-out',targetHandle:'storyboard-in'}]
        const noop=()=>undefined
        const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
        function App(){
          const[nodes,setNodes]=useState(initialNodes)
          const updateNode=(id,patch)=>setNodes(nodes=>nodes.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node))
          const runtime=new Proxy({characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,connectedStoryboardVideo:id=>connectedStoryboardVideo(nodes,edges,id,()=>contract),falSchema:()=>({contract}),videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],updateNode}, {get(target,key){return key in target?target[key]:noop}})
          const root=id=>document.querySelector('.react-flow__node[data-id="'+id+'"]')
          window.__durationProbe={
            snapshot:()=>({budgets:Object.fromEntries(['native-board','invalid-board','legacy-board'].map(id=>[id,root(id)?.querySelector('.storyboard-budget')?.textContent || null])),rects:Array.from(document.querySelectorAll('.react-flow__node')).map(node=>({id:node.getAttribute('data-id'),x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})),graph:JSON.parse(JSON.stringify({nodes,edges})),notes:Object.fromEntries(['native','invalid-native','veo','wan'].map(id=>[id,root(id)?.querySelector('[aria-label="Maximum video duration"]')?.textContent ?? null])),boardText:Object.fromEntries(['native-board','invalid-board','legacy-board'].map(id=>[id,root(id)?.textContent])),veoDuration:root('veo')?.querySelector('[aria-label="Video Duration"]')?.textContent}),
            inventory:async(id,index=0)=>{const button=root(id)?.querySelectorAll('.storyboard-compact-select.is-duration > button')[index];if(!button)throw Error('No duration '+id);button.click();await wait();const menu=document.querySelector('.storyboard-compact-menu');const rows=Array.from(menu.querySelectorAll('[role="option"]'));const value={trigger:button.textContent,labels:rows.map(row=>row.textContent.trim()),enabled:rows.filter(row=>row.getAttribute('aria-disabled')!=='true').map(row=>row.textContent.trim()),font:getComputedStyle(button).fontSize};menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait();return value},
            choose:async(id,index,seconds)=>{root(id).querySelectorAll('.storyboard-compact-select.is-duration > button')[index].click();await wait();const option=document.querySelector('.storyboard-compact-menu [data-option-value="'+seconds+'"]');if(!option||option.getAttribute('aria-disabled')==='true')throw Error('Unsupported choice '+seconds);option.click();await wait()},
            legacyDuration:duration=>updateNode('native',{duration}),
            nativeDuration:duration=>updateNode('native',{falNative:{...nodes.find(node=>node.id==='native').data.falNative,values:{duration}}}),
            reopen:()=>setNodes(JSON.parse(JSON.stringify(nodes))),
          }
          return <ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard,storyboard:StoryboardNode}} defaultViewport={{x:10,y:10,zoom:1}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider>
        }
        createRoot(document.getElementById('root')).render(<App/>);
      `)
      buildSync({entryPoints:[entry],outfile:bundle,bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],jsx:'automatic',loader:{'.png':'dataurl','.svg':'dataurl'},define:{'import.meta.env.DEV':'false'},logLevel:'silent'})
      const styles=resolve(source,'src/renderer/src/styles-next.css'),flowStyles=resolve('node_modules/@xyflow/react/dist/style.css')
      writeFileSync(html,`<!doctype html><html><head><link rel="stylesheet" href="file://${flowStyles}"><link rel="stylesheet" href="file://${styles}"><style>html,body,#root{width:100%;height:100%;margin:0}body{background:#111;color:#ddd}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
      writeFileSync(main,`const{app,BrowserWindow}=require('electron');const path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));let network=0,errors=[],warningContexts=[],phase='initial';const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(v,c=0)=>{process.stdout.write('VIDEO_DURATION_UI:'+JSON.stringify(v)+'\\n');app.exit(c)};app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1500,height:1900,webPreferences:{contextIsolation:false,sandbox:false}});win.webContents.session.webRequest.onBeforeRequest((details,callback)=>{if(/^https?:/.test(details.url)){network++;callback({cancel:true})}else callback({cancel:false})});win.webContents.on('console-message',(_event,level,message)=>{if(level>=3){errors.push(message);warningContexts.push({phase,message})}});win.webContents.on('did-fail-load',(_event,code,message)=>errors.push(code+':'+message));await win.loadFile(${JSON.stringify(html)});const e=code=>{phase=code;return win.webContents.executeJavaScript(code)};await e('document.fonts.ready');await wait(500);const result={before:await e('window.__durationProbe.snapshot()'),native:await e('window.__durationProbe.inventory("native-board")'),legacy:await e('window.__durationProbe.inventory("legacy-board")')};await e('window.__durationProbe.choose("native-board",0,"2")');result.selected=await e('window.__durationProbe.snapshot()');await e('window.__durationProbe.nativeDuration(4)');await wait(150);result.reduced=await e('window.__durationProbe.inventory("native-board",1)');result.reducedSnapshot=await e('window.__durationProbe.snapshot()');${process.env.PRISM_DURATION_UI_BASELINE ? "await e('window.__durationProbe.legacyDuration(4)');await wait(150);" : ''}await e('window.__durationProbe.reopen()');await wait(150);result.reopened=await e('window.__durationProbe.snapshot()');await wait(300);result.stable=await e('window.__durationProbe.snapshot()');result.network=network;result.errors=errors;result.warningContexts=warningContexts;finish(result)}).catch(error=>finish({error:error.stack||String(error)},1));`)
      const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:60_000})
      expect(run.status,`${run.stdout}\n${run.stderr}`).toBe(0)
      const marker=run.stdout.split('\n').find(line=>line.startsWith('VIDEO_DURATION_UI:'));expect(marker,run.stdout).toBeDefined()
      const result=JSON.parse(marker!.slice('VIDEO_DURATION_UI:'.length))
      if(process.env.PRISM_DURATION_UI_BASELINE) {
        if(process.env.PRISM_DURATION_UI_DIAGNOSTICS)writeFileSync(process.env.PRISM_DURATION_UI_DIAGNOSTICS,JSON.stringify(result,null,2)+'\n')
        expect(result.error).toBeUndefined();expect(result.network).toBe(0);expect(result.errors.filter((message:string)=>message!=='ResizeObserver loop completed with undelivered notifications.')).toEqual([]);return
      }
      if(process.env.PRISM_DURATION_UI_DIAGNOSTICS)writeFileSync(process.env.PRISM_DURATION_UI_DIAGNOSTICS,JSON.stringify(result,null,2)+'\n')
      expect(result.error).toBeUndefined();expect(result.network).toBe(0)
      // The identical overflow feedback in the unchanged parent emits this one
      // browser notification. Retain it in diagnostics; reject new/repeating errors.
      const parentFile=process.env.PRISM_DURATION_UI_PARENT_DIAGNOSTICS
      const parent=parentFile?JSON.parse(readFileSync(parentFile,'utf8')):undefined
      expect(result.errors.filter((message:string)=>message!=='ResizeObserver loop completed with undelivered notifications.')).toEqual([])
      expect(result.errors.length).toBeLessThanOrEqual(parent?parent.errors.length:1)
      expect(result.stable.rects).toEqual(result.reopened.rects)
      expect(result.stable.graph).toEqual(result.reopened.graph)
      expect(result.before.notes).toEqual({native:null,'invalid-native':null,veo:null,wan:null})
      expect(result.before.veoDuration).toContain('5.0s');expect(result.before.veoDuration).toContain('review')
      expect(result.native.labels.slice(0,4)).toEqual(['1.0s','1.5s','2.0s','2.5s']);expect(result.native.labels.at(-1)).toBe('30.0s');expect(result.native.enabled.at(-1)).toBe('16.0s')
      expect(result.native.font).toBe('8px')
      expect(result.legacy.trigger).toContain('0.5s');expect(result.legacy.trigger).toContain('review');expect(result.legacy.enabled[0]).toBe('1.0s')
      expect(result.before.boardText['invalid-board']).toContain('saved native duration is unsupported');expect(result.before.budgets['invalid-board']).toBeNull()
      expect(result.selected.graph.nodes.find((node:any)=>node.id==='native-board').data.storyboardPanels.map((panel:any)=>panel.duration)).toEqual([2,2.5])
      expect(result.reduced.enabled.at(-1)).toBe('2.0s');expect(result.reducedSnapshot.graph.nodes.find((node:any)=>node.id==='native-board').data.storyboardPanels.map((panel:any)=>panel.duration)).toEqual([2,2.5])
      expect(result.reducedSnapshot.boardText['native-board']).toContain('Timing exceeds Video budget')
      expect(result.reopened.graph).toEqual(result.reducedSnapshot.graph)
      expect(result.reopened.notes).toEqual(result.before.notes)
      const output=process.env.PRISM_DURATION_UI_EVIDENCE
      if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n')
    } finally {rmSync(directory,{recursive:true,force:true})}
  },70_000)
})


describe('verified native seconds duration token', () => {
  it('renders declared continuous seconds with exact saved values and conservative unit exceptions', () => {
    const source = process.cwd()
    const artifactDirectory = process.env.PRISM_NATIVE_SECONDS_ARTIFACT_DIR
    if (artifactDirectory) mkdirSync(artifactDirectory, { recursive: true })
    const owners = ['src/renderer/src/NodeCardNext.tsx', 'src/renderer/src/AppNext.tsx', 'src/renderer/src/UtilityNodes.tsx', 'src/shared/soundEffectsDuration.ts', 'src/shared/nativeVideoFooterControls.ts', 'src/renderer/src/styles-next.css']
    const hashes = () => Object.fromEntries(owners.map(file => [file, createHash('sha256').update(readFileSync(resolve(source, file))).digest('hex')]))
    const beforeHashes = hashes()
    const directory = mkdtempSync(join(tmpdir(), 'prism-native-seconds-token-'))
    try {
      const entry=join(directory,'renderer.tsx'),bundle=join(directory,'renderer.js'),html=join(directory,'index.html'),main=join(directory,'main.cjs')
      writeFileSync(entry, `
        import React,{useState} from 'react'
        import {createRoot} from 'react-dom/client'
        import {ReactFlow,ReactFlowProvider} from '@xyflow/react'
        import {NodeCard,NodeRuntimeContext} from ${JSON.stringify(resolve(source,'src/renderer/src/NodeCardNext.tsx'))}
        import {ProviderAvailabilityContext} from ${JSON.stringify(resolve(source,'src/renderer/src/ProviderAvailabilityContext.tsx'))}
        import {describeFalRuntimeInputs} from ${JSON.stringify(resolve(source,'src/shared/falRuntimeInputs.ts'))}
        import {projectFalNativeVideoFooterControls} from ${JSON.stringify(resolve(source,'src/shared/nativeVideoFooterControls.ts'))}
        const definition=(id,key,schema)=>{const contract={endpointId:'fixture/'+id+'/text-to-video',schemaPath:'/fixture',category:'text-to-video',input:{type:'object',properties:{[key]:schema}},output:{type:'object'}};contract.runtime={...describeFalRuntimeInputs(contract),fingerprint:id};return contract}
        const seconds='Duration of the generated video in seconds.'
        const contracts={
          continuous:definition('continuous','clip_length',{type:'number',minimum:1,maximum:12,default:3.25,description:seconds}),
          unknown:definition('unknown','duration',{type:'number',minimum:1,maximum:12,description:'Opaque duration units.'}),
          frames:definition('frames','duration',{type:'number',minimum:1,maximum:12,description:'Number of generated video frames.'}),
          capped:definition('capped','clip_length',{type:'number',minimum:1,maximum:1e12,description:seconds}),
          unbounded:definition('unbounded','clip_length',{type:'number',minimum:1,description:seconds}),
          discrete:definition('discrete','clip_length',{type:'number',minimum:1,maximum:2,multipleOf:.25,description:seconds}),
        }
        const higgsFields=describeFalRuntimeInputs(definition('higgs','duration',{type:'number',minimum:1,maximum:15,default:5})).fields
        const initial=Object.entries(contracts).map(([id,contract],index)=>({id,type:'studio',position:{x:(index%3)*390,y:Math.floor(index/3)*550},style:{width:375},data:{kind:'video-generator',title:id,videoEngine:'wan-controlled',duration:5,prompt:'Authored action',runState:'idle',falNative:{endpointId:contract.endpointId,label:'Native '+id,flow:'video',fingerprint:id,values:{[id==='unknown'||id==='frames'?'duration':'clip_length']:id==='discrete'?1.25:3.125},media:[],promptField:null}}}))
        initial.push({id:'higgs',type:'studio',position:{x:0,y:1100},style:{width:375},data:{kind:'video-generator',title:'higgs',videoEngine:'wan-controlled',duration:5,prompt:'Authored action',runState:'idle',higgsfieldNative:{endpointId:'pixverse/v6/text-to-video',label:'PixVerse v6',values:{duration:3.125},media:[]}}})
        const noop=()=>undefined,wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
        function App(){
          const[nodes,setNodes]=useState(initial)
          const updateNode=(id,patch)=>setNodes(nodes=>nodes.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node))
          const runtime=new Proxy({characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,connectedStoryboardVideo:()=>undefined,falSchema:endpoint=>({contract:Object.values(contracts).find(contract=>contract.endpointId===endpoint)}),higgsfieldSchema:()=>({contract:{fields:higgsFields}}),videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],updateNode},{get(target,key){return key in target?target[key]:noop}})
          const root=id=>document.querySelector('.react-flow__node[data-id="'+id+'"]'),control=id=>root(id)?.querySelector('.compact-video-footer [aria-label^="Video Duration"]')
          const visibleControl=async(id)=>{const button=control(id);if(!button)throw Error('No control '+id);const rect=button.getBoundingClientRect();if(rect.top<0||rect.bottom>innerHeight||rect.left<0||rect.right>innerWidth){const viewport=window.__secondsFlow.getViewport();await window.__secondsFlow.setViewport({x:viewport.x+innerWidth/2-(rect.left+rect.right)/2,y:viewport.y+innerHeight/2-(rect.top+rect.bottom)/2,zoom:viewport.zoom},{duration:0});await wait()}const current=control(id),bounds=current.getBoundingClientRect();if(bounds.top<0||bounds.bottom>innerHeight||bounds.left<0||bounds.right>innerWidth)throw Error('Offscreen trigger '+id+' '+JSON.stringify(bounds.toJSON()));return current}
          window.__nativeSeconds={
            snapshot:()=>({nodes:JSON.parse(JSON.stringify(nodes)),controls:Object.fromEntries(nodes.map(node=>{const element=control(node.id),footer=root(node.id)?.querySelector('.compact-video-footer');const style=element&&getComputedStyle(element),fs=footer&&getComputedStyle(footer);return[node.id,element?{tag:element.tagName,text:element.textContent,value:element.value,height:element.getBoundingClientRect().height,background:style.backgroundColor,radius:style.borderRadius,padding:fs&&[fs.paddingTop,fs.paddingRight,fs.paddingBottom,fs.paddingLeft]}:null]})),projections:Object.fromEntries(nodes.map(node=>[node.id,node.data.falNative?projectFalNativeVideoFooterControls(contracts[node.id],node.data.falNative):[]]))}),
            inventory:async(id)=>{const button=await visibleControl(id);if(button.tagName!=='BUTTON')throw Error('No native selector '+id);button.click();await wait();const menu=document.querySelector('[role="listbox"]');if(!menu)throw Error('No menu '+id+' '+JSON.stringify({rect:button.getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight],expanded:button.getAttribute('aria-expanded'),disabled:button.disabled}));const options=Array.from(menu.querySelectorAll('[role="option"]')).map(element=>({text:element.textContent.trim(),disabled:element.getAttribute('aria-disabled')==='true',value:element.id.slice(menu.id.length+1)}));menu.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait();return options},
            choose:async()=>{const button=await visibleControl('continuous');button.click();await wait();const option=Array.from(document.querySelectorAll('[role="option"]')).find(element=>element.id.endsWith('-value:3.5'));if(!option||option.getAttribute('aria-disabled')==='true')throw Error('Missing3.5 option');option.click();await wait()},
            reopen:()=>setNodes(JSON.parse(JSON.stringify(nodes))),
          }
          return <ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow onInit={instance=>{window.__secondsFlow=instance}} nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:10,y:10,zoom:1}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider>
        }
        createRoot(document.getElementById('root')).render(<App/>);
      `)
      buildSync({entryPoints:[entry],outfile:bundle,bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],jsx:'automatic',loader:{'.png':'dataurl','.svg':'dataurl'},define:{'import.meta.env.DEV':'false'},logLevel:'silent'})
      writeFileSync(html,`<!doctype html><html><head><link rel="stylesheet" href="file://${resolve('node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(source,'src/renderer/src/styles-next.css')}"><style>html,body,#root{width:100%;height:100%;margin:0}body{background:#111;color:#ddd}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
      const screenshot=artifactDirectory?join(artifactDirectory,'Duration Token Family Native Seconds Preview.png'):undefined
      writeFileSync(main,`const{app,BrowserWindow}=require('electron');const path=require('node:path'),fs=require('node:fs');app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));let network=0,errors=[],evidence={};const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(v,c=0)=>{process.stdout.write('NATIVE_SECONDS_UI:'+JSON.stringify(v)+'\\n');app.exit(c)};app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1240,height:1193,webPreferences:{contextIsolation:false,sandbox:false}});win.webContents.session.webRequest.onBeforeRequest((details,callback)=>{if(/^https?:/.test(details.url)){network++;callback({cancel:true})}else callback({cancel:false})});win.webContents.on('console-message',(_event,level,message)=>{if(level>=3)errors.push(message)});await win.loadFile(${JSON.stringify(html)});const e=code=>win.webContents.executeJavaScript(code);await e('document.fonts.ready');await wait(500);const result=evidence;result.before=await e('window.__nativeSeconds.snapshot()');result.options=await e('window.__nativeSeconds.inventory("continuous")');result.discreteOptions=await e('window.__nativeSeconds.inventory("discrete")');result.higgsOptions=await e('window.__nativeSeconds.inventory("higgs")');await e('window.__nativeSeconds.choose()');await wait(150);result.selected=await e('window.__nativeSeconds.snapshot()');await e('window.__nativeSeconds.reopen()');await wait(150);result.reopened=await e('window.__nativeSeconds.snapshot()');${screenshot?`fs.writeFileSync(${JSON.stringify(screenshot)},(await win.webContents.capturePage()).toPNG());`:''}result.network=network;result.errors=errors;finish(result)}).catch(error=>finish({...evidence,error:error.stack||String(error),network,errors},1));`)
      const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:60_000})
      const marker=run.stdout.split('\n').find(line=>line.startsWith('NATIVE_SECONDS_UI:'))
      const result=marker?JSON.parse(marker.slice('NATIVE_SECONDS_UI:'.length)):{error:'No renderer result',stdout:run.stdout,stderr:run.stderr}
      const afterHashes=hashes()
      if(artifactDirectory)writeFileSync(join(artifactDirectory,'Duration Token Family Native Seconds Evidence.json'),JSON.stringify({schemaVersion:1,beforeHashes,afterHashes,sourceChanges:owners.filter(file=>beforeHashes[file]!==afterHashes[file]),screenshot, ...result},null,2)+'\n')
      expect(run.status,`${run.stdout}\n${run.stderr}`).toBe(0)
      expect(result.error).toBeUndefined();expect(result.network).toBe(0)
      expect(result.errors.filter((message:string)=>message!=='ResizeObserver loop completed with undelivered notifications.')).toEqual([])
      expect(afterHashes).toEqual(beforeHashes)
      expect(result.before.controls.continuous.tag).toBe('BUTTON')
      expect(result.before.controls.continuous.text).toContain('3.1s')
      expect(result.before.controls.continuous.height).toBe(28)
      expect(result.before.controls.higgs).toMatchObject({tag:'BUTTON',height:28})
      expect(result.before.controls.higgs.text).toContain('3.1s')
      expect(result.higgsOptions.find((option:any)=>option.value==='value:3.125')).toMatchObject({disabled:false})
      expect(result.higgsOptions.filter((option:any)=>option.value?.startsWith('value:')).at(-1).value).toBe('value:15')
      expect(result.before.controls.continuous.padding).toEqual(['12px','12px','12px','12px'])
      expect(result.before.nodes.find((node:any)=>node.id==='continuous').data.falNative.values).toEqual({clip_length:3.125})
      const custom=result.options.find((option:any)=>option.value==='value:3.125')
      expect(custom).toMatchObject({disabled:false});expect(custom.text).toContain('3.1s')
      expect(result.options.filter((option:any)=>option.value?.startsWith('value:')).map((option:any)=>option.value)).toContain('value:1.5')
      expect(result.options.filter((option:any)=>option.value?.startsWith('value:')).at(-1).value).toBe('value:12')
      expect(result.discreteOptions.filter((option:any)=>option.value?.startsWith('value:')).map((option:any)=>option.value)).toEqual(['value:1','value:1.25','value:1.5','value:1.75','value:2'])
      for(const id of ['unknown','frames','capped'])expect(result.before.controls[id],id).toBeNull()
      expect(result.before.controls.unbounded).toMatchObject({tag:'INPUT',value:'3.125',height:28})
      expect(result.selected.nodes.find((node:any)=>node.id==='continuous').data.falNative.values).toEqual({clip_length:3.5})
      expect(result.selected.nodes.find((node:any)=>node.id==='continuous').data.duration).toBe(5)
      expect(result.reopened.nodes).toEqual(result.selected.nodes)
      expect(result.reopened.controls.continuous.text).toContain('3.5s')
    } finally {rmSync(directory,{recursive:true,force:true})}
  },70_000)
})
