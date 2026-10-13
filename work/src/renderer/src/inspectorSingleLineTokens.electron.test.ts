import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const require=createRequire(import.meta.url)
it('unifies actual Inspector single-line fields while preserving authored values, headings and multiline geometry',()=>{
 const dir=mkdtempSync(join(tmpdir(),'prism-inspector-tokens-'))
 try{
  const source=readFileSync(resolve('src/renderer/src/AppNext.tsx'),'utf8')
  const start="inspectorNode.data.kind === 'voiceover' && inspectorNode.data.voiceEngine === 'fish-audio' ? "
  const end=" : inspectorNode.data.kind === 'voiceover' && inspectorNode.data.elevenSpeechMode === 'voice-change' ? "
  expect(source.split(start)).toHaveLength(2)
  const fish=source.split(start)[1].split(end)[0]
  const continuity=source.match(/<label className="inspector-wide"><span>Previous text · continuity context<\/span><textarea[^]*?<\/label>/)![0]
  const title=source.match(/<input className="inspector-title-input"[^]*?\/>/)![0]
  const css=readFileSync(resolve('src/renderer/src/styles-next.css'),'utf8')
  const patchPath=resolve('/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/Apps/Prism/Inspector Single Line Token Patch.json')
  const patch=JSON.parse(readFileSync(patchPath,'utf8'))
  let baseline=css.replace(patch.append,'');for(const r of patch.replacements)baseline=baseline.replace(r.new,r.old)
  writeFileSync(join(dir,'before.css'),baseline)
  const p=(name:string)=>JSON.stringify(resolve(name))
  writeFileSync(join(dir,'renderer.tsx'),`
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{GroupedMenuSelect,SimpleMenuSelect,FalNativeFields}from ${p('src/renderer/src/NodeCardNext.tsx')};
import{ShutterSettings}from ${p('src/renderer/src/ShutterSettings.tsx')};
import{ProviderAvailabilityContext}from ${p('src/renderer/src/ProviderAvailabilityContext.tsx')};
import{fishSampleRateOptions,fishBitrateOptions}from ${p('src/shared/fishAudio.ts')};
import{FISH_AUDIO_FORMATS,FISH_LATENCY_OPTIONS}from ${p('src/shared/providerOptions.ts')};
window.__errors=[];window.__http=0;window.fetch=()=>{window.__http++;throw Error('HTTP forbidden')};window.addEventListener('error',e=>window.__errors.push(e.message));window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
const serviceModels={fish:{models:[{id:'s2-pro',label:'Fictional Fish Model With An Authored Long Label'}]}};
const initial={kind:'voiceover',voiceEngine:'fish-audio',title:'Authored node',fishModel:'s2-pro',fishReferenceId:'custom-authored-voice-id',fishTemperature:0,fishTopP:0,fishVolume:0,speed:1,fishFormat:'mp3',fishSampleRate:44100,fishMp3Bitrate:128,fishChunkLength:300,previousText:'  Authored multiline continuity.\\nPreserve every space.  '};
function Harness(){const[data,setData]=useState(initial),[angle,setAngle]=useState(180),[native,setNative]=useState({endpointId:'fixture',flow:'voice',values:{context:34,enabled:false,authored:'Keep me',preserved:'Authored unavailable value with a long selected label'},media:[],promptField:null,repairs:['Changed schema field; saved content preserved'],fingerprint:'a'.repeat(64)});const inspectorNode={id:'fixture',data};const updateNode=(_id,patch)=>setData(d=>({...d,...patch}));window.__state=()=>({data,native,angle});
const fields=[{key:'context',label:'Context With A Very Long Descriptive Field Heading',control:'number',schema:{type:'number'},required:false,nullable:false,placement:'advanced'},{key:'authored',label:'Authored Single Line Text',control:'text',schema:{type:'string'},required:false,nullable:false,placement:'advanced'},{key:'enabled',label:'Enabled',control:'boolean',schema:{type:'boolean'},required:false,nullable:false,placement:'advanced'}];
return <ProviderAvailabilityContext.Provider value={{mediaConnected:{fish:true},promptConnected:{}}}><aside className="node-inspector-panel"><header><div>${title}</div></header><div className="inspector-scroll">${fish}<section className="inspector-grid">${continuity}<ShutterSettings mode="angle" angle={angle} fps={24} onChange={p=>{if('shutterAngle'in p)setAngle(p.shutterAngle)}}/></section><FalNativeFields placement="advanced" state={native} onChange={setNative} contract={{endpointId:'fixture',input:{},output:{},runtime:{fields,unsupportedInputs:[],adapterRevision:'fixture',fingerprint:'a'.repeat(64)}}}/></div></aside></ProviderAvailabilityContext.Provider>}
window.__snap=()=>{const panel=document.querySelector('.node-inspector-panel'),s=e=>getComputedStyle(e),r=e=>e.getBoundingClientRect(),fields=[...panel.querySelectorAll('input:not([type=range]):not([type=checkbox]),select,.grouped-menu-select,.simple-menu-select')].filter(e=>r(e).height>0);return{fields:fields.map(e=>({name:e.getAttribute('aria-label')||e.closest('label')?.querySelector('span')?.textContent,value:e.value??e.textContent,height:r(e).height,width:r(e).width,bg:s(e).backgroundColor,radius:s(e).borderRadius,border:s(e).borderColor,contained:r(e).left>=r(panel).left&&r(e).right<=r(panel).right})),multiline:[...panel.querySelectorAll('textarea')].map(e=>({value:e.value,height:r(e).height,radius:s(e).borderRadius,bg:s(e).backgroundColor,padding:s(e).padding,min:s(e).minHeight,max:s(e).maxHeight})),ranges:[...panel.querySelectorAll('input[type=range]')].map(e=>({value:e.value,min:e.min,max:e.max,step:e.step})),checkboxes:[...panel.querySelectorAll('input[type=checkbox]')].map(e=>({checked:e.checked,height:r(e).height})),headers:[...panel.querySelectorAll('.inspector-grid label>span')].map(e=>({text:e.textContent,display:s(e).display,height:r(e).height})),errors:window.__errors,http:window.__http,state:window.__state()}};
window.__edit=(label,value)=>{const e=document.querySelector('[aria-label="'+label+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}))};createRoot(document.getElementById('root')).render(<Harness/>);
`)
  require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js')).buildSync({entryPoints:[join(dir,'renderer.tsx')],outfile:join(dir,'renderer.js'),bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],jsx:'automatic',loader:{'.svg':'dataurl','.png':'dataurl'},logLevel:'silent'})
  for(const [name,path]of [['before',join(dir,'before.css')],['after',resolve('src/renderer/src/styles-next.css')]])writeFileSync(join(dir,name+'.html'),`<link rel="stylesheet" href="file://${path}"><style>*{box-sizing:border-box}body{margin:0}.node-inspector-panel{top:0;width:var(--fixture-width,360px)}</style><div id="root"></div><script src="renderer.js"></script>`)
  writeFileSync(join(dir,'main.cjs'),`const{app,BrowserWindow}=require('electron');const fs=require('node:fs');app.setPath('userData',${JSON.stringify(join(dir,'user'))});const wait=ms=>new Promise(r=>setTimeout(r,ms));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:600,height:1100,webPreferences:{contextIsolation:false,sandbox:false}}),result={before:[],after:[]};for(const name of['before','after']){await w.loadFile(${JSON.stringify(dir)}+'/'+name+'.html');await wait(350);for(const width of[360,260,420]){await w.webContents.executeJavaScript('document.documentElement.style.setProperty("--fixture-width","'+width+'px")');await wait(100);result[name].push(await w.webContents.executeJavaScript('window.__snap()'))}}await w.webContents.executeJavaScript('window.__edit("Fish primary voice ID","Changed authored voice")');await wait(100);result.edited=await w.webContents.executeJavaScript('window.__snap()');await w.webContents.executeJavaScript('window.__edit("Model Context With A Very Long Descriptive Field Heading","0")');await wait(100);await w.webContents.executeJavaScript('window.__edit("Model Authored Single Line Text","  Changed native text  ")');await wait(100);result.nativeEdited=await w.webContents.executeJavaScript('window.__snap()');fs.writeFileSync('/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/Apps/Prism/Inspector Single Line Native Evidence.json',JSON.stringify(result,null,2));fs.writeFileSync('/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/Apps/Prism/Inspector Single Line Native.png',(await w.webContents.capturePage()).toPNG());console.log('INSPECTOR_TOKENS:'+JSON.stringify(result));app.exit(0)}).catch(e=>{console.error(e);app.exit(1)})`)
  const run=spawnSync(require('electron'),[join(dir,'main.cjs')],{encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:30000})
  expect(run.status,run.stdout+'\n'+run.stderr).toBe(0)
  const result=JSON.parse(run.stdout.split('\n').find(x=>x.startsWith('INSPECTOR_TOKENS:'))!.slice('INSPECTOR_TOKENS:'.length))
  for(let i=0;i<3;i++){
   const a=result.after[i],b=result.before[i];expect(a.errors).toEqual([]);expect(a.http).toBe(0);expect(a.fields.length).toBeGreaterThan(9)
   for(const f of a.fields){expect(f.height,f.name).toBe(28);expect(f.bg,f.name).toBe('rgb(21, 19, 27)');expect(f.radius,f.name).toBe('999px');expect(f.width,f.name).toBeGreaterThan(0);if(f.name==='Latency')expect(f.width).toBeGreaterThan(100);expect(f.contained,f.name).toBe(true)}
   expect(a.multiline).toEqual(b.multiline);expect(a.ranges).toEqual(b.ranges);expect(a.checkboxes).toEqual(b.checkboxes)
   expect(a.state).toEqual(b.state);expect(a.state.data.fishTemperature).toBe(0);expect(a.state.data.fishVolume).toBe(0);expect(a.state.native.values.context).toBe(34)
   expect(a.headers.filter((h: { display: string })=>h.display!=='none').length).toBeGreaterThan(8)
  }
  expect(result.edited.state.data.fishReferenceId).toBe('Changed authored voice');expect(result.edited.http).toBe(0);expect(result.nativeEdited.state.native.values.context).toBe(0);expect(result.nativeEdited.state.native.values.authored).toBe('  Changed native text  ');expect(result.nativeEdited.state.native.values.preserved).toBe('Authored unavailable value with a long selected label');expect(result.nativeEdited.state.native.repairs).toEqual(['Changed schema field; saved content preserved']);expect(result.nativeEdited.http).toBe(0)
 }finally{rmSync(dir,{recursive:true,force:true})}
},45000)
