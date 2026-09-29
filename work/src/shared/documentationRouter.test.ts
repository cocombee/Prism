import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const docsRoot = fileURLToPath(new URL('../../../docs/', import.meta.url))
const router = readFileSync(join(docsRoot, 'README.md'), 'utf8')
const branchMap = readFileSync(join(docsRoot, 'BRANCH-MAP.md'), 'utf8')

function markdownFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.isFile() && entry.name.endsWith('.md') ? [relative(docsRoot, path).split(sep).join('/')] : []
  })
}

describe('documentation router integrity', () => {
  it('routes Node, Storyboard, and persistence work only to existing canonical documents', () => {
    const routedDocuments = [
      'features/canvas/typed-workflow-graph.md',
      'architecture/runtime-boundaries.md',
      'data/storage-map.md',
    ]
    routedDocuments.forEach((path) => expect(existsSync(join(docsRoot, path)), path).toBe(true))
    expect(router).not.toContain('architecture/workflow-graph.md')
    expect(router).not.toContain('architecture/project-persistence.md')
  })

  it('lists every populated Markdown document exactly once and reports the real count', () => {
    const expected = markdownFiles(docsRoot).filter((path) => path !== 'BRANCH-MAP.md').sort()
    const listed = [...branchMap.matchAll(/^- `([^`]+\.md)`$/gm)].map((match) => match[1]).sort()
    expect(listed).toEqual(expected)
    expect(branchMap).toContain(`Populated Markdown files excluding this map: **${expected.length}**.`)
  })
})
