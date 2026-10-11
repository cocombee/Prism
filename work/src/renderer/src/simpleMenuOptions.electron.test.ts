import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { buildSync } = require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js')) as typeof import('esbuild')
const electronPath = require('electron') as string

it('fits API and Subscription labels and aligns their text without a blank model logo', () => {
  const directory = mkdtempSync(join(tmpdir(), 'prism-simple-menu-'))
  try {
    const entry = join(directory, 'renderer.tsx'), html = join(directory, 'index.html'), main = join(directory, 'main.cjs')
    writeFileSync(entry, `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{SimpleMenuSelect}from ${JSON.stringify(resolve('src/renderer/src/NodeCardNext.tsx'))};
window.__calls=[];
function Harness(){const[value,setValue]=useState('api');return <div className="service-card" style={{width:360,margin:'260px 20px'}}><footer><SimpleMenuSelect className="service-connection-method" menuClassName="service-connection-menu" defaultLabel="Subscription" ariaLabel="OpenAI Revamp connection" value={value} options={[{value:'api',label:'API'},{value:'subscription',label:'Subscription'}]} onChange={value=>{window.__calls.push(value);setValue(value)}}/><button>Manage Accounts</button></footer></div>}
createRoot(document.getElementById('root')).render(<Harness/>);
`)
    buildSync({ entryPoints: [entry], outfile: join(directory, 'renderer.js'), bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve('node_modules')], jsx: 'automatic', loader: { '.svg': 'dataurl', '.png': 'dataurl' }, logLevel: 'silent' })
    writeFileSync(html, `<!doctype html><html><head><link rel="stylesheet" href="file://${resolve('src/renderer/src/styles-next.css')}"></head><body><div id="root"></div><script src="renderer.js"></script></body></html>`)
    writeFileSync(main, `
const{app,BrowserWindow}=require('electron');const path=require('node:path');app.setPath('userData',path.join(${JSON.stringify(directory)},'user'));const wait=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:800,height:650,webPreferences:{contextIsolation:false,sandbox:false}});await win.loadFile(${JSON.stringify(html)});await wait(180);const js=code=>win.webContents.executeJavaScript(code);
 const results=[];
 for(const zoom of [1,2]){
  win.webContents.setZoomFactor(zoom);await wait(40);await js("document.querySelector('button.service-connection-method').click()");await wait(70);
  results.push(await js(\`(()=>{const menu=document.querySelector('.grouped-menu-select-menu'),rows=[...menu.querySelectorAll('[role=option]')];return {rows:rows.map(row=>{const label=row.querySelector('span'),rect=label.getBoundingClientRect();return {text:label.textContent,left:rect.left,client:label.clientWidth,scroll:label.scrollWidth,placeholder:!!row.querySelector('.model-company-logo-placeholder'),height:row.getBoundingClientRect().height}}),width:menu.getBoundingClientRect().width}})()\`));
  await js("document.querySelector('[role=option][aria-selected=false]').click()");await wait(40);
 }
 console.log('SIMPLE_MENU:'+JSON.stringify({results,calls:await js('window.__calls'),selected:await js("document.querySelector('button.service-connection-method').innerText.trim()")}));app.exit(0);
}).catch(error=>{console.error(error.stack);app.exit(1)});
`)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 30_000 })
    expect(run.status, run.stdout + run.stderr).toBe(0)
    const result = JSON.parse(run.stdout.split('\n').find(line => line.startsWith('SIMPLE_MENU:'))!.slice('SIMPLE_MENU:'.length))
    expect(result.calls).toEqual(['subscription', 'api']); expect(result.selected).toBe('API')
    for (const menu of result.results) {
      expect(menu.rows.map((row: any) => row.text)).toEqual(['API', 'Subscription'])
      expect(Math.abs(menu.rows[0].left - menu.rows[1].left)).toBeLessThan(0.5)
      for (const row of menu.rows) { expect(row.placeholder).toBe(false); expect(row.scroll).toBeLessThanOrEqual(row.client) }
    }
  } finally { rmSync(directory, { recursive: true, force: true }) }
}, 40_000)
