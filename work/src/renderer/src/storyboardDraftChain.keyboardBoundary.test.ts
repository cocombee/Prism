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

describe('mounted Storyboard draft boundary', () => {
  it('keeps the actual Storyboard and connected Video mounted while text clears and recompiles', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-storyboard-draft-chain-'))
    temporaryDirectories.push(directory)
    const entry = join(directory, 'renderer.tsx')
    const bundle = join(directory, 'renderer.js')
    const html = join(directory, 'index.html')
    const main = join(directory, 'main.cjs')
    writeFileSync(entry, `
      import React, { useEffect, useMemo, useState } from 'react'
      import { createRoot } from 'react-dom/client'
      import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
      import { StoryboardNode } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/UtilityNodes.tsx'))}
      import { NodeRuntimeContext } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/NodeCardNext.tsx'))}
      import { ProviderPromptPreview } from ${JSON.stringify(resolve(process.cwd(), 'src/renderer/src/ProviderPromptPreview.tsx'))}
      import { buildGenerationRequest } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/workflowResolver.ts'))}
      import { generationReadinessTooltip } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/generationReadiness.ts'))}
      import { visibleProviderPromptBody } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/referenceInstructions.ts'))}
      import { canvasKeyboardAction } from ${JSON.stringify(resolve(process.cwd(), 'src/shared/keyboard.ts'))}
      const edge = { id: 'storyboard-video', source: 'storyboard', sourceHandle: 'storyboard-out', target: 'video', targetHandle: 'storyboard-in' }
      const initial = [
        { id: 'storyboard', type: 'storyboard', position: { x: 0, y: 0 }, selected: false, data: { kind: 'storyboard', title: 'Storyboard', storyboardEditorOpen: true, storyboardMode: 'single', storyboardDuration: 4, storyboardModelId: 'fal-ai/bytedance/seedance/v2/text-to-video', storyboardPanels: [
          { id: 'one', prompt: 'The courier enters.', duration: 2, shotSize: 'wide', camera: 'static', transitionToNext: 'hard-cut' },
          { id: 'two', prompt: 'She checks the board.', duration: 2, shotSize: 'medium', camera: 'dolly-in' },
        ] } },
        { id: 'video', type: 'studio', position: { x: 400, y: 0 }, selected: false, data: { kind: 'video-generator', title: 'Video Generator', videoEngine: 'fal-ai/bytedance/seedance/v2/text-to-video', promptMode: 'auto' } },
      ]
      const textEntry = (target) => target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'))
      function Harness() {
        const [nodes, setNodes] = useState(initial)
        const request = useMemo(() => buildGenerationRequest(nodes[1], nodes, [edge]), [nodes])
        const readiness = generationReadinessTooltip(request)
        const runtime = useMemo(() => new Proxy({
          updateNode: (id, patch) => setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)),
          connectPromptTags: () => {}, connectedInputRules: () => [], availablePromptTags: () => [], availableModels: () => [],
          videoPromptState: () => ({ connected: true, mode: 'auto', autoPrompt: visibleProviderPromptBody(request), manualPrompt: '', activePrompt: visibleProviderPromptBody(request), fingerprint: 'draft', resetDisabled: false }),
          runReadiness: () => readiness, providerConnected: () => true, providerAccount: () => undefined, estimateNode: async () => null,
          nodeMediaLinkState: () => undefined, connectedReferenceTags: () => [], connectedInputMedia: () => undefined, connectedStoryboardVideoFamily: () => 'seedance',
          characterLibrary: [], semanticLibraries: { element: [], location: [], wardrobe: [], 'style-reference': [] }, storyboardLibrary: [],
          listBatchState: () => ({ sourceCount: 0, adjustable: false }), runNode: () => { window.__chain.providerCalls += 1 },
        }, { get: (target, key) => key in target ? target[key] : () => {} }), [readiness.tooltip, request])
        useEffect(() => { window.__chain = { nodes, edges: [edge], preview: visibleProviderPromptBody(request), readiness, providerCalls: window.__chain?.providerCalls || 0 } }, [nodes, request, readiness])
        useEffect(() => {
          const onKeyDown = (event) => {
            const action = canvasKeyboardAction({ key: event.key, metaKey: event.metaKey, ctrlKey: event.ctrlKey, textEntryActive: textEntry(event.target) || textEntry(document.activeElement), canvasScope: true })
            if (action === 'select-all') { event.preventDefault(); setNodes((current) => current.map((node) => ({ ...node, selected: true }))) }
            if (action === 'delete-selection') { event.preventDefault(); setNodes((current) => current.filter((node) => !node.selected)) }
          }
          window.addEventListener('keydown', onKeyDown)
          return () => window.removeEventListener('keydown', onKeyDown)
        }, [])
        return <ReactFlowProvider><NodeRuntimeContext.Provider value={runtime as any}>
          <main data-renderer-mounted="true">
            <div style={{ width: 800, height: 700 }}><ReactFlow nodes={[nodes[0]]} edges={[]} nodeTypes={{ storyboard: StoryboardNode }} fitView /></div>
            <button aria-label="Run Node" disabled={readiness.disabled} onClick={() => runtime.runNode('video')}>Run</button>
            <div data-readiness={readiness.disabled ? 'blocked' : 'ready'}>{readiness.tooltip}</div>
            <ProviderPromptPreview request={request} />
          </main>
        </NodeRuntimeContext.Provider></ReactFlowProvider>
      }
      createRoot(document.getElementById('root')).render(<Harness />)
    `)
    buildSync({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'iife', platform: 'browser', target: 'chrome120', nodePaths: [resolve(process.cwd(), 'node_modules')], jsx: 'automatic', loader: { '.png': 'dataurl' }, logLevel: 'silent' })
    writeFileSync(html, '<!doctype html><html><body><div id="root"></div><script src="./renderer.js"></script></body></html>')
    writeFileSync(main, `
      const { app, BrowserWindow } = require('electron'); const path = require('node:path');
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); const finish = (value, code=0) => { process.stdout.write('CHAIN_RESULT:' + JSON.stringify(value) + '\\n'); app.exit(code) };
      app.setPath('userData', path.join(${JSON.stringify(directory)}, 'user-data'));
      app.whenReady().then(async () => { const win = new BrowserWindow({ show:false, webPreferences:{ contextIsolation:false, sandbox:false } }); await win.loadFile(${JSON.stringify(html)}); await wait(100); win.webContents.debugger.attach('1.3');
        const key = (type, key, code, modifiers=0, commands=[]) => win.webContents.debugger.sendCommand('Input.dispatchKeyEvent', { type, key, code, modifiers, commands });
        const commandA = async () => { await key('keyDown','a','KeyA',4,['selectAll']); await key('keyUp','a','KeyA',4) }; const del = async () => { await key('keyDown','Delete','Delete',0,['deleteForward']); await key('keyUp','Delete','Delete') };
        try { await win.webContents.executeJavaScript("document.querySelector('.storyboard-panel textarea').focus()"); await commandA(); await del(); await wait(120);
          const draft = await win.webContents.executeJavaScript("({ mounted:!!document.querySelector('[data-renderer-mounted]'), textarea:document.querySelector('.storyboard-panel textarea')?.value, chain:structuredClone(window.__chain), readiness:document.querySelector('[data-readiness]')?.textContent, runDisabled:Array.from(document.querySelectorAll('button')).find(function(button){return button.getAttribute('aria-label') === 'Run Node'})?.disabled })");
          await win.webContents.debugger.sendCommand('Input.insertText', { text:'The courier enters again.' }); await wait(120);
          const restored = await win.webContents.executeJavaScript("({ mounted:!!document.querySelector('[data-renderer-mounted]'), chain:structuredClone(window.__chain), readiness:document.querySelector('[data-readiness]')?.textContent, runDisabled:Array.from(document.querySelectorAll('button')).find(function(button){return button.getAttribute('aria-label') === 'Run Node'})?.disabled })"); finish({draft,restored});
        } catch(e) { finish({error:e.stack||String(e)},1) }
      }).catch((e)=>finish({error:e.stack||String(e)},1));
    `)
    const run = spawnSync(electronPath, [main], { cwd: directory, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 30_000 })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('CHAIN_RESULT:'))
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('CHAIN_RESULT:'.length))
    expect(result.draft).toMatchObject({ mounted: true, textarea: '', runDisabled: true })
    expect(result.draft.chain.nodes).toHaveLength(2)
    expect(result.draft.chain.edges).toEqual([{ id: 'storyboard-video', source: 'storyboard', sourceHandle: 'storyboard-out', target: 'video', targetHandle: 'storyboard-in' }])
    expect(result.draft.chain.preview).toContain('STORYBOARD PANEL 1 INCOMPLETE')
    expect(result.draft.readiness).toContain('Storyboard panel 1 is blank')
    expect(result.restored).toMatchObject({ mounted: true, runDisabled: false })
    expect(result.restored.chain.preview).toContain('The courier enters again.')
    expect(result.restored.chain.preview).not.toContain('STORYBOARD PANEL 1 INCOMPLETE')
    expect(result.restored.chain.providerCalls).toBe(0)
  }, 40_000)
})

declare global { interface Window { __chain: any } }
