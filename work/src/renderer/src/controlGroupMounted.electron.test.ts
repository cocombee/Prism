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

describe('mounted fluid control catalog and capability stability', () => {
  it('left-aligns Storyboard selected text at the shared inset while retaining fixed right chevrons and sibling selector alignment', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-control-selected-text-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
      import { ChevronDown } from 'lucide-react'
      import { FluidControlGroup, GroupedMenuSelect } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
      const storyboard=(id,label,width)=>({id,kind:'selector',defaultLabel:label,intrinsicWidth:width,node:<div className="storyboard-compact-select"><button type="button" aria-label={id} data-equalized-options={JSON.stringify([label])} data-equalized-default={label}><span>{label}</span><ChevronDown size={9}/></button></div>})
      const grouped=(id,label)=>({id,kind:'selector',defaultLabel:label,intrinsicWidth:90,node:<GroupedMenuSelect ariaLabel={id} defaultLabel={label} fillTrack value={label} groups={[{label:'Options',options:[{value:label,label}]}]} onChange={()=>{}}/>})
      function App(){return <main>
        <section style={{width:315}}><FluidControlGroup ariaLabel="Storyboard panel selected alignment" gap={5} allocation={{minRows:1,maxRows:1}} controls={[storyboard('Shot Size','Medium',82),storyboard('Duration','3s',48),storyboard('Camera Movement','Push In',118)]}/></section>
        {['Video','Image','Voice'].map(kind=><section key={kind} style={{width:180}}><FluidControlGroup ariaLabel={kind+' selected alignment'} gap={7} allocation={{minRows:1,maxRows:1}} controls={[grouped(kind+' selector',kind+' Model')]}/></section>)}
      </main>}
      const measure=(button)=>{const span=button.querySelector(':scope > span');const visibleText=span.querySelector(':scope > span:not([aria-hidden="true"])')||span;const svg=button.querySelector(':scope > svg');const buttonRect=button.getBoundingClientRect();const svgRect=svg.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(visibleText);const textRect=range.getBoundingClientRect();const style=getComputedStyle(button);return{name:button.getAttribute('aria-label'),textAlign:getComputedStyle(span).textAlign,paintedInset:textRect.left-buttonRect.left,sharedInset:(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0),chevronRightInset:buttonRect.right-svgRect.right,expectedChevronRightInset:(parseFloat(style.borderRightWidth)||0)+(parseFloat(style.paddingRight)||0)}}
      window.__selectedAlignment=()=>Array.from(document.querySelectorAll('.equalized-control-group button[data-equalized-options]')).map(measure)
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}body{margin:20px;background:#111;color:#ddd}main{display:grid;gap:20px}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(value,code=0)=>{process.stdout.write('SELECTED_ALIGNMENT_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:700,height:700,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');await new Promise(r=>setTimeout(r,250));finish(await win.webContents.executeJavaScript('window.__selectedAlignment()'))}).catch(error=>finish({error:error.stack||String(error)},1));`)
    const run = spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:40_000})
    const marker = run.stdout.split('\n').find(line=>line.startsWith('SELECTED_ALIGNMENT_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const results = JSON.parse(marker!.slice('SELECTED_ALIGNMENT_RESULT:'.length))
    expect(results.map((result: any) => result.name)).toEqual(['Shot Size','Duration','Camera Movement','Video selector','Image selector','Voice selector'])
    for (const result of results) {
      expect(result.textAlign, result.name).toBe('left')
      expect(Math.abs(result.paintedInset-result.sharedInset), result.name).toBeLessThanOrEqual(0.75)
      expect(Math.abs(result.chevronRightInset-result.expectedChevronRightInset), result.name).toBeLessThanOrEqual(0.75)
    }
  }, 50_000)

  it('pins selected company icons at the established painted left inset and name gap after selection, including narrow and zoomed controls', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-selected-icon-insets-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React, { useState } from 'react'
      import { createRoot } from 'react-dom/client'
      import { FluidControlGroup, GroupedMenuSelect } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
      const companies=['fal','byteplus','omniroute','openai','google','anthropic','deepseek','moonshot','meta','black-forest-labs','alibaba','bytedance','kuaishou','elevenlabs','fish']
      function Case({company,index}){const [value,setValue]=useState('first');const zoom=index%2?.8:1;return <section className="studio-node" data-company-case={company} data-zoom={zoom} style={{width:index%2?180:300,transform:'scale('+zoom+')',transformOrigin:'top left'}}><FluidControlGroup ariaLabel={company} gap={7} controls={[{id:'model',kind:'selector',intrinsicWidth:100,defaultLabel:'Selected Model',node:<GroupedMenuSelect value={value} ariaLabel={company} defaultLabel="Selected Model" fillTrack groups={[{label:'Models',options:[{value:'first',label:'Initial Model',provider:'openai'},{value:'final',label:'Selected Model',provider:company}]}]} onChange={setValue}/>},{id:'sibling',kind:'selector',intrinsicWidth:52,defaultLabel:'16:9',node:<GroupedMenuSelect value="ratio" ariaLabel="Sibling Ratio" defaultLabel="16:9" fillTrack groups={[{label:'Ratios',options:[{value:'ratio',label:'16:9'},{value:'other',label:'2.35:1'}]}]} onChange={()=>{}}/>}]}/></section>}
      window.__errors=[];window.addEventListener('error',event=>window.__errors.push(event.message))
      const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      window.__selectAll=async()=>{for(const section of document.querySelectorAll('[data-company-case]')){section.querySelector('button.grouped-menu-select:not([aria-label="Sibling Ratio"])').click();await frame();const option=document.querySelector('.grouped-menu-select-menu button[role="option"][id$="-final"]');if(!option)throw Error('Missing final option');option.click();await frame()}}
      window.__measureSelected=()=>(()=>{const r=e=>e.getBoundingClientRect();return [...document.querySelectorAll('[data-company-case]')].map(section=>{const button=section.querySelector('button.grouped-menu-select'),mark=button.querySelector('[data-company]'),label=button.querySelector('.selected-label-full'),svg=mark.querySelector('svg'),zoom=Number(section.dataset.zoom);let left,right;if(svg){const b=svg.getBBox(),m=svg.getScreenCTM();left=new DOMPoint(b.x,b.y).matrixTransform(m).x;right=new DOMPoint(b.x+b.width,b.y).matrixTransform(m).x;}else{const style=getComputedStyle(mark),ctx=document.createElement('canvas').getContext('2d');ctx.font=style.font;ctx.letterSpacing=style.letterSpacing;const ink=ctx.measureText(mark.textContent);const range=document.createRange();range.selectNodeContents(mark);const x=r(range).left;left=x-ink.actualBoundingBoxLeft*zoom;right=x+ink.actualBoundingBoxRight*zoom;}const style=getComputedStyle(button);return {company:section.dataset.companyCase,selected:label.textContent,leftGap:(left-r(button).left)/zoom-parseFloat(style.borderLeftWidth),nameGap:(r(label).left-right)/zoom,expected:parseFloat(style.paddingLeft),expectedName:parseFloat(style.getPropertyValue('--selector-icon-label-gap')),fixedIcon:getComputedStyle(button.querySelector('.selector-leading-icon')).flexGrow==='0',siblings:section.querySelectorAll('button.grouped-menu-select').length};})})()
      createRoot(document.getElementById('root')).render(<main style={{display:'grid',gridTemplateColumns:'repeat(3,300px)',gap:12,padding:12}}>{companies.map((company,index)=><Case key={company} company={company} index={index}/>)}</main>)
    `)
    buildSync({ entryPoints:[entry], outfile:join(directory,'renderer.js'), bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
    const styles=resolve(process.cwd(),'src/renderer/src/styles-next.css')
    writeFileSync(html, `<html><head><link rel="stylesheet" href="file://${styles}"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(value,code=0)=>{process.stdout.write('SELECTED_ICONS_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1100,height:1000,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(html)});await w.webContents.executeJavaScript('document.fonts.ready');await new Promise(r=>setTimeout(r,250));await w.webContents.executeJavaScript('window.__selectAll()');finish({results:await w.webContents.executeJavaScript('window.__measureSelected()'),errors:await w.webContents.executeJavaScript('window.__errors')})}).catch(e=>finish({error:e.stack||String(e)},1));`)
    const syntax=spawnSync(process.execPath,['--check',main],{encoding:'utf8'})
    expect(syntax.status,syntax.stderr).toBe(0)
    const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:40_000})
    expect(run.status,run.stdout+'\n'+run.stderr).toBe(0)
    const marker=run.stdout.split('\n').find(line=>line.startsWith('SELECTED_ICONS_RESULT:'))
    expect(marker,run.stdout).toBeDefined()
    const result=JSON.parse(marker!.slice('SELECTED_ICONS_RESULT:'.length))
    expect(result.errors).toEqual([])
    expect(result.results).toHaveLength(15)
    for(const item of result.results){
      expect(item.selected,item.company).toBe('Selected Model')
      expect(item.fixedIcon,item.company).toBe(true)
      expect(item.siblings,item.company).toBe(2)
      expect(Math.abs(item.leftGap-item.expected),item.company).toBeLessThanOrEqual(.2)
      expect(Math.abs(item.nameGap-item.expectedName),item.company).toBeLessThanOrEqual(.2)
    }
  }, 50_000)

  it('coalesces async Storyboard Claude allocation and survives 50 service/model/capability cycles', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-control-catalog-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
      import { createRoot } from 'react-dom/client'
      import { FluidControlGroup, GroupedMenuSelect } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
      import { Save, WandSparkles, Settings, Play } from 'lucide-react'
      const waitFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      function Quantity({ value='5 / 5s' }) { return <div className="storyboard-budget"><span/><strong>{value}</strong></div> }
      function Harness() {
        const [catalog, setCatalog] = useState({ label: 'Model', provider: 'anthropic', model: 'pending' })
        const [cycle, setCycle] = useState(0)
        const storyboardRoot = useRef(null); const cycleRoot = useRef(null)
        useLayoutEffect(() => {
          const row = storyboardRoot.current?.querySelector('.fluid-control-group-row')
          if (!row || row.dataset.observed) return
          row.dataset.observed = 'true'; window.__mounted.storyboardStyleMutations = 0
          new MutationObserver(records => { window.__mounted.storyboardStyleMutations += records.filter(record => record.attributeName === 'style').length }).observe(row,{attributes:true,attributeFilter:['style']})
        })
        useEffect(() => {
          window.__mounted.loadClaude = async () => { window.__mounted.before = window.__mounted.snapshot(); setCatalog({ label:'Claude Opus 5', provider:'anthropic', model:'claude-opus-5' }); await waitFrame(); await waitFrame(); return window.__mounted.snapshot() }
          window.__mounted.runCycles = async () => {
            const rootIdentity = cycleRoot.current; const snapshots = []
            for (let index=1; index<=50; index++) { setCycle(index); await waitFrame(); snapshots.push(window.__mounted.cycleSnapshot()) }
            return { rootStable: rootIdentity === cycleRoot.current, snapshots }
          }
        })
        const modelLabel = ['Seedance 2 Mini · References','WAN Controlled','Kling Video v3 Pro'][cycle % 3]
        const compact = ['Seedance 2 Mini','WAN Controlled','Kling Video v3'][cycle % 3]
        const ratioAvailable = cycle % 2 === 0
        return <>
          <div ref={storyboardRoot} style={{width:315}}>
            <FluidControlGroup className="storyboard-footer-group" ariaLabel="Mounted Storyboard Footer Controls" gap={6} allocation={{minRows:1,maxRows:1,firstId:'assistant-model'}} recalculationKey={catalog.label} controls={[
              { id:'assistant-model', kind:'selector', defaultLabel:catalog.label, fullLabel:catalog.label, compactLabel:catalog.label, intrinsicWidth:80, minimumWidth:70, shrinkPriority:'model', node:<GroupedMenuSelect ariaLabel="Storyboard AI model" displayLabel={catalog.label} compactLabel={catalog.label} defaultLabel={catalog.label} fillTrack value={catalog.provider+'::'+catalog.model} groups={[{label:'Anthropic',options:[{value:catalog.provider+'::'+catalog.model,label:catalog.label,provider:'anthropic'}]}]} onChange={()=>{}}/> },
              { id:'budget', kind:'bounded-elastic', intrinsicWidth:58, maximumExtraWidth:12, shortCharacterWidth:6, node:<Quantity/> },
              { id:'save', kind:'intrinsic', intrinsicWidth:62, node:<button className="storyboard-save"><Save size={12}/><span>Save</span></button> },
              { id:'revamp', kind:'intrinsic', intrinsicWidth:62, node:<button className="storyboard-revamp-all"><WandSparkles size={12}/>All</button> },
            ] as any}/>
          </div>
          <div ref={cycleRoot} data-cycle-root style={{width:315}}>
            <FluidControlGroup className="compact-video-footer-group" ariaLabel="Mounted Video Capability Controls" gap={7} allocation={{minRows:1,maxRows:2,firstId:'model',terminalIds:['settings','run']}} recalculationKey={String(cycle)} controls={[
              {id:'model',kind:'selector',visible:true,available:true,defaultLabel:modelLabel,fullLabel:modelLabel,compactLabel:compact,intrinsicWidth:80,minimumWidth:72,shrinkPriority:'model',fixedAnchor:'first',node:<GroupedMenuSelect ariaLabel="Video Model" displayLabel={modelLabel} compactLabel={compact} defaultLabel={modelLabel} fillTrack value={'service::'+cycle} groups={[{label:'Service',options:[{value:'service::'+cycle,label:modelLabel,provider:'bytedance'}]}]} onChange={()=>{}}/>},
              {id:'motion',kind:'selector',visible:true,available:true,defaultLabel:'Native',intrinsicWidth:58,node:<GroupedMenuSelect ariaLabel="Motion" defaultLabel="Native" fillTrack value="native" groups={[{label:'',options:[{value:'native',label:'Native'}]}]} onChange={()=>{}}/>},
              {id:'ratio',kind:'selector',visible:true,available:ratioAvailable,defaultLabel:'16:9',intrinsicWidth:48,node:<GroupedMenuSelect ariaLabel="Ratio" defaultLabel="16:9" fillTrack value="16:9" groups={[{label:'',options:[{value:'16:9',label:'16:9'}]}]} onChange={()=>{}}/>},
              {id:'settings',kind:'fixed-action',visible:true,available:true,intrinsicWidth:28,fixedAnchor:'terminal',node:<button className="compact-settings compact-options"><Settings size={14}/></button>},
              {id:'run',kind:'fixed-action',visible:true,available:true,intrinsicWidth:28,fixedAnchor:'terminal',node:<span className="play-tooltip-anchor"><button className="footer-run"><Play size={14}/></button></span>},
            ] as any}/>
          </div>
        </>
      }
      window.__mounted = {
        storyboardStyleMutations:0,
        snapshot:() => { const group=document.querySelector('[aria-label="Mounted Storyboard Footer Controls"]'); const model=group?.querySelector('[data-fluid-control-id="assistant-model"] button'); const visibleLabel=[...model.querySelectorAll('.selected-label > span')].find(span=>getComputedStyle(span).display!=='none'&&span.getBoundingClientRect().width>0); window.__mounted.selectorIdentity ||= model; const budget=group?.querySelector('[data-fluid-control-id="budget"]'); return { modelText:visibleLabel?.textContent?.trim(), modelVisible:!!visibleLabel, selectorStable:window.__mounted.selectorIdentity===model, budgetWidth:budget?.getBoundingClientRect().width, ids:Array.from(group?.querySelectorAll('[data-fluid-control-id]')||[]).map(x=>x.dataset.fluidControlId), allocationCount:Number(group?.dataset.allocationCommitCount||0), rowKey:group?.querySelector('.fluid-control-group-row')?.dataset.observed, mutations:window.__mounted.storyboardStyleMutations } },
        cycleSnapshot:() => { const group=document.querySelector('[aria-label="Mounted Video Capability Controls"]'); const ids=Array.from(group?.querySelectorAll('[data-fluid-control-id]')||[]).map(x=>x.dataset.fluidControlId); const text=group?.querySelector('[data-fluid-control-id="model"] .selected-label')?.textContent?.trim()||''; return {ids,text,ratioVisible:ids.includes('ratio'),cycle:Number(document.querySelector('[data-cycle-root]')?.textContent?.length>=0)} },
      }
      createRoot(document.getElementById('root')).render(<Harness />)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}body{margin:20px;background:#111;color:#ddd}.storyboard-save,.storyboard-revamp-all{height:28px;padding:0 9px;display:flex;align-items:center;gap:5px;border:1px solid #3b3544;border-radius:999px;background:#211e27;color:#b9b1c0}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `
      const {app,BrowserWindow}=require('electron'); const path=require('node:path'); const finish=(value,code=0)=>{process.stdout.write('MOUNTED_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)}; const wait=ms=>new Promise(r=>setTimeout(r,ms));
      app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));
      app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:900,height:700,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');await wait(180);try{const initial=await win.webContents.executeJavaScript('window.__mounted.snapshot()');const loaded=await win.webContents.executeJavaScript('window.__mounted.loadClaude()');const cycles=await win.webContents.executeJavaScript('window.__mounted.runCycles()');finish({initial,loaded,sameNode:loaded.selectorStable,cycles})}catch(e){finish({error:e.stack||String(e)},1)}}).catch(e=>finish({error:e.stack||String(e)},1));
    `)
    const run = spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:40_000})
    const marker = run.stdout.split('\n').find(line=>line.startsWith('MOUNTED_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('MOUNTED_RESULT:'.length))
    expect(result.initial.modelText).toBe('Model')
    expect(result.loaded.modelText).toBe('Claude Opus 5')
    expect(result.loaded.modelVisible).toBe(true)
    expect(result.sameNode).toBe(true)
    expect(result.loaded.budgetWidth).toBeLessThanOrEqual(result.initial.budgetWidth)
    expect(result.loaded.allocationCount - result.initial.allocationCount).toBe(1)
    expect(result.cycles.rootStable).toBe(true)
    expect(result.cycles.snapshots).toHaveLength(50)
    result.cycles.snapshots.forEach((snapshot: any, index: number) => {
      expect(snapshot.ids.length).toBe(new Set(snapshot.ids).size)
      expect(snapshot.ids).toEqual(expect.arrayContaining(['model','motion','settings','run']))
      expect(snapshot.ratioVisible).toBe((index + 1) % 2 === 0)
      expect(snapshot.text).not.toBe('')
    })
  }, 50_000)

  it('keeps three reported regressions and eight production control groups full, bounded, and gap-normalized', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-control-geometry-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
      import { FluidControlGroup, GroupedMenuSelect } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
      import { Play, Save, Settings, WandSparkles } from 'lucide-react'
      const select=(id,label,width,model=false)=>({id,kind:'selector',defaultLabel:label,fullLabel:label,compactLabel:model?label.split(' · ')[0]:label,intrinsicWidth:width,minimumWidth:model?72:undefined,shrinkPriority:model?'model':undefined,node:<GroupedMenuSelect ariaLabel={id} displayLabel={label} compactLabel={model?label.split(' · ')[0]:undefined} defaultLabel={label} fillTrack value={id} groups={[{label:'Options',options:[{value:id,label,provider:model?'bytedance':undefined}]}]} onChange={()=>{}}/>})
      const fixed=(id)=>( {id,kind:'fixed-action',intrinsicWidth:28,node:id==='settings'?<button className="compact-settings compact-options"><Settings size={14}/></button>:<span className="play-tooltip-anchor"><button className="footer-run"><Play size={12}/></button></span>} )
      const quantity={id:'quantity',kind:'bounded-elastic',intrinsicWidth:42,maximumExtraWidth:24,shortCharacterWidth:5,node:<div className="quantity-stepper"><span className="quantity-stepper-inner-cluster">− x1 +</span></div>}
      function Video({name,label,sound=true,ratio=true}) { const controls=[select('model',label,80,true),select('motion','Native',54),{...select('ratio','16:9',44),available:ratio},select('duration','4s',38),quantity,select('resolution',name.includes('seedance')?'480p':'720p',48),{id:'sound',kind:'intrinsic',intrinsicWidth:64,available:sound,node:<label className="compact-toggle compact-sound"><span>Sound</span><input type="checkbox"/><i/></label>},fixed('settings'),fixed('run')]; return <Case name={name}><FluidControlGroup className="compact-video-footer-group" ariaLabel={name} gap={7} allocation={{minRows:2,maxRows:2,firstId:'model',terminalIds:['settings','run'],preferredRows:[['model','motion','ratio','duration'],['quantity','resolution','sound','settings','run']]}} recalculationKey={name} controls={controls}/></Case> }
      function Case({name,children}) { return <section data-case={name} style={{width:315}}>{children}</section> }
      function Storyboard() { return <Case name="regression-storyboard"><FluidControlGroup className="storyboard-footer-group" ariaLabel="regression-storyboard" gap={6} allocation={{minRows:1,maxRows:1,firstId:'assistant-model'}} recalculationKey="Claude Opus 5" controls={[select('assistant-model','Claude Opus 5',80,true),{id:'budget',kind:'bounded-elastic',intrinsicWidth:58,maximumExtraWidth:12,shortCharacterWidth:6,node:<div className="storyboard-budget"><span/><strong>5 / 5s</strong></div>},{id:'save',kind:'intrinsic',intrinsicWidth:62,node:<button className="storyboard-save"><Save size={12}/>Save</button>},{id:'revamp',kind:'intrinsic',intrinsicWidth:62,node:<button className="storyboard-revamp-all"><WandSparkles size={12}/>All</button>}]}/></Case> }
      function OneRow({name,controls,gap=7}) { return <Case name={name}><FluidControlGroup ariaLabel={name} gap={gap} allocation={{minRows:1,maxRows:1}} recalculationKey={name} controls={controls}/></Case> }
      function App(){return <main>
        <Video name="regression-seedance-sound" label="Seedance 2 Mini · References" sound={true}/>
        <Storyboard/>
        <Video name="regression-wan-no-sound" label="WAN 2.2 Animate · Replace" sound={false}/>
        <OneRow name="prior-image-footer" controls={[select('model','FLUX 1.1 Pro Ultra',112,true),quantity,select('ratio','16:9',52),fixed('settings'),fixed('run')]}/>
        <OneRow name="prior-voice-model" controls={[select('model','ElevenLabs Eleven v3',138,true),select('voice','Rachel',112)]}/>
        <OneRow name="prior-voice-delivery" controls={[select('language','English',92),select('output','MP3 44.1 kHz',130),select('speed','1×',52)]}/>
        <OneRow name="prior-storyboard-panel" gap={5} controls={[select('shot-size','Wide',54),select('duration','5s',42),select('camera','Static',82)]}/>
        <OneRow name="prior-wan-quality" controls={[select('native-fps','24 fps',62),select('quality','High',66),select('file','Balanced',76)]}/>
        <Video name="prior-kling" label="Kling Video v3 Pro" sound={false}/>
        <Video name="prior-veo" label="Veo 3.1 Fast" sound={true}/>
        <Video name="prior-seedance-capability" label="Seedance 2.5 Image" sound={false} ratio={false}/>
      </main>}
      window.__geometry=()=>Array.from(document.querySelectorAll('[data-case]')).map(section=>{const name=section.dataset.case;const group=section.querySelector('.equalized-control-group');const style=getComputedStyle(group);const rect=group.getBoundingClientRect();const left=rect.left+(parseFloat(style.paddingLeft)||0);const right=rect.right-(parseFloat(style.paddingRight)||0);const rows=Array.from(group.querySelectorAll(':scope > .fluid-control-group-row')).map(row=>{const boxes=Array.from(row.children).map(wrapper=>{const painted=wrapper.querySelector('[data-equalized-default],.quantity-stepper,.storyboard-budget,.compact-toggle,.play-tooltip-anchor,:scope > button,:scope > label')||wrapper;const box=painted.getBoundingClientRect();return{id:wrapper.dataset.fluidControlId,left:box.left,right:box.right,width:box.width}});return{boxes,gaps:boxes.slice(1).map((box,index)=>box.left-boxes[index].right),full:boxes.length>0&&Math.abs(boxes[0].left-left)<=1&&Math.abs(boxes.at(-1).right-right)<=1,contained:boxes.every(box=>box.left>=left-1&&box.right<=right+1)}});const boxes=rows.flatMap(row=>row.boxes);const gaps=rows.flatMap(row=>row.gaps);const model=boxes.find(box=>box.id==='model'||box.id==='assistant-model');const resolution=boxes.find(box=>box.id==='resolution');const fullLabel=[...group.querySelectorAll('[data-fluid-control-id="assistant-model"] .selected-label > span')].find(span=>getComputedStyle(span).display!=='none'&&span.getBoundingClientRect().width>0);return{name,rowCount:rows.length,full:rows.every(row=>row.full),contained:rows.every(row=>row.contained),noOverlap:gaps.every(gap=>gap>=-1),sharedGap:gaps.length<2||Math.max(...gaps)-Math.min(...gaps)<=1,modelWidth:model?.width,resolutionWidth:resolution?.width,storyboardNameVisible:!group.querySelector('[data-fluid-control-id="assistant-model"]')||fullLabel?.textContent==='Claude Opus 5',lastIds:rows.at(-1)?.boxes.slice(-2).map(box=>box.id)}})
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader:{'.png':'dataurl'}, logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}body{margin:20px;background:#111;color:#ddd}main{display:grid;grid-template-columns:repeat(3,315px);gap:30px}.storyboard-save,.storyboard-revamp-all{height:28px;padding:0 9px;display:flex;align-items:center;gap:5px;border:1px solid #3b3544;border-radius:999px;background:#211e27;color:#b9b1c0}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(value,code=0)=>{process.stdout.write('GEOMETRY_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1200,height:1000,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');await new Promise(r=>setTimeout(r,300));finish(await win.webContents.executeJavaScript('window.__geometry()'))}).catch(error=>finish({error:error.stack||String(error)},1));`)
    const run = spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:40_000})
    const marker = run.stdout.split('\n').find(line=>line.startsWith('GEOMETRY_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const results = JSON.parse(marker!.slice('GEOMETRY_RESULT:'.length))
    expect(results).toHaveLength(11)
    for (const result of results) {
      expect(result.full, result.name).toBe(true)
      expect(result.contained, result.name).toBe(true)
      expect(result.noOverlap, result.name).toBe(true)
      expect(result.sharedGap, result.name).toBe(true)
    }
    for (const name of ['regression-seedance-sound','regression-wan-no-sound','prior-kling','prior-veo','prior-seedance-capability']) {
      const result = results.find((entry: any) => entry.name === name)
      expect(result.rowCount, name).toBe(2)
      expect(result.lastIds, name).toEqual(['settings','run'])
      expect(result.resolutionWidth, name).toBeLessThan(result.modelWidth)
    }
    expect(results.find((entry: any) => entry.name === 'regression-storyboard').storyboardNameVisible).toBe(true)
  }, 50_000)
})

declare global { interface Window { __mounted: any } }
