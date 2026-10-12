import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { projectFolderPath, projectScaffoldPaths } from './projectFolders'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function root() { const path = await mkdtemp(join(tmpdir(), 'prism-folder-layout-')); roots.push(path); return path }

describe('shared project output folder contract', () => {
  it('scaffolds readable new roots and media leaves without numbered or duplicate Storyboards trees', async () => {
    const path = await root()
    const paths = projectScaffoldPaths(path)
    await Promise.all(paths.map(folder => mkdir(folder, { recursive: true })))
    expect(paths.map(folder => relative(path, folder))).toEqual([
      'Project', 'Characters', 'Elements', 'Locations', 'Storyboards', 'Canvas',
      'Generated Assets/Images', 'Generated Assets/Videos', 'Generated Assets/Audio',
      'Imported Assets/Images', 'Imported Assets/Videos', 'Imported Assets/Audio',
    ])
    expect((await readdir(path)).every(name => !/^\d+\./.test(name))).toBe(true)
    expect(projectFolderPath(path, 'Wardrobes', 'coat')).toBe(join(path, 'Wardrobes', 'coat'))
  })
  it('opens legacy metadata and media in place without shadowing or moving them during scaffold', async () => {
    const path = await root()
    await mkdir(join(path, '05. Canvas')); await writeFile(join(path, '05. Canvas', 'workflow.json'), '{"id":"original"}')
    await mkdir(join(path, '06. Generated Assets', '03. Audio'), { recursive: true })
    await writeFile(join(path, '06. Generated Assets', '03. Audio', 'voice.mp3'), 'original-audio')
    await Promise.all(projectScaffoldPaths(path).map(folder => mkdir(folder, { recursive: true })))
    expect(await readFile(projectFolderPath(path, 'Canvas', 'workflow.json'), 'utf8')).toBe('{"id":"original"}')
    expect(await readFile(projectFolderPath(path, 'Generated Assets', 'Audio', 'voice.mp3'), 'utf8')).toBe('original-audio')
    expect(await readdir(path)).not.toContain('Canvas')
    expect(await readdir(path)).not.toContain('Generated Assets')
  })
  it('uses migrated readable folders without recreating any legacy aliases', async () => {
    const path = await root()
    await mkdir(join(path, 'Generated Assets', 'Audio'), { recursive: true })
    await mkdir(join(path, 'Project')); await writeFile(join(path, 'Project', 'Owned.prismflow'), 'portable')
    await Promise.all(projectScaffoldPaths(path).map(folder => mkdir(folder, { recursive: true })))
    expect(await readFile(projectFolderPath(path, 'Project', 'Owned.prismflow'), 'utf8')).toBe('portable')
    expect(projectFolderPath(path, 'Generated Assets', 'Audio', 'voice.mp3')).toBe(join(path, 'Generated Assets', 'Audio', 'voice.mp3'))
    expect((await readdir(path)).some(name => /^\d+\./.test(name))).toBe(false)
  })
})
