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

function runHarness(connected = true) {
  const directory = mkdtempSync(join(tmpdir(), 'prism-final-acceptance-'))
  temporaryDirectories.push(directory)
  const entry = join(directory, 'renderer.tsx')
  const bundle = join(directory, 'renderer.js')
  const html = join(directory, 'index.html')
  const main = join(directory, 'main.cjs')
  writeFileSync(entry, `
    import React, { Component, useEffect, useMemo, useState } from 'react'
    import { createRoot } from 'react-dom/client'
    import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
    import { NodeCard, NodeRuntimeContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
    import { ProviderAvailabilityContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderAvailabilityContext.tsx'))}
    import { StoryboardNode } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/UtilityNodes.tsx'))}
    import { applyGeneratorLocalDurationPatch } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/storyboardDurationMutation.ts'))}
    import { buildGenerationRequest } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/workflowResolver.ts'))}
    import { generationReadinessTooltip } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/generationReadiness.ts'))}
    import { videoModelDurationInventory } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/videoModels.ts'))}

    const connected=${JSON.stringify(connected)}
    const edge={id:'storyboard-video',source:'storyboard',sourceHandle:'storyboard-out',target:'video',targetHandle:'storyboard-in'}
    const panels=[
      {id:'panel-a',prompt:'First authored shot.',duration:8,shotSize:'wide',camera:'static',transitionToNext:'continue',locked:false,originalPrompt:'First authored shot.',revampedPrompt:'First revamped shot.',selectedPromptVersion:'original'},
      {id:'panel-b',prompt:'Second authored shot.',duration:7,shotSize:'medium',camera:'dolly-down-slow',locked:true,originalPrompt:'Second authored shot.',selectedPromptVersion:'original'},
    ]
    const initial=[
      {id:'storyboard',type:'storyboard',position:{x:70,y:100},data:{kind:'storyboard',title:'Authored board',storyboardEditorOpen:true,referenceTag:'@saved-board',selectorDeployment:true,storyboardPanels:panels,storyboardPanelCount:2,assistantProvider:'anthropic',assistantModelId:'claude-opus-5'}},
      {id:'video',type:'studio',position:{x:520,y:100},data:{kind:'video-generator',title:'Video Generator',videoEngine:'bytedance/seedance-2.5/reference-to-video',duration:20,autoDuration:true,frameRate:24,aspectRatio:'16:9',resolution:'480p',quantity:1,generateAudio:true,prompt:'Unrelated generator state',seed:77}},
    ]
    class Boundary extends Component { constructor(p){super(p);this.state={error:null}} componentDidCatch(error,info){window.__caught.push({message:error.message,stack:error.stack,componentStack:info.componentStack});this.setState({error})} render(){return this.state.error?<div data-boundary-error>{this.state.error.message}</div>:this.props.children} }
    const stable=(value)=>JSON.parse(JSON.stringify(value))
    function Harness(){
      const [nodes,setNodes]=useState(initial)
      const [saved,setSaved]=useState(null)
      const requestState=useMemo(()=>{try{return {request:buildGenerationRequest(nodes[1],nodes,connected?[edge]:[])}}catch(error){const message=error.stack||String(error);window.__resolverErrors.push(message);return {error:message}}},[nodes])
      const readiness=requestState.request?generationReadinessTooltip(requestState.request):{disabled:true,tooltip:requestState.error||'Cannot run: render request failed.'}
      const runtime=useMemo(()=>new Proxy({
        updateNode:(id,patch)=>setNodes(current=>id==='video'&&patch.duration!==undefined&&Object.keys(patch).every(key=>key==='duration'||key==='autoDuration')?applyGeneratorLocalDurationPatch(current,id,{duration:patch.duration,autoDuration:patch.autoDuration}):current.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node)),
        connectedStoryboardVideo:(id)=>connected&&id==='storyboard'?{nodeId:'video',modelId:nodes[1].data.videoEngine,duration:nodes[1].data.duration,durationOptions:videoModelDurationInventory(nodes[1].data.videoEngine,nodes[1].data.frameRate).filter(value=>typeof value==='number')}:undefined,
        connectedInputRules:()=>[],availablePromptTags:()=>[],availableModels:(provider)=>provider==='anthropic'?[{id:'claude-opus-5',label:'Claude Opus 5'}]:[],
        runReadiness:()=>readiness,providerConnected:()=>true,providerAccount:()=>undefined,estimateNode:async()=>null,
        connectedReferenceTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=> 'seedance',videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,
        characterLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},storyboardLibrary:[{nodeId:'reusable',title:'Reusable Browser Entry',storyboardPanels:panels}],
        listBatchState:()=>({sourceCount:0,adjustable:false}),runNode:()=>{},
      },{get:(target,key)=>key in target?target[key]:()=>{}}),[nodes,readiness.tooltip])
      useEffect(()=>{window.__state={nodes:stable(nodes),edges:connected?[stable(edge)]:[],readiness:stable(readiness),saved}},[nodes,readiness,saved])
      useEffect(()=>{window.__actions={
        setDuration:(duration)=>runtime.updateNode('video',{duration,autoDuration:false}),
        save:()=>setSaved(stable(nodes)),reload:()=>setNodes(current=>saved?stable(saved):current),
      }},[runtime,nodes,saved])
      return <Boundary><main data-root-app data-canvas-mounted><ReactFlowProvider><ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}>
        <div style={{width:1200,height:1800}}><ReactFlow nodes={nodes} edges={connected?[edge]:[]} nodeTypes={{storyboard:StoryboardNode,studio:NodeCard}} defaultViewport={{x:60,y:60,zoom:1}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></div>
      </NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></ReactFlowProvider></main></Boundary>
    }
    window.__caught=[];window.__resolverErrors=[];window.__consoleErrors=[];const originalError=console.error;console.error=(...args)=>{window.__consoleErrors.push(args.map(String).join(' '));originalError(...args)}
    createRoot(document.getElementById('root')).render(<Harness/>)
  `)
  buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader: { '.svg': 'dataurl','.png':'dataurl'}, logLevel:'silent' })
  const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
  const flowStyles = resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')
  writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${flowStyles}"><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}body{background:#111;color:#ddd}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
  writeFileSync(main, `
    const {app,BrowserWindow}=require('electron');const path=require('node:path');const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));const finish=(value,code=0)=>{process.stdout.write('FINAL_ACCEPTANCE_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};
    app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1500,height:2200,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(700);const js=code=>win.webContents.executeJavaScript(code);const snap=()=>js("({root:!!document.querySelector('[data-root-app]'),canvas:!!document.querySelector('[data-canvas-mounted]'),boundary:document.querySelector('[data-boundary-error]')?.textContent||null,nodeIds:Array.from(document.querySelectorAll('.react-flow__node')).map(n=>n.dataset.id),state:structuredClone(window.__state),caught:structuredClone(window.__caught),resolverErrors:structuredClone(window.__resolverErrors),consoleErrors:structuredClone(window.__consoleErrors),browserText:document.body.innerText,editor:!!document.querySelector('[aria-label^=\\\"Storyboard panels\\\"]'),browser:!!document.querySelector('.storyboard-browser'),custom:Array.from(document.querySelectorAll('*')).some(e=>e.textContent?.trim()==='Custom Storyboard'),runPresent:!!document.querySelector('[aria-label=\\\"Run Node\\\"]'),runFocusable:document.querySelector('.play-tooltip-anchor.is-disabled')?.tabIndex===0,counter:document.querySelector('.storyboard-budget strong')?.textContent?.trim()})");
      const result={initial:await snap()};
      const arrow=await js("(()=>{const node=document.querySelector('.react-flow__node[data-id=storyboard]');const port=node.querySelector('.node-port-source .node-port-visual');const toolbar=node.querySelector('.utility-node-toolbar');const style=()=>({visibility:getComputedStyle(toolbar).visibility,opacity:getComputedStyle(toolbar).opacity});const r=port.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,before:style(),toolbar:[toolbar.getBoundingClientRect().left,toolbar.getBoundingClientRect().top],node:[node.getBoundingClientRect().left,node.getBoundingClientRect().top]}})()");
      await win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:arrow.x,y:arrow.y});await wait(80);result.arrowHover=await js("(()=>{const t=document.querySelector('.react-flow__node[data-id=storyboard] .utility-node-toolbar');return {visibility:getComputedStyle(t).visibility,opacity:getComputedStyle(t).opacity}})()");
      result.arrowFocus=await js("(()=>{const p=document.querySelector('.react-flow__node[data-id=storyboard] .node-port-source');p.focus();const t=document.querySelector('.utility-node-toolbar');return {tabIndex:p.tabIndex,active:document.activeElement===p,visibility:getComputedStyle(t).visibility,opacity:getComputedStyle(t).opacity}})()");
      await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:arrow.toolbar[0]+10,y:arrow.toolbar[1]+10});await wait(80);result.arrowToToolbar=await js("(()=>{const t=document.querySelector('.utility-node-toolbar');return {visibility:getComputedStyle(t).visibility,opacity:getComputedStyle(t).opacity}})()");
      await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:arrow.node[0]+100,y:arrow.node[1]+100});await wait(80);result.toolbarToNode=await js("(()=>{const t=document.querySelector('.utility-node-toolbar');return {visibility:getComputedStyle(t).visibility,opacity:getComputedStyle(t).opacity}})()");
      await js("document.activeElement?.blur()");await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:10,y:10});await wait(500);result.leave=await js("(()=>{const t=document.querySelector('.utility-node-toolbar');return {visibility:getComputedStyle(t).visibility,opacity:getComputedStyle(t).opacity}})()");
      await js("window.__actions.setDuration(18)");await wait(120);result.loweredValid=await snap();await js("window.__actions.setDuration(20)");await wait(80);
      const durationTrigger=await js("(()=>{const n=document.querySelector('.react-flow__node[data-id=video]');const b=n.querySelector('[aria-label=\\\"Video Duration\\\"]');b.click();return !!b})()");await wait(80);result.selectorOpen=durationTrigger&&await js("!!document.querySelector('.grouped-menu-select-menu,.simple-menu-select-menu')");
      await js("(()=>{const row=Array.from(document.querySelectorAll('[role=option]')).find(option=>option.textContent.trim()==='10.0s');if(!row)throw new Error('missing 10.0s Generator duration option');row.click()})()");await wait(180);result.overflow=await snap();
      await js("window.__actions.setDuration(20)");await wait(120);result.raised=await snap();await js("window.__actions.setDuration(10)");await wait(120);result.loweredAgain=await snap();
      await js("window.__actions.save()");await wait(30);await js("window.__actions.setDuration(20)");await wait(30);await js("window.__actions.reload()");await wait(140);result.reloaded=await snap();
      finish(result)
    }).catch(error=>finish({error:error.stack||String(error)},1));
  `)
  const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:60_000})
  const marker=run.stdout.split('\n').find(line=>line.startsWith('FINAL_ACCEPTANCE_RESULT:'))
  expect(run.status,`${run.stdout}\n${run.stderr}`).toBe(0)
  expect(marker,`${run.stdout}\n${run.stderr}`).toBeDefined()
  return JSON.parse(marker!.slice('FINAL_ACCEPTANCE_RESULT:'.length))
}

