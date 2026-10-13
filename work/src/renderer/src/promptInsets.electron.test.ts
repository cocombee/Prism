import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

it('bounds real prompt editors by visual lines, preserves field families and separates outer insets from gaps', () => {
  const require = createRequire(import.meta.url)
  const { buildSync } = require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js'))
  const owner = process.env.PRISM_PROMPT_BASELINE_ROOT || process.cwd()
  const dir = mkdtempSync(join(tmpdir(), 'prism-prompt-insets-'))
  try {
    writeFileSync(join(dir, 'entry.tsx'), `
      import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {TaggedPromptTextarea} from ${JSON.stringify(resolve(owner, 'src/renderer/src/TaggedPromptTextarea.tsx'))};
      import {AssetDescriptionField} from ${JSON.stringify(resolve(owner, 'src/renderer/src/AssetPromptFields.tsx'))};
      import {ReactFlow,ReactFlowProvider} from '@xyflow/react';
      import {NodeCard,NodeRuntimeContext} from ${JSON.stringify(resolve(owner, 'src/renderer/src/NodeCardNext.tsx'))};
      import {ProviderAvailabilityContext} from ${JSON.stringify(resolve(owner, 'src/renderer/src/ProviderAvailabilityContext.tsx'))};
      window.__calls=[];
      function Field({name,classes='',readonly=false}){ const [value,setValue]=useState('');window.__setters[name]=setValue;return <section data-case={name} className={name==='inspector'?'inspector-section':'studio-node'} style={{width:315}}><TaggedPromptTextarea className={classes} aria-label={name} value={value} readOnly={readonly} connectedTags={['@fixture']} onValueChange={setValue}/></section> }
      window.__setters={};
      const runtime=new Proxy({characterLibrary:[],semanticLibraries:{},connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],runReadiness:()=>({disabled:false,tooltip:'Ready'}),availableModels:()=>[],availablePromptModels:provider=>provider==='openai'?[{id:'gpt-6.1-sol',label:'GPT 6.1 Sol'}]:[],providerAccount:()=>({state:'connected'}),promptProviderAccount:()=>({state:'connected'}),runAssistantNode:id=>window.__calls.push(id),updateNode:()=>{},updatePrompt:()=>{},workflow:{nodes:[],edges:[]}},{get:(target,key)=>key in target?target[key]:()=>undefined});
      createRoot(document.getElementById('root')).render(<><Field name="voice" classes="node-prompt media-generator-prompt"/><Field name="prompt" classes="node-textarea"/><Field name="video" classes="node-prompt generator-prompt media-generator-prompt" readonly/><Field name="asset" classes="node-prompt generator-prompt media-generator-prompt"/><Field name="inspector"/><AssetDescriptionField id="fixture" value="description" placeholder="Description" connectedTags={[]} availableTags={[]} onChange={()=>{}}/>{['image','video','voice'].map(name=><section data-footer={name} className={'studio-node kind-'+(name==='voice'?'voiceover':name+'-generator')} style={{width:315}}><div className={'compact-generator-footer '+(name==='voice'?'compact-generic-footer has-voice-footer':'compact-video-footer')}><div style={{width:80,height:28}}>Control</div></div></section>)}<section className="studio-node is-media-tile kind-upload" style={{width:315}}><header className="node-header">Upload</header><button className="upload-drop media-tile-empty">Choose Media</button></section><ProviderAvailabilityContext.Provider value={{promptConnected:{openai:true},mediaConnected:{}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><div style={{width:400,height:360}}><ReactFlow nodes={[{id:'fixture-prompt',type:'studio',position:{x:20,y:20},data:{kind:'prompt',title:'Prompt',prompt:'Fictional fixture',assistantProvider:'openai',assistantModelId:'gpt-6.1-sol'}}]} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:0,y:0,zoom:1}}/></div></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></>);
      window.__probe=name=>{const shell=document.querySelector('[data-case="'+name+'"] .tagged-prompt-shell'),t=shell.querySelector('textarea'),pre=shell.querySelector('pre'),s=getComputedStyle(t),p=getComputedStyle(pre);return{height:t.offsetHeight,line:parseFloat(s.lineHeight),top:parseFloat(s.paddingTop),bottom:parseFloat(s.paddingBottom),left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight),border:parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth),shell:shell.offsetHeight,shellBorder:parseFloat(getComputedStyle(shell).borderTopWidth)+parseFloat(getComputedStyle(shell).borderBottomWidth),preWidth:pre.offsetWidth,textWidth:t.clientWidth,prePadding:[p.paddingTop,p.paddingBottom,p.paddingLeft,p.paddingRight],scroll:t.scrollHeight>t.clientHeight,value:t.value}};
    `)
    buildSync({entryPoints:[join(dir,'entry.tsx')],outfile:join(dir,'renderer.js'),bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom'),'@xyflow/react':resolve('node_modules/@xyflow/react')},jsx:'automatic',loader:{'.svg':'dataurl','.png':'dataurl'},logLevel:'silent'})
    writeFileSync(join(dir,'index.html'), `<!doctype html><link rel="stylesheet" href="file://${resolve('node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(owner, 'src/renderer/src/styles-next.css')}"><style>body{margin:0;overflow:auto}#root{display:grid;gap:12px;align-items:start}*{box-sizing:border-box}</style><div id="root"></div><script src="renderer.js"></script>`)
    const probe=String.raw`(async()=>{
      const wait=ms=>new Promise(r=>setTimeout(r,ms));await document.fonts.ready;await wait(250);const result={fields:{}};
      for(const name of ['voice','prompt','video','asset','inspector']){
        const run=async value=>{window.__setters[name](value);await wait(40);return window.__probe(name)};
        const initial=await run(''),seven=await run('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7'),overflow=await run(Array.from({length:12},(_,i)=>'Line '+i).join('\n')),shrunk=await run('Short'),wrapped=await run('Wrapped words '.repeat(22));
        const section=[...document.querySelectorAll('[data-case]')].find(e=>e.dataset.case===name);section.style.width='150px';await wait(70);const narrow=window.__probe(name);section.style.width='315px';await wait(70);const wide=window.__probe(name);result.fields[name]={initial,seven,overflow,shrunk,wrapped,narrow,wide};
      }
      const description=getComputedStyle(document.querySelector('.asset-reference-description-field textarea'));result.descriptionPadding=[description.paddingTop,description.paddingRight,description.paddingBottom,description.paddingLeft];
      result.footers=[...document.querySelectorAll('[data-footer] .compact-generator-footer')].map(e=>{const s=getComputedStyle(e);return{sides:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],gap:s.gap}});
      const upload=getComputedStyle(document.querySelector('.upload-drop'));result.upload={sides:[upload.borderTopLeftRadius,upload.borderTopRightRadius,upload.borderBottomLeftRadius,upload.borderBottomRightRadius]};
      const node=document.querySelector('[data-id="fixture-prompt"]'),footer=node.querySelector('.prompt-node-footer'),button=footer?.querySelector('[aria-label="Revamp Prompt"]');
      result.prompt={sides:footer?(()=>{const s=getComputedStyle(footer);return[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft]})():null,enhanceSwitch:!!node.querySelector('.prompt-enhance-switch'),footer:!!footer,model:!!footer?.querySelector('[aria-label="Prompt Revamp model"]'),buttons:footer?.querySelectorAll('button').length,round:button?getComputedStyle(button).borderRadius:null};button?.click();result.prompt.calls=window.__calls;return result;
    })()`
    writeFileSync(join(dir,'main.cjs'), `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(join(dir,'user-data'))});app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1000,height:1600,webPreferences:{contextIsolation:false,sandbox:false}});w.webContents.on('console-message',(_e,_l,message)=>console.log('FIXTURE_CONSOLE:'+message));await w.loadFile(${JSON.stringify(join(dir,'index.html'))});const result=await w.webContents.executeJavaScript(${JSON.stringify(probe)});console.log('PROMPT_INSETS_RESULT:'+JSON.stringify(result));app.quit()}).catch(e=>{console.error(e);app.exit(1)});`)
    expect(spawnSync(process.execPath,['--check',join(dir,'main.cjs')],{encoding:'utf8'}).status).toBe(0)
    const run=spawnSync(require('electron'),[join(dir,'main.cjs')],{cwd:dir,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:45000})
    expect(run.status,run.stdout+'\n'+run.stderr).toBe(0)
    const result=JSON.parse(run.stdout.split('\n').find(line=>line.startsWith('PROMPT_INSETS_RESULT:'))!.slice('PROMPT_INSETS_RESULT:'.length))
    for(const [name,raw] of Object.entries(result.fields)){
      const r=raw as any;const expected=(p:any,lines:number)=>p.line*lines+p.top+p.bottom+p.border
      expect(r.initial.height,name).toBeCloseTo(expected(r.initial,3),0)
      expect(r.seven.height,name).toBeCloseTo(expected(r.seven,7),0)
      expect(r.overflow.height,name).toBeCloseTo(expected(r.overflow,7),0)
      expect(r.overflow.scroll,name).toBe(true)
      expect(r.shrunk.height,name).toBe(r.initial.height)
      expect(r.wrapped.height,name).toBeGreaterThan(r.initial.height)
      expect(r.narrow.height,name).toBeGreaterThanOrEqual(r.wide.height)
      for(const p of [r.initial,r.seven,r.overflow,r.shrunk,r.wrapped,r.narrow,r.wide]){expect([p.top,p.bottom,p.left,p.right],name).toEqual([12,12,12,12]);expect(p.shell,name).toBe(p.height+p.shellBorder);expect(p.preWidth,name).toBe(p.textWidth+p.border);expect(p.prePadding,name).toEqual(['12px','12px','12px','12px'])}
    }
    expect(result.descriptionPadding).toEqual(['12px','12px','12px','12px'])
    for(const f of result.footers)expect(f.sides).toEqual(['12px','12px','12px','12px'])
    expect(result.upload.sides).toEqual(['13px','13px','13px','13px'])
    expect(result.prompt).toMatchObject({sides:['12px','12px','12px','12px'],enhanceSwitch:false,footer:true,model:true,buttons:2,round:'50%',calls:['fixture-prompt']})
  }finally{rmSync(dir,{recursive:true,force:true})}
},55000)
