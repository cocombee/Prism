import { Worker } from 'node:worker_threads'
import { falCompilerWorkerSource, falValidatorWorkerSource, type FalSchemaContract, type FalSchemaNode } from '../shared/falSchemaBinding'
import { falEndpointId } from '../shared/falModelCatalog'

/** Provider validation, including alternative expansion, cannot block Electron's main thread. */
export async function validateFalContractValue(schema: FalSchemaNode, value: unknown, path = 'Input', timeoutMs = 1000): Promise<void> {
  await runFalContractWorker<void>(falValidatorWorkerSource(), { schema, value, path }, timeoutMs)
}

/** Compilation may expand local references; it shares validation's isolated deadline and heap cap. */
export async function compileFalContractIsolated(endpointId: string, openapi: unknown, timeoutMs = 1500): Promise<FalSchemaContract> {
  const id = falEndpointId(endpointId)
  return runFalContractWorker<FalSchemaContract>(falCompilerWorkerSource(), { endpointId: id, openapi }, timeoutMs)
}

async function runFalContractWorker<T>(source: string, workerData: unknown, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 20 || timeoutMs > 5000) throw new Error('Invalid fal validation deadline.')
  return new Promise<T>((resolve, reject) => {
    const worker = new Worker(source, { eval: true, workerData, resourceLimits: { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 8 } })
    let settled = false
    const finish = (error?: Error, value?: T) => {
      if (settled) return
      settled = true; clearTimeout(timer)
      void worker.terminate().catch(() => undefined)
      if (error) reject(error); else resolve(value as T)
    }
    const timer = setTimeout(() => finish(new Error('Fal model contract processing timed out. No generation was submitted.')), timeoutMs)
    worker.once('message', (result: { ok?: boolean; message?: string; value?: T }) => finish(result.ok === true ? undefined : new Error(result.message || 'Fal model contract is invalid.'), result.value))
    worker.once('error', (error) => finish(error))
    worker.once('exit', () => { if (!settled) finish(new Error('Fal model validation stopped before completion.')) })
  })
}
