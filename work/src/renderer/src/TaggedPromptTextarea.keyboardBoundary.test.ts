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

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('Storyboard TaggedPromptTextarea centralized keyboard boundary', () => {
  it('keeps Canvas selection inert for text keys and deletes only manually selected Canvas items outside text', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prism-textarea-boundary-'))
    temporaryDirectories.push(directory)
    const componentPath = resolve(process.cwd(), 'src/renderer/src/TaggedPromptTextarea.tsx')
    const keyboardPath = resolve(process.cwd(), 'src/shared/keyboard.ts')
    const rendererEntry = join(directory, 'renderer.tsx')
    const rendererBundle = join(directory, 'renderer.js')
    const htmlPath = join(directory, 'index.html')
    const mainPath = join(directory, 'main.cjs')

    writeFileSync(rendererEntry, `
      import React, { useEffect, useState } from 'react'
      import { createRoot } from 'react-dom/client'
      import { TaggedPromptTextarea } from ${JSON.stringify(componentPath)}
      import { canvasKeyboardAction } from ${JSON.stringify(keyboardPath)}

      const boundary = {
        scope: 'canvas',
        reactFlowDeleteKeyCode: null,
        reactFlowCaptureKeys: [],
        parentKeys: [],
        editorCaptureKeys: [],
        value: '',
        nodes: [],
        edges: [],
        reactFlowDelete: null,
        preparePreselectedText: null,
      }
      window.__boundary = boundary

      // Registered before React mounts, matching React Flow's earlier WINDOW CAPTURE ownership.
      window.addEventListener('keydown', (event) => {
        boundary.reactFlowCaptureKeys.push(event.key)
        if (boundary.reactFlowDeleteKeyCode?.includes(event.key)) boundary.reactFlowDelete?.()
      }, true)

      const textEntryActive = (target) => {
        const element = target instanceof Element ? target : null
        return Boolean(element && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable || element.closest('[contenteditable="true"], [contenteditable=""]')))
      }

      function Harness() {
        const [value, setValue] = useState('Storyboard prompt text')
        const [nodes, setNodes] = useState([
          { id: 'storyboard', selected: false },
          { id: 'video', selected: false },
        ])
        const [edges, setEdges] = useState([{ id: 'storyboard-video', source: 'storyboard', target: 'video', selected: false }])

        useEffect(() => {
          boundary.value = value
          boundary.nodes = nodes
          boundary.edges = edges
          boundary.reactFlowDelete = () => {
            const selected = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
            if (!selected.size) return
            setNodes((current) => current.filter((node) => !selected.has(node.id)))
            setEdges((current) => current.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target)))
          }
          boundary.preparePreselectedText = () => {
            setValue('Preselected storyboard text')
            setNodes((current) => current.map((node) => ({ ...node, selected: node.id === 'storyboard' })))
          }
        }, [edges, nodes, value])

        useEffect(() => {
          const onKeyDown = (event) => {
            const action = canvasKeyboardAction({
              key: event.key,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
              textEntryActive: textEntryActive(event.target) || textEntryActive(document.activeElement),
              canvasScope: boundary.scope === 'canvas',
            })
            if (action === 'delete-selection') {
              event.preventDefault()
              const selected = new Set(nodes.filter((node) => node.selected).map((node) => node.id))
              if (selected.size) {
                setNodes((current) => current.filter((node) => !selected.has(node.id)))
                setEdges((current) => current.filter((edge) => !selected.has(edge.source) && !selected.has(edge.target)))
              } else {
                setEdges((current) => current.filter((edge) => !edge.selected))
              }
            }
            if (action === 'select-all') {
              event.preventDefault()
              setNodes((current) => current.map((node) => ({ ...node, selected: true })))
              setEdges((current) => current.map((edge) => ({ ...edge, selected: false })))
            }
          }
          window.addEventListener('keydown', onKeyDown)
          return () => window.removeEventListener('keydown', onKeyDown)
        }, [nodes])

        return <main>
          <section data-node-kind="storyboard" data-storyboard-panel onKeyDown={(event) => boundary.parentKeys.push(event.key)}>
            <label htmlFor="storyboard-prompt">Storyboard Panel Prompt</label>
            <TaggedPromptTextarea
              id="storyboard-prompt"
              value={value}
              connectedTags={[]}
              onValueChange={setValue}
              onKeyDownCapture={(event) => boundary.editorCaptureKeys.push(event.key)}
            />
          </section>
          <div id="canvas" tabIndex={0} onPointerDownCapture={() => { boundary.scope = 'canvas' }}>Canvas</div>
        </main>
      }

      createRoot(document.getElementById('root')).render(<Harness />)
    `)

    buildSync({
      entryPoints: [rendererEntry],
      outfile: rendererBundle,
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'chrome120',
      nodePaths: [resolve(process.cwd(), 'node_modules')],
      jsx: 'automatic',
      logLevel: 'silent',
    })

    writeFileSync(htmlPath, '<!doctype html><html><body><div id="root"></div><script src="./renderer.js"></script></body></html>')
    writeFileSync(mainPath, `
      const { app, BrowserWindow } = require('electron')
      const path = require('node:path')
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
      const finish = (payload, exitCode = 0) => {
        process.stdout.write('BOUNDARY_RESULT:' + JSON.stringify(payload) + '\\n')
        app.exit(exitCode)
      }
      app.setPath('userData', path.join(${JSON.stringify(directory)}, 'user-data'))
      app.whenReady().then(async () => {
        const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, sandbox: false } })
        await window.loadFile(${JSON.stringify(htmlPath)})
        window.webContents.debugger.attach('1.3')
        const dispatchKey = (params) => window.webContents.debugger.sendCommand('Input.dispatchKeyEvent', params)
        const commandA = async () => {
          await dispatchKey({ type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65, commands: ['selectAll'] })
          await dispatchKey({ type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65 })
        }
        const deleteForward = async () => {
          await dispatchKey({ type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46, commands: ['deleteForward'] })
          await dispatchKey({ type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 })
        }
        await wait(40)
        try {
          await window.webContents.executeJavaScript("document.querySelector('[data-storyboard-panel] textarea').focus()")
          await commandA()
          await wait(30)
          const selectedText = await window.webContents.executeJavaScript("(() => { const textarea = document.querySelector('[data-storyboard-panel] textarea'); return { start: textarea.selectionStart, end: textarea.selectionEnd, length: textarea.value.length }; })()")
          await deleteForward()
          await wait(40)
          const afterText = await window.webContents.executeJavaScript("(() => ({ textareaValue: document.querySelector('[data-storyboard-panel] textarea').value, value: window.__boundary.value, nodes: window.__boundary.nodes, edges: window.__boundary.edges, reactFlowCaptureKeys: window.__boundary.reactFlowCaptureKeys, editorCaptureKeys: window.__boundary.editorCaptureKeys, parentKeys: window.__boundary.parentKeys, reactFlowDeleteKeyCode: window.__boundary.reactFlowDeleteKeyCode }))()")

          await window.webContents.executeJavaScript("window.__boundary.preparePreselectedText()")
          await wait(40)
          await window.webContents.executeJavaScript("document.querySelector('[data-storyboard-panel] textarea').focus()")
          await commandA()
          await wait(30)
          const preselectedTextSelection = await window.webContents.executeJavaScript("(() => { const textarea = document.querySelector('[data-storyboard-panel] textarea'); return { start: textarea.selectionStart, end: textarea.selectionEnd, length: textarea.value.length }; })()")
          await deleteForward()
          await wait(40)
          const afterPreselectedText = await window.webContents.executeJavaScript("(() => ({ textareaValue: document.querySelector('[data-storyboard-panel] textarea').value, value: window.__boundary.value, nodes: structuredClone(window.__boundary.nodes), edges: structuredClone(window.__boundary.edges) }))()")

          await window.webContents.executeJavaScript("document.querySelector('#canvas').focus()")
          await commandA()
          await wait(30)
          await deleteForward()
          await wait(40)
          const afterCanvasDelete = await window.webContents.executeJavaScript("({ nodes: structuredClone(window.__boundary.nodes), edges: structuredClone(window.__boundary.edges) })")
          finish({ selectedText, afterText, preselectedTextSelection, afterPreselectedText, afterCanvasDelete })
        } catch (error) {
          finish({ error: error && error.stack ? error.stack : String(error) }, 1)
        }
      }).catch((error) => finish({ error: error && error.stack ? error.stack : String(error) }, 1))
    `)

    const run = spawnSync(electronPath, [mainPath], {
      cwd: directory,
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
      timeout: 30_000,
    })
    const marker = run.stdout.split('\n').find((line) => line.startsWith('BOUNDARY_RESULT:'))
    expect(run.error).toBeUndefined()
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0)
    expect(marker, `${run.stdout}\n${run.stderr}`).toBeDefined()
    const result = JSON.parse(marker!.slice('BOUNDARY_RESULT:'.length))

    expect(result.selectedText).toEqual({ start: 0, end: 22, length: 22 })
    expect(result.afterText.textareaValue).toBe('')
    expect(result.afterText.value).toBe('')
    expect(result.afterText.nodes).toEqual([
      { id: 'storyboard', selected: false },
      { id: 'video', selected: false },
    ])
    expect(result.afterText.edges).toEqual([{ id: 'storyboard-video', source: 'storyboard', target: 'video', selected: false }])
    expect(result.afterText.reactFlowDeleteKeyCode).toBeNull()
    expect(result.afterText.reactFlowCaptureKeys).toEqual(['a', 'Delete'])
    expect(result.afterText.editorCaptureKeys).toEqual(['a', 'Delete'])
    expect(result.afterText.parentKeys).toEqual([])
    expect(result.preselectedTextSelection).toEqual({ start: 0, end: 27, length: 27 })
    expect(result.afterPreselectedText).toEqual({
      textareaValue: '',
      value: '',
      nodes: [
        { id: 'storyboard', selected: true },
        { id: 'video', selected: false },
      ],
      edges: [{ id: 'storyboard-video', source: 'storyboard', target: 'video', selected: false }],
    })
    expect(result.afterCanvasDelete).toEqual({ nodes: [], edges: [] })
  }, 40_000)
})

declare global {
  interface Window {
    __boundary: {
      scope: 'canvas' | 'library'
      reactFlowDeleteKeyCode: string[] | null
      reactFlowCaptureKeys: string[]
      parentKeys: string[]
      editorCaptureKeys: string[]
      value: string
      nodes: Array<{ id: string; selected: boolean }>
      edges: Array<{ id: string; source: string; target: string; selected: boolean }>
      reactFlowDelete: (() => void) | null
      preparePreselectedText: (() => void) | null
    }
  }
}
