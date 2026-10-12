import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const require=createRequire(import.meta.url)
const {buildSync}=require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath=require('electron') as string

it('publishes a cold subscription catalog on the first open and enables text actions independently of unavailable media/API accounts',()=>{
  const directory=mkdtempSync(join(tmpdir(),'prism-prompt-subscription-'))
  try{
    const entry=join(directory,'renderer.tsx'),bundle=join(directory,'renderer.js'),html=join(directory,'index.html'),main=join(directory,'main.cjs')
    writeFileSync(entry,`
import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{ReactFlow,ReactFlowProvider}from'@xyflow/react';
import{NodeCard,NodeRuntimeContext}from ${JSON.stringify(resolve('src/renderer/src/NodeCardNext.tsx'))};
import{StoryboardNode}from ${JSON.stringify(resolve('src/renderer/src/UtilityNodes.tsx'))};
import{assistantThinkingOptions}from ${JSON.stringify(resolve('src/shared/assistantThinking.ts'))};
import{ProviderAvailabilityContext}from ${JSON.stringify(resolve('src/renderer/src/ProviderAvailabilityContext.tsx'))};
const discoveredCatalog=['gpt-6.1-sol','gpt-6-luna','gpt-6-astra','gpt-6-sol'].flatMap(id=>assistantThinkingOptions({id,label:id},(id.includes('luna')?['low','medium','high','xhigh','max']:['low','medium','high','xhigh','max','ultra']).map(reasoningEffort=>({reasoningEffort}))));
window.__calls=[];window.__errors=[];window.addEventListener('error',event=>window.__errors.push(event.message));window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)));
const noop=()=>undefined;function Harness(){const[ready,setReady]=useState(false);window.__publish=setReady;const[nodes,setNodes]=useState([
 {id:'prompt',type:'studio',position:{x:0,y:0},style:{width:315},data:{kind:'prompt',title:'Prompt',prompt:'A fictional red cube rotates for five seconds.',assistantProvider:'openai',assistantModelId:'gpt-6.1-sol',runState:'idle'}},
 {id:'storyboard',type:'storyboard',position:{x:380,y:0},style:{width:315},data:{kind:'storyboard',title:'Storyboard',assistantProvider:'openai',assistantModelId:'gpt-6.1-sol',storyboardPanels:[{id:'one',prompt:'A fictional red cube.',duration:5,locked:false},{id:'two',prompt:'The cube stops.',duration:5,locked:false}]}},
 {id:'style',type:'studio',position:{x:760,y:0},style:{width:315},data:{kind:'style-reference',title:'Style',styleEditorOpen:true,styleDescription:'Clean fictional style',assetGenerationPrompt:'Use clean lighting and a simple finish.',assistantProvider:'openai',stylePromptModelId:'gpt-6.1-sol',runState:'idle'}}
]);const runtime=new Proxy({availablePromptModels:provider=>provider==='openai'&&ready?[...discoveredCatalog,{id:'gpt-4o',label:'GPT 4o'},{id:'gpt-live-1',label:'GPT Live 1'}]:[],availableModels:()=>[{id:'gpt-api-fixture',label:'API fixture must not appear'}],promptProviderAccount:provider=>({provider,state:ready?'ready':'unavailable',message:'Subscription fixture',checkedAt:'fixture'}),providerAccount:provider=>({provider,state:'unavailable',message:'API disconnected',checkedAt:'fixture'}),runAssistantNode:id=>window.__calls.push(id),buildStylePrompt:id=>window.__calls.push(id),updateNode:(id,patch)=>setNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node)),connectedInputRules:()=>[],connectedReferenceTags:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideo:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,runReadiness:()=>({disabled:true,tooltip:'No media generation in fixture'}),estimateNode:async()=>null,videoPromptState:()=>undefined,characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]}}, {get:(target,key)=>key in target?target[key]:noop});
return <ProviderAvailabilityContext.Provider value={{mediaConnected:{openai:false,fal:false},promptConnected:{openai:ready}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><div style={{width:1120,height:950}}><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard,storyboard:StoryboardNode}} defaultViewport={{x:0,y:0,zoom:1}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></div></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider>}
createRoot(document.getElementById('root')).render(<Harness/>);
`)
    buildSync({entryPoints:[entry],outfile:bundle,bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],jsx:'automatic',loader:{'.svg':'dataurl','.png':'dataurl'},logLevel:'silent'})
    writeFileSync(html,`<!doctype html><html><head><link rel="stylesheet" href="file://${resolve('src/renderer/src/styles-next.css')}"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
    writeFileSync(main,`const{app,BrowserWindow}=require('electron');const path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));const wait=ms=>new Promise(r=>setTimeout(r,ms));const finish=(value,code=0)=>{console.log('PROMPT_SUBSCRIPTION:'+JSON.stringify(value));app.exit(code)};app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1180,height:1000,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(200);const js=code=>win.webContents.executeJavaScript(code);const cold=await js("document.querySelector('[aria-label=\\\"Revamp Prompt\\\"]').disabled");await js("document.querySelector('[aria-label=\\\"Prompt Revamp model\\\"]').click()");await wait(30);await js('window.__publish(true)');await wait(100);const flat=await js("({flat:!!document.querySelector('.is-flat-catalog'),disclosures:document.querySelectorAll('[data-catalog-disclosure]').length,dividers:Array.from(document.querySelectorAll('.is-flat-catalog section')).some(section=>parseFloat(getComputedStyle(section).borderTopWidth)>0)})");const first=await js("Array.from(document.querySelectorAll('[role=option]')).map(row=>row.id)");await js("document.querySelector('[role=option]').click()");await wait(30);const ready=await js("({apply:document.querySelector('[aria-label=\\\"Revamp Prompt\\\"]').disabled,style:document.querySelector('[aria-label=\\\"Build Style Prompt\\\"]').disabled})");await js("document.querySelector('[aria-label=\\\"Revamp Prompt\\\"]').click()");await js("document.querySelector('[aria-label=\\\"Storyboard AI model\\\"]').click()");await wait(50);const storyboard=await js("Array.from(document.querySelectorAll('[role=option]')).map(row=>row.id)");await js('window.__publish(false)');await wait(50);finish({cold,flat,first,ready,storyboard,disconnected:await js("document.querySelector('[aria-label=\\\"Revamp Prompt\\\"]').disabled"),calls:await js('window.__calls'),errors:await js('window.__errors')})}).catch(error=>finish({error:error.stack},1));`)
    const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:30_000})
    expect(run.status,run.stdout+run.stderr).toBe(0)
    const result=JSON.parse(run.stdout.split('\n').find(line=>line.startsWith('PROMPT_SUBSCRIPTION:'))!.slice('PROMPT_SUBSCRIPTION:'.length))
    const expected=['gpt-6.1-sol','gpt-6-luna','gpt-6-astra'].flatMap(id=>(id.includes('luna')?['low','medium','high','xhigh','max']:['low','medium','high','xhigh','max','ultra']).map(effort=>`${id}::thinking=${effort}`))
    const choices=(ids:string[])=>ids.map(id=>id.slice(id.indexOf('openai::')+'openai::'.length))
    expect(result.errors).toEqual([]);expect(result.flat).toEqual({flat:true,disclosures:0,dividers:false});expect(result.cold).toBe(true)
    expect(choices(result.first)).toEqual(expected)
    expect(result.ready).toEqual({apply:false,style:false});expect(choices(result.storyboard)).toEqual(expected)
    expect(result.disconnected).toBe(true);expect(result.calls).toEqual(['prompt'])

  }finally{rmSync(directory,{recursive:true,force:true})}
},40_000)
