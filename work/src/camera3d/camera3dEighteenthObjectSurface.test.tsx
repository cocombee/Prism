import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { StructuredObjectCreatePanel } from './StructuredObjectCreatePanel'

describe('3D Camera Eighteenth Structured Object creation surface',()=>{
  it('reuses one reference plus required prompt and Storyboard Revamp anatomy in exact order',()=>{
    const html=renderToStaticMarkup(<StructuredObjectCreatePanel busy={false} connected onCancel={vi.fn()} onCreate={vi.fn()} onRevamp={vi.fn()} />)
    const positions=['3D Object','Custom 3D Object','asset-intake-surface','Describe the 3D object to create…','storyboard-control-reveal-zone','Revamp Object','Send Object'].map(token=>html.indexOf(token))
    expect(positions.every(position=>position>=0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a,b)=>a-b))
    expect(html).toContain('WandSparkles')
    expect(html).toContain('aria-label="Revamp Object"')
    expect(html).toContain('disabled=""')
  })
  it('omits every unrelated media/batch/provider control and shows honest connection state',()=>{
    const html=renderToStaticMarkup(<StructuredObjectCreatePanel busy={false} connected={false} onCancel={vi.fn()} onCreate={vi.fn()} onRevamp={vi.fn()} />)
    for(const forbidden of ['>Multi<','>Sheets<','>Single<','>Batch<','Quantity','Resolution','Image Format','Provider','Model']) expect(html).not.toContain(forbidden)
    expect(html).toContain('Connection required')
    expect(html).toContain('Open Connections')
  })
  it.each([
    ['Describe This Object','Describe the selected Object…','Send Description'],
    ['Ask About Object','Ask a question about the selected Object…','Send Question'],
    ['Create Similar Object','Describe the similar Object to create…','Send Object'],
    ['Use As Reference','Describe the 3D object to create…','Send Object'],
    ['Tutorial','Describe what you want to learn about this Object…','Send Tutorial'],
  ] as const)('mounts the %s Prompt Tool with its own truthful terminal action',(tool,placeholder,terminal)=>{
    const html=renderToStaticMarkup(<StructuredObjectCreatePanel tool={tool} busy={false} connected onCancel={vi.fn()} onCreate={vi.fn()} onRevamp={vi.fn()} />)
    expect(html).toContain(`aria-label="${tool}"`)
    expect(html).toContain(`placeholder="${placeholder}"`)
    expect(html).toContain(`>${terminal}<`)
  })
})
