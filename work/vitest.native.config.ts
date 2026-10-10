import { defineConfig } from 'vitest/config'
import { nativeTestIncludes } from './vitest.native-patterns'

export default defineConfig({
  test: {
    include: nativeTestIncludes,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    bail: 1,
  },
})
