import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { outDir: 'out-camera/main', rollupOptions: { input: resolve('src/camera-tester/main.ts'), output: { entryFileNames: 'main.js' } } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { outDir: 'out-camera/preload', rollupOptions: { input: resolve('src/camera-tester/preload.ts'), output: { entryFileNames: 'preload.js' } } },
  },
  renderer: {
    root: resolve('src/camera-tester'),
    plugins: [react()],
    build: {
      outDir: resolve('out-camera/renderer'),
      rollupOptions: { input: resolve('src/camera-tester/index.html') },
    },
  },
})
