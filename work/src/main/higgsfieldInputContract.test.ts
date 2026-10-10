import { describe, expect, it, vi } from 'vitest'
import { readHiggsfieldInputContract } from './higgsfieldInputContract'
import { higgsfieldSeedanceSchema } from '../shared/higgsfieldSeedanceInput'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const endpoint = 'bytedance/seedance-2.5/reference-to-video'
describe('owned current Higgsfield contract reader', () => {
  it('returns current provider controls with a schema-bound digest and no static fallback', async () => {
    const schema = higgsfieldSeedanceSchema(endpoint); schema.properties!.image_urls.maxItems = 12
    const readContract = vi.fn(async () => schema), assertCurrent = vi.fn()
    const result = await readHiggsfieldInputContract(endpoint, {readContract,assertCurrent})
    expect(readContract).toHaveBeenCalledOnce(); expect(readContract).toHaveBeenCalledWith(endpoint,assertCurrent)
    expect(result.media.find(field => field.key === 'image_urls')!.maximum).toBe(12)
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect((await readHiggsfieldInputContract(endpoint,{readContract,assertCurrent})).fingerprint).toBe(result.fingerprint)
    schema.properties!.image_urls.maxItems = 13
    expect((await readHiggsfieldInputContract(endpoint,{readContract,assertCurrent})).fingerprint).not.toBe(result.fingerprint)
  })
  it.each([undefined, {}, 'fal-ai/unknown', 'bytedance/seedance-2.5/unverified'])('rejects unregistered identity %s before public work', async id => {
    const readContract = vi.fn(), assertCurrent = vi.fn()
    await expect(readHiggsfieldInputContract(id,{readContract,assertCurrent})).rejects.toThrow()
    expect(readContract).not.toHaveBeenCalled()
  })
  it('rejects a stale scope after the public read and does not return a cached contract', async () => {
    let current = true
    const readContract = vi.fn(async () => {current=false; return higgsfieldSeedanceSchema(endpoint)})
    const assertCurrent = () => {if(!current) throw new Error('Profile changed')}
    await expect(readHiggsfieldInputContract(endpoint,{readContract,assertCurrent})).rejects.toThrow('Profile changed')
  })
  it('surfaces current document failure without injecting bundled defaults', async () => {
    await expect(readHiggsfieldInputContract(endpoint,{readContract:async()=>{throw new Error('Current document unavailable')},assertCurrent:()=>{}})).rejects.toThrow('Current document unavailable')
  })
  it('actual main IPC keeps current contract reads inside the Higgsfield owner lease', async () => {
    const source = ts.createSourceFile('index.ts',readFileSync(new URL('./index.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
    let callback: ts.Expression | undefined
    function scan(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'ipcMain.handle' && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'services:higgsfield-schema') callback = node.arguments[1]
      ts.forEachChild(node,scan)
    }
    scan(source)
    if (!callback) throw new Error('Missing actual native schema IPC')
    const code = ts.transpileModule('return '+callback.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
    const readContract = vi.fn(async () => higgsfieldSeedanceSchema(endpoint)), assertCurrent = vi.fn()
    const lease = vi.fn(async (provider: string, work: () => Promise<unknown>) => {expect(provider).toBe('higgsfield'); return work()})
    const handler = new Function('withProviderRequest','readHiggsfieldInputContract','runtimeServiceFailures','higgsfieldPublicCatalog',code)(lease,readHiggsfieldInputContract,{assertCurrent},{readContract})
    expect(await handler({},endpoint)).toMatchObject({endpointId:endpoint,fingerprint:expect.any(String)})
    expect(assertCurrent.mock.calls.every(call => call[0] === 'higgsfield')).toBe(true)
    lease.mockRejectedValue(new Error('Owner changed'))
    await expect(handler({},endpoint)).rejects.toThrow('Owner changed')
    expect(readContract).toHaveBeenCalledOnce()
  })
  it('actual preload exposes a fixed schema channel and passes only the selected endpoint', async () => {
    const source = ts.createSourceFile('preload.ts',readFileSync(new URL('../preload/index.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
    let initializer: ts.Expression | undefined
    for (const statement of source.statements) if(ts.isVariableStatement(statement)) for(const declaration of statement.declarationList.declarations) if(declaration.name.getText(source)==='api') initializer=declaration.initializer
    if(!initializer) throw new Error('Missing actual preload API')
    const code = ts.transpileModule('return '+initializer.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
    const invoke = vi.fn(async () => ({})), api = new Function('ipcRenderer','webUtils',code)({invoke},{})
    await api.services.higgsfieldSchema(endpoint)
    expect(invoke.mock.calls).toEqual([['services:higgsfield-schema',endpoint]])
  })
})
