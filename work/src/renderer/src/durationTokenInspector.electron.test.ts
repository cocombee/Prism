import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
it('renders Music Inspector duration, retains hidden SFX controls and preserves unsupported Storyboard timing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prism-duration-inspector-'))
  try {
    const source = readFileSync(resolve('src/renderer/src/AppNext.tsx'), 'utf8')
    const sfx = source.match(/<label><span>Duration<\/span><SimpleMenuSelect ariaLabel="Sound effect duration"[^]*?<\/label>/)?.[0]
    const music = source.match(/<label><span>Duration<\/span><SimpleMenuSelect ariaLabel="Inspector Music duration"[^]*?<\/label>/)?.[0]
    expect(sfx).toBeTruthy(); expect(music).toBeTruthy()
    const path = (name: string) => JSON.stringify(resolve(name))
    writeFileSync(join(dir, 'renderer.tsx'), `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {ReactFlow,ReactFlowProvider} from '@xyflow/react';
import {SimpleMenuSelect,musicDurationControl,NodeRuntimeContext} from ${path('src/renderer/src/NodeCardNext.tsx')};
import {defaultSoundEffectDuration,soundEffectDurationOptions} from ${path('src/shared/soundEffectsDuration.ts')};
import {StoryboardNode} from ${path('src/renderer/src/UtilityNodes.tsx')};
import {ProviderAvailabilityContext} from ${path('src/renderer/src/ProviderAvailabilityContext.tsx')};
window.__errors=[];window.__http=0;window.fetch=()=>{window.__http++;throw Error('HTTP forbidden')};
window.addEventListener('error',event=>window.__errors.push(event.message));
window.addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason)));
const authored={kind:'music-generator',musicVersion:1,audioProvider:'elevenlabs',musicModelId:'music_v2_5',musicGenerationMode:'prompt',musicSeconds:'3.125',duration:3.125,prompt:'Keep authored text',musicPlanDrafts:{v1:{sections:[{id:'raw',seconds:'3.125',lyrics:'Keep\\r\\nwhitespace'}]},v2:{sections:[]}},error:'Earlier error'};
const panels=[{id:'custom',prompt:'Saved panel',duration:3.125,shotSize:'wide',camera:'static',locked:false},{id:'other',prompt:'Other panel',duration:1,shotSize:'wide',camera:'static',locked:false}];
const board={id:'saved-board',type:'storyboard',position:{x:0,y:0},style:{width:315},data:{kind:'storyboard',title:'Saved Storyboard',storyboardEditorOpen:true,storyboardPanels:panels}};
const noop=()=>undefined;
const runtime=new Proxy({characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,connectedStoryboardVideo:()=>({nodeId:'video',modelId:'fal-ai/veo3.1',duration:6,durationOptions:[4,6,8]}),videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),estimateNode:async()=>null,availableModels:()=>[],updateNode:(_id,patch)=>{window.__boardPatch=patch}}, {get:(target,key)=>key in target?target[key]:noop});
function Harness(){const[data,setData]=React.useState(authored),[width,setWidth]=React.useState(315);const inspectorNode={id:'inspected',data};const updateNode=(_id,patch)=>setData(current=>({...current,...patch}));
window.__state=data;window.__set=(patch)=>setData(current=>({...current,...patch}));window.__width=setWidth;
return <ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,elevenlabs:true},promptConnected:{}}}><aside className="node-inspector-panel" style={{position:'absolute',left:0,right:'auto',width,minWidth:width,maxWidth:width}}><div className="inspector-scroll"><section className="inspector-grid">${music}${sfx}</section></div></aside><div style={{position:'absolute',left:430,width:360,height:800}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={[board]} edges={[]} nodeTypes={{storyboard:StoryboardNode}} defaultViewport={{x:5,y:5,zoom:1}} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} zoomOnScroll={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></div></ProviderAvailabilityContext.Provider>}
createRoot(document.getElementById('root')).render(<Harness/>);
const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const trigger=label=>document.querySelector('[aria-label="'+label+'"]');
const menu=()=>document.querySelector('.grouped-menu-select-menu,.storyboard-compact-menu');
const optionValue=e=>{const listbox=e.closest('[role="listbox"]'),prefix=listbox?.id+'-';return listbox&&e.id.startsWith(prefix)?e.id.slice(prefix.length):null};
const snapshot=()=>({state:window.__state,board:board.data,boardPatch:window.__boardPatch??null,http:window.__http,errors:window.__errors,fields:['Inspector Music duration','Sound effect duration'].map(label=>{const e=trigger(label),s=getComputedStyle(e),r=e.getBoundingClientRect();return{label,text:e.textContent.trim(),height:r.height,width:r.width,bg:s.backgroundColor,radius:s.borderRadius,labelDisplay:getComputedStyle(e.closest('label')).display}}),storyboardLabel:trigger('Panel 1 duration, 3.1 seconds.')?.textContent.trim()});
const menuProbe=()=>{const portal=menu(),results=portal?.querySelector('.selector-results'),rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom}},active=document.activeElement,listRect=results?rect(results):null;return{viewport:{width:innerWidth,height:innerHeight},menu:portal?rect(portal):null,results:results?{...listRect,scrollTop:results.scrollTop,clientHeight:results.clientHeight,scrollHeight:results.scrollHeight}:null,activeElement:{tagName:active?.tagName,ariaLabel:active?.getAttribute('aria-label'),role:active?.getAttribute('role'),connected:active?.isConnected},firstOptions:['1','1.5','2'].map(value=>{const e=[...portal.querySelectorAll('[role="option"]')].find(e=>optionValue(e)===value);const bounds=e?rect(e):null;return{value,label:e?.textContent.trim(),rect:bounds,visibleInResults:Boolean(bounds&&listRect&&bounds.bottom>listRect.top&&bounds.top<listRect.bottom),visibleInViewport:Boolean(bounds&&bounds.bottom>0&&bounds.top<innerHeight&&bounds.x+bounds.width>0&&bounds.x<innerWidth),fullyInsideViewportAndResults:Boolean(bounds&&listRect&&bounds.width>0&&bounds.height>0&&bounds.top>=Math.max(0,listRect.top)&&bounds.bottom<=Math.min(innerHeight,listRect.bottom)&&bounds.x>=0&&bounds.x+bounds.width<=innerWidth)}})}};
window.__duration={menuProbe,openMusic:async()=>{trigger('Inspector Music duration').click();await wait();return menuProbe()},close:async()=>{menu()?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait()},snapshot,set:async patch=>{window.__set(patch);await wait();return snapshot()},width:async width=>{window.__width(width);await wait();return snapshot()},inventory:async label=>{trigger(label).click();await wait();const result=[...menu().querySelectorAll('[role="option"]')].map(e=>({value:optionValue(e),label:e.textContent.trim(),disabled:e.getAttribute('aria-disabled')==='true'}));menu().dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait();return result},choose:async(label,value)=>{trigger(label).click();await wait();const option=[...menu().querySelectorAll('[role="option"]')].find(e=>optionValue(e)===value);if(!option)throw Error('Missing option '+value);option.click();await wait();return snapshot()}};
`)
    require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js')).buildSync({entryPoints:[join(dir,'renderer.tsx')],outfile:join(dir,'renderer.js'),bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],jsx:'automatic',loader:{'.png':'dataurl','.svg':'dataurl'},logLevel:'silent'})
    writeFileSync(join(dir,'index.html'), `<link rel="stylesheet" href="file://${resolve('node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve('src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}body{background:#111;color:#ddd}</style><div id="root"></div><script src="./renderer.js"></script>`)
    writeFileSync(join(dir,'main.cjs'), `const{app,BrowserWindow}=require('electron');const fs=require('node:fs'),path=require('node:path');app.setPath('userData',${JSON.stringify(join(dir,'user'))});const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{contextIsolation:false}});const r={widths:[]};let run;const savePartial=()=>{const dir=process.env.PRISM_DURATION_TOKEN_FAMILY_ARTIFACT_DIR;if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'Inspector Storyboard Partial Evidence.json'),JSON.stringify(r,null,2))}};try{await w.loadFile(${JSON.stringify(join(dir,'index.html'))});await wait(700);run=code=>w.webContents.executeJavaScript(code,true);for(const width of[250,315,375])r.widths.push(await run('__duration.width('+width+')'));r.menuProbe={beforeHome:await run("__duration.openMusic()")};w.webContents.sendInputEvent({type:"keyDown",keyCode:"Home"});w.webContents.sendInputEvent({type:"keyUp",keyCode:"Home"});await wait(100);r.menuProbe.afterHome=await run("__duration.menuProbe()");await run("__duration.close()");savePartial();r.music=await run('__duration.inventory("Inspector Music duration")');savePartial();r.selected=await run('__duration.choose("Inspector Music duration","3.5")');r.final=await run('__duration.snapshot()');console.log('DURATION_CALLERS:'+JSON.stringify(r));w.destroy();app.quit()}catch(error){r.failure=String(error);if(run){try{r.failureSnapshot=await run('__duration.snapshot()');r.failureMenuProbe=await run('__duration.menuProbe()')}catch(probeError){r.failureProbeError=String(probeError)}}savePartial();console.error(error);app.exit(1)}})`)
    const run=spawnSync(require('electron'),[join(dir,'main.cjs')],{encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:45000})
    expect(run.status,run.stdout+'\n'+run.stderr).toBe(0)
    const result=JSON.parse(run.stdout.split('\n').find(line=>line.startsWith('DURATION_CALLERS:'))!.slice('DURATION_CALLERS:'.length))
    for(const state of result.widths){
      expect(state.errors).toEqual([]);expect(state.http).toBe(0)
      for(const field of state.fields){
        if(field.label==='Sound effect duration'){expect(field.height).toBe(0);expect(field.width).toBe(0);expect(field.labelDisplay).toBe('none');continue}
        expect(field.height,field.label).toBe(28);expect(field.width).toBeGreaterThan(0);expect(field.bg).toBe('rgb(21, 19, 27)');expect(field.radius).toBe('999px')
      }
      expect(state.state.musicSeconds).toBe('3.125');expect(state.state.duration).toBe(3.125)
      expect(state.storyboardLabel).toBe('3.1s · review');expect(state.board.storyboardPanels[0].duration).toBe(3.125);expect(state.boardPatch).toBeNull()
    }
    for(const phase of [result.menuProbe.beforeHome,result.menuProbe.afterHome]) {
      expect(phase.firstOptions.map((option:{label:string})=>option.label)).toEqual(['1.0s','1.5s','2.0s'])
      expect(phase.results.scrollHeight).toBeGreaterThan(phase.results.clientHeight)
    }
    for(const option of result.menuProbe.afterHome.firstOptions.slice(0,2)) {
      expect(option.visibleInResults,option.label).toBe(true)
      expect(option.visibleInViewport,option.label).toBe(true)
      expect(option.fullyInsideViewportAndResults,option.label).toBe(true)
    }
    result.coverage={visible:['Music Inspector','Storyboard saved timing'],hidden:['Sound Effects Inspector duration'],soundEffectsProof:'Shared helper source/pure checks and separate actual SFX Footer fixture; no hidden Inspector menu interaction or visible paint claim.'}
    const musicStandard=result.music.filter((option:{value:string})=>option.value!=='3.125')
    expect(musicStandard.map((option:{value:string})=>Number(option.value))).toEqual(Array.from({length:1199},(_,index)=>1+index/2))
    expect(result.music.findIndex((option:{value:string})=>option.value==='3.125')).toBe(5)
    expect(result.selected.state.musicSeconds).toBe('3.5');expect(result.selected.state.duration).toBe(3.5);expect(result.selected.state.error).toBeUndefined()
    expect(result.selected.state.prompt).toBe('Keep authored text');expect(result.selected.state.musicPlanDrafts).toEqual(result.widths[0].state.musicPlanDrafts)
    expect(result.final.errors).toEqual([]);expect(result.final.http).toBe(0)
    const artifact=process.env.PRISM_DURATION_TOKEN_FAMILY_ARTIFACT_DIR
    if(artifact){mkdirSync(artifact,{recursive:true});writeFileSync(join(artifact,'Inspector Storyboard Evidence.json'),JSON.stringify(result,null,2)+'\n')}
  } finally { rmSync(dir,{recursive:true,force:true}) }
},60000)
