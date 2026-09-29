import { join } from 'node:path'

export function explicitCameraUserDataDir(argv: readonly string[]): string | null {
  const equalsForm = argv.find((argument) => argument.startsWith('--user-data-dir='))
  if (equalsForm) return equalsForm.slice('--user-data-dir='.length)
  const flagIndex = argv.indexOf('--user-data-dir')
  return flagIndex >= 0 ? argv[flagIndex + 1] || null : null
}

export function resolveCameraUserDataPath(argv: readonly string[], appDataPath: string): string {
  return explicitCameraUserDataDir(argv) || join(appDataPath, 'Prism3DCameraEighteenthCorrection20260830')
}
