import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { buildSync } = require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string

const KLING_TEXT = 'kling-video/v3.0/std/text-to-video'
const KLING_REFERENCE = 'kling-video/v3.0/std/image-to-video'
const PROMPT = '  A hand-built paper lantern drifts over the dark river.\r\nKeep the existing cut and camera.  '
const FAL_KLING_FIXTURE = 'fixture/kling-v3-standard/text-to-video'
const WAN_DURATION_FIXTURE = 'alibaba/wan-3.0/reference-to-video'

describe('flat model choices in the production NodeCard', () => {
  it('renders direct host/model routes in helper order and preserves native selection, prompt, ports, timing, and chrome', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-flat-model-choices-'))
    try {
      const entry = join(directory, 'renderer.tsx')
      const html = join(directory, 'index.html')
      const main = join(directory, 'main.cjs')
      writeFileSync(entry, `
import React,{useMemo,useState} from 'react';import {createRoot} from 'react-dom/client';import {ReactFlow,ReactFlowProvider} from '@xyflow/react';
import {NodeCard,NodeRuntimeContext,modelCompanyFor,videoModelGroups} from ${JSON.stringify(resolve('src/renderer/src/NodeCardNext.tsx'))};
import {ProviderAvailabilityContext} from ${JSON.stringify(resolve('src/renderer/src/ProviderAvailabilityContext.tsx'))};
import {higgsfieldBundledCatalogModels,higgsfieldInputSchema} from ${JSON.stringify(resolve('src/shared/higgsfieldNative.ts'))};
import {HIGGSFIELD_TEXT_VIDEO_MODELS} from ${JSON.stringify(resolve('src/shared/higgsfieldTextVideo.ts'))};
import {HIGGSFIELD_REFERENCE_VIDEO_MODELS} from ${JSON.stringify(resolve('src/shared/higgsfieldReferenceVideo.ts'))};
import {describeHiggsfieldInputContract} from ${JSON.stringify(resolve('src/shared/higgsfieldInputContract.ts'))};
import {reconcileHiggsfieldNodeBinding,selectHiggsfieldBinding} from ${JSON.stringify(resolve('src/shared/higgsfieldNodeBinding.ts'))};
import {higgsfieldVideoDurationLimits} from ${JSON.stringify(resolve('src/shared/videoDurationLimits.ts'))};
import {nodeInputPorts} from ${JSON.stringify(resolve('src/shared/nodePorts.ts'))};
import {admittedModelCatalogMenu,flatModelCatalogMenu,POPULAR_VIDEO_FEATURED_POLICY} from ${JSON.stringify(resolve('src/shared/flatModelCatalogMenu.ts'))};
import {filterProviderModelGroups} from ${JSON.stringify(resolve('src/shared/providerAvailability.ts'))};
import {describeFalRuntimeInputs} from ${JSON.stringify(resolve('src/shared/falRuntimeInputs.ts'))};

const TEXT_ENDPOINT=${JSON.stringify(KLING_TEXT)},REFERENCE_ENDPOINT=${JSON.stringify(KLING_REFERENCE)},WAN_ENDPOINT=${JSON.stringify(WAN_DURATION_FIXTURE)},AUTHORED_PROMPT=${JSON.stringify(PROMPT)},FINGERPRINT='a'.repeat(64);
const bundled=higgsfieldBundledCatalogModels();
const higgsfield={provider:'higgsfield',verified:true,models:bundled};
// These synthetic fal entries exercise two connected host rows and named tiers only. They are fixture IDs, never provider requests.
const fal={provider:'fal',verified:true,models:[
 {id:'fixture/omni-1.1/reference',label:'Gemini Omni Flash 1.1 · Reference to Video',category:'image-to-video',catalog:{service:'fal.ai',company:'Google',release:'Gemini Omni Flash 1.1',mode:'Reference to Video'}},
 {id:'fixture/vidu-q4',label:'Vidu Q4',category:'image-to-video',catalog:{service:'fal.ai',company:'Vidu',release:'Vidu Q4',mode:'Image to Video',releasedAt:new Date().toISOString().slice(0,10)}},
 {id:${JSON.stringify(FAL_KLING_FIXTURE)},label:'Kling 3.0 Standard · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Kling',release:'Kling 3.0',mode:'Text to Video'}},
 {id:'fixture/northstar-3/text',label:'Veo 3 · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 3',mode:'Text to Video'}},
 {id:'fixture/northstar-2/text',label:'Veo 2 · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 2',mode:'Text to Video'}},
 {id:'fixture/northstar-1/text',label:'Veo 1 · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 1',mode:'Text to Video'}},
 {id:'fixture/northstar-0.5/text',label:'Veo 0.5 · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 0.5',mode:'Text to Video'}},
 {id:'fixture/northstar-3-fast/text',label:'Veo 3 Fast · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 3 Fast',mode:'Text to Video'}},
 {id:'fixture/northstar-3-mini/text',label:'Veo 3 Mini · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 3 Mini',mode:'Text to Video'}},
 {id:'fixture/northstar-3-turbo/text',label:'Veo 3 Turbo · Text to Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 3 Turbo',mode:'Text to Video'}},
 {id:'fixture/northstar-3-edit/text',label:'Veo 3 Edit · Video Edit',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 3 Edit',mode:'Video Edit'}},
 {id:'fixture/northstar-3-extend/text',label:'Veo 3 Extend · Extend Video',category:'text-to-video',catalog:{service:'fal.ai',company:'Google',release:'Veo 3 Extend',mode:'Extend Video'}},
 ...[4,3,2,1].map(version=>({id:'fixture/northstar-image-'+version,label:'FLUX.'+version,category:'text-to-image',catalog:{service:'fal.ai',company:'Black Forest Labs',release:'FLUX.'+version,mode:'Text to Image'}})),
 {id:'fixture/openai-image-qa',label:'FLUX Kontext QA',category:'text-to-image',catalog:{service:'fal.ai',company:'Black Forest Labs',release:'FLUX Kontext QA',mode:'Text to Image'}}
]};
const wanContract={endpointId:WAN_ENDPOINT,schemaPath:'/alibaba/wan-3.0/reference-to-video',category:'image-to-video',input:{type:'object',properties:{prompt:{type:'string'},duration:{default:5,anyOf:[{type:'integer',minimum:2,maximum:30},{type:'null'}]}}},output:{type:'object'}};
wanContract.runtime={...describeFalRuntimeInputs(wanContract),fingerprint:'wan-duration-fixture'};
const wanFal={provider:'fal',verified:true,models:[{id:WAN_ENDPOINT,label:'Wan 3.0 · Reference to Video',category:'image-to-video',catalog:{service:'fal.ai',company:'Alibaba',release:'Wan 3.0',mode:'Reference to Video'}}]};
const inputContract=(endpointId)=>describeHiggsfieldInputContract(endpointId,structuredClone(higgsfieldInputSchema(endpointId)),FINGERPRINT);
const boundState=(endpointId,state)=>{const contract=inputContract(endpointId);return {...reconcileHiggsfieldNodeBinding(state,contract),reviewedFingerprint:contract.fingerprint};};
function initialNative(){const selected=selectHiggsfieldBinding({},TEXT_ENDPOINT,[]);const base={...selected.higgsfieldNative,values:{...selected.higgsfieldNative.values,prompt:AUTHORED_PROMPT}};return boundState(TEXT_ENDPOINT,base)}
const portSummary=(state)=>nodeInputPorts({kind:'video-generator',higgsfieldNative:state}).map(port=>({id:port.id,signal:port.signal,label:port.label,maxConnections:port.maxConnections,icon:port.icon}));
const routeSummary=(state)=>{const contract=inputContract(state.endpointId);return {endpointId:state.endpointId,values:structuredClone(state.values),contract:{fingerprint:contract.fingerprint,unsupportedInputs:contract.unsupportedInputs,required:contract.input.required||[],fields:contract.fields.map(field=>({key:field.key,control:field.control,required:field.required,media:field.media||null})),media:contract.media,timingScope:contract.timingScope},ports:portSummary(state),duration:higgsfieldVideoDurationLimits(state,contract)}};
const groupForProjection=(groups,connected)=>admittedModelCatalogMenu(filterProviderModelGroups(groups,connected));
window.__commands=[];window.__routeAudit=[];window.__snapshots={};
window.__registry={textRoutes:HIGGSFIELD_TEXT_VIDEO_MODELS.map(model=>model.id),referenceRoutes:HIGGSFIELD_REFERENCE_VIDEO_MODELS.map(model=>model.id),textContract:routeSummary(initialNative())};
const noop=()=>undefined;
function Case({width,durationOnly=false,actionState,coldCatalog=false,coldSchema=false}){
 const [schemaReady,setSchemaReady]=useState(!coldSchema);
 window.__publishSchema=()=>setSchemaReady(true);
 const [catalogReady,setCatalogReady]=useState(!coldCatalog);
 window.__publishCatalog=()=>setCatalogReady(true);
 const [connected,setConnected]=useState({fal:true,higgsfield:true,byteplus:true,openai:true,google:false});
 const videoId=durationOnly?'wan-duration-'+width:'video-'+width;
 const [nodes,setNodes]=useState(()=>durationOnly?[
  {id:videoId,type:'studio',position:{x:0,y:0},selected:true,style:{width},data:{kind:'video-generator',title:'Wan Duration Fixture',videoEngine:'wan-controlled',promptMode:'manual',manualPromptDraft:'Exact authored prompt',runState:'idle',duration:5,quantity:1,falNative:{endpointId:WAN_ENDPOINT,label:'Wan 3.0 · Reference to Video',flow:'video',fingerprint:'wan-duration-fixture',values:{},media:[],promptField:null}}}
 ]:[
  {id:'video-'+width,type:'studio',position:{x:0,y:0},style:{width},data:{kind:'video-generator',title:'Video Generator',videoEngine:'seedance25-text',promptMode:'manual',manualPromptDraft:AUTHORED_PROMPT,manualPromptSeeded:true,runState:actionState==='stop'?'running':'idle',...(actionState==='rerun'?{outputPath:'/fixture/generated.mp4'}:{}),duration:5,quantity:1,higgsfieldNative:initialNative(),higgsfieldNativePresets:{}}},
  {id:'image-'+width,type:'studio',position:{x:width+35,y:0},style:{width},data:{kind:'image-generator',title:'Image Generator',imageProvider:'openai',imageModelId:'gpt-image-2',prompt:'Exact image prompt',runState:'idle',quantity:1}}
 ]);
 const videoNode=nodes.find(node=>node.id===videoId);
 window.__snapshots[width]=()=>JSON.parse(JSON.stringify(nodes));
 window.__disconnectHiggsfield=()=>setConnected(current=>({...current,higgsfield:false}));
 window.__reconnectHiggsfield=()=>setConnected(current=>({...current,higgsfield:true}));
 window.__disconnectFal=()=>setConnected(current=>({...current,fal:false}));
 window.__reconnectFal=()=>setConnected(current=>({...current,fal:true}));
 const runtime=useMemo(()=>new Proxy({
  updateNode:(id,patch)=>{window.__commands.push({id,owner:'node',patch});setNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node));},
  selectFalModel:(id,endpoint)=>window.__commands.push({id,owner:'fal',endpoint}),
  selectHiggsfieldModel:(id,endpointId)=>{
   window.__commands.push({id,owner:'higgsfield',endpointId});
   setNodes(current=>current.map(node=>{
    if(node.id!==id)return node;
    const selection=selectHiggsfieldBinding(node.data,endpointId,[]);
    const nextNative=boundState(endpointId,selection.higgsfieldNative);
    window.__routeAudit.push(routeSummary(nextNative));
    return {...node,data:{...node.data,...selection,higgsfieldNative:nextNative,error:undefined}};
   }));
  },
  updatePrompt:noop,
  videoPromptState:()=>({mode:'manual',connected:false,manualPrompt:AUTHORED_PROMPT,activePrompt:AUTHORED_PROMPT,autoPrompt:'',resetDisabled:true}),
  openInspector:noop,
  higgsfieldSchema:endpointId=>schemaReady?({contract:inputContract(endpointId),loading:false}):({loading:true}),higgsfieldPresets:()=>({presets:[],loading:false}),
  serviceAvailability:provider=>!catalogReady?undefined:provider==='fal'?(connected.fal?(durationOnly?wanFal:fal):undefined):provider==='higgsfield'?(connected.higgsfield?higgsfield:undefined):undefined,
  availableModels:provider=>provider==='openai'?[{id:'gpt-image-2',label:'GPT Image 2'},{id:'gpt-image-2.5-sunburst',label:'GPT Image 2.5 Sunburst'}]:[],
  modelAvailabilityVerified:()=>true,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,
  falSchema:endpoint=>endpoint===WAN_ENDPOINT?{contract:wanContract,loading:false}:{contract:undefined,loading:true},
  runReadiness:()=>({disabled:!actionState,tooltip:'Fixture only; generation is disabled'}),estimateNode:async()=>null,characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]}
 },{get(target,key){return key in target?target[key]:noop}}),[connected,actionState,catalogReady,schemaReady]);
 return <ProviderAvailabilityContext.Provider value={{mediaConnected:connected,promptConnected:{}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><div style={{width:950,height:1000,position:'relative'}}><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} proOptions={{hideAttribution:true}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false}/></div></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider>
}

const root=createRoot(document.getElementById('root'));
const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
window.__showWanDuration=async width=>{root.render(<Case key={'wan-duration-capture-'+width} width={width} durationOnly/>);await wait();await wait();};
window.__showVideoActionState=async(width,actionState)=>{root.render(<Case key={'video-action-'+width+'-'+actionState} width={width} actionState={actionState}/>);await wait();await wait();};
window.__measureVideoAction=()=>{const card=document.querySelector('#root .react-flow__node[data-id="video-315"]');if(!card)throw Error('Missing action parity card');const read=element=>{if(!element)throw Error('Missing footer parity button');const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return {label:element.getAttribute('aria-label'),disabled:element.disabled,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},radius:style.borderRadius,borderWidth:style.borderWidth,transform:style.transform,background:style.backgroundColor}};return {action:read(card.querySelector('.footer-run')),settings:read(card.querySelector('button[aria-label="Node Settings"]')),sound:read(card.querySelector('button[aria-label="Generate Native Sound"]'))};};
const menu=()=>document.querySelector('.grouped-menu-select-menu');
const routeOf=row=>row.title.split(' · ').at(-1);
const optionRows=()=>[...menu().querySelectorAll('[role="option"]')];
const open=async selector=>{const button=document.querySelector(selector);if(!button)throw Error('Missing selector '+selector);button.click();await wait();if(!menu())throw Error('Selector did not open '+selector);return menu()};
const close=async()=>{menu()?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait();};
const chooseRoute=async(selector,route)=>{await open(selector);const row=optionRows().find(option=>routeOf(option)===route);if(!row)throw Error('Missing exact route '+route+'; saw '+optionRows().map(routeOf).join(','));row.click();await wait();if(menu())throw Error('Choice did not close '+route)};
const videoSelector=width=>'#root .react-flow__node[data-id="video-'+width+'"] button[aria-label="Video Model"]';
const imageSelector=width=>'#root .react-flow__node[data-id="image-'+width+'"] button[aria-label="Image engine"]';
const videoFieldSelector=(width,label)=>'#root .react-flow__node[data-id="video-'+width+'"] button[aria-label="'+label+'"]';
const chooseFieldOption=async(width,label,match)=>{await open(videoFieldSelector(width,label));const row=optionRows().find(option=>match(option.textContent.trim()));if(!row)throw Error('Missing '+label+' option; saw '+optionRows().map(option=>option.textContent.trim()).join('|'));row.click();await wait();if(menu())throw Error(label+' choice did not close')};
window.__exercise=async()=>{
 const out=[];
 root.render(<Case key="cold-schema" width={315} coldSchema/>);await wait();await wait();
 await open(videoSelector(315));const schemaMenu=menu(),schemaListboxId=schemaMenu.querySelector('[role="listbox"]').id;
 schemaMenu.dispatchEvent(new KeyboardEvent('keydown',{key:'k',bubbles:true}));await wait();
 if(menu().querySelector('input').value!=='k')throw Error('Cold schema fixture did not enter model search');
 window.__publishSchema();await wait();await wait();
 if(!menu())throw Error('Schema hydration closed the first-open model selector');
 if(menu().querySelector('input').value!=='k'||menu().querySelector('[role="listbox"]').id!==schemaListboxId||document.activeElement!==menu().querySelector('input'))throw Error('Schema hydration lost search, stable option identity, or focus');
 menu().querySelector('button[aria-label="Clear selector search"]').click();await wait();
 const coldSchemaEvidence={openAfterHydration:true,searchPreserved:true,focusPreserved:true,stableIds:true,rows:optionRows().length};await close();
 root.render(<Case key="cold-catalog" width={315} coldCatalog/>);await wait();await wait();
 await open(videoSelector(315));
 const firstMenu=menu(),coldBefore=optionRows().map(routeOf);
 window.__publishCatalog();await wait();await wait();
 if(menu()!==firstMenu)throw Error('Catalog arrival closed or replaced the first-open selector');
 const coldAfter=optionRows().map(routeOf);
 if(!coldAfter.includes(${JSON.stringify('fal-native::fixture/omni-1.1/reference')}))throw Error('Late catalog did not appear in the still-open selector');
 await close();await open(videoSelector(315));
 if(JSON.stringify(optionRows().map(routeOf))!==JSON.stringify(coldAfter))throw Error('Second opening contains routes absent from the first hydrated opening');
 const coldCatalogEvidence={coldBefore,coldAfter,firstMenuPreserved:true};await close();
 for(const width of [250,315,375]){
  root.render(<Case key={'wan-duration-'+width} width={width} durationOnly/>);await wait();await wait();
  const durationId='wan-duration-'+width,durationCard=document.querySelector('#root .react-flow__node[data-id="'+durationId+'"]');
  const durationFooter=durationCard?.querySelector('.compact-video-footer-group[aria-label="Video Footer Controls"]');
  const durationModel=durationFooter?.querySelector('button[aria-label="Video Model"]');
  const durationButton=durationFooter?.querySelector('button[aria-label="Video Duration"]');
  const currentDurationButton=()=>document.querySelector('#root .react-flow__node[data-id="'+durationId+'"] button[aria-label="Video Duration"]');
  const paintedDurationLabel=()=>currentDurationButton()?.querySelector('.selected-label-full')?.textContent.trim()||'';
  if(!durationCard||!durationFooter||!durationModel||!durationButton)throw Error('Wan nullable duration fixture is missing its selected model or footer control');
  const durationGeometry=[durationModel,durationButton].map(button=>{const style=getComputedStyle(button);return {label:button.getAttribute('aria-label'),height:button.getBoundingClientRect().height,radius:style.borderRadius,align:style.justifyContent,textAlign:getComputedStyle(button.querySelector('.selected-label')).textAlign,chevron:button.querySelector(':scope > svg')?.getBoundingClientRect().width}});
  const selectedOutline=getComputedStyle(durationCard.querySelector('.studio-node'));
  const wanInitial=window.__snapshots[width]().find(node=>node.id===durationId).data;
  if(Object.prototype.hasOwnProperty.call(wanInitial.falNative.values,'duration'))throw Error('Rendering the default must not insert it into saved values');
  const initialDurationLabel=paintedDurationLabel();
  if(!initialDurationLabel.includes('5.0s'))throw Error('Nullable Wan duration default must display 5.0s: '+initialDurationLabel);
  if(durationCard.querySelector('.primary-node-controls button[aria-label="Video Duration"]'))throw Error('Wan duration is duplicated in full-width primary fields');
  if(durationCard.querySelector('[aria-label="Maximum video duration"]'))throw Error('Wan native route retained the obsolete maximum-duration strip');
  if(!durationCard.querySelector('.studio-node.is-selected')||selectedOutline.outlineOffset!=='0px'||selectedOutline.outlineWidth!=='1px')throw Error('Selected Wan node outline must retain the one-pixel zero-offset token');
  const chooseWanDuration=async(match)=>{const button=currentDurationButton();if(!button)throw Error('Wan duration trigger disappeared after a saved-value update');button.click();await wait();const rows=optionRows(),row=rows.find(option=>match(option.textContent.trim(),option));if(!row)throw Error('Missing Wan duration choice; saw '+rows.map(option=>option.textContent.trim()).join('|'));row.click();await wait();};
  await chooseWanDuration(label=>label==='12.0s');
  const wanNumber=window.__snapshots[width]().find(node=>node.id===durationId).data;
  if(wanNumber.falNative.values.duration!==12||typeof wanNumber.falNative.values.duration!=='number'||wanNumber.duration!==5)throw Error('Wan numeric duration must remain an exact number in Fal values');
  await chooseWanDuration(label=>label==='Auto');
  const wanAuto=window.__snapshots[width]().find(node=>node.id===durationId).data;
  const wanAutoLabel=paintedDurationLabel();
  if(!Object.prototype.hasOwnProperty.call(wanAuto.falNative.values,'duration')||wanAuto.falNative.values.duration!==null)throw Error('Wan nullable Auto choice did not save explicit JSON null: '+JSON.stringify({values:wanAuto.falNative.values,label:wanAutoLabel}));
  if(wanAutoLabel!=='Auto')throw Error('Wan nullable Auto choice has the wrong closed label: '+JSON.stringify({values:wanAuto.falNative.values,label:wanAutoLabel}));
  await chooseWanDuration((_label,row)=>row.title.endsWith(' · @default'));
  const wanDefault=window.__snapshots[width]().find(node=>node.id===durationId).data;
  const wanDefaultLabel=paintedDurationLabel();
  if(Object.prototype.hasOwnProperty.call(wanDefault.falNative.values,'duration')||wanDefaultLabel!=='5.0s')throw Error('Selecting the Wan default must remove its authored override and show 5.0s only');
  const wanDurationAudit={initialValues:wanInitial.falNative.values,numberValues:wanNumber.falNative.values,autoValues:wanAuto.falNative.values,defaultValues:wanDefault.falNative.values,initialLabel:initialDurationLabel,autoLabel:wanAutoLabel,defaultLabel:wanDefaultLabel,durationGeometry,selectedOutline:{outline:selectedOutline.outline,outlineOffset:selectedOutline.outlineOffset,outlineWidth:selectedOutline.outlineWidth},footerRows:durationFooter.querySelectorAll('.fluid-control-group-row').length};
  root.render(<Case key={width} width={width}/>);await wait();await wait();
  const commandStart=window.__commands.length,routeStart=window.__routeAudit.length;
  root.render(<Case key={width} width={width}/>);await wait();await wait();
  const videoButton=()=>document.querySelector(videoSelector(width)),imageButton=()=>document.querySelector(imageSelector(width));
  const geometry=['video','image'].map(kind=>{const button=kind==='video'?videoButton():imageButton();if(!button)throw Error('Missing '+kind+' model trigger; '+document.body.innerText);const style=getComputedStyle(button);return {kind,height:button.getBoundingClientRect().height,radius:style.borderRadius,align:style.justifyContent,textAlign:getComputedStyle(button.querySelector('.selected-label')).textAlign,chevron:button.querySelector(':scope > svg')?.getBoundingClientRect().width};});
  const closedIdentity=videoButton().querySelector('.selected-label-full').textContent.trim();
  if(!closedIdentity.endsWith('…')||/Text to Video|Reference to Video/.test(closedIdentity)||!videoButton().title.includes('Text to Video'))throw Error('Closed native identity must retain base name plus one ellipsis, with the full selected mode in its tooltip');
  if(!document.querySelector('#root .react-flow__node[data-id="video-'+width+'"] button[aria-label="Run"]')?.disabled)throw Error('Generation must remain disabled in the fixture');
  const initialNative=window.__snapshots[width]().find(node=>node.id==='video-'+width).data.higgsfieldNative;
  const currentGroups=videoModelGroups(fal,higgsfield,window.__snapshots[width]().find(node=>node.id==='video-'+width).data);
  const connected={fal:true,higgsfield:true,byteplus:true,openai:true};
  const expected=flatModelCatalogMenu(groupForProjection(currentGroups,connected),'higgsfield-native::'+initialNative.endpointId,5,POPULAR_VIDEO_FEATURED_POLICY);
  const modelMenu=await open(videoSelector(width));
  if(!modelMenu.classList.contains('is-flat-catalog'))throw Error('Video model menu is not the production flat catalog');
  const options=optionRows(),featuredRows=[...modelMenu.querySelectorAll('.model-catalog-featured [role="option"]')];
  const renderedGroups=[...modelMenu.querySelectorAll('[role="group"]')].map(group=>({label:group.getAttribute('aria-label'),rows:[...group.querySelectorAll('[role="option"]')].map(routeOf)}));
  const featured=featuredRows.map(routeOf),all=renderedGroups.flatMap(group=>group.rows),ids=[...featured,...all];
  const topLabels=[...modelMenu.querySelectorAll('.model-catalog-featured > small,[role="group"] > small')];
  const labels=topLabels.map(element=>element.textContent.trim());
  const headers=topLabels.map(element=>{const style=getComputedStyle(element);return {color:style.color,font:style.fontSize,left:element.getBoundingClientRect().left+parseFloat(style.paddingLeft||'0')}});
  const borders=[...modelMenu.querySelectorAll('section,.model-catalog-all-label')].map(element=>getComputedStyle(element).borderTopWidth);
  const menuLabels=options.map(option=>option.textContent.trim());
  const expectedFeatured=expected.featured.map(row=>row.option.value),expectedAll=expected.all.map(row=>row.option.value);
  if(featuredRows.length!==5||!featuredRows.some(row=>row.textContent.includes('Gemini Omni Flash 1.1'))||featuredRows.some(row=>/Vidu|Veo/.test(row.textContent)))throw Error('Popular family Featured was displaced by unrelated newly added routes');
  if(JSON.stringify(featured)!==JSON.stringify(expectedFeatured)||JSON.stringify(all)!==JSON.stringify(expectedAll))throw Error('Rendered direct rows differ from flatModelCatalogMenu helper order');
  const expectedMenuLabels=['Featured',...expected.allGroups.map(group=>group.label)];
  if(JSON.stringify(labels)!==JSON.stringify(expectedMenuLabels))throw Error('Direct rows must show Featured followed by exact connected-provider headings: '+labels.join('|'));
  if(JSON.stringify(renderedGroups.map(group=>group.label))!==JSON.stringify(expected.allGroups.map(group=>group.label))||JSON.stringify(renderedGroups.map(group=>group.rows))!==JSON.stringify(expected.allGroups.map(group=>group.rows.map(row=>row.option.value))))throw Error('Provider groups or their exact projected route order changed');
  if(!ids.includes('fal-native::'+${JSON.stringify(FAL_KLING_FIXTURE)})||!ids.includes('higgsfield-native::'+TEXT_ENDPOINT))throw Error('The same Kling model is not separately selectable from both connected hosts');
  const hostRows=options.filter(option=>[routeOf(option)].includes('fal-native::'+${JSON.stringify(FAL_KLING_FIXTURE)})||routeOf(option)==='higgsfield-native::'+TEXT_ENDPOINT).map(option=>({route:routeOf(option),title:option.title,host:option.title.split(' · ').at(-2)}));
  if(!hostRows.some(row=>row.host==='fal.ai')||!hostRows.some(row=>row.host==='Higgsfield'))throw Error('Exact host labels are missing for the same model: '+JSON.stringify(hostRows));
  const textRoutes=window.__registry.textRoutes.map(route=>'higgsfield-native::'+route),referenceRoutes=window.__registry.referenceRoutes.map(route=>'higgsfield-native::'+route);
  if(textRoutes.some(route=>!ids.includes(route))||referenceRoutes.some(route=>!ids.includes(route)))throw Error('An admitted Higgsfield text/reference endpoint is missing from direct menu rows');
  const tiers=['Fast','Mini','Turbo'];
  if(tiers.some(tier=>menuLabels.some(label=>label.includes('Veo 3 '+tier))))throw Error('Extra tiers must not crowd the two main input choices');
  if(menuLabels.some(label=>/\b(?:Genjutsu|Edit|Extend)\b/i.test(label)))throw Error('An excluded Genjutsu/Edit/Extend workflow entered the menu: '+menuLabels.join('|'));
  const hostLogos=options.flatMap(option=>{const route=routeOf(option),logo=option.querySelector('[data-company]'),expectedHost=route.startsWith('fal-native::')?'fal':route.startsWith('higgsfield-native::')?'higgsfield':undefined;return expectedHost?[{route,actual:logo?.getAttribute('data-company'),expected:expectedHost}]:[]});
  if(hostLogos.some(item=>item.actual!==item.expected))throw Error('Hosted rows must use their serving-provider logo: '+JSON.stringify(hostLogos.filter(item=>item.actual!==item.expected)));
  for(const endpoint of ['fixture/northstar-1/text','fixture/northstar-0.5/text'])if(ids.includes('fal-native::'+endpoint))throw Error('Older Veo releases must be excluded by the connected-provider two-generation limit: '+endpoint);
  if(options.some(option=>!option.closest('[role="listbox"]')))throw Error('An option is outside its actual listbox');
  await close();

  const videoCard=document.querySelector('#root .react-flow__node[data-id="video-'+width+'"]');
  const nativeFooter=videoCard.querySelector('.compact-video-footer-group[aria-label="Video Footer Controls"]');
  const primaryFields=videoCard.querySelector('[aria-label="Primary Higgsfield Fields"]');
  const motionButton=videoCard.querySelector('button[aria-label="Motion FPS"]');
  if(!nativeFooter||!motionButton||!motionButton.disabled||(!motionButton.title.includes('User prompt is preserved') || motionButton.title.includes('connected Storyboard')))throw Error('Native video must retain Motion FPS in Manual mode with its compiled-prompt explanation');
  if(!nativeFooter.querySelector('button[aria-label="Video Aspect Ratio"]')||!nativeFooter.querySelector('button[aria-label="Video Duration"]')||!nativeFooter.querySelector('button[aria-label="Generate Native Sound"]')||!nativeFooter.querySelector('.quantity-stepper')||!nativeFooter.querySelector('button[aria-label="Node Settings"]')||!nativeFooter.querySelector('button[aria-label="Run"]'))throw Error('The native footer omitted an established ratio/duration/quantity/sound/settings/run control');
  if(nativeFooter.querySelector('button[aria-label="Native FPS"]'))throw Error('Kling must not receive an invented Native FPS control');
  if(primaryFields?.querySelector('button[aria-label="Video Aspect Ratio"],button[aria-label="Video Duration"],button[aria-label="Generate Native Sound"]'))throw Error('A footer-owned schema control is duplicated above the native footer');
  if(!nativeFooter.querySelector('.quantity-stepper').textContent.includes('x1'))throw Error('The local native repeat control must start at x1');
  const footerRows=nativeFooter.querySelectorAll('.fluid-control-group-row').length;
  if(footerRows<2||footerRows>3)throw Error('Native video footer must retain its established two-or-three-row allocation: '+footerRows);
  let footerAudit;

  await chooseRoute(videoSelector(width),'higgsfield-native::'+REFERENCE_ENDPOINT);
  const referenceSnapshot=window.__snapshots[width]().find(node=>node.id==='video-'+width).data;
  const referenceAudit=window.__routeAudit.at(-1);
  if(referenceSnapshot.higgsfieldNative.endpointId!==REFERENCE_ENDPOINT)throw Error('Selecting the Reference endpoint did not preserve its exact image-to-video route');
  if(referenceAudit.contract.unsupportedInputs.length)throw Error('Current Reference schema is not fully owned: '+JSON.stringify(referenceAudit.contract.unsupportedInputs));
  const startEnd=referenceAudit.contract.media.map(field=>[field.key,field.role,field.required]);
  if(JSON.stringify(startEnd)!==JSON.stringify([['image_url','start-frame',true],['last_image_url','end-frame',false]]))throw Error('Kling Reference start/end bindings changed: '+JSON.stringify(startEnd));
  if(JSON.stringify(referenceAudit.ports.filter(port=>port.id.startsWith('higgsfield-input::')).map(port=>[port.id,port.signal,port.maxConnections]))!==JSON.stringify([['higgsfield-input::image_url','image',1],['higgsfield-input::last_image_url','image',1]]))throw Error('Kling Reference field ports changed');
  if(referenceAudit.duration.error||referenceAudit.duration.selectedSeconds!==5||referenceAudit.duration.minimum!==3||referenceAudit.duration.maximum!==15)throw Error('Kling Reference timing is not owned by its current schema: '+JSON.stringify(referenceAudit.duration));
  if(referenceSnapshot.manualPromptDraft!==AUTHORED_PROMPT)throw Error('Changing the endpoint changed source-owned prompt bytes');

  await chooseRoute(videoSelector(width),'higgsfield-native::'+TEXT_ENDPOINT);
  const textSnapshot=window.__snapshots[width]().find(node=>node.id==='video-'+width).data;
  const textAudit=window.__routeAudit.at(-1);
  if(textSnapshot.higgsfieldNative.endpointId!==TEXT_ENDPOINT)throw Error('Selecting the Text endpoint did not restore its exact route');
  if(textSnapshot.manualPromptDraft!==AUTHORED_PROMPT||textSnapshot.higgsfieldNative.values.prompt!==AUTHORED_PROMPT)throw Error('Text route selection changed authored prompt bytes');
  if(textAudit.contract.unsupportedInputs.length||!textAudit.contract.fields.some(field=>field.key==='prompt'&&field.control==='text'))throw Error('Kling Text schema prompt contract changed');
  if(textAudit.contract.media.length||textAudit.ports.some(port=>port.id.startsWith('higgsfield-input::')))throw Error('Kling Text route acquired a media field or media port');
  if(textAudit.duration.error||textAudit.duration.selectedSeconds!==5||textAudit.duration.minimum!==3||textAudit.duration.maximum!==15)throw Error('Kling Text timing is not owned by its current schema: '+JSON.stringify(textAudit.duration));

  if(width===315){
   const before=window.__snapshots[width]().find(node=>node.id==='video-'+width).data;
   const initialSound=before.higgsfieldNative.values.sound||'on';
   await chooseFieldOption(width,'Video Duration',label=>label==='8.0s');
   await chooseFieldOption(width,'Video Aspect Ratio',label=>label==='9:16');
   videoCard.querySelector('button[aria-label="Generate Native Sound"]').click();await wait();
   videoCard.querySelector('.quantity-stepper button[aria-label="Increase Outputs"]').click();await wait();
   const after=window.__snapshots[width]().find(node=>node.id==='video-'+width).data;
   const nextSound=initialSound.toLowerCase()==='on'?'off':'on';
   if(after.higgsfieldNative.values.duration!==8||typeof after.higgsfieldNative.values.duration!=='number'||after.duration!==5)throw Error('Native duration must update the exact schema field without changing generic duration');
   if(after.higgsfieldNative.values.aspect_ratio!=='9:16'||after.aspectRatio!==undefined)throw Error('Native ratio must update only the model-owned value');
   if(after.higgsfieldNative.values.sound!==nextSound||after.generateAudio!==undefined)throw Error('Native sound must update the exact on/off field without generic audio state');
   if(after.quantity!==2||after.frameRate!==undefined)throw Error('The local x1–x4 control or native FPS ownership changed');
   if(after.manualPromptDraft!==AUTHORED_PROMPT||after.higgsfieldNative.values.prompt!==AUTHORED_PROMPT)throw Error('Native footer actions changed the saved User prompt bytes');
   footerAudit={before,after,manualMotionDisabled:motionButton.disabled,footerControlCount:nativeFooter.querySelectorAll('button').length,footerRows};
   const ltxEndpoint='lightricks/ltx-2.5/text-to-video/pro';
   await chooseRoute(videoSelector(width),'higgsfield-native::'+ltxEndpoint);
   const ltxFooter=videoCard.querySelector('.compact-video-footer-group[aria-label="Video Footer Controls"]');
   const nativeFpsButton=ltxFooter.querySelector('button[aria-label="Native FPS"]');
   if(!nativeFpsButton||!nativeFpsButton.textContent.includes('25 fps'))throw Error('Schema-declared LTX Native FPS must be visible with its exact default');
   const manualCadence=ltxFooter.querySelector('button[aria-label="Motion FPS"]');
   if(!manualCadence.disabled||(!manualCadence.title.includes('User prompt is preserved') || manualCadence.title.includes('connected Storyboard')))throw Error('LTX Motion FPS must remain disabled in User mode');
   await chooseFieldOption(width,'Native FPS',label=>label==='50 fps');
   await chooseFieldOption(width,'Video Duration',label=>label==='10.0s');
   await chooseFieldOption(width,'Video Aspect Ratio',label=>label==='9:16');
   await chooseFieldOption(width,'Video Resolution',label=>label==='1080p');
   videoCard.querySelector('button[aria-label="Generate Native Sound"]').click();await wait();
   const ltxAfter=window.__snapshots[width]().find(node=>node.id==='video-'+width).data;
   if(ltxAfter.higgsfieldNative.values.fps!==50||typeof ltxAfter.higgsfieldNative.values.fps!=='number'||ltxAfter.frameRate!==undefined)throw Error('Native FPS must update the exact numeric schema value, never generic playback cadence');
   if(ltxAfter.higgsfieldNative.values.duration!==10||ltxAfter.higgsfieldNative.values.aspect_ratio!=='9:16'||ltxAfter.higgsfieldNative.values.resolution!=='1080p'||ltxAfter.higgsfieldNative.values.generate_audio!==false)throw Error('LTX footer callbacks did not preserve exact duration/ratio/resolution/audio schema values');
   if(ltxAfter.duration!==5||ltxAfter.aspectRatio!==undefined||ltxAfter.resolution!==undefined||ltxAfter.generateAudio!==undefined||ltxAfter.motionCadence!==undefined)throw Error('Native footer values leaked into generic fields or auto-selected Motion FPS');
   if(ltxAfter.quantity!==2)throw Error('LTX footer changed app-local quantity while editing schema controls');
   footerAudit={...footerAudit,ltxAfter,ltxNativeFpsLabel:nativeFpsButton.textContent.trim(),ltxMotionDisabled:manualCadence.disabled};
  }

  await open(videoSelector(width));
  const videoSearch=menu().querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(videoSearch,'Veo 2');videoSearch.dispatchEvent(new Event('input',{bubbles:true}));await wait();
  if(!optionRows().some(option=>routeOf(option)==='fal-native::fixture/northstar-2/text'))throw Error('The second admitted Veo generation must remain searchable');
  if(optionRows().some(option=>['fal-native::fixture/northstar-1/text','fal-native::fixture/northstar-0.5/text'].includes(routeOf(option))))throw Error('Search must not restore generations excluded by the connected-provider limit');
  await close();
  await chooseRoute(videoSelector(width),'fal-native::fixture/northstar-2/text');
  await open(imageSelector(width));
  const restoredImageRoutes=optionRows().map(routeOf);
  for(const version of [4,3])if(!restoredImageRoutes.includes('fal-native::fixture/northstar-image-'+version))throw Error('Admitted FLUX release missing '+version);
  for(const version of [2,1])if(restoredImageRoutes.includes('fal-native::fixture/northstar-image-'+version))throw Error('Older FLUX release should be excluded '+version);
  await close();await chooseRoute(imageSelector(width),'fal-native::fixture/northstar-image-3');
  await chooseRoute(imageSelector(width),'openai::gpt-image-2.5-sunburst');
  await chooseRoute(videoSelector(width),'fal-native::fixture/northstar-3/text');
  window.__disconnectHiggsfield();await wait();
  const higgsfieldDisconnected=await open(videoSelector(width));
  const afterHiggsfieldDisconnect=optionRows().map(routeOf);
  if(afterHiggsfieldDisconnect.some(route=>route.startsWith('higgsfield-native::'))||!afterHiggsfieldDisconnect.includes('fal-native::'+${JSON.stringify(FAL_KLING_FIXTURE)}))throw Error('Disconnecting Higgsfield must hide only its rows and preserve the connected fal host row');
  await close();window.__reconnectHiggsfield();await wait();
  window.__disconnectFal();await wait();
  const falDisconnected=await open(videoSelector(width));
  const afterFalDisconnect=optionRows().map(routeOf);
  if(afterFalDisconnect.some(route=>route.startsWith('fal-native::'))||!afterFalDisconnect.includes('higgsfield-native::'+TEXT_ENDPOINT))throw Error('Disconnecting fal must hide only its rows and preserve Higgsfield');
  await close();
  const imageMenu=await open(imageSelector(width));
  const imageRoutes=optionRows().map(routeOf);
  if(!imageRoutes.includes('openai::gpt-image-2.5-sunburst')||imageRoutes.includes('fal-native::fixture/openai-image-qa'))throw Error('OpenAI exact image option or fal disconnect filtering changed');
  await close();window.__reconnectFal();await wait();
  if(width===375)await open(videoSelector(width));
  out.push({width,wanDurationAudit,geometry,labels,expectedMenuLabels,featured,all,ids,expectedFeatured,expectedAll,headers,borders,menuLabels,hostRows,hostLogos,renderedGroups,footerAudit,footerRows,textRoutes,referenceRoutes,referenceSnapshot,textSnapshot,referenceAudit,textAudit,afterHiggsfieldDisconnect,afterFalDisconnect,imageRoutes,commands:window.__commands.slice(commandStart),routeAudit:window.__routeAudit.slice(routeStart)});
 }
 return {registry:window.__registry,out,coldCatalogEvidence,coldSchemaEvidence,commands:window.__commands};
};
root.render(<Case width={315}/>);
`)
      buildSync({ entryPoints: [entry], outfile: join(directory, 'renderer.js'), bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve('node_modules')], jsx: 'automatic', loader: { '.png': 'dataurl', '.svg': 'dataurl' }, logLevel: 'silent' })
      writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve('node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve('src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}html,body{margin:0;overflow:hidden;background:#0d0c12;color:#ddd}#root{width:950px;height:1000px;position:relative}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
      writeFileSync(main, `const {app,BrowserWindow}=require('electron'),fs=require('fs'),path=require('path');app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));const finish=(value,code=0)=>{console.log('FLAT_MODEL_CHOICES_RESULT:'+JSON.stringify(value));app.exit(code)};app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1100,height:1150,webPreferences:{contextIsolation:false,sandbox:false}}),errors=[];let remote=0;win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(details,callback)=>{remote+=1;callback({cancel:true})});win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message)});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');const evidence=await win.webContents.executeJavaScript('window.__exercise()');const actionParity=[];await win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('DOM.enable');await win.webContents.debugger.sendCommand('CSS.enable');for(const actionState of ['run','rerun','stop']){await win.webContents.executeJavaScript('window.__showVideoActionState(315,'+JSON.stringify(actionState)+')');const normal=await win.webContents.executeJavaScript('window.__measureVideoAction()');if(normal.action.disabled)throw new Error('Action parity fixture must enable only inert stub actions');const {root}=await win.webContents.debugger.sendCommand('DOM.getDocument',{depth:-1});const selectors=['#root .react-flow__node[data-id="video-315"] .footer-run','#root .react-flow__node[data-id="video-315"] button[aria-label="Node Settings"]','#root .react-flow__node[data-id="video-315"] button[aria-label="Generate Native Sound"]'];for(const selector of selectors){const {nodeId}=await win.webContents.debugger.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector});if(!nodeId)throw new Error('Missing hover parity target '+selector);await win.webContents.debugger.sendCommand('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']})}const hover=await win.webContents.executeJavaScript('window.__measureVideoAction()');if(hover.action.background===normal.action.background)throw new Error('CDP did not apply the footer action hover state for '+actionState);actionParity.push({actionState,normal,hover});if(process.env.PRISM_FLAT_MODEL_CHOICES_EVIDENCE_DIR){const dir=process.env.PRISM_FLAT_MODEL_CHOICES_EVIDENCE_DIR;fs.mkdirSync(dir,{recursive:true});const name=actionState==='run'?'Run':actionState==='rerun'?'Rerun':'Stop';fs.writeFileSync(path.join(dir,'Footer Action '+name+' Hover Native.png'),(await win.webContents.capturePage()).toPNG())}}if(process.env.PRISM_FLAT_MODEL_CHOICES_EVIDENCE_DIR){const dir=process.env.PRISM_FLAT_MODEL_CHOICES_EVIDENCE_DIR;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'Footer Action Circle Parity Native.json'),JSON.stringify(actionParity,null,2)+'\\n');const providerImage=path.join(dir,'Provider Model Groups And Footer Native.png');if(!fs.existsSync(providerImage))fs.writeFileSync(providerImage,(await win.webContents.capturePage()).toPNG());await win.webContents.executeJavaScript('window.__showWanDuration(315)');fs.writeFileSync(path.join(dir,'Numeric Duration And Selection Outline Native.png'),(await win.webContents.capturePage()).toPNG())}finish({evidence,actionParity,remote,errors})}).catch(error=>finish({error:error.stack},1));`)

      const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', timeout: 90_000, env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined } })
      expect(run.status, run.stdout + run.stderr).toBe(0)
      const line = run.stdout.split('\n').find(value => value.startsWith('FLAT_MODEL_CHOICES_RESULT:'))
      expect(line, run.stdout + run.stderr).toBeTruthy()
      const result = JSON.parse(line!.slice('FLAT_MODEL_CHOICES_RESULT:'.length))
      expect(result.error).toBeUndefined()
      expect(result.remote).toBe(0)
      expect(result.errors).toEqual([])
      expect(result.actionParity.map((row: { actionState: string }) => row.actionState)).toEqual(['run', 'rerun', 'stop'])
      const expectedActionLabels: Record<string, string> = { run: 'Run', rerun: 'Rerun', stop: 'Stop' }
      for (const row of result.actionParity) {
        expect(row.normal.action.label).toBe(expectedActionLabels[row.actionState])
        expect(row.normal.action.disabled).toBe(false)
        for (const phase of [row.normal, row.hover]) {
          const controls = [phase.action, phase.settings, phase.sound]
          for (const control of controls) {
            expect(control.rect.width).toBe(28)
            expect(control.rect.height).toBe(28)
            expect(control.radius).toBe('50%')
            expect(control.borderWidth).toBe('1px')
            expect(control.transform).toBe('none')
            expect(control.rect.width).toBe(phase.settings.rect.width)
            expect(control.rect.height).toBe(phase.settings.rect.height)
            expect(control.rect.width).toBe(phase.sound.rect.width)
            expect(control.rect.height).toBe(phase.sound.rect.height)
            expect(control.radius).toBe(phase.settings.radius)
            expect(control.radius).toBe(phase.sound.radius)
            expect(control.borderWidth).toBe(phase.settings.borderWidth)
            expect(control.borderWidth).toBe(phase.sound.borderWidth)
          }
        }
        expect(row.hover.action.background).not.toBe(row.normal.action.background)
        expect(row.hover.action.rect).toEqual(row.normal.action.rect)
        expect(row.hover.settings.rect).toEqual(row.normal.settings.rect)
        expect(row.hover.sound.rect).toEqual(row.normal.sound.rect)
      }

      const evidence = result.evidence
      expect(evidence.coldCatalogEvidence.firstMenuPreserved).toBe(true)
      expect(evidence.coldSchemaEvidence).toMatchObject({openAfterHydration:true,searchPreserved:true,focusPreserved:true,stableIds:true})
      expect(evidence.coldCatalogEvidence.coldAfter.length).toBeGreaterThan(evidence.coldCatalogEvidence.coldBefore.length)
      expect(evidence.registry.textRoutes).toHaveLength(8)
      expect(evidence.registry.referenceRoutes).toHaveLength(8)
      expect(evidence.registry.textContract.contract.unsupportedInputs).toEqual([])
      expect(evidence.registry.textContract.contract.fields.some((field: { key: string; control: string }) => field.key === 'prompt' && field.control === 'text')).toBe(true)
      expect(evidence.registry.textContract.duration).toMatchObject({ minimum: 3, maximum: 15, selectedSeconds: 5 })

      for (const row of evidence.out) {
        expect([250, 315, 375]).toContain(row.width)
        expect(row.labels).toEqual(row.expectedMenuLabels)
        expect(row.labels).not.toContain('All Models')
        expect(row.featured.length).toBeGreaterThan(1)
        expect(row.all).toEqual(row.expectedAll)
        expect(row.featured).toEqual(row.expectedFeatured)
        expect(row.renderedGroups.map((group: { label: string }) => group.label)).toEqual(row.expectedMenuLabels.slice(1))
        expect(row.renderedGroups.flatMap((group: { rows: string[] }) => group.rows)).toEqual(row.all)
        expect(new Set(row.ids).size).toBe(row.ids.length)
        expect(row.menuLabels.every((label: string) => / · (?:Text|References)$/.test(label.replace(/New$/, '').trim()))).toBe(true)
        expect(row.borders.every((border: string) => border === '0px')).toBe(true)
        expect(row.headers[0].color).toBe(row.headers[1].color)
        expect(row.headers[0].font).toBe(row.headers[1].font)
        expect(row.headers[0].left).toBe(row.headers[1].left)
        expect(row.menuLabels.some((label: string) => /\b(?:Genjutsu|Edit|Extend)\b/i.test(label))).toBe(false)
        expect(row.menuLabels.some((label: string) => label.includes('Veo 3 Fast'))).toBe(false)
        expect(row.menuLabels.some((label: string) => label.includes('Veo 3 Mini'))).toBe(false)
        expect(row.menuLabels.some((label: string) => label.includes('Veo 3 Turbo'))).toBe(false)
        expect(row.textRoutes).toHaveLength(8)
        expect(row.referenceRoutes).toHaveLength(8)
        expect(row.textRoutes.every((route: string) => row.ids.includes(route))).toBe(true)
        expect(row.referenceRoutes.every((route: string) => row.ids.includes(route))).toBe(true)
        expect(row.hostRows.some((host: { host: string }) => host.host === 'fal.ai')).toBe(true)
        expect(row.hostRows.some((host: { host: string }) => host.host === 'Higgsfield')).toBe(true)
        expect(row.hostLogos.length).toBeGreaterThan(0)
        expect(row.hostLogos.every((logo: { actual: string; expected: string }) => logo.actual === logo.expected)).toBe(true)
        expect(row.footerRows).toBeGreaterThanOrEqual(2)
        expect(row.footerRows).toBeLessThanOrEqual(3)
        expect(row.referenceSnapshot.higgsfieldNative.endpointId).toBe(KLING_REFERENCE)
        expect(row.referenceSnapshot.manualPromptDraft).toBe(PROMPT)
        expect(row.referenceAudit.contract.unsupportedInputs).toEqual([])
        expect(row.referenceAudit.contract.media.map((field: { key: string; role: string; required: boolean }) => [field.key, field.role, field.required])).toEqual([['image_url', 'start-frame', true], ['last_image_url', 'end-frame', false]])
        expect(row.referenceAudit.ports.filter((port: { id: string }) => port.id.startsWith('higgsfield-input::')).map((port: { id: string; signal: string; maxConnections: number }) => [port.id, port.signal, port.maxConnections])).toEqual([['higgsfield-input::image_url', 'image', 1], ['higgsfield-input::last_image_url', 'image', 1]])
        expect(row.referenceAudit.duration).toMatchObject({ minimum: 3, maximum: 15, selectedSeconds: 5 })
        expect(row.textSnapshot.higgsfieldNative.endpointId).toBe(KLING_TEXT)
        expect(row.textSnapshot.manualPromptDraft).toBe(PROMPT)
        expect(row.textSnapshot.higgsfieldNative.values.prompt).toBe(PROMPT)
        expect(row.textAudit.contract.unsupportedInputs).toEqual([])
        expect(row.textAudit.contract.fields.some((field: { key: string; control: string }) => field.key === 'prompt' && field.control === 'text')).toBe(true)
        expect(row.textAudit.contract.media).toEqual([])
        expect(row.textAudit.ports.some((port: { id: string }) => port.id.startsWith('higgsfield-input::'))).toBe(false)
        expect(row.textAudit.duration).toMatchObject({ minimum: 3, maximum: 15, selectedSeconds: 5 })
        expect(row.afterHiggsfieldDisconnect.some((route: string) => route.startsWith('higgsfield-native::'))).toBe(false)
        expect(row.afterHiggsfieldDisconnect).toContain('fal-native::'+FAL_KLING_FIXTURE)
        expect(row.afterFalDisconnect.some((route: string) => route.startsWith('fal-native::'))).toBe(false)
        expect(row.afterFalDisconnect).toContain('higgsfield-native::'+KLING_TEXT)
        expect(row.imageRoutes).toContain('openai::gpt-image-2.5-sunburst')
        expect(row.imageRoutes).not.toContain('fal-native::fixture/openai-image-qa')
        expect(row.commands).toContainEqual({ id: `video-${row.width}`, owner: 'higgsfield', endpointId: KLING_REFERENCE })
        expect(row.commands).toContainEqual({ id: `video-${row.width}`, owner: 'higgsfield', endpointId: KLING_TEXT })
        expect(row.commands).toContainEqual({ id: `image-${row.width}`, owner: 'fal', endpoint: 'fixture/northstar-image-3' })
        expect(row.commands).toContainEqual({ id: `video-${row.width}`, owner: 'fal', endpoint: 'fixture/northstar-2/text' })
        expect(row.commands.some((command: { id: string; owner: string; endpoint: string }) => command.id === `video-${row.width}` && command.owner === 'fal' && command.endpoint === 'fixture/northstar-1/text')).toBe(false)
        expect(row.commands.some((command: { id: string; owner: string; patch?: Record<string, unknown> }) => command.id === `image-${row.width}` && command.owner === 'node' && command.patch?.imageProvider === 'openai' && command.patch?.imageModelId === 'gpt-image-2.5-sunburst')).toBe(true)
        expect(row.geometry.every((geometry: { height: number; radius: string; align: string; textAlign: string; chevron: number }) => geometry.height === 28 && geometry.radius === '999px' && geometry.align === 'flex-start' && geometry.textAlign === 'left' && geometry.chevron > 0)).toBe(true)
        expect(row.wanDurationAudit.initialValues).toEqual({})
        expect(row.wanDurationAudit.numberValues).toEqual({ duration: 12 })
        expect(typeof row.wanDurationAudit.numberValues.duration).toBe('number')
        expect(row.wanDurationAudit.autoValues).toEqual({ duration: null })
        expect(row.wanDurationAudit.defaultValues).toEqual({})
        expect(row.wanDurationAudit.initialLabel).toContain('5.0s')
        expect(row.wanDurationAudit.autoLabel).toBe('Auto')
        expect(row.wanDurationAudit.defaultLabel).toBe('5.0s')
        expect(row.wanDurationAudit.durationGeometry.every((geometry: { height: number; radius: string; align: string; textAlign: string; chevron: number }) => geometry.height === 28 && geometry.radius === '999px' && geometry.align === 'flex-start' && geometry.textAlign === 'left' && geometry.chevron > 0)).toBe(true)
        expect(row.wanDurationAudit.selectedOutline.outlineOffset).toBe('0px')
        expect(row.wanDurationAudit.selectedOutline.outlineWidth).toBe('1px')
        expect(row.wanDurationAudit.footerRows).toBeGreaterThanOrEqual(2)
        expect(row.wanDurationAudit.footerRows).toBeLessThanOrEqual(3)
      }

      const footer = evidence.out.find((row: { width: number }) => row.width === 315).footerAudit
      expect(footer).toBeTruthy()
      expect(footer.after.higgsfieldNative.values).toMatchObject({ duration: 8, aspect_ratio: '9:16', sound: expect.any(String) })
      expect(footer.after.quantity).toBe(2)
      expect(footer.after.duration).toBe(5)
      expect(footer.after.aspectRatio).toBeUndefined()
      expect(footer.after.generateAudio).toBeUndefined()
      expect(footer.ltxNativeFpsLabel).toContain('25 fps')
      expect(footer.ltxAfter.higgsfieldNative.values).toMatchObject({ fps: 50, duration: 10, aspect_ratio: '9:16', resolution: '1080p', generate_audio: false })
      expect(footer.ltxAfter.frameRate).toBeUndefined()
      expect(footer.ltxAfter.motionCadence).toBeUndefined()
      expect(footer.ltxMotionDisabled).toBe(true)

      const evidenceDirectory = process.env.PRISM_FLAT_MODEL_CHOICES_EVIDENCE_DIR
      if (evidenceDirectory) {
        mkdirSync(evidenceDirectory, { recursive: true })
        writeFileSync(join(evidenceDirectory, 'Numeric Duration And Selection Outline Native.json'), JSON.stringify(evidence.out.map((row: { width: number; wanDurationAudit: unknown }) => ({ width: row.width, wanDurationAudit: row.wanDurationAudit })), null, 2) + '\n')
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 110_000)
})
