import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const activeCss = [
  new URL('./styles-next.css', import.meta.url),
]

function pureWhiteForegroundDeclarations(source: string) {
  return source.match(/color\s*:\s*(?:white|#fff(?:fff)?(?=\s*(?:;|}|$))|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi) ?? []
}

describe('active successor foreground contract', () => {
  it('contains no pure-white foreground declaration in the complete active app stylesheet', () => {
    const findings = activeCss.flatMap((url) => {
      const source = readFileSync(url, 'utf8')
      return pureWhiteForegroundDeclarations(source).map((declaration) => `${url.pathname}: ${declaration}`)
    })
    expect(findings).toEqual([])
  })
})
