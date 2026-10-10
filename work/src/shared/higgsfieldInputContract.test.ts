import { describe, expect, it } from 'vitest'
import { HIGGSFIELD_SEEDANCE25_ROUTES, higgsfieldSeedanceSchema } from './higgsfieldSeedanceInput'
import { describeHiggsfieldInputContract, higgsfieldControlDefaults, higgsfieldInputFingerprintMaterial } from './higgsfieldInputContract'

const root = 'bytedance/seedance-2.5/'
describe('independent Higgsfield current input projection', () => {
  it.each(HIGGSFIELD_SEEDANCE25_ROUTES)('projects %s without borrowing fal roles, capacities or timing', endpoint => {
    const schema = higgsfieldSeedanceSchema(endpoint), before = JSON.stringify(schema)
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'owned-current')
    expect(contract.unsupportedInputs).toEqual([])
    expect(contract.fields.map(field => field.key)).toEqual(Object.keys(schema.properties!))
    expect(contract.media.every(field => field.portId === `higgsfield-input::${field.key}`)).toBe(true)
    expect(JSON.stringify(contract)).not.toMatch(/fal\.ai|fal-input-/)
    expect(JSON.stringify(schema)).toBe(before)
    expect(higgsfieldControlDefaults(contract)).not.toHaveProperty('prompt')
    expect(higgsfieldControlDefaults(contract)).not.toHaveProperty('video_url')
    contract.input.properties!.resolution.enum!.push('mutated')
    expect(JSON.stringify(schema)).toBe(before)
  })
  it('keeps generated clip, extension and source-owned duration distinct', () => {
    expect(describeHiggsfieldInputContract(root + 'video-edit', higgsfieldSeedanceSchema(root + 'video-edit'), '').timingScope).toBe('source-video')
    expect(describeHiggsfieldInputContract(root + 'video-extend', higgsfieldSeedanceSchema(root + 'video-extend'), '').timingScope).toBe('generated-extension')
    expect(describeHiggsfieldInputContract(root + 'text-to-video', higgsfieldSeedanceSchema(root + 'text-to-video'), '').timingScope).toBe('generated-clip')
  })
  it('uses current per-field capacity, choices and defaults instead of another provider adapter', () => {
    const endpoint = root + 'reference-to-video', schema = higgsfieldSeedanceSchema(endpoint)
    schema.properties!.image_urls.maxItems = 12
    schema.properties!.resolution.enum = ['720p', '1440p']; schema.properties!.resolution.default = '1440p'
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'updated')
    expect(contract.media.find(field => field.key === 'image_urls')!.maximum).toBe(12)
    expect(contract.fields.find(field => field.key === 'resolution')!.choices).toEqual(['720p', '1440p'])
    expect(higgsfieldControlDefaults(contract).resolution).toBe('1440p')
    expect(contract.unsupportedInputs).toEqual([])
  })
  it('does not turn unknown URL inputs or changed alternatives into runnable adapters', () => {
    const endpoint = root + 'reference-to-video', schema = higgsfieldSeedanceSchema(endpoint)
    schema.properties!.mask_url = { type: 'string', format: 'uri' }
    schema.else = { required: ['image_urls'] }
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'changed')
    expect(contract.fields.find(field => field.key === 'mask_url')!.control).toBe('unsupported')
    expect(contract.media.some(field => field.key === 'mask_url')).toBe(false)
    expect(contract.unsupportedInputs.map(field => field.key)).toEqual(expect.arrayContaining(['mask_url', '$conditional']))
  })
  it('preserves a changed media declaration for review without granting a different socket', () => {
    const endpoint = root + 'image-to-video', schema = higgsfieldSeedanceSchema(endpoint)
    schema.properties!.image_url = { type: 'array', items: { type: 'string' } }
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'changed')
    expect(contract.fields.find(field => field.key === 'image_url')!.control).toBe('unsupported')
    expect(contract.media.some(field => field.key === 'image_url')).toBe(false)
    expect(contract.unsupportedInputs.map(field => field.key)).toContain('image_url')
  })
  it('retains unsupported output formats for review instead of submitting an undecodable movie', () => {
    const endpoint = root + 'text-to-video', schema = higgsfieldSeedanceSchema(endpoint)
    schema.properties!.output_format.enum = ['mp4', 'mov', 'webm']
    const contract = describeHiggsfieldInputContract(endpoint, schema, 'changed')
    expect(contract.fields.find(field => field.key === 'output_format')!.control).toBe('unsupported')
    expect(contract.unsupportedInputs).toContainEqual({ key: 'output_format', reason: expect.stringContaining('movie adapter') })
    expect(schema.properties!.output_format.enum).toEqual(['mp4', 'mov', 'webm'])
  })
  it('binds fingerprint material to controls and local media policy deterministically', () => {
    const endpoint = root + 'image-to-video', schema = higgsfieldSeedanceSchema(endpoint)
    expect(higgsfieldInputFingerprintMaterial(endpoint, schema)).toBe(higgsfieldInputFingerprintMaterial(endpoint, structuredClone(schema)))
    const before = higgsfieldInputFingerprintMaterial(endpoint, schema)
    schema.properties!.duration.maximum = 12
    expect(higgsfieldInputFingerprintMaterial(endpoint, schema)).not.toBe(before)
  })
})
