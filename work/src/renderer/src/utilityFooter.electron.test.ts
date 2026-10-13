import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { buildSync } = require(resolve(process.cwd(), 'node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string
const directories: string[] = []
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('actual Storyboard footer shared policy', () => {
  it('reflows connected/disconnected footers with painted anchors, common spacing and unchanged callbacks/data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-utility-footer-'))
    directories.push(directory)
    const entry = join(directory, 'renderer.tsx'), bundle = join(directory, 'renderer.js'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
      import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
      import { StoryboardNode } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/UtilityNodes.tsx'))}
      import { NodeRuntimeContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
      import { ProviderAvailabilityContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderAvailabilityContext.tsx'))}
      window.__footerCalls=[]; window.__fixtureData=[]; window.__errors=[];
      window.addEventListener('error', event => window.__errors.push(event.message))
      const catalog=[{id:'claude-opus-5',label:'Claude Opus 5',provider:'omniroute'}]
      function Case({width,connected}) {
        const id=width+'-'+connected
        const data={kind:'storyboard',title:'Storyboard',runState:'idle',assistantProvider:'omniroute',assistantModelId:'claude-opus-5',storyboardPanelCount:2,storyboardPanels:[{id:'first',prompt:'Authored first shot',originalPrompt:'Authored first shot',selectedPromptVersion:'original',duration:1,shotSize:'wide',camera:'static'},{id:'second',prompt:'Authored second shot',originalPrompt:'Authored second shot',selectedPromptVersion:'original',duration:1,shotSize:'medium',camera:'static'}]}
        window.__fixtureData.push(data)
        const runtime=new Proxy({connectedStoryboardVideo:()=>connected?{duration:5,durationOptions:[1,2,3,5],minimumSeconds:1}:undefined,connectedInputRules:()=>[],availablePromptTags:()=>[],availablePromptModels:provider=>provider==='omniroute'?catalog:[],availableModels:provider=>provider==='omniroute'?catalog:[],modelAvailabilityVerified:()=>true,saveStoryboard:nodeId=>{window.__footerCalls.push(['save',nodeId]);return true},rewriteStoryboardPanel:nodeId=>window.__footerCalls.push(['revamp',nodeId]),updateNode:(nodeId,patch)=>window.__footerCalls.push(['update',nodeId,patch])},{get:(target,key)=>key in target?target[key]:()=>undefined})
        return <section data-case={id} data-width={width} style={{width,height:620}}><NodeRuntimeContext.Provider value={runtime}><ProviderAvailabilityContext.Provider value={{mediaConnected:new Set(['omniroute']),promptConnected:new Set(['omniroute'])}}><ReactFlowProvider><ReactFlow nodeTypes={{storyboard:StoryboardNode}} nodes={[{id,type:'storyboard',position:{x:0,y:0},data,style:{width}}]} edges={[]} defaultViewport={{x:0,y:0,zoom:1}} minZoom={1} maxZoom={1} proOptions={{hideAttribution:true}} /></ReactFlowProvider></ProviderAvailabilityContext.Provider></NodeRuntimeContext.Provider></section>
      }
      const box=element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,centerY:(r.top+r.bottom)/2}}
      window.__utilityFooterProbe=async()=>{
        await document.fonts.ready; await new Promise(resolve=>setTimeout(resolve,450))
        const originalData=JSON.stringify(window.__fixtureData)
        const geometry=[...document.querySelectorAll('[data-case]')].map(section=>{
          const footer=section.querySelector('.storyboard-footer'),group=section.querySelector('[aria-label="Storyboard Footer Controls"]'),f=box(footer),style=getComputedStyle(footer)
          const rows=[...group.querySelectorAll('.fluid-control-group-row')].map(row=>({box:box(row),controls:[...row.querySelectorAll(':scope > [data-fluid-control-id]')].map(wrapper=>({id:wrapper.dataset.fluidControlId,...box(wrapper.querySelector('[data-equalized-default],.storyboard-budget,button')||wrapper)}))})).filter(row=>row.controls.length)
          const actions=[...footer.querySelectorAll('button')];const headers=[...footer.querySelectorAll('label > span')].filter(span=>getComputedStyle(span).display!=='none').map(span=>span.textContent)
          return{id:section.dataset.case,width:Number(section.dataset.width),footer:f,insets:[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft].map(parseFloat),rows,headers,actionLabels:actions.map(button=>button.getAttribute('aria-label')),allShape:box(footer.querySelector('[aria-label="Revamp All"]')),allRadius:getComputedStyle(footer.querySelector('[aria-label="Revamp All"]')).borderRadius}
        })
        document.querySelector('[data-case="315-true"] [aria-label="Save Storyboard"]').click();await new Promise(resolve=>setTimeout(resolve,60));document.querySelector('[data-case="315-true"] [aria-label="Revamp All"]').click();await new Promise(resolve=>setTimeout(resolve,30))
        return{geometry,calls:window.__footerCalls,authoredDataPreserved:originalData===JSON.stringify(window.__fixtureData),errors:window.__errors}
      }
      createRoot(document.getElementById('root')).render(<main>{[250,315,375].flatMap(width=>[false,true].map(connected=><Case key={width+'-'+connected} width={width} connected={connected}/>))}</main>)
    `)
    buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.svg': 'dataurl', '.png': 'dataurl' }, logLevel: 'silent' })
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}body{margin:12px;background:#111;color:#ddd}main{display:grid;grid-template-columns:repeat(3,400px);gap:12px}.storyboard-node{width:100%}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
    writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('UTILITY_FOOTER_RESULT:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1280,height:1350,webPreferences:{contextIsolation:false,sandbox:false}});let remoteRequests=0;win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_details,callback)=>{remoteRequests++;callback({cancel:true})});await win.loadFile(${JSON.stringify(html)});const result=await win.webContents.executeJavaScript('window.__utilityFooterProbe()');result.remoteRequests=remoteRequests;if(process.env.PRISM_UTILITY_FOOTER_EVIDENCE){require('node:fs').writeFileSync(process.env.PRISM_UTILITY_FOOTER_EVIDENCE,JSON.stringify(result,null,2));require('node:fs').writeFileSync(process.env.PRISM_UTILITY_FOOTER_EVIDENCE.replace(/\\.json$/i,'.png'),(await win.webContents.capturePage()).toPNG())}finish(result)}).catch(error=>finish({error:error.stack||String(error)},1))`)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 45_000 })
    const marker = run.stdout.split('\n').find(line => line.startsWith('UTILITY_FOOTER_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('UTILITY_FOOTER_RESULT:'.length))
    expect(result.error).toBeUndefined(); expect(result.errors).toEqual([]); expect(result.remoteRequests).toBe(0)
    expect(result.authoredDataPreserved).toBe(true)
    expect(result.calls).toEqual([['save', '315-true'], ['revamp', '315-true']])
    expect(result.geometry).toHaveLength(6)
    for (const geometry of result.geometry) {
      const context = JSON.stringify(geometry)
      expect(geometry.insets, context).toEqual([12,12,12,12]); expect(geometry.headers, context).toEqual([])
      const controls = geometry.rows.flatMap((row: any) => row.controls)
      expect(controls[0]?.id, context).toBe('assistant-model')
      expect(controls.at(-1)?.id, context).toBe('revamp')
      expect(controls.filter((control: any) => control.id === 'budget').length).toBe(geometry.id.endsWith('true') ? 1 : 0)
      const lastRow=geometry.rows.at(-1), last=lastRow.controls.at(-1)
      expect(last.right,context).toBeCloseTo(geometry.footer.right-12,0)
      const save=controls.find((control:any)=>control.id==='save'); expect(save.width,context).toBeCloseTo(28,1);expect(save.height,context).toBeCloseTo(28,1)
      expect(geometry.allShape.height,context).toBeCloseTo(28,1); expect(geometry.allShape.width,context).toBeGreaterThan(28)
      for (const row of geometry.rows) {
        for (const control of row.controls) {expect(control.left,context).toBeGreaterThanOrEqual(geometry.footer.left+11.5);expect(control.right,context).toBeLessThanOrEqual(geometry.footer.right-11.5)}
        for (let index=1;index<row.controls.length;index++) {expect(row.controls[index].left-row.controls[index-1].right,context).toBeCloseTo(7,0);expect(row.controls[index].centerY,context).toBeCloseTo(row.controls[index-1].centerY,0)}
      }
      for(let index=1;index<geometry.rows.length;index++) expect(geometry.rows[index].box.top-geometry.rows[index-1].box.bottom,context).toBeCloseTo(7,0)
      const saveRow=geometry.rows.find((row:any)=>row.controls.some((control:any)=>control.id==='save'))
      if(saveRow===lastRow) expect(lastRow.controls.at(-2).id,context).toBe('save')
      else {expect(saveRow.controls.at(-1).id,context).toBe('save');expect(save.right,context).toBeCloseTo(geometry.footer.right-12,0)}
    }
  }, 60_000)
})
