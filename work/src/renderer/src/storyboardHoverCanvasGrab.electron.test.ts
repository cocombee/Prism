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

describe('mounted production Storyboard and Canvas grab ownership', () => {
  it('computes compact reveal geometry and lets production preview surfaces yield to trusted Canvas grabs', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-hover-grab-'))
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
      import { StoryboardNode } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/UtilityNodes.tsx'))}
      const noop=()=>undefined
      const runtime=new Proxy({characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[]},{get:(target,key)=>key in target?target[key]:noop})
      const image='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="60"%3E%3Crect width="80" height="60" fill="purple"/%3E%3C/svg%3E'
      const asset=(id)=>({id,name:id,path:'/tmp/'+id+'.png',url:image,mimeType:'image/png',origin:'generated',createdAt:new Date(0).toISOString()})
      const nodes=[
        {id:'character',type:'studio',position:{x:20,y:20},data:{kind:'character',title:'Character',referenceAssets:[asset('character')]}},
        {id:'style',type:'studio',position:{x:380,y:20},data:{kind:'style-reference',title:'Style',referenceAssets:[asset('style')],styleDescription:'Style'}},
        {id:'wardrobe',type:'studio',position:{x:740,y:20},data:{kind:'wardrobe',title:'Wardrobe',referenceAssets:[asset('wardrobe')]}},
        {id:'video',type:'studio',position:{x:20,y:430},data:{kind:'video-generator',title:'Video',videoEngine:'bytedance/seedance-2.0/mini/reference-to-video',prompt:'Prompt',outputUrl:'file:///tmp/not-present.mp4',outputType:'video',generatedResults:[{path:'/tmp/not-present.mp4',url:'file:///tmp/not-present.mp4',type:'video',modelId:'fixture'}],runState:'complete',aspectRatio:'16:9',duration:4,resolution:'480p',quantity:1}},
        {id:'storyboard',type:'storyboard',position:{x:740,y:430},data:{kind:'storyboard',title:'Storyboard',storyboardEditorOpen:true,storyboardDuration:6,storyboardPanels:[{id:'p1',prompt:'A long first shot prompt that wraps through several lines and remains editable.',duration:3,shotSize:'medium',camera:'push-in',locked:false},{id:'p2',prompt:'Final shot prompt.',duration:3,shotSize:'wide',camera:'static',locked:false}]}}
      ]
      function App(){const [space,setSpace]=React.useState(false);React.useEffect(()=>{const down=(event)=>{const target=document.activeElement;if(event.code==='Space' && !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable)){event.preventDefault();setSpace(true)}};const up=(event)=>{if(event.code==='Space')setSpace(false)};window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[]);return <ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><div style={{width:'1200px',height:'1000px'}}><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard,storyboard:StoryboardNode}} defaultViewport={{x:0,y:0,zoom:1}} nodesDraggable={!space} panOnDrag={space?[0,1]:[1]} panActivationKeyCode="Space" zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></div></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider>}
      const rect=(e)=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2}}
      window.__probe=()=>{const fields=[...document.querySelectorAll('.storyboard-prompt-field')];const zones=[...document.querySelectorAll('.storyboard-control-reveal-zone')];const actions=[...document.querySelectorAll('.storyboard-prompt-actions')];const text=fields[0].querySelector('textarea');const pre=fields[0].querySelector('pre');const previews=['character','style','wardrobe'].map(id=>document.querySelector('.react-flow__node[data-id="'+id+'"] .reusable-large-preview'));const images=previews.map(e=>e.querySelector('img'));const videoStage=document.querySelector('.react-flow__node[data-id="video"] .generator-stage');const video=videoStage.querySelector('video');return {field:rect(fields[0]),zones:zones.map(rect),zonePoints:zones.map(e=>rect(e)),idle:actions.map(e=>({opacity:getComputedStyle(e).opacity,pointer:getComputedStyle(e).pointerEvents})),padding:[getComputedStyle(text).padding,getComputedStyle(pre).padding],previews:previews.map(e=>({nodrag:e.classList.contains('nodrag'),rect:rect(e)})),images:images.map(img=>{const event=new DragEvent('dragstart',{bubbles:true,cancelable:true});img.dispatchEvent(event);return{draggable:img.draggable,prevented:event.defaultPrevented}}),video:{stageNodrag:videoStage.classList.contains('nodrag'),controls:video.controls,draggable:video.draggable,rect:rect(videoStage)},viewport:document.querySelector('.react-flow__viewport').style.transform,nodeTransforms:Object.fromEntries(nodes.map(n=>[n.id,document.querySelector('.react-flow__node[data-id="'+n.id+'"]').style.transform]))}}
      window.__focusReveal=()=>{document.querySelector('.storyboard-shot-action').focus();const e=document.querySelector('.storyboard-prompt-actions');return{opacity:getComputedStyle(e).opacity,pointer:getComputedStyle(e).pointerEvents}}
      window.__viewport=()=>document.querySelector('.react-flow__viewport').style.transform
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader: { '.svg': 'dataurl','.png':'dataurl'}, logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    const flowStyles = resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${flowStyles}"><link rel="stylesheet" href="file://${styles}"><style>body{margin:0;background:#111}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('HOVER_GRAB_RESULT:'+JSON.stringify(v)+'\\n');app.exit(c)};const wait=ms=>new Promise(r=>setTimeout(r,ms));app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1200,height:1000,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(700);const before=await win.webContents.executeJavaScript('window.__probe()');await win.webContents.executeJavaScript('window.__focusReveal()');await wait(140);const focus=await win.webContents.executeJavaScript('(()=>{const e=document.querySelector(".storyboard-prompt-actions");return{opacity:getComputedStyle(e).opacity,pointer:getComputedStyle(e).pointerEvents}})()');const zone=before.zonePoints[0];win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(zone.cx),y:Math.round(zone.cy)});await wait(80);const hover=await win.webContents.executeJavaScript('(()=>{const e=document.querySelector(".storyboard-prompt-actions");return{opacity:getComputedStyle(e).opacity,pointer:getComputedStyle(e).pointerEvents}})()');await win.webContents.executeJavaScript('document.activeElement.blur()');const drag=async(rect,mode)=>{const prior=await win.webContents.executeJavaScript('window.__viewport()');if(mode==='space'){win.webContents.sendInputEvent({type:'keyDown',keyCode:'Space'});await wait(30)};win.webContents.sendInputEvent({type:'mouseDown',x:Math.round(rect.cx),y:Math.round(rect.cy),button:mode==='middle'?'middle':'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(rect.cx+45),y:Math.round(rect.cy+30),button:mode==='middle'?'middle':'left'});win.webContents.sendInputEvent({type:'mouseUp',x:Math.round(rect.cx+45),y:Math.round(rect.cy+30),button:mode==='middle'?'middle':'left',clickCount:1});if(mode==='space')win.webContents.sendInputEvent({type:'keyUp',keyCode:'Space'});await wait(80);const after=await win.webContents.executeJavaScript('window.__viewport()');return{prior,after}};const grabs=[];for(const preview of before.previews)grabs.push(await drag(preview.rect,'space'));grabs.push(await drag(before.video.rect,'space'));grabs.push(await drag(before.video.rect,'middle'));const after=await win.webContents.executeJavaScript('window.__probe()');finish({before,focus,hover,grabs,after})}).catch(e=>finish({error:e.stack||String(e)},1));`)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 50_000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('HOVER_GRAB_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('HOVER_GRAB_RESULT:'.length))
    expect(result.before.idle).toEqual([{ opacity: '0', pointer: 'none' }, { opacity: '0', pointer: 'none' }])
    expect(result.focus).toEqual({ opacity: '1', pointer: 'auto' })
    expect(result.hover).toEqual({ opacity: '1', pointer: 'auto' })
    expect(result.before.padding).toEqual(['8px 8px 43px', '8px 8px 43px'])
    expect(result.before.zones[0].height).toBeLessThanOrEqual(48)
    expect(result.before.zones[0].right).toBeLessThanOrEqual(result.before.field.right + 0.5)
    expect(result.before.zones[0].bottom).toBeLessThanOrEqual(result.before.field.bottom + 0.5)
    expect(result.before.zones[1].width).toBeLessThan(result.before.zones[0].width)
    expect(result.before.previews.every((entry: any) => entry.nodrag)).toBe(true)
    expect(result.before.images).toEqual([{ draggable: false, prevented: true }, { draggable: false, prevented: true }, { draggable: false, prevented: true }])
    expect(result.before.video).toMatchObject({ stageNodrag: true, controls: true, draggable: false })
    expect(result.grabs.every((entry: any) => entry.after !== entry.prior), JSON.stringify(result.grabs)).toBe(true)
    expect(result.after.nodeTransforms).toEqual(result.before.nodeTransforms)
  }, 60_000)
})
