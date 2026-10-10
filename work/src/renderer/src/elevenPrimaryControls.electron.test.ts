import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
const require = createRequire(import.meta.url)
const { buildSync } = require(resolve(process.cwd(), 'node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string

describe('mounted ElevenLabs primary controls', () => {
  it('uses actual node controls at narrow widths, searches names and stops samples on voice/account/unmount changes', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-eleven-primary-'))
    try {
      const entry = join(directory, 'renderer.tsx'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
      writeFileSync(entry, `
        import React,{useMemo,useState,useEffect} from 'react'
        import {createRoot} from 'react-dom/client'
        import {ReactFlow,ReactFlowProvider} from '@xyflow/react'
        import {NodeCard,NodeRuntimeContext} from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
        window.__samples=[];window.__settings=[];window.__data={};window.__controls={}
        window.Audio=class {constructor(){this.src='';this.preload='';this.pauseCount=0;window.__samples.push(this)}play(){this.playCount=(this.playCount||0)+1;return Promise.resolve()}pause(){this.pauseCount++}removeAttribute(name){if(name==='src')this.src=''}load(){this.loadCount=(this.loadCount||0)+1}}
        const catalog={provider:'elevenlabs',verified:true,models:[{id:'eleven_v4',label:'Eleven v4'},{id:'eleven_flash_v2_5',label:'Flash v2.5',supportsStyle:true}],voices:[{id:'mizan',label:'Uncle Mizan',previewUrl:'https://cdn.example.com/mizan.mp3'},{id:'long',label:'A long voice name that should retain its full name in the menu',previewUrl:'https://cdn.example.com/long.mp3'},{id:'missing',label:'No sample'}]}
        const noop=()=>undefined
        function Case({width}){
          const [data,setData]=useState({kind:'voiceover',title:'Voiceover',voiceEngine:'elevenlabs-direct',voiceModelId:'eleven_v4',voice:'mizan',prompt:'[warm] Salam.',runState:'idle',stability:0,similarityBoost:0.85,audioOutputFormat:'wav_44100',languageCode:'ms',speed:1.2,quantity:1})
          const [availability,setAvailability]=useState(catalog),[mounted,setMounted]=useState(true)
          window.__controls[width]={patch:patch=>setData(current=>({...current,...patch})),account:()=>setAvailability({...catalog,voices:[...catalog.voices]}),unmount:()=>setMounted(false)}
          useEffect(()=>{window.__data[width]=data},[data])
          const runtime=useMemo(()=>new Proxy({updateNode:(_id,patch)=>setData(current=>({...current,...patch})),updatePrompt:(_id,prompt)=>setData(current=>({...current,prompt})),openInspector:id=>window.__settings.push(id),serviceAvailability:()=>availability,availableModels:()=>availability.models,modelAvailabilityVerified:()=>true,connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:true,tooltip:'Fixture: generation disabled'}),estimateNode:async()=>null,characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]}}, {get(target,key){return key in target?target[key]:noop}}),[availability])
          return <section data-width={width} style={{width,height:800}}>{mounted&&<NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={[{id:'voice-'+width,type:'studio',position:{x:0,y:0},style:{width},data}]} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:0,y:0,zoom:1}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false}/></ReactFlowProvider></NodeRuntimeContext.Provider>}</section>
        }
        const edit=(width,label,value)=>{const input=document.querySelector('[data-width="'+width+'"] [aria-label="'+label+'"]');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))}
        const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
        window.__fixture={
          edit,
          dialogueSnapshot:()=>[...document.querySelectorAll('[data-width]')].map(section=>({width:Number(section.dataset.width),nodeBox:rect(section.querySelector('.studio-node')),turns:[...section.querySelectorAll('[data-dialogue-turn]')].map(turn=>({id:turn.dataset.dialogueTurn,text:turn.querySelector('textarea').value,controls:[...turn.querySelectorAll('button,input,textarea')].map(e=>({label:e.getAttribute('aria-label'),box:rect(e)}))}))})),
          click:(width,label)=>document.querySelector('[data-width="'+width+'"] [aria-label="'+label+'"]').click(),
          snapshot:()=>[...document.querySelectorAll('[data-width]')].map(section=>{const primary=section.querySelector('.voice-primary-controls'),box=rect(primary);return {width:Number(section.dataset.width),box,nodeBox:rect(section.querySelector('.studio-node')),controls:[...primary.querySelectorAll('button,input')].map(e=>({label:e.getAttribute('aria-label'),box:rect(e),disabled:e.disabled,computedFont:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight,radius:getComputedStyle(e).borderRadius,inset:getComputedStyle(e).paddingLeft})),nativeRanges:primary.querySelectorAll('input[type="range"]').length,settingValues:[...primary.querySelectorAll('[aria-label="ElevenLabs stability"],[aria-label="ElevenLabs similarity"]')].map(e=>e.querySelector('.selected-label-full')?.textContent?.trim()||e.textContent.trim()),settingsButton:rect(section.querySelector('[aria-label="Node Settings"]')),labels:primary.textContent}}),
          speechSnapshot:()=>[...document.querySelectorAll('[aria-label=\"Speech text\"]')].map(e=>({value:e.value,height:e.getBoundingClientRect().height})),
          search:value=>{const input=document.querySelector('[aria-label="Search ElevenLabs voice ID options"]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))},
          editSpeech:value=>{const input=document.querySelector('[data-width=\"250\"] [aria-label=\"Speech text\"]');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))},
          options:()=>[...document.querySelectorAll('[role="option"]')].map(e=>e.textContent.trim()),
          choose:label=>[...document.querySelectorAll('[role="option"]')].find(e=>e.textContent.trim()===label).click(),
        }
        createRoot(document.getElementById('root')).render(<main style={{display:'flex',gap:24}}>{[250,315,375].map(width=><Case key={width} width={width}/>)}</main>)
      `)
      buildSync({ entryPoints:[entry], outfile:join(directory,'renderer.js'), bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
      writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(),'node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(process.cwd(),'src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}body{margin:24px;background:#0d0c12;color:#ddd}section[data-width] .studio-node{width:100%}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
      writeFileSync(main, `
        const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));
        const finish=(result,code=0)=>{process.stdout.write('ELEVEN_PRIMARY_RESULT:'+JSON.stringify(result)+'\\n');app.exit(code)}
        app.whenReady().then(async()=>{
          const win=new BrowserWindow({show:false,width:1200,height:950,webPreferences:{contextIsolation:false,sandbox:false}}),errors=[],layoutNotices=[];let remoteRequests=0;
          win.webContents.on('console-message',(_event,_level,message)=>{if(message.includes('Uncaught'))errors.push(message);if(message.includes('[FluidControlGroup]'))layoutNotices.push(message)})
          win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>{remoteRequests++;callback({cancel:true})})
          await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');const wait=()=>new Promise(r=>setTimeout(r,150));await wait();
          const js=code=>win.webContents.executeJavaScript(code),result={};result.initial=await js('window.__fixture.snapshot()');result.initialSamples=await js('window.__samples.length');result.speechVisible=await js('window.__fixture.speechSnapshot()');
          if(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR){fs.mkdirSync(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR,'Prism Eleven Primary Native.png'),(await win.webContents.capturePage()).toPNG())}
          await js("window.__fixture.click(250,'ElevenLabs voice ID')");await wait();result.searchVisible=await js("Boolean(document.querySelector('[aria-label=\\"Search ElevenLabs voice ID options\\"]'))");
          await js("window.__fixture.search('Mizan')");await wait();result.filtered=await js('window.__fixture.options()');await js("window.__fixture.choose('Uncle Mizan')");await wait();
          await js("window.__fixture.click(250,'Play voice sample')");await wait();result.playing=await js("Boolean(document.querySelector('[data-width=\\"250\\"] [aria-label=\\"Stop voice sample\\"]'))");
          await js('window.__controls[250].account()');await wait();result.accountStopped=await js("window.__samples[0].pauseCount>0&&window.__samples[0].src===''&&Boolean(document.querySelector('[data-width=\\"250\\"] [aria-label=\\"Play voice sample\\"]'))");
          await js("window.__fixture.click(250,'Play voice sample')");await wait();await js("window.__controls[250].patch({voice:'missing'})");await wait();result.voiceStopped=await js('window.__samples[1].pauseCount>0');result.missingDisabled=await js("document.querySelector('[data-width=\\"250\\"] [aria-label=\\"Play voice sample\\"]').disabled");
          await js("window.__fixture.click(250,'ElevenLabs stability')");await wait();await js("window.__fixture.choose('0.40')");await wait();result.changedStability=await js('window.__data[250].stability');await js("window.__controls[250].patch({voice:'mizan',voiceModelId:'eleven_flash_v2_5'})");await wait();result.preserved=await js('window.__data[250]');result.olderModel=await js('window.__fixture.snapshot()[0]');
          await js("window.__fixture.editSpeech('  [warm] Salam.  ')");await wait();result.editedSpeech=await js('window.__data[250].prompt');await js("window.__fixture.click(250,'Node Settings')");result.settingsCalls=await js('window.__settings');
          await js("window.__controls[250].patch({voiceModelId:'eleven_v4'})");await wait();
          await js("window.__fixture.click(250,'ElevenLabs speech mode')");await wait();await js("window.__fixture.choose('Dialogue')");await wait();result.seededDialogue=await js('window.__data[250]');
          await js("window.__fixture.edit(250,'Turn 1 speech text','  [warm] One.  ')");await wait();
          await js("window.__fixture.click(250,'Add dialogue turn')");await wait();await js("window.__fixture.edit(250,'Turn 2 speech text','[sober] Two.')");await wait();
          await js("window.__fixture.click(250,'Speaker 2 voice')");await wait();await js("window.__fixture.choose('A long voice name that should retain its full name in the menu')");await wait();result.pairedDialogue=await js('window.__data[250].elevenDialogueTurns');
          await js("window.__fixture.click(250,'Move turn 2 earlier')");await wait();result.reorderedDialogue=await js('window.__data[250].elevenDialogueTurns');
          await js("window.__fixture.click(250,'Play voice sample')");await wait();result.turnSampleIndex=await js('window.__samples.length-1');
          await js("window.__fixture.click(250,'Remove turn 1')");await wait();result.removedDialogue=await js('window.__data[250].elevenDialogueTurns');result.removedSampleStopped=await js('window.__samples['+result.turnSampleIndex+'].pauseCount>0');
          await js("window.__fixture.click(250,'ElevenLabs speech mode')");await wait();await js("window.__fixture.choose('Speech')");await wait();result.speechDraftPreserved=await js('window.__data[250].prompt');
          for(const width of [250,315,375]){await js("window.__fixture.click("+width+",'ElevenLabs speech mode')");await wait();await js("window.__fixture.choose('Dialogue')");await wait()}
          result.dialogueGeometry=await js('window.__fixture.dialogueSnapshot()');result.dialogueDraftPreserved=await js('window.__data[250].elevenDialogueTurns');
          if(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR)fs.writeFileSync(path.join(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR,'Prism Eleven Dialogue Native.png'),(await win.webContents.capturePage()).toPNG());
          await js("window.__fixture.click(250,'ElevenLabs speech mode')");await wait();await js("window.__fixture.choose('Speech')");await wait();
          await js("window.__fixture.click(250,'Play voice sample')");await wait();result.unmountSampleIndex=await js('window.__samples.length-1');await js('window.__controls[250].unmount()');await wait();result.unmountedStopped=await js('window.__samples['+result.unmountSampleIndex+'].pauseCount>0');
          result.remoteRequests=remoteRequests;result.errors=errors;result.layoutNotices=layoutNotices;finish(result)
        }).catch(error=>finish({error:error.stack||String(error)},1));
      `)
      const syntax = spawnSync(process.execPath,['--check',main],{encoding:'utf8',timeout:5000})
      expect(syntax.status,syntax.stderr).toBe(0)
      const run = spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:45_000})
      expect(run.status,`${run.stdout}\n${run.stderr}`).toBe(0)
      const marker=run.stdout.split('\n').find(line=>line.startsWith('ELEVEN_PRIMARY_RESULT:'))
      expect(marker,`${run.stdout}\n${run.stderr}`).toBeDefined()
      const r=JSON.parse(marker!.slice('ELEVEN_PRIMARY_RESULT:'.length))
      if(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR) writeFileSync(join(process.env.PRISM_ELEVEN_NATIVE_ARTIFACT_DIR,'Eleven Primary Native Evidence.json'),JSON.stringify(r,null,2))
      expect(r.error).toBeUndefined();expect(r.errors).toEqual([]);expect(r.remoteRequests).toBe(0);expect(r.initialSamples).toBe(0)
      expect(r.speechVisible).toHaveLength(3);for(const speech of r.speechVisible){expect(speech.value).toBe('[warm] Salam.');expect(speech.height).toBeGreaterThan(30)}
      expect(r.editedSpeech).toBe('  [warm] Salam.  ');expect(r.searchVisible).toBe(true);expect(r.filtered).toEqual(['Uncle Mizan']);expect(r.playing).toBe(true)
      expect(r.accountStopped).toBe(true);expect(r.voiceStopped).toBe(true);expect(r.missingDisabled).toBe(true);expect(r.unmountedStopped).toBe(true)
      expect(r.seededDialogue.elevenDialogueTurns).toMatchObject([{voiceId:'mizan',text:'  [warm] Salam.  '}])
      expect(r.pairedDialogue.map((turn:any)=>[turn.voiceId,turn.text])).toEqual([['mizan','  [warm] One.  '],['long','[sober] Two.']])
      expect(r.reorderedDialogue).toEqual([...r.pairedDialogue].reverse());expect(r.removedDialogue).toEqual([r.pairedDialogue[0]])
      expect(r.removedSampleStopped).toBe(true);expect(r.speechDraftPreserved).toBe('  [warm] Salam.  ');expect(r.dialogueDraftPreserved).toEqual(r.removedDialogue)
      for(const state of r.dialogueGeometry){expect(state.turns).toHaveLength(1);for(const control of state.turns[0].controls){expect(control.box.width,control.label).toBeGreaterThan(0);expect(control.box.left,control.label).toBeGreaterThanOrEqual(state.nodeBox.left-1);expect(control.box.right,control.label).toBeLessThanOrEqual(state.nodeBox.right+1)}}
      expect(r.changedStability).toBe(0.4);expect(r.settingsCalls).toEqual(['voice-250']);expect(r.preserved).toMatchObject({stability:0.4,similarityBoost:0.85,languageCode:'ms',audioOutputFormat:'wav_44100',speed:1.2})
      for(const state of [...r.initial,r.olderModel]){
        expect(state.nativeRanges).toBe(0);expect(state.settingValues).toEqual([state===r.olderModel?'0.40':'0.00','0.85'])
        expect(state.nodeBox.width).toBe(state.width)
        const settings=state.controls.filter((c:any)=>/stability|similarity/.test(c.label||'')),anchor=state.controls.find((c:any)=>c.label==='Voice provider and model')
        for(const control of settings){expect(control.computedFont).toBe(anchor.computedFont);expect(control.weight).toBe(anchor.weight);expect(control.radius).toBe(anchor.radius);expect(control.inset).toBe(anchor.inset);expect(control.box.height).toBe(anchor.box.height)}
        expect(settings[0].box.right).toBeLessThanOrEqual(settings[1].box.left-5)
        const sample=state.controls.find((c:any)=>c.label==='Play voice sample');expect(sample.box.width).toBe(state.settingsButton.width);expect(sample.box.height).toBe(state.settingsButton.height);expect(Math.abs(sample.box.top-settings[0].box.top)).toBeLessThanOrEqual(1)
        expect(state.labels).not.toMatch(/Language|Output|Speed/)
        for(const c of state.controls){expect(c.box.width,c.label).toBeGreaterThan(0);expect(c.box.left,c.label).toBeGreaterThanOrEqual(state.box.left-1);expect(c.box.right,c.label).toBeLessThanOrEqual(state.box.right+1)}
      }
    } finally { rmSync(directory,{recursive:true,force:true}) }
  },55_000)
})
