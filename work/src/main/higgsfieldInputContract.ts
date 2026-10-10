import { createHash } from 'node:crypto'
import type { FalSchemaNode } from '../shared/falSchemaBinding'
import { higgsfieldModel } from '../shared/higgsfieldNative'
import { describeHiggsfieldInputContract, higgsfieldInputFingerprintMaterial, type HiggsfieldInputContract } from '../shared/higgsfieldInputContract'

/** One current public schema, bound to the active Higgsfield scope by the caller. No credentials or fallback defaults. */
export async function readHiggsfieldInputContract(endpoint: unknown, dependencies: {
  assertCurrent(): void
  readContract(endpointId: string, assertCurrent: () => void): Promise<FalSchemaNode>
}): Promise<HiggsfieldInputContract> {
  dependencies.assertCurrent()
  if (typeof endpoint !== 'string') throw new Error('Invalid Higgsfield input contract selection.')
  const model = higgsfieldModel(endpoint)
  const schema = await dependencies.readContract(model.id, dependencies.assertCurrent)
  dependencies.assertCurrent()
  const material = higgsfieldInputFingerprintMaterial(model.id, schema)
  return describeHiggsfieldInputContract(model.id, schema, createHash('sha256').update(material).digest('hex'))
}
