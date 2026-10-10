import { configDefaults, defineConfig } from 'vitest/config'
import { nativeTestIncludes } from './vitest.native-patterns'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, ...nativeTestIncludes],
  },
})
