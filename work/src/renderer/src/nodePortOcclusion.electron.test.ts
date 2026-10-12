import {mkdtempSync,rmSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
import {expect,it} from 'vitest'

it('clips real input/output handles behind node bodies while uncovered hit targets and centers remain intact',()=>{
  const require=createRequire(import.meta.url),{buildSync}=require(resolve('node_modules/vite/node_modules/esbuild/lib/main.js'))
  const owner=process.env.PRISM_PROMPT_BASELINE_ROOT||process.cwd()
  const dir=mkdtempSync(join(tmpdir(),'prism-port-cover-'))
  try{
    writeFileSync(join(dir,'entry.tsx'),`
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ReactFlow,ReactFlowProvider,Position} from '@xyflow/react';
      import {NodePort} from ${JSON.stringify(resolve(owner, 'src/renderer/src/NodePort.tsx'))};
      function Card({id}){return <article className="studio-node" style={{width:200,height:160}}>{id==='owner'&&<><NodePort id="text-in" type="target" signal="text" label="Prompt" style={{top:80}}/><NodePort id="media-out" type="source" signal="image" label="Image" style={{top:80}}/></>}{id==='left'&&<NodePort id="text-out" type="source" signal="text" label="Fixture text" style={{top:80}}/>}</article>}
      function Harness(){const[nodes,setNodes]=useState([{id:'owner',type:'studio',position:{x:240,y:100},data:{kind:'image-generator',title:'Fictional owner'},zIndex:10},{id:'left',type:'studio',position:{x:20,y:80},data:{kind:'upload',title:'Left cover'},zIndex:0},{id:'right',type:'studio',position:{x:460,y:80},data:{kind:'upload',title:'Right cover'},zIndex:0}]);window.__move=()=>setNodes(n=>n.map(x=>x.id==='owner'?x:{...x,position:{...x.position,y:500}}));window.__zoom=()=>window.__flow.setViewport({x:0,y:0,zoom:1.5});return <ReactFlowProvider><ReactFlow nodes={nodes} edges={[{id:'fixture-wire',source:'left',sourceHandle:'text-out',target:'owner',targetHandle:'text-in'}]} nodeTypes={{studio:Card}} onInit={flow=>window.__flow=flow} defaultViewport={{x:0,y:0,zoom:1}}/></ReactFlowProvider>};createRoot(document.getElementById('root')).render(<Harness/>);
    `)
    buildSync({entryPoints:[join(dir,'entry.tsx')],outfile:join(dir,'renderer.js'),bundle:true,format:'iife',platform:'browser',target:'chrome120',nodePaths:[resolve('node_modules')],alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom'),'@xyflow/react':resolve('node_modules/@xyflow/react')},jsx:'automatic',logLevel:'silent'})
    writeFileSync(join(dir,'index.html'),`<!doctype html><link rel="stylesheet" href="file://${resolve('node_modules/@xyflow/react/dist/style.css')}"><link rel="stylesheet" href="file://${resolve(owner, 'src/renderer/src/styles-next.css')}"><style>*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}.node-port-visual{opacity:1!important;translate:0 0!important;scale:1!important}</style><div id="root"></div><script src="renderer.js"></script>`)
    const probe=String.raw`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(250);const sample=()=>['target','source'].map(type=>{const h=document.querySelector('.node-port-'+type),r=h.getBoundingClientRect(),scale=r.width/h.offsetWidth;const inside=(x)=>document.elementFromPoint(x,r.top+r.height/2)?.closest('.node-port')===h;const covered=type==='target'?r.left+3*scale:r.right-3*scale,clear=type==='target'?r.right-3*scale:r.left+3*scale;return{center:[r.left+r.width/2,r.top+r.height/2],coveredHit:inside(covered),clearHit:inside(clear),pointerChild:getComputedStyle(h.querySelector('span')).pointerEvents,handleClass:h.className,handlePointer:getComputedStyle(h).pointerEvents,clearElement:document.elementFromPoint(clear,r.top+r.height/2)?.className,rect:[r.left,r.top,r.right,r.bottom],clip:h.style.clipPath}});const initial=sample();window.__move();await wait(120);const moved=sample();window.__zoom();await wait(150);const zoomed=sample();return{initial,moved,zoomed}})()`
    writeFileSync(join(dir,'main.cjs'),`const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(join(dir,'data'))});app.whenReady().then(async()=>{const w=new BrowserWindow({show:false,width:1100,height:850,webPreferences:{contextIsolation:false,sandbox:false}});w.webContents.on('console-message',(_e,_l,message)=>console.log(message));await w.loadFile(${JSON.stringify(join(dir,'index.html'))});const result=await w.webContents.executeJavaScript(${JSON.stringify(probe)});console.log('PORT_COVER_RESULT:'+JSON.stringify(result));app.quit()}).catch(e=>{console.error(e);app.exit(1)});`)
    const run=spawnSync(require('electron'),[join(dir,'main.cjs')],{cwd:dir,encoding:'utf8',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined},timeout:20000})
    expect(run.status,run.stdout+'\n'+run.stderr).toBe(0)
    const r=JSON.parse(run.stdout.split('\n').find(l=>l.startsWith('PORT_COVER_RESULT:'))!.slice('PORT_COVER_RESULT:'.length))
    for(let i=0;i<2;i++){
      expect(r.initial[i].coveredHit).toBe(false)
      expect(r.initial[i].clearHit,JSON.stringify(r)).toBe(true)
      expect(r.initial[i].pointerChild).toBe('none')
      expect(r.initial[i].clip).toMatch(/^path/)
      expect(r.moved[i].coveredHit).toBe(true)
      expect(r.moved[i].clearHit).toBe(true)
      expect(r.moved[i].center).toEqual(r.initial[i].center)
      expect(r.zoomed[i].coveredHit).toBe(true)
      expect(r.zoomed[i].clearHit).toBe(true)
    }
  }finally{rmSync(dir,{recursive:true,force:true})}
},25000)
