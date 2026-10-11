import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const canvasHandSource = readFileSync(new URL('canvasHandTool.electron.tsx', import.meta.url), 'utf8')

const require = createRequire(import.meta.url)
const { buildSync } = require(resolve(process.cwd(), 'node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string
const temporaryDirectories: string[] = []
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }) })

describe('actual production NodeCardNext and Storyboard geometry', () => {
  it('keeps production controls bounded, readable, ordered, and collision-free at 315px and Canvas zoom', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-actual-component-layout-'))
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
      import { StoryboardNode } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/UtilityNodes.tsx'))}

      window.__errors=[]
      window.addEventListener('error', event => window.__errors.push(event.error?.stack || event.message))
      window.addEventListener('unhandledrejection', event => window.__errors.push(event.reason?.stack || String(event.reason)))
      const noop = () => undefined
      const runtime = new Proxy({
        characterLibrary: [], storyboardLibrary: [],
        semanticLibraries: { element: [], location: [], wardrobe: [], 'style-reference': [] },
        videoPromptState: () => null,
        nodeMediaLinkState: () => undefined,
        connectedReferenceTags: () => [], connectedInputRules: () => [], availablePromptTags: () => [],
        connectedInputMedia: () => undefined, connectedStoryboardVideoFamily: () => undefined,
        generatedMediaFavorite: () => false,
        providerAccount: () => undefined, providerConnected: () => true,
        runReadiness: () => ({ disabled: false, tooltip: 'Ready' }),
        estimateNode: async () => null,
        availableModels: (provider) => provider === 'anthropic' ? [{ id: 'claude-opus-5', label: 'Claude Opus 5' }] : [],
      }, { get(target, property) { return property in target ? target[property] : noop } })

      const generated = [{ path: '/tmp/output.mp4', url: 'file:///tmp/output.mp4', type: 'video', modelId: 'fixture' }]
      const props = (id, data) => ({ id, data, selected: false, type: 'studio', dragging: false, zIndex: 0, isConnectable: true, positionAbsoluteX: 0, positionAbsoluteY: 0 })
      const videos = [
        ['seedance-reference', { kind:'video-generator', title:'Seedance Reference', videoEngine:'bytedance/seedance-2.0/mini/reference-to-video', prompt:'Use references', outputUrl:'file:///tmp/output.mp4', outputPath:'/tmp/output.mp4', outputType:'video', generatedResults:generated, runState:'complete', aspectRatio:'16:9', duration:4, resolution:'480p', quantity:1, generateAudio:true }],
        ['seedance-image', { kind:'video-generator', title:'Seedance Image', videoEngine:'bytedance/seedance-2.5/image-to-video', prompt:'Animate image', runState:'idle', aspectRatio:'16:9', duration:4, resolution:'480p', quantity:4, generateAudio:false }],
        ['seedance-fast', { kind:'video-generator', title:'Seedance Fast', videoEngine:'bytedance/seedance-2.0/fast/text-to-video', prompt:'Move fast', runState:'idle', aspectRatio:'16:9', duration:4, resolution:'480p', quantity:1, generateAudio:true }],
        ['wan-controlled', { kind:'video-generator', title:'WAN Controlled', videoEngine:'wan-controlled', prompt:'Controlled motion', runState:'complete', aspectRatio:'16:9', duration:4, resolution:'720p', quantity:1, frameRate:24, videoQuality:'high', videoWriteMode:'balanced' }],
      ]
      const storyboard = { kind:'storyboard', title:'Storyboard', storyboardEditorOpen:true, storyboardMode:'single', storyboardDuration:6, storyboardModelId:'bytedance/seedance-2.0/mini/reference-to-video', assistantProvider:'anthropic', assistantModelId:'claude-opus-5', storyboardPanels:[
        { id:'panel-1', prompt:'First shot', duration:3, shotSize:'medium', camera:'push-in', audioCue:'', locked:false },
        { id:'panel-2', prompt:'Second shot', duration:3, shotSize:'wide', camera:'static', audioCue:'', locked:false },
      ] }
      const nodeTypes = { studio: NodeCard, storyboard: StoryboardNode }
      function Mount({ name, data, zoom=1, storyboardNode=false }) { const nodes=[{id:name,type:storyboardNode?'storyboard':'studio',position:{x:0,y:0},style:{width:315},data}]; return <section data-case={name} data-zoom={zoom} style={{ width:350, height:storyboardNode?850:650 }}><ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true,openai:true,google:true,higgsfield:true,elevenlabs:true,fish:true},promptConnected:{openai:true,anthropic:true,google:true,omniroute:true,deepseek:true,moonshot:true}}}><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} defaultViewport={{x:0,y:0,zoom}} minZoom={0.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></section> }
      function App(){return <main>{videos.map(([name,data])=><Mount key={name} name={name} data={data}/>)}<Mount name="storyboard" data={storyboard} storyboardNode/><Mount name="seedance-reference-zoom" data={videos[0][1]} zoom={0.8}/></main>}

      const tolerance = (section) => Number(section.dataset.zoom || 1) * 1.25
      const rect = (element) => { const value=element.getBoundingClientRect(); return {left:value.left,right:value.right,top:value.top,bottom:value.bottom,width:value.width,height:value.height,cx:value.left+value.width/2,cy:value.top+value.height/2} }
      const painted = (wrapper) => wrapper.querySelector('[data-equalized-default],.quantity-stepper,.storyboard-budget,.compact-toggle,.play-tooltip-anchor,:scope > button,:scope > label') || wrapper
      const visibleText = (wrapper) => { const labels=Array.from(wrapper.querySelectorAll('.selected-label-full,.selected-label-compact')).filter(element => getComputedStyle(element).display !== 'none').map(element=>element.textContent.trim()).join(' '); return labels || wrapper.querySelector('.storyboard-compact-select > button > span')?.textContent?.trim() || '' }
      const paintedTextRect = (element) => { const range=document.createRange(); const node=element?.firstChild; if(!node)return rect(element); range.selectNodeContents(node); const value=range.getBoundingClientRect(); return {left:value.left,right:value.right,top:value.top,bottom:value.bottom,width:value.width,height:value.height} }
      const inspectGroup = (section, group) => {
        const groupBox=rect(group); const groupStyle=getComputedStyle(group); const usableLeft=groupBox.left+(parseFloat(groupStyle.paddingLeft)||0)*Number(section.dataset.zoom||1); const usableRight=groupBox.right-(parseFloat(groupStyle.paddingRight)||0)*Number(section.dataset.zoom||1); const rows=Array.from(group.querySelectorAll(':scope > .fluid-control-group-row')).map(row=>{
          const boxes=Array.from(row.children).map(wrapper=>({id:wrapper.dataset.fluidControlId,tier:wrapper.dataset.fluidLabelTier,text:visibleText(wrapper),...rect(painted(wrapper))}));
          return { boxes, gaps:boxes.slice(1).map((box,index)=>box.left-boxes[index].right), ...rect(row) }
        });
        const expectedGap=(parseFloat(groupStyle.rowGap)||parseFloat(groupStyle.gap)||0)*Number(section.dataset.zoom||1); const verticalGaps=rows.slice(1).map((row,index)=>row.top-rows[index].bottom);
        return { label:group.getAttribute('aria-label'), group:groupBox, rows, boxes:rows.flatMap(row=>row.boxes), expectedGap, verticalGaps, contained:rows.every(row=>row.boxes.every(box=>box.left>=usableLeft-tolerance(section)&&box.right<=usableRight+tolerance(section))), fullEdges:rows.every(row=>Math.abs(row.boxes[0].left-usableLeft)<=tolerance(section)&&Math.abs(row.boxes.at(-1).right-usableRight)<=tolerance(section)), noOverlap:rows.every(row=>row.gaps.every(gap=>gap>=-tolerance(section))), sharedGap:rows.flatMap(row=>row.gaps).every(value=>Math.abs(value-expectedGap)<=tolerance(section))&&verticalGaps.every(value=>Math.abs(value-expectedGap)<=tolerance(section)) }
      }
      window.__actualGeometry=()=>Array.from(document.querySelectorAll('[data-case]')).map(section=>{
        const node=section.querySelector('.studio-node,.storyboard-node'); const nodeBox=rect(node); const groups=Array.from(node.querySelectorAll('.equalized-control-group')).map(group=>inspectGroup(section,group));
        const footer=groups.find(group=>group.label==='Video Footer Controls'||group.label==='Storyboard Footer Controls');
        const quality=groups.find(group=>group.label==='Primary Video Quality Controls');
        const settings=footer?.boxes.find(box=>box.id==='settings'); const action=footer?.boxes.find(box=>box.id==='run'); const model=footer?.boxes.find(box=>box.id==='model'||box.id==='assistant-model'); const resolution=footer?.boxes.find(box=>box.id==='resolution'); const quantity=footer?.boxes.find(box=>box.id==='quantity');
        const quantityCluster=footer?.label==='Video Footer Controls' ? rect(node.querySelector('.quantity-stepper-inner-cluster')) : undefined;
        const terminalButtons=footer?.label==='Video Footer Controls' ? [node.querySelector('[aria-label="Node Settings"]'),node.querySelector('[aria-label="Run"], [aria-label="Rerun"], [aria-label="Stop"]')].filter(Boolean).map(button=>{const box=rect(button);const icon=rect(button.querySelector('svg'));return{...box,icon,radius:parseFloat(getComputedStyle(button).borderRadius)||0}}) : [];
        const panel=groups.find(group=>group.label==='Panel 1 controls'); const storyboardFooter=groups.find(group=>group.label==='Storyboard Footer Controls');
        const save=storyboardFooter?.boxes.find(box=>box.id==='save'); const revamp=storyboardFooter?.boxes.find(box=>box.id==='revamp');
        const sound=node.querySelector('[aria-label="Generate Native Sound"]'); const soundBox=sound?rect(sound):undefined; const soundIcon=sound?.querySelector('svg'); const soundIconBox=soundIcon?rect(soundIcon):undefined;
        const saveButton=node.querySelector('[aria-label="Save Storyboard"]'); const saveButtonBox=saveButton?rect(saveButton):undefined; const saveIcon=saveButton?.querySelector('svg'); const saveIconBox=saveIcon?rect(saveIcon):undefined;
        const selectorSlack=panel?panel.boxes.map(box=>{const trigger=node.querySelector('[data-fluid-control-id="'+box.id+'"] .storyboard-compact-select > button');const span=trigger?.querySelector('span');const chevron=trigger?.querySelector('svg');return span&&chevron?rect(chevron).left-rect(span).right:null}):[];
        return { name:section.dataset.case, zoom:Number(section.dataset.zoom), node:nodeBox, nodeOpen:Boolean(node.querySelector('.node-open')), terminalArrow:Boolean(node.querySelector('.compact-generator-footer .lucide-arrow-up-right')), groups, allContained:groups.every(group=>group.contained&&group.fullEdges&&group.group.left>=nodeBox.left-tolerance(section)&&group.group.right<=nodeBox.right+tolerance(section)), noOverlap:groups.every(group=>group.noOverlap), sharedGap:groups.every(group=>group.sharedGap), settingsBeforeAction:Boolean(settings&&action&&footer.rows.at(-1).boxes.slice(-2).map(box=>box.id).join(',')==='settings,run'&&settings.right<=action.left+tolerance(section)&&Math.abs(settings.cy-action.cy)<=tolerance(section)), operationalFull:footer?.label!=='Video Footer Controls'||footer.boxes.filter(box=>['motion','ratio','duration','resolution'].includes(box.id)).every(box=>box.tier==='full'&&box.text.length>0), shortBounded:!model||footer.rows.filter(row=>row.boxes.some(box=>box.id===model.id)).flatMap(row=>row.boxes).filter(box=>['motion','ratio','duration','resolution'].includes(box.id)).every(box=>box.width<=model.width+tolerance(section)), modelTier:model?.tier, modelClosed:node.querySelector('[data-fluid-control-id="model"] .selected-label-full')?.textContent?.trim(), modelAccessible:node.querySelector('[data-fluid-control-id="model"] button')?.getAttribute('aria-description'), modelMenu:JSON.parse(node.querySelector('[data-fluid-control-id="model"] button')?.dataset.equalizedOptions||'[]'), footerIds:footer?.boxes.map(box=>box.id), quantitySymmetric:!quantity||!quantityCluster||Math.abs((quantityCluster.cx-quantity.left)-(quantity.right-quantityCluster.cx))<=tolerance(section), terminalEqual:terminalButtons.length===0||terminalButtons.every(button=>Math.abs(button.width-button.height)<=tolerance(section)&&Math.abs(button.icon.width-button.icon.height)<=tolerance(section)&&Math.abs(button.width-terminalButtons[0].width)<=tolerance(section)&&button.radius>=button.width/2-tolerance(section)), soundGeometry:!soundBox?null:{width:soundBox.width,height:soundBox.height,iconWidth:soundIconBox?.width,iconHeight:soundIconBox?.height,pressed:sound.getAttribute('aria-pressed'),disabled:sound.disabled}, saveGeometry:!saveButtonBox?null:{width:saveButtonBox.width,height:saveButtonBox.height,iconWidth:saveIconBox?.width,iconHeight:saveIconBox?.height,text:saveButton.textContent.trim(),classes:saveButton.className}, qualityValues:quality?.boxes.map(box=>({id:box.id,text:box.text,tier:box.tier})), panelValues:panel?.boxes.map(box=>({id:box.id,text:box.text,tier:box.tier})), selectorSlack, storyboardFull:storyboardFooter?.boxes.find(box=>box.id==='assistant-model')?.tier==='full'&&storyboardFooter?.boxes.find(box=>box.id==='assistant-model')?.text.includes('Claude Opus 5'), storyboardActionsRight:Boolean(save&&revamp&&save.right<=revamp.left+tolerance(section)&&revamp.right<=storyboardFooter.group.right+tolerance(section)), panelLeft:!panel||panel.boxes.every(box=>{const trigger=node.querySelector('[data-fluid-control-id="'+box.id+'"] .storyboard-compact-select > button');return trigger&&getComputedStyle(trigger).justifyContent==='flex-start'}), utilityActionIds:Array.from(node.querySelectorAll(':scope > .utility-node-toolbar button')).map(button=>button.getAttribute('aria-label')), errors:window.__errors }
      })
      window.__saveLifecycle=async()=>{const button=document.querySelector('[data-case="storyboard"] [aria-label="Save Storyboard"]');button.click();await new Promise(r=>setTimeout(r,0));const saving=button.dataset.savePhase;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const saved=button.dataset.savePhase;await new Promise(r=>setTimeout(r,2050));return [saving,saved,button.dataset.savePhase]}
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints:[entry], outfile:bundle, bundle:true, format:'iife', platform:'browser', target:'chrome120', nodePaths:[resolve(process.cwd(),'node_modules')], jsx:'automatic', loader: { '.svg': 'dataurl','.png':'dataurl'}, logLevel:'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}body{margin:20px;background:#111;color:#ddd}main{display:grid;grid-template-columns:repeat(3,315px);gap:44px;align-items:start}section[data-case="storyboard"]{width:315px}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(value,code=0)=>{process.stdout.write('ACTUAL_COMPONENT_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1200,height:1400,webPreferences:{contextIsolation:false,sandbox:false}});const consoleErrors=[];win.webContents.on('console-message',(_event,details)=>{if(details.level==='error')consoleErrors.push(details.message)});await win.loadFile(${JSON.stringify(html)});await win.webContents.executeJavaScript('document.fonts.ready');await new Promise(r=>setTimeout(r,500));const geometry=await win.webContents.executeJavaScript('window.__actualGeometry()');if(!geometry.length)return finish({error:'No mounted cases',consoleErrors,errors:await win.webContents.executeJavaScript('window.__errors'),body:await win.webContents.executeJavaScript('document.body.innerText')},1);const saveLifecycle=await win.webContents.executeJavaScript('window.__saveLifecycle()');finish({geometry,saveLifecycle})}).catch(error=>finish({error:error.stack||String(error)},1));`)
    const run = spawnSync(electronPath,[main],{cwd:directory,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:50_000})
    const marker = run.stdout.split('\n').find(line=>line.startsWith('ACTUAL_COMPONENT_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const payload = JSON.parse(marker!.slice('ACTUAL_COMPONENT_RESULT:'.length))
    const results = payload.geometry
    expect(payload.saveLifecycle).toEqual(['saving', 'saved', 'neutral'])
    expect(results, JSON.stringify(results, null, 2)).toHaveLength(6)
    for (const result of results) {
      expect(result.allContained, JSON.stringify(result, null, 2)).toBe(true)
      expect(result.noOverlap, JSON.stringify(result, null, 2)).toBe(true)
      expect(result.sharedGap, JSON.stringify(result, null, 2)).toBe(true)
    }
    for (const result of results.filter((entry: any) => entry.name !== 'storyboard')) {
      expect(result.nodeOpen, result.name).toBe(false)
      expect(result.terminalArrow, result.name).toBe(false)
      expect(result.settingsBeforeAction, result.name).toBe(true)
      expect(result.shortBounded, JSON.stringify(result, null, 2)).toBe(true)
      expect(result.operationalFull, result.name).toBe(true)
      expect(result.modelTier, JSON.stringify(result, null, 2)).toBe('full')
      expect(result.quantitySymmetric, result.name).toBe(true)
      expect(result.terminalEqual, result.name).toBe(true)
    }
    const expectedClosed: Record<string, [string, string]> = {
      'seedance-reference': ['Seedance 2 Mini…', 'Seedance 2 Mini · References'],
      'seedance-image': ['Seedance 2.5…', 'Seedance 2.5 · Image'],
      'seedance-fast': ['Seedance 2 Fast…', 'Seedance 2 Fast · Text'],
      'wan-controlled': ['Wan FPS…', 'Wan 2.2 · Controlled FPS'],
    }
    for (const [name, [closed, full]] of Object.entries(expectedClosed)) {
      const result = results.find((entry: any) => entry.name === name)
      expect(result.modelClosed, name).toBe(closed)
      expect(result.modelAccessible, name).toBe(full)
      if(name==='wan-controlled')expect(result.modelMenu).not.toContain(full)
      else expect(result.modelMenu.some((label:string)=>label===full || label.endsWith(' '+full)), JSON.stringify({name,models:result.modelMenu})).toBe(true)
    }
    expect(results.find((entry: any) => entry.name === 'seedance-image').footerIds).not.toContain('ratio')
    for (const result of results.filter((entry: any) => entry.name.startsWith('seedance'))) {
      expect(result.soundGeometry.width / result.zoom).toBeCloseTo(28, 2)
      expect(result.soundGeometry.height / result.zoom).toBeCloseTo(28, 2)
      expect(result.soundGeometry.iconWidth / result.zoom).toBeCloseTo(14, 2)
      expect(result.soundGeometry.iconHeight / result.zoom).toBeCloseTo(14, 2)
    }
    expect(results.find((entry: any) => entry.name === 'wan-controlled').footerIds).not.toContain('sound')
    const wan = results.find((entry: any) => entry.name === 'wan-controlled')
    expect(wan.qualityValues.map((entry: any) => [entry.id, entry.text])).toEqual([['native-fps','24 fps'],['quality','High'],['file','Balanced']])
    const storyboardResult = results.find((entry: any) => entry.name === 'storyboard')
    expect(storyboardResult.storyboardFull).toBe(true)
    expect(storyboardResult.storyboardActionsRight).toBe(true)
    expect(storyboardResult.panelLeft).toBe(true)
    expect(storyboardResult.panelValues.map((entry: any) => [entry.id, entry.text])).toEqual([['shot-size','Medium Shot'],['lens','Unspecified'],['duration','3.0s'],['camera','Push In']])
    expect(Math.max(...storyboardResult.selectorSlack)-Math.min(...storyboardResult.selectorSlack), JSON.stringify(storyboardResult.selectorSlack)).toBeLessThanOrEqual(1)
    expect(Math.min(...storyboardResult.selectorSlack)).toBeGreaterThanOrEqual(4)
    expect(storyboardResult.saveGeometry).toMatchObject({ width: 28, height: 28, iconWidth: 14, iconHeight: 14, text: '' })
    expect(storyboardResult.utilityActionIds).toEqual(['Connect Node','Duplicate Node','Lock Node Position','Delete Node'])
    expect(canvasHandSource).toContain("panOnDrag={canvasPanButtons(tool)}")
    expect(canvasHandSource).toContain("panActivationKeyCode=\"Space\"")
  }, 60_000)
})

declare global { interface Window { __actualGeometry: () => unknown } }
