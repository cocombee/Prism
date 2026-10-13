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

describe('direct production Image and semantic control geometry', () => {
  it('fills the actual footer interior for Image and every semantic Single surface at canonical and scaled Canvas zoom', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-image-semantic-geometry-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')

    writeFileSync(entry, `
      import React from 'react'
      import { createRoot } from 'react-dom/client'
      import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
      import { NodeCard, NodeRuntimeContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
    import { ProviderAvailabilityContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderAvailabilityContext.tsx'))}

      window.__errors=[]
      window.addEventListener('error', event => { if (!String(event.message).includes('ResizeObserver loop')) window.__errors.push(event.error?.stack || event.message) })
      window.addEventListener('unhandledrejection', event => window.__errors.push(event.reason?.stack || String(event.reason)))
      const noop=()=>undefined
      const runtime=new Proxy({
        characterLibrary:[], semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},
        videoPromptState:()=>null, nodeMediaLinkState:()=>undefined, connectedReferenceTags:()=>[], connectedInputRules:()=>[], availablePromptTags:()=>[],
        connectedInputMedia:()=>undefined, connectedStoryboardVideoFamily:()=>undefined, generatedMediaFavorite:()=>false,
        providerAccount:()=>undefined, providerConnected:()=>true, runReadiness:()=>({disabled:false,tooltip:'Ready'}), estimateNode:async()=>null,
        availableModels:()=>[], updateNode:()=>undefined,
      },{get(target,key){return key in target?target[key]:noop}})
      const image=(provider,model,format='png',resolution='1K')=>({kind:'image-generator',title:'Image Generator',prompt:'Portrait fixture',imageProvider:provider,imageModelId:model,outputFormat:format,imageResolution:resolution,quantity:1,aspectRatio:'2:3',runState:'idle'})
      const semantic=(kind)=>({kind,title:kind,prompt:'Semantic fixture',styleDescription:kind==='style-reference'?'Public style fixture':undefined,stylePrompt:kind==='style-reference'?'Private style fixture':undefined,imageProvider:'fal',imageModelId:'fal-ai/nano-banana-pro/edit',outputFormat:'png',imageResolution:'4K',quantity:1,characterInputMode:kind==='character'?'single':undefined,elementInputMode:kind==='element'?'single':undefined,characterEditorOpen:kind==='character',styleEditorOpen:kind==='style-reference',semanticEditorOpen:!['character','style-reference'].includes(kind),referenceAssets:[],semanticAssetLifecycle:{version:1,status:'EMPTY',references:[]},runState:'idle'})
      const semanticKinds=['character','wardrobe','element','style-reference','location']
      const cases=[
        ['image-nano-webp-large',image('fal','fal-ai/nano-banana-pro','webp','4K'),1],
        ['image-bfl-png',image('fal','fal-ai/flux/schnell','png','1K'),1],
        ['image-bfl-png-z08',image('fal','fal-ai/flux/schnell','png','1K'),.8],
        ['image-google-png-large',image('google','gemini-3.1-flash-image','png','4K'),1],
        ['image-openai-jpeg',image('openai','gpt-image-2','jpeg','1K'),1],
        ...semanticKinds.flatMap(kind=>[[kind+'-single',semantic(kind),1],[kind+'-single-z08',semantic(kind),.8]]),
      ]
      function Mount({name,data,zoom}){const nodes=[{id:name,type:'studio',position:{x:0,y:0},style:{width:315},data}];return <section data-case={name} data-zoom={zoom} style={{width:350,height:650}}><ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard}} defaultViewport={{x:0,y:0,zoom}} minZoom={.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></section>}
      function App(){return <main>{cases.map(([name,data,zoom])=><Mount key={name} name={name} data={data} zoom={zoom}/>)}</main>}
      const box=element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
      const painted=wrapper=>wrapper.querySelector('[data-equalized-default],.quantity-stepper,.play-tooltip-anchor,:scope > button,:scope > label')||wrapper
      const visibleLabel=wrapper=>Array.from(wrapper.querySelectorAll('.selected-label-full,.selected-label-compact')).find(element=>getComputedStyle(element).display!=='none')
      const inspect=section=>{
        const zoom=Number(section.dataset.zoom);const node=section.querySelector('.studio-node');const group=node.querySelector('[aria-label="Image Controls"],[aria-label="Semantic Image Controls"]');const footer=group.closest('.compact-generator-footer');const g=box(group);const f=box(footer);const footerStyle=getComputedStyle(footer);const footerLeft=f.left+(parseFloat(footerStyle.paddingLeft)||0)*zoom;const footerRight=f.right-(parseFloat(footerStyle.paddingRight)||0)*zoom;const style=getComputedStyle(group);const left=g.left+(parseFloat(style.paddingLeft)||0)*zoom;const right=g.right-(parseFloat(style.paddingRight)||0)*zoom;const expectedGap=(parseFloat(style.rowGap)||parseFloat(style.gap)||0)*zoom;const tolerance=1.25*zoom;
        const rows=Array.from(group.querySelectorAll(':scope > .fluid-control-group-row')).map(row=>{const controls=Array.from(row.children).map(wrapper=>{const p=box(painted(wrapper));const label=visibleLabel(wrapper);const trigger=label?.closest('button');return{id:wrapper.dataset.fluidControlId,tier:wrapper.dataset.fluidLabelTier,text:label?.textContent?.trim()||wrapper.textContent.trim(),readable:!label||label.scrollWidth<=label.clientWidth+1,...p,triggerWidth:trigger?box(trigger).width:undefined}});return{controls,gaps:controls.slice(1).map((item,index)=>item.left-controls[index].right),...box(row)}})
        const verticalGaps=rows.slice(1).map((row,index)=>row.top-rows[index].bottom);const allGaps=rows.flatMap(row=>row.gaps);const ids=rows.map(row=>row.controls.map(control=>control.id));const counts=rows.map(row=>row.controls.length);const run=rows.at(-1).controls.at(-1);const model=rows[0].controls[0];const groupLabel=group.getAttribute('aria-label');const format=node.querySelector('[aria-label^="Format:"]');
        return{name:section.dataset.case,zoom,groupLabel,nodeWidth:box(node).width/zoom,footerWidth:f.width/zoom,footerContentWidth:(footerRight-footerLeft)/zoom,groupWidth:g.width/zoom,groupLeftInset:(g.left-footerLeft)/zoom,groupRightInset:(footerRight-g.right)/zoom,nodeRunRemainder:(box(node).right-run.right)/zoom,footerRightInset:parseFloat(footerStyle.paddingRight),nodeRightBorder:parseFloat(getComputedStyle(node).borderRightWidth),rowCount:rows.length,rows:ids,rowCounts:counts,controls:rows.flatMap(row=>row.controls.map(control=>({id:control.id,text:control.text,width:control.width/zoom,tier:control.tier,readable:control.readable}))),horizontalGap:(allGaps[0]||0)/zoom,verticalGap:(verticalGaps[0]||0)/zoom,expectedGap:expectedGap/zoom,firstRemainder:(model.left-left)/zoom,rightRemainder:(right-run.right)/zoom,fullEdges:rows.every(row=>Math.abs(row.controls[0].left-left)<=tolerance&&Math.abs(row.controls.at(-1).right-right)<=tolerance),sharedGaps:allGaps.every(gap=>Math.abs(gap-expectedGap)<=tolerance)&&verticalGaps.every(gap=>Math.abs(gap-expectedGap)<=tolerance),noOverlap:allGaps.every(gap=>gap>=-tolerance)&&verticalGaps.every(gap=>gap>=-tolerance),readable:rows.flatMap(row=>row.controls).every(control=>control.readable),closedFormat:format?.querySelector('.selected-label-full,.selected-label-compact')?.textContent?.trim(),modelText:node.querySelector('[data-fluid-control-id="model"] .selected-label-full,[data-fluid-control-id="model"] .selected-label-compact')?.textContent?.trim()}
      }
      window.__probe=async()=>{await document.fonts.ready;await new Promise(resolve=>setTimeout(resolve,500));const geometry=Array.from(document.querySelectorAll('[data-case]')).map(inspect);const trigger=document.querySelector('[data-case="image-nano-webp-large"] [aria-label="Format: WebP"]');trigger.click();await new Promise(resolve=>setTimeout(resolve,50));const webpMenu=Array.from(document.querySelectorAll('[role="listbox"] [role="option"]')).map(option=>option.textContent.trim());return{geometry,webpMenu,errors:window.__errors}}
      createRoot(document.getElementById('root')).render(<App/>)
    `)

    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader: { '.svg': 'dataurl','.png':'dataurl'}, logLevel:'silent' })
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve(process.cwd(), 'src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}body{margin:20px;background:#111;color:#ddd}main{display:grid;grid-template-columns:repeat(3,350px);gap:36px;align-items:start}</style></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
    writeFileSync(main, `const{app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(v,c=0)=>{process.stdout.write('IMAGE_SEMANTIC_GEOMETRY:'+JSON.stringify(v)+'\\n');app.exit(c)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1200,height:1500,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});finish(await win.webContents.executeJavaScript('window.__probe()'))}).catch(e=>finish({error:e.stack||String(e)},1))`)
    const run=spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:50_000})
    const marker=run.stdout.split('\n').find(line=>line.startsWith('IMAGE_SEMANTIC_GEOMETRY:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const payload=JSON.parse(marker!.slice('IMAGE_SEMANTIC_GEOMETRY:'.length))
    if(process.env.PRISM_GEOMETRY_REPORT==='1') console.log('IMAGE_SEMANTIC_GEOMETRY_REPORT '+JSON.stringify(payload))
    expect(payload.errors).toEqual([])
    expect(payload.geometry).toHaveLength(15)
    for(const result of payload.geometry){
      expect(result.nodeWidth,result.name).toBeCloseTo(result.name.startsWith('image-')?360:315,1)
      expect(result.groupWidth,result.name).toBeCloseTo(result.footerContentWidth,1)
      expect(Math.abs(result.groupLeftInset),JSON.stringify(result)).toBeLessThanOrEqual(1.25)
      expect(Math.abs(result.groupRightInset),JSON.stringify(result)).toBeLessThanOrEqual(1.25)
      expect(result.footerRightInset,JSON.stringify(result)).toBe(12); expect(result.nodeRunRemainder,JSON.stringify(result)).toBeCloseTo(12+result.nodeRightBorder,1)
      expect(result.rows[0][0],result.name).toBe('model')
      expect(result.rows[0].length,result.name).toBeGreaterThan(1)
      expect(result.rowCount,result.name).toBeGreaterThanOrEqual(2)
      expect(result.rowCount,result.name).toBeLessThanOrEqual(3)
      expect(Math.max(...result.rowCounts)-Math.min(...result.rowCounts),JSON.stringify(result)).toBeLessThanOrEqual(1)
      expect(result.rowCounts.at(-1),result.name).toBeGreaterThanOrEqual(3)
      expect(result.fullEdges,JSON.stringify(result)).toBe(true)
      expect(result.sharedGaps,JSON.stringify(result)).toBe(true)
      expect(result.noOverlap,JSON.stringify(result)).toBe(true)
      expect(result.readable,JSON.stringify(result)).toBe(true)
      expect(Math.abs(result.firstRemainder),JSON.stringify(result)).toBeLessThanOrEqual(1.25)
      expect(Math.abs(result.rightRemainder),JSON.stringify(result)).toBeLessThanOrEqual(1.25)
      const terminal=result.groupLabel==='Semantic Image Controls'?['save','settings','run']:['ratio','settings','run']
      expect(result.rows.at(-1).slice(-3),JSON.stringify(result)).toEqual(terminal)
    }
    const image=payload.geometry.find((result:any)=>result.name==='image-bfl-png')
    const semantic=payload.geometry.find((result:any)=>result.name==='element-single')
    const normalize=(rows:string[][])=>rows.map(row=>row.map(id=>id==='ratio'||id==='save'?'slot':id))
    expect(normalize(image.rows)).toEqual(normalize(semantic.rows))
    expect(image.rowCounts).toEqual(semantic.rowCounts)
    expect(image.horizontalGap).toBeCloseTo(semantic.horizontalGap,2)
    expect(image.verticalGap).toBeCloseTo(semantic.verticalGap,2)
    for(const id of ['quantity','settings','run']){
      const a=image.controls.find((control:any)=>control.id===id);const b=semantic.controls.find((control:any)=>control.id===id)
      expect(a.width,id).toBeCloseTo(b.width,1)
    }
    expect(image.closedFormat).toBe('PNG')
    for(const kind of ['character','wardrobe','element','style-reference','location']) expect(payload.geometry.find((result:any)=>result.name===kind+'-single').closedFormat).toBe('PNG')
    expect(payload.geometry.find((result:any)=>result.name==='image-nano-webp-large').closedFormat).toBe('WebP')
    expect(payload.geometry.find((result:any)=>result.name==='image-openai-jpeg').closedFormat).toBe('JPEG')
    expect(payload.webpMenu).toEqual(['PNG','JPEG','WebP'])
  },60_000)
})

declare global { interface Window { __probe: () => unknown; __errors: unknown[] } }
