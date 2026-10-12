import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AudioPlayer } from './AudioPlayer'

describe('approved shared audio player controls',()=>{
  it('reuses play, carousel and folder controls without native duration or ratings',()=>{
    const html=renderToStaticMarkup(<AudioPlayer src="prism-asset://local/audio.mp3" activeIndex={0} total={3} onReveal={()=>{}} />)
    expect(html).toContain('compact-settings compact-options');expect(html).toContain('Seek Audio');expect(html).toContain('Previous Result');expect(html).toContain('Next Result');expect(html).toContain('Show Audio In Finder');expect(html).toContain('1/3')
    expect(html).not.toContain(' controls=');expect(html).not.toContain('0:00');expect(html).not.toContain('Download');expect(html).not.toContain('Like')
  })
  it('omits result navigation for a single result and keeps source-aware Finder optional',()=>{
    const html=renderToStaticMarkup(<AudioPlayer src="https://media.example/audio.mp3" />)
    expect(html).not.toContain('Previous Result');expect(html).not.toContain('Show Audio In Finder');expect(html).not.toContain('<i ')
  })
})
