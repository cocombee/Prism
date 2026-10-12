import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Main-owned disk layout. Names are independent from project and asset IDs.
 * Legacy selection is read compatibility, never a migration or overwrite. */
export const PROJECT_FOLDER_ALIASES = Object.freeze({
  Project: ['00. Project'], Characters: ['01. Characters'], Elements: ['02. Elements'],
  Locations: ['03. Locations'], Wardrobes: ['04. Wardrobes'], Styles: ['04. Styles'],
  Storyboards: ['04. Storyboards', '08. Storyboards'], Canvas: ['05. Canvas'],
  'Generated Assets': ['06. Generated Assets'], 'Imported Assets': ['07. Imported Assets'],
})
export type ProjectFolder = keyof typeof PROJECT_FOLDER_ALIASES
const mediaAliases: Record<string, string> = { Images: '01. Images', Videos: '02. Videos', Audio: '03. Audio' }

export function projectFolderPath(root: string, name: ProjectFolder, ...parts: string[]): string {
  const canonical = join(root, name)
  // Do not shadow a saved Canvas or document tree with a newly scaffolded copy.
  const folder = existsSync(canonical) ? canonical
    : PROJECT_FOLDER_ALIASES[name].map(alias => join(root, alias)).find(path => existsSync(path)) || canonical
  if ((name === 'Generated Assets' || name === 'Imported Assets') && parts.length && mediaAliases[parts[0]]) {
    const [leaf, ...rest] = parts
    const readable = join(folder, leaf), legacy = join(folder, mediaAliases[leaf])
    return join(existsSync(readable) || !existsSync(legacy) ? readable : legacy, ...rest)
  }
  return join(folder, ...parts)
}

export function projectScaffoldPaths(root: string): string[] {
  return [
    ...(['Project', 'Characters', 'Elements', 'Locations', 'Storyboards', 'Canvas'] as const).map(name => projectFolderPath(root, name)),
    ...(['Generated Assets', 'Imported Assets'] as const).flatMap(name => ['Images', 'Videos', 'Audio'].map(leaf => projectFolderPath(root, name, leaf))),
  ]
}
