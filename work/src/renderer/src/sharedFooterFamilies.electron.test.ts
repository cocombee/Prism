import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { build } = require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string
const sourceOverrides: Record<string,string> = JSON.parse(process.env.PRISM_SHARED_FOOTER_SOURCE_OVERRIDES || '{}')
const owners = ['src/renderer/src/NodeCardNext.tsx', 'src/renderer/src/UtilityNodes.tsx', 'src/renderer/src/styles-next.css', 'src/shared/footerControlLayout.ts']
const sourceHashes = () => Object.fromEntries(owners.map(owner => [owner, createHash('sha256').update(readFileSync(sourceOverrides[owner] || resolve(owner))).digest('hex')]))

/** Generation and samples never run; callbacks own only fictional controlled renderer state. */
describe('actual shared footer families', () => {
  it('preserves painted tokens, field pressure, circle anchors and callbacks across actual node families', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-shared-footer-families-'))
    const before = sourceHashes()
    try {
      const entry = join(directory, 'renderer.tsx'), bundle = join(directory, 'renderer.js'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
      writeFileSync(entry, String.raw`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ReactFlow,ReactFlowProvider} from '@xyflow/react';
import {NodeCard,NodeRuntimeContext} from ${JSON.stringify(resolve('src/renderer/src/NodeCardNext.tsx'))};
import {StoryboardNode} from ${JSON.stringify(resolve('src/renderer/src/UtilityNodes.tsx'))};
import {describeHiggsfieldInputContract} from ${JSON.stringify(resolve('src/shared/higgsfieldInputContract.ts'))};
import {higgsfieldInputSchema} from ${JSON.stringify(resolve('src/shared/higgsfieldNative.ts'))};
import {selectHiggsfieldBinding,reconcileHiggsfieldNodeBinding} from ${JSON.stringify(resolve('src/shared/higgsfieldNodeBinding.ts'))};
import {ProviderAvailabilityContext} from ${JSON.stringify(resolve('src/renderer/src/ProviderAvailabilityContext.tsx'))};
import {describeFalRuntimeInputs} from ${JSON.stringify(resolve('src/shared/falRuntimeInputs.ts'))};
import {reconcileFalNodeBinding} from ${JSON.stringify(resolve('src/shared/falNodeBinding.ts'))};
const noop=()=>undefined,connected={mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}};
const schema=(endpointId,category,properties)=>({endpointId,category,schemaPath:'/fictional-layout',input:{type:'object',properties},output:{type:'object'}});
const nativeSchemas=[schema('fixture/video/reference-to-video','image-to-video',{prompt:{type:'string'},aspect_ratio:{type:'string',enum:['16:9','9:16'],default:'16:9'},clip_length:{type:'integer',title:'Duration',minimum:1,maximum:15,default:5},resolution:{type:'string',enum:['720p','1080p'],default:'1080p'},generate_audio:{type:'boolean',default:true}}),schema('fixture/image/text-to-image','text-to-image',{prompt:{type:'string'},aspect_ratio:{type:'string',enum:['1:1','16:9'],default:'1:1'},resolution:{type:'string',enum:['1K','2K'],default:'1K'}}),schema('fal-ai/elevenlabs/tts/turbo-v2.5','text-to-speech',{text:{type:'string'},voice:{type:'string',default:'Rachel'},stability:{type:'number',default:.5},similarity_boost:{type:'number',default:.75}})];
const contracts=Object.fromEntries(nativeSchemas.map(s=>[s.endpointId,{...s,runtime:{...describeFalRuntimeInputs(s),fingerprint:'a'.repeat(64)}}]));
const binding=(index,flow,values,label)=>reconcileFalNodeBinding({endpointId:nativeSchemas[index].endpointId,label,flow,values,media:[]},contracts[nativeSchemas[index].endpointId]);
const higgsEndpoint='bytedance/seedance-2.5/text-to-video',higgsContract=describeHiggsfieldInputContract(higgsEndpoint,higgsfieldInputSchema(higgsEndpoint),'owned-layout-fixture'),higgsBinding=reconcileHiggsfieldNodeBinding(selectHiggsfieldBinding({},higgsEndpoint,[]).higgsfieldNative,higgsContract);
const base={prompt:'  Authored fixture prompt.  ',quantity:1,runState:'idle'};
const image=(provider,model)=>({...base,kind:'image-generator',title:'Image',imageProvider:provider,imageModelId:model,outputFormat:'png',imageResolution:'1K',aspectRatio:'2:3'});
const semantic=kind=>({...base,kind,title:kind,imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro/edit',outputFormat:'png',imageResolution:'4K',characterInputMode:kind==='character'?'single':undefined,elementInputMode:kind==='element'?'single':undefined,characterEditorOpen:kind==='character',styleEditorOpen:kind==='style-reference',semanticEditorOpen:!['character','style-reference'].includes(kind),referenceAssets:[],semanticAssetLifecycle:{version:1,status:'EMPTY',references:[]},styleDescription:kind==='style-reference'?'Public fictional style':undefined,stylePrompt:kind==='style-reference'?'Private fictional style':undefined});
const voice=(mode)=>({...base,kind:'voiceover',title:'Voice',voiceEngine:'elevenlabs-direct',voiceModelId:mode==='voice-change'?'eleven_multilingual_sts_v2':'eleven_v3',voice:'fixture-voice',elevenSpeechMode:mode,stability:.5,similarityBoost:.75,speed:1,elevenDialogueTurns:mode==='dialogue'?[{id:'turn-1',voiceId:'fixture-voice',text:'Authored turn'}]:undefined});
const cases=[
 ['image-fal',image('fal','fal-ai/nano-banana-pro')],['image-openai',image('openai','gpt-image-2')],['image-google',image('google','gemini-3.1-flash-image')],
 ['image-editor',{...image('fal','fal-ai/nano-banana-pro/edit'),kind:'image-editor'}],
 ['video-seedance',{...base,kind:'video-generator',title:'Video',videoEngine:'bytedance/seedance-2.5/image-to-video',aspectRatio:'16:9',duration:4,resolution:'480p',generateAudio:true}],
 ['video-wan',{...base,kind:'video-generator',title:'Video',videoEngine:'wan-controlled',aspectRatio:'16:9',duration:4,resolution:'720p',frameRate:24,videoQuality:'high',videoWriteMode:'balanced'}],
 ['native-video',{...base,kind:'video-generator',title:'Native Video',falNative:binding(0,'video',{clip_length:5,aspect_ratio:'16:9',resolution:'1080p',generate_audio:true},'Future Reference Video')}],
 ['native-image',{...base,kind:'image-generator',title:'Native Image',falNative:binding(1,'image',{aspect_ratio:'1:1',resolution:'1K'},'Future Image')}],
 ['higgs-seedance',{...base,kind:'video-generator',title:'Higgsfield Seedance',promptMode:'manual',manualPromptDraft:'  Authored fixture prompt.  ',higgsfieldNative:higgsBinding}],
 ['higgs-genjutsu',{...base,kind:'video-generator',title:'Genjutsu retained fallback',promptMode:'manual',manualPromptDraft:'  Authored fixture prompt.  ',higgsfieldNative:{endpointId:'higgsfield/genjutsu/restyle/v1.0',label:'Genjutsu · Restyle',contractRevision:'prism-genjutsu-2026-10-09-v1',values:{resolution:'720p',preset_id:'11111111-1111-1111-1111-111111111111'}}}],
 ['prompt',{...base,kind:'prompt',title:'Prompt',assistantProvider:'anthropic',assistantModelId:'claude-opus-5'}],
 ...['character','location','wardrobe','element','style-reference'].map(kind=>['semantic-'+kind,semantic(kind)]),
 ['upscaler-image',{...base,kind:'upscaler',title:'Upscaler',upscalerModel:'clarity-image',scale:2,creativity:.35,resemblance:.6}],
 ['upscaler-video',{...base,kind:'upscaler',title:'Upscaler',upscalerModel:'realesrgan-video',scale:2}],
 ...['elevenlabs','fal'].map(provider=>['sfx-'+provider,{...base,kind:'sound-effects',title:'Sound Effects',audioProvider:provider,duration:.5,loop:false,audioOutputFormat:'mp3_44100_128'}]),
 ...['speech','dialogue','voice-change'].map(mode=>['voice-'+mode,voice(mode)]),
 ...['mp3','opus'].map(format=>['fish-'+format,{...base,kind:'voiceover',title:'Fish Voice',voiceEngine:'fish-audio',fishModel:'s2-pro',fishReferenceId:'fictional-voice',fishFormat:format,fishSampleRate:format==='mp3'?44100:48000,fishMp3Bitrate:128,fishOpusBitrate:64,fishVolume:0,speed:1}]),
 ['voice-legacy',{...base,kind:'voiceover',title:'Legacy Voice',voiceEngine:'elevenlabs',voice:'George',languageCode:'eng',audioOutputFormat:'mp3_44100_128',speed:1}],
 ['voice-native',{...base,kind:'voiceover',title:'Native Voice',falNative:binding(2,'voice',{voice:'George',stability:.5,similarity_boost:.75},'ElevenLabs TTS Turbo v2.5')}],
 ['storyboard',{...base,kind:'storyboard',title:'Storyboard',assistantProvider:'anthropic',assistantModelId:'claude-opus-5',storyboardPanelCount:2,storyboardPanels:[{id:'first',prompt:'Authored first shot',originalPrompt:'Authored first shot',selectedPromptVersion:'original',duration:1,shotSize:'wide',camera:'static'}]}],
];
window.__footerFamilies={controls:{},errors:[],warnings:[],callbacks:[],authored:{},modelCatalogs:{}};
window.addEventListener('error',e=>{const message=e.error?.stack||e.message;if(String(message).includes('ResizeObserver loop'))window.__footerFamilies.warnings.push(message);else window.__footerFamilies.errors.push(message)});window.addEventListener('unhandledrejection',e=>window.__footerFamilies.errors.push(e.reason?.stack||String(e.reason)));
const elevenModels=[{id:'eleven_v3',label:'ElevenLabs Eleven v3',supportsDialogue:true},{id:'eleven_multilingual_v2',label:'ElevenLabs Multilingual v2'},{id:'eleven_multilingual_sts_v2',label:'Multilingual STS v2',supportsVoiceConversion:true}];
const fishModels=[{id:'s2-pro',label:'Fish Audio S2 Pro'},{id:'s2.1-pro',label:'Fish Audio S2.1 Pro'},{id:'drama-3-preview',label:'Fish Audio Drama3 Preview'}];
const promptModels=[{id:'claude-opus-5',label:'Claude Opus 5',provider:'anthropic'}];
const voices=[{id:'fixture-voice',label:'Fixture Voice',previewUrl:'https://cdn.example.com/fictional-not-played.mp3'},{id:'george',label:'George',previewUrl:'https://cdn.example.com/fictional-not-played.mp3'}];
window.prism={services:{voiceFacets:async()=>({accents:[],collections:[]}),browseVoices:async()=>({voices,hasMore:false}),selectVoice:async()=>voices[0]}};
class Boundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(e){window.__footerFamilies.errors.push(this.props.id+': '+e.stack)}render(){return this.state.failed?<div data-render-error={this.props.id}>Actual component render failed</div>:this.props.children}}
function Mount({name,initial}){const [data,setData]=useState(initial),[width,setWidth]=useState(375),[zoom,setZoom]=useState(1),[long,setLong]=useState(false);window.__footerFamilies.authored[name]=data;window.__footerFamilies.controls[name]={patch:patch=>setData(d=>({...d,...patch})),width:setWidth,zoom:setZoom,long:setLong};
 const modelLabel=label=>long?label+' Extended Cinematic Layout Diagnostic Long Selected Name':label;
 const availability=provider=>({provider,verified:true,models:(provider==='elevenlabs'?elevenModels:provider==='fish'?fishModels:provider==='anthropic'||provider==='omniroute'?promptModels:provider==='higgsfield'?[{id:higgsEndpoint,label:'Seedance 2.5 · Text to Video',category:'text-to-video'},{id:'higgsfield/genjutsu/restyle/v1.0',label:'Genjutsu · Restyle'}]:provider==='fal'?[...nativeSchemas.map(s=>({id:s.endpointId,label:s.category.includes('video')?'Future Reference Video':s.category.includes('speech')?'ElevenLabs TTS Turbo v2.5':'Future Image',category:s.category,metadata:{}})),{id:'fal-ai/nano-banana-pro',label:'Nano Banana Pro',category:'text-to-image'},{id:'fal-ai/nano-banana-pro/edit',label:'Nano Banana Pro Edit',category:'image-to-image'}]:provider==='openai'?[{id:'gpt-image-2',label:'GPT Image 2'}]:provider==='google'?[{id:'gemini-3.1-flash-image',label:'Gemini Flash Image'}]:[]).map(m=>({...m,label:modelLabel(m.label)})),voices});
 const runtime=new Proxy({characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,connectedStoryboardVideo:()=>undefined,connectedStoryboardVideoFamily:()=>undefined,videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:true,tooltip:'Fictional geometry test; generation disabled'}),estimateNode:async()=>null,serviceAvailability:availability,availableModels:provider=>availability(provider).models,availablePromptModels:provider=>availability(provider).models,modelAvailabilityVerified:()=>true,higgsfieldSchema:endpointId=>({contract:endpointId===higgsEndpoint?higgsContract:undefined}),higgsfieldPresets:()=>({presets:[{id:'11111111-1111-1111-1111-111111111111',name:'QA Ink'},{id:'22222222-2222-2222-2222-222222222222',name:'QA Paper'}]}),falSchema:endpointId=>({contract:contracts[endpointId]||contracts[data.falNative?.endpointId]}),updateNode:(id,patch)=>{window.__footerFamilies.callbacks.push(['update',id,patch]);setData(d=>({...d,...patch}))},updatePrompt:(id,prompt)=>setData(d=>({...d,prompt})),openInspector:id=>window.__footerFamilies.callbacks.push(['settings',id]),saveStoryboard:id=>{window.__footerFamilies.callbacks.push(['save',id]);return true},rewriteStoryboardPanel:id=>window.__footerFamilies.callbacks.push(['revamp',id]),runNode:()=>{throw Error('Fixture must never generate')},runAssistantNode:()=>{throw Error('Fixture must never generate')}},{get:(target,key)=>key in target?target[key]:noop});
 return <section data-case={name} data-kind={data.kind} data-zoom={zoom} style={{width:width*zoom+2,height:800}}><p>{name}</p><Boundary id={name}><NodeRuntimeContext.Provider value={runtime}><ProviderAvailabilityContext.Provider value={connected}><ReactFlowProvider><ReactFlow nodes={[{id:name,type:data.kind==='storyboard'?'storyboard':'studio',position:{x:0,y:0},style:{width},data}]} nodeTypes={{studio:NodeCard,storyboard:StoryboardNode}} edges={[]} viewport={{x:0,y:0,zoom}} onViewportChange={noop} minZoom={.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} proOptions={{hideAttribution:true}}/></ReactFlowProvider></ProviderAvailabilityContext.Provider></NodeRuntimeContext.Provider></Boundary></section>}
const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2}};
const painted=w=>w.querySelector('[data-equalized-default],.quantity-stepper,.storyboard-budget,.compact-loop,.compact-toggle,.voice-primary-input,.play-tooltip-anchor > button,button')||w;
const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
window.__footerFamilies.snapshot=()=>[...document.querySelectorAll('section[data-case]')].map(section=>{const node=section.querySelector('.studio-node,.storyboard-node'),zoom=Number(section.dataset.zoom);if(!node)return{id:section.dataset.case,missingNode:true};const n=rect(node),groups=[...node.querySelectorAll('.generator-footer-control-group')];const footers=[...node.querySelectorAll('.compact-generator-footer,.storyboard-footer,.asset-prompt-revamp-footer')].filter(f=>visible(f)&&f.querySelector('button,input'));
 return{id:section.dataset.case,kind:section.dataset.kind,zoom,node:n,footers:footers.map(f=>{const box=rect(f),s=getComputedStyle(f),g=f.querySelector('.generator-footer-control-group');const rows=g?[...g.querySelectorAll(':scope > .fluid-control-group-row')].map(row=>({alignment:row.dataset.footerRowAlignment||row.dataset.footerAlignment||getComputedStyle(row).justifyContent,row:rect(row),controls:[...row.children].map(w=>{const e=painted(w),b=rect(e),css=getComputedStyle(e);return{id:w.dataset.fluidControlId,kind:w.dataset.fluidKind,label:e.getAttribute('aria-label'),text:e.querySelector('.selected-label-full')?.textContent||e.textContent,rect:b,frame:{radius:css.borderRadius,padding:css.padding},wrapper:rect(w)}})})):[];return{classes:f.className,label:g?.getAttribute('aria-label'),box,insets:['Top','Right','Bottom','Left'].map(side=>parseFloat(s['padding'+side])),borderTop:parseFloat(s.borderTopWidth)||0,borderBottom:parseFloat(s.borderBottomWidth)||0,headers:[...f.querySelectorAll('label > span')].filter(e=>visible(e)&&!e.closest('.compact-toggle,.compact-loop,.quantity-stepper')).map(e=>e.textContent),rows,unallocated:[...f.querySelectorAll('button,input')].filter(e=>visible(e)&&!e.closest('[data-fluid-control-id]')).map(e=>e.getAttribute('aria-label')||e.className)}}),sharedGroups:groups.map(g=>g.getAttribute('aria-label')),errors:window.__footerFamilies.errors.filter(e=>e.includes(section.dataset.case))};});
window.__footerFamilies.fit=()=>{for(const s of document.querySelectorAll('section[data-case]')){const n=s.querySelector('.studio-node,.storyboard-node');if(n)s.style.height=Math.ceil(n.getBoundingClientRect().height+46)+'px'}};
createRoot(document.getElementById('root')).render(<main>{cases.map(([name,initial])=><Mount key={name} name={name} initial={initial}/>)}</main>);
`)
      await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve('node_modules')], jsx: 'automatic', define: { 'import.meta.env.DEV': 'true' }, loader: { '.svg': 'dataurl', '.png': 'dataurl' }, logLevel: 'silent', plugins: [{ name: 'explicit-read-only-baseline', setup(build) { for (const [owner, source] of Object.entries(sourceOverrides)) if (owner.endsWith('.tsx')) build.onLoad({ filter: /\.tsx$/ }, args => args.path === resolve(owner) ? { contents: readFileSync(source,'utf8'), loader: 'tsx', resolveDir: resolve(owner,'..') } : null) } }] })
      writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve('node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${sourceOverrides['src/renderer/src/styles-next.css'] || resolve('src/renderer/src/styles-next.css')}"><style>body{padding:24px;overflow:auto}main{display:grid;grid-template-columns:repeat(3,max-content);align-items:start;gap:24px}section[data-case]{position:relative;overflow:visible}section[data-case]>.react-flow{height:100%}section[data-case] .studio-node,section[data-case] .storyboard-node{width:100%}section[data-case]>p{font:12px system-ui;color:var(--muted);margin:0 0 12px}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
      writeFileSync(main, String.raw`
const{app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');app.setPath('userData',${JSON.stringify(join(directory, 'user-data'))});
const finish=(r,c=0)=>{fs.writeFileSync(${JSON.stringify(join(directory,'result.json'))},JSON.stringify(r));process.stdout.write('SHARED_FOOTER_FAMILIES:'+JSON.stringify({written:true})+'\n',()=>app.exit(c))};
app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1280,height:1500,webPreferences:{contextIsolation:false,sandbox:false}});let remoteRequests=0;const consoleErrors=[],layoutNotices=[];win.webContents.on('console-message',(...args)=>{const message=args[0]?.message||args[2]||'';if(message.includes('Uncaught'))consoleErrors.push(message);if(message.includes('[FluidControlGroup]'))layoutNotices.push(message)});win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_d,cb)=>{remoteRequests++;cb({cancel:true})});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');const pause=()=>new Promise(r=>setTimeout(r,180));await pause();const states=[];const take=async name=>{await win.webContents.executeJavaScript('window.__footerFamilies.fit()');await pause();states.push({name,geometry:await win.webContents.executeJavaScript('window.__footerFamilies.snapshot()'),layoutNoticeCount:layoutNotices.length})};await take('initial375');
for(const width of[250,315]){await win.webContents.executeJavaScript('Object.values(window.__footerFamilies.controls).forEach(c=>c.width('+width+'))');await pause();await take('mountedWidth'+width)}
await win.webContents.executeJavaScript('Object.values(window.__footerFamilies.controls).forEach(c=>c.long(true))');await pause();await take('longSelectedCatalogLabels');await win.webContents.executeJavaScript('Object.values(window.__footerFamilies.controls).forEach(c=>c.long(false))');await pause();
await win.webContents.executeJavaScript('Object.values(window.__footerFamilies.controls).forEach(c=>c.zoom(.8))');await pause();await take('canvasZoom08');await win.webContents.executeJavaScript('Object.values(window.__footerFamilies.controls).forEach(c=>c.zoom(1))');await pause();
const choose=async(id,label,value)=>{const selector='[data-case="'+id+'"] [aria-label="'+label+'"]';await win.webContents.executeJavaScript('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",behavior:"instant"})');await pause();await win.webContents.executeJavaScript('document.querySelector('+JSON.stringify(selector)+').click()');await pause();await win.webContents.executeJavaScript('(()=>{const option=[...document.querySelectorAll("[role=option]")].find(e=>e.id.endsWith("-'+value+'"));if(!option)throw Error("Missing actual selector option '+value+'");option.click()})()');await pause()};
let selectionError;try{await choose('sfx-elevenlabs','Sound Effect Duration','3');await choose('sfx-elevenlabs','Sound Effect Output Format','pcm_48000');await choose('fish-mp3','Fish Audio Format','opus')}catch(e){selectionError=e.stack||String(e)}await take('actualSelectorChanges');
const values=await win.webContents.executeJavaScript('({sfx:window.__footerFamilies.authored["sfx-elevenlabs"],fish:window.__footerFamilies.authored["fish-mp3"]})');const errors=await win.webContents.executeJavaScript('window.__footerFamilies.errors');const warnings=await win.webContents.executeJavaScript('window.__footerFamilies.warnings');const callbacks=await win.webContents.executeJavaScript('window.__footerFamilies.callbacks');
if(process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR){fs.mkdirSync(process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR,{recursive:true});await win.webContents.executeJavaScript('document.body.scrollTop=0;document.documentElement.scrollTop=0;window.scrollTo(0,0)');const fullHeight=await win.webContents.executeJavaScript('Math.ceil(document.querySelector("main").getBoundingClientRect().height+48)');win.setContentSize(1280,fullHeight);await pause();fs.writeFileSync(path.join(process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR,'Shared Footer Families.png'),(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript("document.querySelectorAll('[data-case]').forEach(e=>{if(!['image-fal','native-video','higgs-seedance','sfx-elevenlabs','voice-speech','voice-voice-change'].includes(e.dataset.case))e.style.display='none'});document.body.scrollTop=0;document.documentElement.scrollTop=0;window.scrollTo(0,0)");const samplesHeight=await win.webContents.executeJavaScript('Math.ceil(document.querySelector("main").getBoundingClientRect().height+48)');win.setContentSize(1280,samplesHeight);await pause();fs.writeFileSync(path.join(process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR,'Shared Footer Family Samples.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR,'Shared Footer Families Raw.json'),JSON.stringify({states,remoteRequests,consoleErrors,layoutNotices,errors,warnings,values,callbacks,selectionError},null,2))}finish({states,remoteRequests,consoleErrors,layoutNotices,errors,warnings,values,callbacks,selectionError})}).catch(e=>finish({error:e.stack||String(e)},1));
`)
      const syntax = spawnSync(process.execPath, ['--check', main], { encoding: 'utf8', timeout: 5000 })
      expect(syntax.status, syntax.stderr).toBe(0)
      const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 45_000, maxBuffer: 16 * 1024 * 1024 })
      const marker = run.stdout.split('\n').find(line => line.startsWith('SHARED_FOOTER_FAMILIES:'))
      expect(run.status, run.stdout.slice(-3000) + run.stderr).toBe(0)
      expect(marker, run.stdout.slice(-3000) + run.stderr).toBeDefined()
      const result = JSON.parse(readFileSync(join(directory,'result.json'),'utf8'))
      const failures: string[] = []
      const fail = (context: string, reason: string) => failures.push(context + ': ' + reason)
      for (const state of result.states || []) for (const node of state.geometry) {
        const context = `${state.name}/${node.id}`, zoom = node.zoom, tolerance = 1.25 * zoom
        if (node.missingNode) { fail(context, 'missing actual node'); continue }
        if (!node.footers.length) fail(context, 'missing footer')
        for (const footer of node.footers) {
          const f = `${context}/${footer.label || footer.classes}`
          if (footer.insets.some((value: number) => value !== 12)) fail(f, 'outer insets are ' + footer.insets.join(','))
          if (footer.headers.length) fail(f, 'visible footer headers ' + footer.headers.join(','))
          if (footer.unallocated.length) fail(f, 'unallocated controls ' + footer.unallocated.join(','))
          if (!footer.rows.length) { fail(f, 'missing actual shared rows'); continue }
          const left = footer.box.left + 12 * zoom, right = footer.box.right - 12 * zoom
          const flattened = footer.rows.flatMap((row: any) => row.controls)
          const unique = new Set(flattened.map((control: any) => control.id))
          if (unique.size !== flattened.length) fail(f, 'duplicate row control IDs')
          const model = flattened.find((control: any) => control.id === 'model' || control.id === 'assistant-model')
          if (model && flattened[0] !== model) fail(f, 'Model not first')
          if (model && Math.abs(model.rect.left - left) > tolerance) fail(f, 'Model not painted at left inset')
          const circles = flattened.filter((control: any) => control.kind === 'fixed-action')
          const last = footer.rows.at(-1).controls
          const settings = flattened.find((control: any) => control.id === 'settings')
          const runControl = flattened.find((control: any) => control.id === 'run' || control.id === 'revamp')
          if (settings && runControl && last.slice(-2).map((control: any) => control.id).join(',') !== `${settings.id},${runControl.id}`) fail(f, 'Settings/Run terminal order')
          if (runControl && Math.abs(runControl.rect.right - right) > tolerance) fail(f, 'Run not painted at right inset')
          if (circles.length && flattened.slice(-circles.length).some((control: any) => !circles.includes(control))) fail(f, 'circular action cluster interspersed with fields')
          for (let index = 0; index < footer.rows.length; index++) {
            const row = footer.rows[index]
            if (!row.controls.length) { fail(f, 'empty row'); continue }
            const actionOnly = row.controls.every((control: any) => control.kind === 'fixed-action')
            if (Math.abs(row.controls.at(-1).rect.right - right) > tolerance) fail(f, 'row not painted to right edge')
            if (!actionOnly && Math.abs(row.controls[0].rect.left - left) > tolerance) fail(f, 'field row not filled from left edge')
            for (let i = 0; i < row.controls.length; i++) {
              const control = row.controls[i], box = control.rect
              if (box.width <= 0 || box.left < left - tolerance || box.right > right + tolerance) fail(f, 'bounds ' + control.id)
              if (Math.abs(box.cy - row.controls[0].rect.cy) > tolerance) fail(f, 'painted center mismatch ' + control.id)
              if (i && Math.abs(box.left - row.controls[i - 1].rect.right - 7 * zoom) > tolerance) fail(f, 'horizontal gap ' + control.id)
              const preservedAllPill = node.id === 'storyboard' && control.id === 'revamp' && control.label === 'Revamp All' && control.text.trim() === 'All'
              if (control.kind === 'fixed-action' && (Math.abs(box.width - (preservedAllPill ? 62 : 28) * zoom) > tolerance || Math.abs(box.height - 28 * zoom) > tolerance)) fail(f, (preservedAllPill ? 'preserved All pill frame ' : 'circle frame ') + control.id)
            }
            if (index && Math.abs(row.row.top - footer.rows[index - 1].row.bottom - 7 * zoom) > tolerance) fail(f, 'vertical shared gap')
          }
          const minTop = Math.min(...flattened.map((control: any) => control.rect.top))
          const maxBottom = Math.max(...flattened.map((control: any) => control.rect.bottom))
          if (Math.abs(minTop - footer.box.top - (12 + footer.borderTop) * zoom) > tolerance) fail(f, 'painted top clearance')
          if (Math.abs(footer.box.bottom - maxBottom - (12 + footer.borderBottom) * zoom) > tolerance) fail(f, 'painted bottom clearance')
        }
      }
      const after = sourceHashes()
      const changedDuringRun = owners.filter(owner => before[owner] !== after[owner])
      const nodeKindSource = readFileSync(resolve('src/shared/types.ts'), 'utf8').split('export type NodeKind =')[1].split('export type RunState')[0]
      const kinds = [...nodeKindSource.matchAll(/'([^']+)'/g)].map(match => match[1])
      const renderedKinds = new Set(result.states?.[0]?.geometry.map((node: any) => node.kind) || [])
      const inventory = kinds.map(kind => ({ kind, status: renderedKinds.has(kind) ? 'actual canonical footer owner rendered' : ['music-generator', 'assistant'].includes(kind) ? 'legacy AppNext-migrated kind; no activation' : 'non-generation node; no generator footer contract' }))
      const footerLabels = new Set<string>((result.states || []).flatMap((state: any) => state.geometry.flatMap((node: any) => node.sharedGroups || [])))
      const footerLayoutNotices = result.layoutNotices.filter((notice: string) => [...footerLabels].some(label => notice.startsWith('[FluidControlGroup] ' + label + '/')))
      const bodyLayoutNotices = result.layoutNotices.filter((notice: string) => !footerLayoutNotices.includes(notice))
      const evidence = { ...result, footerLayoutNotices, bodyLayoutNotices, sourceOverrides, failures, sourceHashes: { before, after }, changedDuringRun, inventory, familyCases: result.states?.[0]?.geometry.length || 0, geometryStates: (result.states || []).reduce((sum: number, state: any) => sum + state.geometry.length, 0), productionInstalled: false, providerGenerationDisabled: true }
      if (process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR) writeFileSync(join(process.env.PRISM_SHARED_FOOTER_ARTIFACT_DIR, 'Shared Footer Families Evidence.json'), JSON.stringify(evidence, null, 2) + '\n')
      expect(result.error).toBeUndefined()
      expect(result.remoteRequests).toBe(0)
      expect(result.errors, JSON.stringify(result.errors)).toEqual([])
      expect(result.consoleErrors, JSON.stringify(result.consoleErrors)).toEqual([])
      expect(footerLayoutNotices, JSON.stringify(footerLayoutNotices)).toEqual([])
      expect(bodyLayoutNotices.every((notice: string) => notice.startsWith('[FluidControlGroup] Dialogue Turn Actions/') || notice.startsWith('[FluidControlGroup] Panel 1 controls/')), JSON.stringify(bodyLayoutNotices)).toBe(true)
      expect(result.selectionError).toBeUndefined()
      expect(result.values.sfx).toMatchObject({ duration: 3, audioOutputFormat: 'pcm_48000', prompt: '  Authored fixture prompt.  ' })
      expect(result.values.fish.fishFormat).toBe('opus')
      expect(inventory).toHaveLength(26)
      expect(result.states[0].geometry).toHaveLength(28)
      expect(failures, JSON.stringify(failures.slice(0, 80), null, 2)).toEqual([])
      expect(changedDuringRun, 'Sources changed during native fixture; rerun coherent final source').toEqual([])
    } finally { rmSync(directory, { recursive: true, force: true }) }
  }, 60_000)
})