describe('final user acceptance mounted successor renderer',()=>{
  it('opens every Storyboard directly in the panel editor with no reusable browser surface',()=>{
    const result=runHarness()
    expect(result.initial).toMatchObject({root:true,canvas:true,boundary:null,editor:true,browser:false,custom:false})
    expect(result.initial.browserText).not.toMatch(/Search Storyboards|Create Storyboard|Browse or create a reusable Storyboard|Custom Storyboard/)
  },70_000)

  it('shares toolbar hover/focus ownership with the always-visible Storyboard output arrow',()=>{
    const result=runHarness()
    for(const state of [result.arrowHover,result.arrowFocus,result.arrowToToolbar,result.toolbarToNode]) expect(state.visibility).toBe('visible')
    expect(result.arrowFocus).toMatchObject({active:true})
    expect(result.leave.visibility).toBe('hidden')
  },70_000)

  it('keeps the mounted graph and disabled Run wrapper intact through duration overflow cycles and reload',()=>{
    const result=runHarness()
    const disconnected=runHarness(false)
    expect(result.selectorOpen).toBe(true)
    for(const state of [result.loweredValid,result.overflow,result.raised,result.loweredAgain,result.reloaded]){
      expect(state).toMatchObject({root:true,canvas:true,boundary:null,nodeIds:['storyboard','video']})
      expect(state.caught).toEqual([])
      expect(state.consoleErrors).toEqual([])
      expect(state.state.edges).toHaveLength(1)
      expect(state.state.nodes[0].position).toEqual({x:70,y:100})
      expect(state.state.nodes[0].data.storyboardPanels).toEqual(result.initial.state.nodes[0].data.storyboardPanels)
      expect(state.state.nodes[1].data).toMatchObject({prompt:'Unrelated generator state',seed:77})
    }
    expect(result.loweredValid).toMatchObject({counter:'15.0 / 18.0s'})
    expect(result.loweredValid.state.readiness.tooltip).toBe(result.initial.state.readiness.tooltip)
    expect(result.overflow).toMatchObject({counter:'15.0 / 10.0s',runPresent:true,runFocusable:true})
    expect(result.overflow.state.readiness).toMatchObject({disabled:true})
    expect(result.overflow.state.readiness.tooltip).toMatch(/duration|timing|10\.0/i)
    expect(result.overflow.state.nodes[1].data).toMatchObject({duration:10,autoDuration:false})
    expect(result.raised.state.nodes[1].data.duration).toBe(20)
    expect(result.loweredAgain.state.nodes[1].data.duration).toBe(10)
    expect(result.reloaded.state.nodes[1].data.duration).toBe(10)
    expect(disconnected.overflow).toMatchObject({root:true,canvas:true,boundary:null})
    expect(disconnected.overflow.counter).toBeUndefined()
    expect(disconnected.overflow.state.edges).toEqual([])
    expect(disconnected.overflow.state.nodes[0].data.storyboardPanels).toEqual(disconnected.initial.state.nodes[0].data.storyboardPanels)
  },70_000)
})

declare global { interface Window { __caught:any[];__resolverErrors:any[];__consoleErrors:string[];__state:any;__actions:any } }
