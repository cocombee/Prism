// The two older keyboard suites also launch Electron despite their filenames.
export const nativeTestIncludes = [
  '**/*.electron.test.ts',
  'src/renderer/src/TaggedPromptTextarea.keyboardBoundary.test.ts',
  'src/renderer/src/storyboardDraftChain.keyboardBoundary.test.ts',
]
