import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

describe('rendered Generator and Storyboard selector menus', () => {
  it('keeps native Generator choices distinct from Storyboard half-steps and strictly filters from a prior bottom scroll', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-selector-menus-'))
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

      const noop=()=>undefined
      const runtime=new Proxy({
        characterLibrary:[],storyboardLibrary:[],semanticLibraries:{element:[],location:[],wardrobe:[],'style-reference':[]},
        connectedReferenceTags:()=>[],connectedInputRules:()=>[],availablePromptTags:()=>[],connectedInputMedia:()=>undefined,
        connectedStoryboardVideoFamily:()=>undefined,
        connectedStoryboardVideo:(id)=>id==='connected-board'?{nodeId:'video',modelId:'fal-ai/veo3.1',duration:6,durationOptions:[4,6,8]}:undefined,
        videoPromptState:()=>null,nodeMediaLinkState:()=>undefined,generatedMediaFavorite:()=>false,
        providerAccount:()=>undefined,providerConnected:()=>true,runReadiness:()=>({disabled:false,tooltip:'Ready'}),
        estimateNode:async()=>null,availableModels:(provider)=>provider==='anthropic'?[{id:'claude-opus-5',label:'Claude Opus 5'}]:[],
      },{get(target,property){return property in target?target[property]:noop}})
      const video={kind:'video-generator',title:'Video Generator',videoEngine:'bytedance/seedance-2.5/reference-to-video',prompt:'Move',runState:'idle',aspectRatio:'16:9',duration:4,resolution:'480p',quantity:1,generateAudio:true}
      const board=(connected)=>({kind:'storyboard',title:connected?'Connected Storyboard':'Disconnected Storyboard',storyboardEditorOpen:true,assistantProvider:'anthropic',assistantModelId:'claude-opus-5',storyboardPanels:[
        {id:(connected?'c':'d')+'-one',prompt:'First shot',duration:2,shotSize:'medium',camera:'static',lensMm:35,locked:false},
        {id:(connected?'c':'d')+'-two',prompt:'Second shot',duration:1,shotSize:'wide',camera:'static',lensMm:50,locked:false},
      ]})
      const wideBoard={...board(false),title:'Wide Storyboard',storyboardPanels:board(false).storyboardPanels.map(panel=>({...panel,id:'w-'+panel.id}))}
      const nodes=[
        {id:'video',type:'studio',position:{x:0,y:0},style:{width:315},data:video},
        {id:'disconnected-board',type:'storyboard',position:{x:380,y:0},style:{width:315},data:board(false)},
        {id:'connected-board',type:'storyboard',position:{x:760,y:0},style:{width:315},data:board(true)},
        {id:'wide-board',type:'storyboard',position:{x:1140,y:0},style:{width:620},data:wideBoard},
      ]
      function App(){const [flowNodes,setFlowNodes]=React.useState(nodes);window.__flowNodeSnapshot=flowNodes;const appRuntime=React.useMemo(()=>new Proxy(runtime,{get(target,property){if(property==='updateNode')return(id,patch)=>{window.__lastNodeUpdate={id,patch};setFlowNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,...patch}}:node))};return target[property]}}),[]);return <><div className="prompt-enhance-model-menu" data-prompt-heading-probe><section><small>Prompt provider group</small></section></div><select data-native-optgroup-probe><optgroup label="Native provider"><option>Model</option></optgroup></select><ProviderAvailabilityContext.Provider value={{mediaConnected:{fal:true,byteplus:true},promptConnected:{anthropic:true}}}><NodeRuntimeContext.Provider value={appRuntime}><ReactFlowProvider><ReactFlow nodes={flowNodes} edges={[]} nodeTypes={{studio:NodeCard,storyboard:StoryboardNode}} defaultViewport={{x:10,y:10,zoom:1}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></ProviderAvailabilityContext.Provider></>}
      const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      const trigger=(nodeId,label,index=0)=>document.querySelectorAll('.react-flow__node[data-id="'+nodeId+'"] [aria-label="'+label+'"]')[index]
      const portal=()=>document.querySelector('.grouped-menu-select-menu,.storyboard-compact-menu')
      const rows=()=>Array.from(portal()?.querySelectorAll('[role="option"]')||[])
      const labels=()=>rows().map(row=>row.textContent.trim())
      const controlGeometry=nodeId=>{const node=document.querySelector('.react-flow__node[data-id="'+nodeId+'"]');const group=node?.querySelector('.storyboard-panel[data-panel-id] .equalized-control-group[aria-label="Panel 1 controls"]');if(!group)throw new Error('missing fluid panel controls '+nodeId);const rect=element=>{const box=element.getBoundingClientRect();return {x:Math.round(box.x*100)/100,y:Math.round(box.y*100)/100,width:Math.round(box.width*100)/100,height:Math.round(box.height*100)/100}};return {group:rect(group),rowCount:group.querySelectorAll('.fluid-control-group-row').length,controls:Array.from(group.querySelectorAll('[data-fluid-control-id]')).map(wrapper=>({id:wrapper.dataset.fluidControlId,...rect(wrapper)})),allocationCommits:Number(group.dataset.allocationCommitCount||0)}}
      const close=async()=>{portal()?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait()}
      const inventory=async(nodeId,label,index=0)=>{const control=trigger(nodeId,label,index);if(!control)throw new Error('missing inventory trigger '+nodeId+' '+label+' '+index);control.click();await wait();if(!portal())throw new Error('inventory menu did not open '+nodeId+' '+label+' '+index+' '+JSON.stringify(control.getBoundingClientRect().toJSON()));const value={labels:labels(),enabled:rows().filter(row=>row.getAttribute('aria-disabled')!=='true').map(row=>row.textContent.trim())};await close();return value}
      const chooseLens=async(nodeId,value)=>{const control=trigger(nodeId,'Lens / FOV');if(!control)throw new Error('missing lens trigger '+nodeId);control.click();await wait();const option=portal()?.querySelector('[role="option"][data-option-value="'+value+'"]');if(!option)throw new Error('missing lens option '+value);option.click();await wait();const reopened=trigger(nodeId,'Lens / FOV');if(!reopened)throw new Error('missing reopened lens trigger '+nodeId);const triggerText=reopened.textContent.trim();reopened.click();await wait();const selected=portal()?.querySelector('[role="option"][aria-selected="true"]');const selectedValue=selected?.getAttribute('data-option-value')||null;const openLabels=labels();const storedLens=window.__flowNodeSnapshot.find(node=>node.id===nodeId)?.data.storyboardPanels?.[0]?.lensMm;return {triggerText,selectedValue,openLabels,storedLens,lastUpdate:window.__lastNodeUpdate}}
      const longLabels=async(nodeId)=>{
        for(const label of ['Shot Size','Camera Movement']){trigger(nodeId,label).click();await wait();const option=rows().filter(row=>row.getAttribute('aria-disabled')!=='true').sort((a,b)=>b.textContent.length-a.textContent.length)[0];option.click();await wait()}
        const node=document.querySelector('.react-flow__node[data-id="'+nodeId+'"]');const group=node.querySelector('[aria-label="Panel 1 controls"]');
        return {geometry:controlGeometry(nodeId),fields:Array.from(group.querySelectorAll('button[aria-haspopup="listbox"]')).map(button=>{const span=button.querySelector('span');const style=getComputedStyle(button),textStyle=getComputedStyle(span);return {label:button.getAttribute('aria-label'),text:span.textContent,title:button.title,padding:[style.paddingLeft,style.paddingRight],ellipsis:textStyle.textOverflow,whiteSpace:textStyle.whiteSpace,overflow:textStyle.overflow,clipped:span.scrollWidth>span.clientWidth,chevronVisible:Boolean(button.querySelector('svg')?.getBoundingClientRect().width)}})}
      }
      const openLensMenu=async(nodeId)=>{const control=trigger(nodeId,'Lens / FOV');if(!control)throw new Error('missing lens trigger '+nodeId);control.click();await wait();if(!portal())throw new Error('lens menu did not open '+nodeId);return labels()}
      const scrollMenu=async(position)=>{const list=portal()?.querySelector('.selector-results');if(!list)throw new Error('missing selector results');list.scrollTop=position==='top'?0:list.scrollHeight;await wait()}
      const bounds=(selector)=>{const element=document.querySelector(selector);if(!element)throw new Error('missing screenshot target '+selector);const rect=element.getBoundingClientRect();return {x:Math.floor(rect.x),y:Math.floor(rect.y),width:Math.ceil(rect.width),height:Math.ceil(rect.height)}}
      const openSearch=async(nodeId,label,query,index=0,scrollBottom=false)=>{
        const control=trigger(nodeId,label,index);if(!control)throw new Error('missing trigger '+nodeId+' '+label+' '+index)
        control.click();await wait()
        const menu=portal();if(!menu)throw new Error('menu did not open '+nodeId+' '+label+' '+index)
        const results=menu.querySelector('.selector-results');if(!results)throw new Error('missing results '+nodeId+' '+label)
        if(scrollBottom)results.scrollTop=results.scrollHeight
        const prior=results.scrollTop
        for(const character of query){portal().dispatchEvent(new KeyboardEvent('keydown',{key:character,bubbles:true}));await wait()}
        const currentMenu=portal(),currentResults=currentMenu.querySelector('.selector-results')
        window.__openSearchContext={menu:currentMenu,results:currentResults,prior,nodeId,label,query}
      }
      const finishSearch=async()=>{
        const {menu,results,prior}=window.__openSearchContext
        await wait()
        const input=menu.querySelector('.selector-search-row input')
        const visible=labels();const active=menu.querySelector('[role="option"].is-keyboard-active')
        const option=menu.querySelector('[role="option"]')
        if(!input || !option)throw new Error('Empty selector search: '+JSON.stringify({context:window.__openSearchContext.query,label:window.__openSearchContext.label,visible,input:input?.value}));
        const inputStyle=getComputedStyle(input), optionStyle=getComputedStyle(option)
        const headings=Array.from(menu.querySelectorAll('section > small,.selector-results > div > small,.model-catalog-company > small')).map(heading=>({text:heading.textContent.trim(),weight:getComputedStyle(heading).fontWeight,color:getComputedStyle(heading).color}))
        const filtered={flatCatalog:menu.classList.contains('is-flat-catalog'),visible,scrollTop:results.scrollTop,active:active?.textContent.trim(),aria:input.getAttribute('aria-activedescendant'),inputFont:[inputStyle.fontSize,inputStyle.fontWeight],optionFont:[optionStyle.fontSize,optionStyle.fontWeight],headings}
        menu.querySelector('[aria-label="Clear selector search"]').click()
        await new Promise(resolve=>requestAnimationFrame(resolve))
        const restored=results.scrollTop
        await wait()
        const cleared={count:rows().length,scrollTop:results.scrollTop,selectedVisible:Boolean(menu.querySelector('[role="option"][aria-selected="true"]'))}
        await close()
        return {prior,filtered,restored,cleared}
      }
      window.__selectorMenus={
        inventoryData:async()=>({
          generator:await inventory('video','Video Duration'),
          disconnected:await inventory('disconnected-board','Panel 1 duration, 2.0 seconds.'),
          connectedFirst:await inventory('connected-board','Panel 1 duration, 2.0 seconds.'),
          connectedSecond:await inventory('connected-board','Panel 2 duration, 1.0 seconds.'),
          disconnectedShotSizes:await inventory('disconnected-board','Shot Size'),
          disconnectedLenses:await inventory('disconnected-board','Lens / FOV'),
        }),
        controls:()=>({narrow:controlGeometry('disconnected-board'),wide:controlGeometry('wide-board')}),
        bounds,
        chooseLens,longLabels,
        openLensMenu,
        scrollMenu,
        closeMenu:close,
        openSearch,finishSearch,
      }
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'dataurl', '.svg': 'dataurl' }, logLevel: 'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    const flowStyles = resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${flowStyles}"><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}body{background:#111;color:#ddd}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `
      const { app, BrowserWindow } = require('electron')
      const fs = require('node:fs')
      const path = require('node:path')
      const evidenceDir = process.env.PRISM_SELECTOR_EVIDENCE_DIR
      const imageNames = ['Camera Selector Narrow Controls.png', 'Camera Selector Wide Controls.png', 'Camera Selector Lens Menu Initial Options.png', 'Camera Selector Lens Menu Selected 85mm.png']
      const finish = (value, code = 0) => {
        if (evidenceDir && !value.error) {
          value.evidence = { directory: evidenceDir, images: imageNames.map(name => path.join(evidenceDir, name)) }
          fs.writeFileSync(path.join(evidenceDir, 'Camera Selector Verification Results.json'), JSON.stringify(value, null, 2) + '\\n')
        }
        process.stdout.write('SELECTOR_MENUS_RESULT:' + JSON.stringify(value) + '\\n')
        app.exit(code)
      }
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
      const saveCrop = async (win, name, bounds) => {
        if (!evidenceDir) return
        const image = await win.webContents.capturePage({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height })
        fs.writeFileSync(path.join(evidenceDir, name), image.toPNG())
      }
      app.setPath('userData', path.join(${JSON.stringify(directory)}, 'user-data'))
      app.whenReady().then(async () => {
        const win = new BrowserWindow({ show: false, width: 2100, height: 1350, webPreferences: { contextIsolation: false, sandbox: false } })
        await win.loadFile(${JSON.stringify(html)})
        const evaluate = code => win.webContents.executeJavaScript(code)
        await evaluate('document.fonts.ready')
        await wait(850)
        win.show()
        await wait(350)
        const result = await evaluate('window.__selectorMenus.inventoryData()')
        result.headingProbes = await evaluate("(() => { const prompt = getComputedStyle(document.querySelector('[data-prompt-heading-probe] small')); const native = getComputedStyle(document.querySelector('[data-native-optgroup-probe] optgroup')); return { prompt: { weight: prompt.fontWeight, color: prompt.color }, native: { weight: native.fontWeight, color: native.color } } })()")
        result.controlGeometryBefore = await evaluate('window.__selectorMenus.controls()')
        if (evidenceDir) {
          fs.mkdirSync(evidenceDir, { recursive: true })
          await evaluate('document.activeElement instanceof HTMLElement && document.activeElement.blur()')
          await wait(100)
          await saveCrop(win, imageNames[0], await evaluate('window.__selectorMenus.bounds(' + JSON.stringify('.react-flow__node[data-id="disconnected-board"]') + ')'))
          await saveCrop(win, imageNames[1], await evaluate('window.__selectorMenus.bounds(' + JSON.stringify('.react-flow__node[data-id="wide-board"]') + ')'))
          result.initialLensMenuLabels = await evaluate('window.__selectorMenus.openLensMenu("wide-board")')
          await evaluate('window.__selectorMenus.scrollMenu("top")')
          await wait(100)
          await saveCrop(win, imageNames[2], await evaluate('window.__selectorMenus.bounds(".storyboard-compact-menu")'))
          await evaluate('window.__selectorMenus.closeMenu()')
        }
        const search = async (node, label, query, index = 0, bottom = false) => {
          await evaluate('window.__selectorMenus.openSearch(' + JSON.stringify(node) + ',' + JSON.stringify(label) + ',' + JSON.stringify(query) + ',' + index + ',' + bottom + ')')
          await wait(120)
          return evaluate('window.__selectorMenus.finishSearch()')
        }
        result.cameraSearch = await search('disconnected-board', 'Camera Movement', 'track', 0, true)
        result.stabilizedHeading = await search('disconnected-board', 'Camera Movement', 'handheld')
        result.simpleFont = await search('video', 'Video Duration', '4')
        result.groupedFont = await search('video', 'Video Model', 'seedance')
        result.durationFont = await search('disconnected-board', 'Panel 1 duration, 2.0 seconds.', '1.5')
        result.lensPersistence = await evaluate('window.__selectorMenus.chooseLens("wide-board", "85")')
        if (evidenceDir) await saveCrop(win, imageNames[3], await evaluate('window.__selectorMenus.bounds(".storyboard-compact-menu")'))
        await evaluate('window.__selectorMenus.closeMenu()')
        result.controlGeometryAfter = await evaluate('window.__selectorMenus.controls()')
        result.longLabels = {narrow:await evaluate('window.__selectorMenus.longLabels("disconnected-board")'),wide:await evaluate('window.__selectorMenus.longLabels("wide-board")')}
        if(evidenceDir){await saveCrop(win,'Camera Selector Long Labels Narrow.png',await evaluate('window.__selectorMenus.bounds('+JSON.stringify('.react-flow__node[data-id="disconnected-board"]')+')'));await saveCrop(win,'Camera Selector Long Labels Wide.png',await evaluate('window.__selectorMenus.bounds('+JSON.stringify('.react-flow__node[data-id="wide-board"]')+')'))}
        finish(result)
      }).catch(error => finish({ error: error.stack || String(error) }, 1))
    `)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60_000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('SELECTOR_MENUS_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('SELECTOR_MENUS_RESULT:'.length))

    expect(result.generator.labels).toEqual(Array.from({ length: 27 }, (_, index) => `${(index + 4).toFixed(1)}s`))
    expect(result.generator.labels.some((label: string) => label === '4.5s')).toBe(false)
    expect(result.disconnected.labels.slice(0, 4)).toEqual(['1.0s', '1.5s', '2.0s', '2.5s'])
    expect(result.disconnected.labels.at(-1)).toBe('30.0s')
    expect(result.connectedFirst.labels.at(-1)).toBe('8.0s')
    expect(result.connectedFirst.enabled.slice(0, 4)).toEqual(['1.0s', '1.5s', '2.0s', '2.5s'])
    expect(result.connectedFirst.enabled.at(-1)).toBe('6.0s')
    expect(result.connectedSecond.enabled.at(-1)).toBe('4.0s')
    expect(result.disconnectedShotSizes.labels).toEqual(['Extreme Wide Shot', 'Wide Shot', 'Medium Shot', 'Close-up', 'Extreme Close-up', 'Detail / Insert'])
    expect(result.disconnectedLenses.labels).toEqual(['Unspecified', '8mm', '16mm', '24mm', '35mm', '50mm', '85mm', '100mm'])
    expect(result.lensPersistence.triggerText).toContain('85mm')
    expect(result.lensPersistence.selectedValue).toBe('85')
    expect(result.lensPersistence.storedLens).toBe(85)
    expect(result.lensPersistence.lastUpdate.id).toBe('wide-board')
    expect(result.lensPersistence.lastUpdate.patch.storyboardPanels[0].lensMm).toBe(85)
    expect(result.lensPersistence.openLabels).toEqual(result.disconnectedLenses.labels)
    if (process.env.PRISM_SELECTOR_EVIDENCE_DIR) expect(result.initialLensMenuLabels).toEqual(result.disconnectedLenses.labels)
    const geometryShape = (geometry: { group: { x: number; y: number; width: number; height: number }; rowCount: number; controls: Array<{ id: string; x: number; y: number; width: number; height: number }> }) => ({
      group: geometry.group,
      rowCount: geometry.rowCount,
      controls: geometry.controls,
    })
    const expectedControlIds = ['shot-size', 'lens', 'duration', 'camera']
    for (const width of ['narrow', 'wide'] as const) {
      const before = result.controlGeometryBefore[width]
      const after = result.controlGeometryAfter[width]
      expect(before.controls.map((control: { id: string }) => control.id), `${width} control order`).toEqual(expectedControlIds)
      expect(before.rowCount, `${width} FluidControlGroup rows`).toBe(1)
      expect(before.allocationCommits, `${width} FluidControlGroup allocation`).toBeGreaterThan(0)
      const rightEdge = before.group.x + before.group.width
      const bottomEdge = before.group.y + before.group.height
      for (const control of before.controls) {
        expect(control.x, `${width} ${control.id} left within group`).toBeGreaterThanOrEqual(before.group.x - 0.5)
        expect(control.x + control.width, `${width} ${control.id} right within group`).toBeLessThanOrEqual(rightEdge + 0.5)
        expect(control.y, `${width} ${control.id} top within group`).toBeGreaterThanOrEqual(before.group.y - 0.5)
        expect(control.y + control.height, `${width} ${control.id} bottom within group`).toBeLessThanOrEqual(bottomEdge + 0.5)
      }
      const rows = new Map<number, string[]>()
      for (const control of before.controls) rows.set(control.y, [...(rows.get(control.y) || []), control.id])
      expect([...rows.values()], `${width} responsive control rows`).toEqual([expectedControlIds])
      expect(geometryShape(after), `${width} geometry after lens selection and menu reopen`).toEqual(geometryShape(before))
      const long = result.longLabels[width]
      expect(geometryShape(long.geometry), `${width} long selected labels retain the same row geometry`).toEqual(geometryShape(before))
      for(const field of long.fields){expect(field.padding).toEqual(['7px','7px']);expect(field.ellipsis).toBe('ellipsis');expect(field.whiteSpace).toBe('nowrap');expect(field.overflow).toBe('hidden');expect(field.chevronVisible).toBe(true)}
      if(width === 'narrow') expect(long.fields.some((field:{clipped:boolean})=>field.clipped), 'longer selections truncate within established padding when constrained').toBe(true)

    }

    const evidenceDir = process.env.PRISM_SELECTOR_EVIDENCE_DIR
    if (evidenceDir) {
      const imageNames = ['Camera Selector Narrow Controls.png', 'Camera Selector Wide Controls.png', 'Camera Selector Lens Menu Initial Options.png', 'Camera Selector Lens Menu Selected 85mm.png']
      expect(result.evidence.images).toEqual(imageNames.map((name) => join(evidenceDir, name)))
      const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      for (const name of imageNames) expect(readFileSync(join(evidenceDir, name)).subarray(0, 8), name).toEqual(pngSignature)
      const evidence = JSON.parse(readFileSync(join(evidenceDir, 'Camera Selector Verification Results.json'), 'utf8'))
      expect(evidence.lensPersistence.storedLens).toBe(85)
    }

    for (const key of ['simpleFont', 'groupedFont', 'durationFont', 'cameraSearch'] as const) expect(result[key].filtered.inputFont, key).toEqual(result[key].filtered.optionFont)
    expect(result.groupedFont.filtered.flatCatalog).toBe(true)
    expect(result.groupedFont.filtered.headings).toEqual([])
    for (const key of ['cameraSearch'] as const) {
      expect(result[key].filtered.headings.length, key).toBeGreaterThan(0)
      expect(result[key].filtered.headings.every((heading: { weight: string }) => heading.weight === '400'), key).toBe(true)
      expect(result[key].filtered.headings.every((heading: { color: string }) => heading.color === 'rgb(173, 150, 237)'), key).toBe(true)
    }
    expect(result.headingProbes).toEqual({
      prompt: { weight: '400', color: 'rgb(173, 150, 237)' },
      native: { weight: '500', color: 'rgb(173, 150, 237)' },
    })
    expect(result.stabilizedHeading.filtered.headings).toContainEqual(expect.objectContaining({ text: 'Stabilized & Handheld', weight: '400', color: 'rgb(173, 150, 237)' }))
    expect(result.cameraSearch.filtered.visible).toContain('Track Left')
    expect(result.cameraSearch.filtered.visible).toContain('Track Right')
    expect(result.cameraSearch.filtered.visible).not.toContain('Track Forward')
    expect(result.cameraSearch.filtered.visible.some((label: string) => label.includes('Dolly In'))).toBe(false)
    expect(result.cameraSearch.filtered.scrollTop).toBe(0)
    expect(result.cameraSearch.filtered.active).toBe(result.cameraSearch.filtered.visible[0])
    expect(result.cameraSearch.filtered.aria).toBeTruthy()
    expect(result.cameraSearch.restored).toBe(result.cameraSearch.prior)
    expect(result.cameraSearch.cleared.count).toBeGreaterThan(result.cameraSearch.filtered.visible.length)
    expect(result.cameraSearch.cleared.selectedVisible).toBe(true)
  }, 70_000)
})

declare global {
  interface Window {
    __selectorMenus: {
      inventoryData: () => Promise<unknown>
      controls: () => unknown
      bounds: (selector: string) => { x: number; y: number; width: number; height: number }
      chooseLens: (nodeId: string, value: string) => Promise<unknown>
      openLensMenu: (nodeId: string) => Promise<string[]>
      scrollMenu: (position: 'top' | 'bottom') => Promise<void>
      closeMenu: () => Promise<void>
      openSearch: (nodeId: string, label: string, query: string, index?: number, scrollBottom?: boolean) => Promise<void>
      finishSearch: () => Promise<unknown>
    }
    __openSearchContext: { menu: HTMLElement; results: HTMLElement; prior: number }
  }
}
