import type { FalSchemaNode } from '../shared/falSchemaBinding'
import { higgsfieldModel, planHiggsfieldNativeInput, type HiggsfieldNativeRequest } from '../shared/higgsfieldNative'
import { readHiggsfieldInputContract } from './higgsfieldInputContract'
import { validateFalContractValue } from './falSchemaValidation'
import { HIGGSFIELD_RESOURCE_LIMITS } from './higgsfieldResourceLimits'

/** Main owns schema/digest; renderer supplies only its reviewed digest, never schema. */
export async function resolveHiggsfieldCurrentInput(request: HiggsfieldNativeRequest, dependencies: {
  assertCurrent(): void
  readContract(endpointId: string, assertCurrent: () => void): Promise<FalSchemaNode>
}) {
  const native = structuredClone(request), captured = planHiggsfieldNativeInput(native)
  const scoped = higgsfieldModel(native.endpointId).kind !== 'genjutsu' && native.fingerprint !== undefined
  const read = async () => {
    dependencies.assertCurrent()
    if (scoped) {
      const contract = await readHiggsfieldInputContract(native.endpointId, dependencies)
      if (contract.fingerprint !== native.fingerprint) throw new Error('The current Higgsfield model inputs changed. Review the preserved values and connections before generating.')
      if (contract.unsupportedInputs.length) throw new Error(contract.unsupportedInputs.map(item => item.reason).join(' '))
      return contract.input
    }
    const schema = await dependencies.readContract(native.endpointId, dependencies.assertCurrent)
    dependencies.assertCurrent()
    if (captured.kind !== 'genjutsu') for (const [key, field] of Object.entries(captured.schema.properties || {})) {
      if (!Object.hasOwn(native.values, key) && Object.hasOwn(field, 'default') && JSON.stringify(schema.properties?.[key]?.default) !== JSON.stringify(field.default)) throw new Error(`The selected native default for ${key} changed. Review its current controls; saved values were preserved.`)
    }
    return schema
  }
  const schema = await read(), plan = scoped ? planHiggsfieldNativeInput(native, schema) : captured
  if(Buffer.byteLength(JSON.stringify(plan.preview))>HIGGSFIELD_RESOURCE_LIMITS.wireBytes)throw new Error('Higgsfield inputs exceed Prism’s protected request capacity; authored values were preserved.')
  await validateFalContractValue(schema, plan.preview); dependencies.assertCurrent()
  return {
    schema, plan,
    /** Before client creation and before submit, reread the exact owner and validate actual input. */
    async validateInput(input: unknown) {
      const latest = await read()
      await validateFalContractValue(latest, input); dependencies.assertCurrent()
      return latest
    },
  }
}
