import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PanelLeftClose } from 'lucide-react'
import { APP_ICONS } from './iconSystem'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
it('keeps section/list insets distinct from peer gaps, including scroll endpoints and header icon parity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prism-assets-insets-'))
  try {
    const icon = (component: typeof PanelLeftClose) => renderToStaticMarkup(createElement(component, { size: 17 }))
    const rows = Array.from({length:16},(_,i)=>`<article><button class="canvas-asset-thumb">${i+1}</button><button class="canvas-asset-info"><strong>Fictional asset ${i+1}</strong><small>Video</small></button></article>`).join('')
    writeFileSync(join(dir,'index.html'), `<!doctype html><link rel="stylesheet" href="file://${resolve('src/renderer/src/styles-next.css')}"><style>body{margin:0}.side-panel{top:0}</style><aside class="side-panel canvas-assets-panel is-open"><header><div>${icon(APP_ICONS.assets)}<span><small>CANVAS</small><strong>Assets</strong></span></div><button aria-label="Close Assets">${icon(PanelLeftClose)}</button></header><nav class="canvas-asset-types">${['All','Characters','Wardrobes','Elements','Locations','Styles','Storyboards','Images','Videos','Audio'].map(x=>`<button>${x}</button>`).join('')}</nav><div class="canvas-asset-filters"><label>Search Assets</label><div><button>All</button><button>Imported</button><button>Generated</button></div></div><div class="canvas-asset-sticky-actions"><button>Import Asset</button><button>Create</button></div><div class="canvas-asset-list">${rows}</div></aside>`)
    const probe=String.raw`(async()=>{
      await document.fonts.ready;const q=s=>document.querySelector(s),rect=e=>e.getBoundingClientRect(),style=e=>getComputedStyle(e),padding=e=>{const s=style(e);return [s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].map(parseFloat)};
      const root=style(document.documentElement),outer=parseFloat(root.getPropertyValue('--node-body-inset')),peer=parseFloat(root.getPropertyValue('--selector-content-inset'));
      const list=q('.canvas-asset-list'),rows=[...list.children],box=rect(list),innerRight=box.left+list.clientLeft+list.clientWidth;
      list.scrollTop=0;const first=rect(rows[0]),second=rect(rows[1]);const start={top:first.top-box.top,left:first.left-box.left,right:innerRight-first.right,gap:second.top-first.bottom};
      list.scrollTop=list.scrollHeight;await new Promise(r=>requestAnimationFrame(r));const bottom=box.top+list.clientTop+list.clientHeight-rect(rows.at(-1)).bottom;
      const tabs=q('.canvas-asset-types');tabs.scrollLeft=tabs.scrollWidth;await new Promise(r=>requestAnimationFrame(r));const tabEnd=rect(tabs).left+tabs.clientLeft+tabs.clientWidth-rect(tabs.lastElementChild).right;
      const icons=[...q('header').querySelectorAll('svg')].map(e=>({width:rect(e).width,height:rect(e).height,stroke:parseFloat(style(e).strokeWidth),viewBox:e.getAttribute('viewBox')}));
      return {outer,peer,paddings:['header','.canvas-asset-types','.canvas-asset-filters','.canvas-asset-sticky-actions','.canvas-asset-list'].map(s=>padding(q(s))),gaps:['.canvas-asset-types','.canvas-asset-filters','.canvas-asset-filters > div','.canvas-asset-sticky-actions','.canvas-asset-list'].map(s=>parseFloat(style(q(s)).gap)),start,bottom,tabEnd,overflow:list.scrollHeight>list.clientHeight,icons,closePadding:padding(q('header > button'))};
    })()`
    writeFileSync(join(dir,'main.cjs'),`const{app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(join(dir,'user-data'))});app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1280,height:700,webPreferences:{contextIsolation:false,sandbox:false}});await w.loadFile(${JSON.stringify(join(dir,'index.html'))});const result=[];for(const width of[1280,900]){w.setSize(width,700);result.push(await w.webContents.executeJavaScript(${JSON.stringify(probe)}))}console.log('ASSETS_INSETS:'+JSON.stringify(result));app.quit()}).catch(e=>{console.error(e);app.exit(1)});`)
    const run=spawnSync(require('electron'),[join(dir,'main.cjs')],{encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:35000})
    expect(run.status,run.stdout+'\n'+run.stderr).toBe(0)
    const results=JSON.parse(run.stdout.split('\n').find(x=>x.startsWith('ASSETS_INSETS:'))!.slice('ASSETS_INSETS:'.length))
    for(const r of results){
      expect(r.outer).toBe(12);expect(r.peer).toBe(8);expect(r.overflow).toBe(true)
      for(const p of r.paddings)expect(p).toEqual([r.outer,r.outer,r.outer,r.outer])
      for(const gap of r.gaps)expect(gap).toBe(r.peer)
      expect(r.start.top).toBeCloseTo(r.outer,0);expect(r.start.left).toBeCloseTo(r.outer,0);expect(r.start.right).toBeCloseTo(r.outer,0);expect(r.start.gap).toBe(r.peer)
      expect(r.bottom).toBeCloseTo(r.outer,0);expect(r.tabEnd).toBeCloseTo(r.outer,0)
      expect(r.icons).toEqual([{width:17,height:17,stroke:2,viewBox:'0 0 24 24'},{width:17,height:17,stroke:2,viewBox:'0 0 24 24'}]);expect(r.closePadding).toEqual([0,0,0,0])
    }
  }finally{rmSync(dir,{recursive:true,force:true})}
},45000)
