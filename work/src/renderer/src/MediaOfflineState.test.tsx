import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MediaOfflineState } from './MediaOfflineState'

describe('MediaOfflineState', () => {
  it('renders a deliberate 16:9 red offline stage with a Relink action and no native media fallback', () => {
    const html = renderToStaticMarkup(<MediaOfflineState mediaFamily="image" state="offline" onFind={() => undefined} />)
    expect(html).toContain('media-offline-state is-offline')
    expect(html).toContain('Media Offline')
    expect(html).toContain('Broken image')
    expect(html).toContain('Relink')
    expect(html).toContain('Relink missing media')
    expect(html).not.toContain('<img')
  })

  it('renders animated finding and temporary found states', () => {
    expect(renderToStaticMarkup(<MediaOfflineState mediaFamily="video" state="finding" findingDots={2} onFind={() => undefined} />)).toContain('Finding..')
    expect(renderToStaticMarkup(<MediaOfflineState mediaFamily="audio" state="found" onFind={() => undefined} />)).toContain('Found')
  })
})
