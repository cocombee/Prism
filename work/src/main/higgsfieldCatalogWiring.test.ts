import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { ScopedCatalogCache } from './scopedCatalogCache'
import { HIGGSFIELD_BUNDLED_CATALOG_REVISION, higgsfieldBundledCatalogModels } from '../shared/higgsfieldNative'
const source = ts.createSourceFile('index.ts', readFileSync(new URL('./index.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
const declaration = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === 'listServiceModels')!
const program = ts.transpileModule(declaration.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
function setup() {
  let now = 0
  const cache = new ScopedCatalogCache<any>(1000, () => now), credential = vi.fn(), assertCurrent = vi.fn(), read = vi.fn(async () => ({ availability: { provider: 'higgsfield', verified: true, catalogComplete: false, models: [{ id: 'future/seedance-3.0', label: 'Future release' }] } }))
  const bindings = { higgsfieldCatalogCache: cache, higgsfieldPublicCatalog: { read }, runtimeServiceFailures: { catalogScope: () => 'higgsfield:owned-project-profile', assertCurrent }, higgsfieldBundledCatalogModels, HIGGSFIELD_BUNDLED_CATALOG_REVISION, loadServiceCredential: credential }
  const models = new Function(...Object.keys(bindings), program + '\nreturn listServiceModels;')(...Object.values(bindings))
  return { models, cache, read, credential, assertCurrent, expire: () => { now = 2000 } }
}
describe('actual main independent public Higgsfield model delivery', () => {
  it('publishes current public IDs through the owned cache without reading keys or another service', async () => {
    const fixture = setup()
    expect(await fixture.models('higgsfield')).toMatchObject({ provider: 'higgsfield', verified: true, models: [{ id: 'future/seedance-3.0' }] })
    await fixture.models('higgsfield'); expect(fixture.read).toHaveBeenCalledOnce(); expect(fixture.credential).not.toHaveBeenCalled()
  })
  it('preserves the previous owned catalog on a later transport failure and uses explicit bundled fallback only without one', async () => {
    const fixture = setup(), first = await fixture.models('higgsfield')
    fixture.expire(); fixture.read.mockRejectedValue(new Error('Public transport503'))
    expect(await fixture.models('higgsfield')).toMatchObject({ models: first.models, catalogStale: true, catalogError: 'Public transport503' })
    const blank = setup(); blank.read.mockRejectedValue(new Error('Public transport403'))
    const fallback = await blank.models('higgsfield')
    expect(fallback).toMatchObject({ verified: false, catalogComplete: false, catalogStale: true })
    expect(fallback.models).toEqual(higgsfieldBundledCatalogModels())
    expect(fallback.catalogFingerprint).toBe(HIGGSFIELD_BUNDLED_CATALOG_REVISION)
    expect(blank.credential).not.toHaveBeenCalled()
  })
  it('rejects a superseded request without disguising it as a bundled usable catalog', async () => {
    const fixture = setup()
    fixture.read.mockImplementation(async () => { fixture.assertCurrent.mockImplementation(() => { throw Error('Superseded owner') }); return { availability: { provider: 'higgsfield', verified: true, catalogComplete: false, models: [] } } })
    await expect(fixture.models('higgsfield')).rejects.toThrow('Superseded owner')
    expect(fixture.credential).not.toHaveBeenCalled(); expect(fixture.cache.snapshot('higgsfield:owned-project-profile')).toBeUndefined()
  })
})
