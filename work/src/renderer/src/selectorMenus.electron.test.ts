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
        {id:(connected?'c':'d')+'-one',prompt:'First shot',duration:2,shotSize:'medium',camera:'static',locked:false},
        {id:(connected?'c':'d')+'-two',prompt:'Second shot',duration:1,shotSize:'wide',camera:'static',locked:false},
      ]})
      const nodes=[
        {id:'video',type:'studio',position:{x:0,y:0},style:{width:315},data:video},
        {id:'disconnected-board',type:'storyboard',position:{x:380,y:0},style:{width:315},data:board(false)},
        {id:'connected-board',type:'storyboard',position:{x:760,y:0},style:{width:315},data:board(true)},
      ]
      function App(){return <><div className="prompt-enhance-model-menu" data-prompt-heading-probe><section><small>Prompt provider group</small></section></div><select data-native-optgroup-probe><optgroup label="Native provider"><option>Model</option></optgroup></select><NodeRuntimeContext.Provider value={runtime}><ReactFlowProvider><ReactFlow nodes={nodes} edges={[]} nodeTypes={{studio:NodeCard,storyboard:StoryboardNode}} defaultViewport={{x:10,y:10,zoom:1}} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}/></ReactFlowProvider></NodeRuntimeContext.Provider></>}
      const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
      const trigger=(nodeId,label,index=0)=>document.querySelectorAll('.react-flow__node[data-id="'+nodeId+'"] [aria-label="'+label+'"]')[index]
      const portal=()=>document.querySelector('.grouped-menu-select-menu,.storyboard-compact-menu')
      const rows=()=>Array.from(portal()?.querySelectorAll('[role="option"]')||[])
      const labels=()=>rows().map(row=>row.textContent.trim())
      const close=async()=>{portal()?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait()}
      const inventory=async(nodeId,label,index=0)=>{const control=trigger(nodeId,label,index);if(!control)throw new Error('missing inventory trigger '+nodeId+' '+label+' '+index);control.click();await wait();if(!portal())throw new Error('inventory menu did not open '+nodeId+' '+label+' '+index+' '+JSON.stringify(control.getBoundingClientRect().toJSON()));const value={labels:labels(),enabled:rows().filter(row=>row.getAttribute('aria-disabled')!=='true').map(row=>row.textContent.trim())};await close();return value}
      const openSearch=async(nodeId,label,query,index=0,scrollBottom=false)=>{
        const control=trigger(nodeId,label,index);if(!control)throw new Error('missing trigger '+nodeId+' '+label+' '+index)
        control.click();await wait()
        const menu=portal();if(!menu)throw new Error('menu did not open '+nodeId+' '+label+' '+index)
        const results=menu.querySelector('.selector-results');if(!results)throw new Error('missing results '+nodeId+' '+label)
        if(scrollBottom)results.scrollTop=results.scrollHeight
        const prior=results.scrollTop
        for(const character of query){portal().dispatchEvent(new KeyboardEvent('keydown',{key:character,bubbles:true}));await wait()}
        const currentMenu=portal(),currentResults=currentMenu.querySelector('.selector-results')
        window.__openSearchContext={menu:currentMenu,results:currentResults,prior}
      }
      const finishSearch=async()=>{
        const {menu,results,prior}=window.__openSearchContext
        await wait()
        const input=menu.querySelector('.selector-search-row input')
        const visible=labels();const active=menu.querySelector('[role="option"].is-keyboard-active')
        const option=menu.querySelector('[role="option"]')
        const inputStyle=getComputedStyle(input), optionStyle=getComputedStyle(option)
        const headings=Array.from(menu.querySelectorAll('section > small,.selector-results > div > small')).map(heading=>({text:heading.textContent.trim(),weight:getComputedStyle(heading).fontWeight,color:getComputedStyle(heading).color}))
        const filtered={visible,scrollTop:results.scrollTop,active:active?.textContent.trim(),aria:input.getAttribute('aria-activedescendant'),inputFont:[inputStyle.fontSize,inputStyle.fontWeight],optionFont:[optionStyle.fontSize,optionStyle.fontWeight],headings}
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
        }),
        openSearch,finishSearch,
      }
      createRoot(document.getElementById('root')).render(<App/>)
    `)
    buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'dataurl' }, logLevel: 'silent' })
    const styles = resolve(process.cwd(), 'src/renderer/src/styles-next.css')
    const flowStyles = resolve(process.cwd(), 'node_modules/@xyflow/react/dist/style.css')
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${flowStyles}"><link rel="stylesheet" href="file://${styles}"><style>*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}body{background:#111;color:#ddd}</style></head><body><div id="root"></div><script src="./renderer.js"></script></body></html>`)
    writeFileSync(main, `const {app,BrowserWindow}=require('electron');const path=require('node:path');const finish=(value,code=0)=>{process.stdout.write('SELECTOR_MENUS_RESULT:'+JSON.stringify(value)+'\\n');app.exit(code)};const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));app.setPath('userData',path.join(${JSON.stringify(directory)},'user-data'));app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1300,height:2400,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});const evaluate=code=>win.webContents.executeJavaScript(code);await evaluate('document.fonts.ready');await wait(500);const result=await evaluate('window.__selectorMenus.inventoryData()');result.headingProbes=await evaluate("(()=>{const prompt=getComputedStyle(document.querySelector('[data-prompt-heading-probe] small'));const native=getComputedStyle(document.querySelector('[data-native-optgroup-probe] optgroup'));return {prompt:{weight:prompt.fontWeight,color:prompt.color},native:{weight:native.fontWeight,color:native.color}}})()");const search=async(node,label,query,index=0,bottom=false)=>{await evaluate('window.__selectorMenus.openSearch('+JSON.stringify(node)+','+JSON.stringify(label)+','+JSON.stringify(query)+','+index+','+bottom+')');await wait(120);return evaluate('window.__selectorMenus.finishSearch()')};result.cameraSearch=await search('disconnected-board','Camera Movement','track',0,true);result.stabilizedHeading=await search('disconnected-board','Camera Movement','handheld');result.simpleFont=await search('video','Video Duration','4');result.groupedFont=await search('video','Video Model','seedance');result.durationFont=await search('disconnected-board','Panel 1 duration, 2.0 seconds.','0.5');finish(result)}).catch(error=>finish({error:error.stack||String(error)},1));`)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60_000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('SELECTOR_MENUS_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('SELECTOR_MENUS_RESULT:'.length))

    expect(result.generator.labels).toEqual(Array.from({ length: 27 }, (_, index) => `${(index + 4).toFixed(1)}s`))
    expect(result.generator.labels.some((label: string) => label === '4.5s')).toBe(false)
    expect(result.disconnected.labels.slice(0, 4)).toEqual(['0.5s', '1.0s', '1.5s', '2.0s'])
    expect(result.disconnected.labels.at(-1)).toBe('30.0s')
    expect(result.connectedFirst.labels.at(-1)).toBe('8.0s')
    expect(result.connectedFirst.enabled.slice(0, 4)).toEqual(['0.5s', '1.0s', '1.5s', '2.0s'])
    expect(result.connectedFirst.enabled.at(-1)).toBe('6.0s')
    expect(result.connectedSecond.enabled.at(-1)).toBe('4.0s')

    for (const key of ['simpleFont', 'groupedFont', 'durationFont', 'cameraSearch'] as const) expect(result[key].filtered.inputFont, key).toEqual(result[key].filtered.optionFont)
    for (const key of ['groupedFont', 'cameraSearch'] as const) {
      expect(result[key].filtered.headings.length, key).toBeGreaterThan(0)
      expect(result[key].filtered.headings.every((heading: { weight: string }) => heading.weight === '400'), key).toBe(true)
      expect(result[key].filtered.headings.every((heading: { color: string }) => heading.color === 'rgb(173, 150, 237)'), key).toBe(true)
    }
    expect(result.headingProbes).toEqual({
      prompt: { weight: '400', color: 'rgb(173, 150, 237)' },
      native: { weight: '500', color: 'rgb(173, 150, 237)' },
    })
    expect(result.stabilizedHeading.filtered.headings).toContainEqual(expect.objectContaining({ text: 'Stabilized & Handheld', weight: '400', color: 'rgb(173, 150, 237)' }))
    expect(result.cameraSearch.filtered.visible).toContain('Track Forward')
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
      openSearch: (nodeId: string, label: string, query: string, index?: number, scrollBottom?: boolean) => Promise<void>
      finishSearch: () => Promise<unknown>
    }
    __openSearchContext: { menu: HTMLElement; results: HTMLElement; prior: number }
  }
}
