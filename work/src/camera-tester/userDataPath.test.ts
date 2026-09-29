import { describe, expect, it } from 'vitest'
import { resolveCameraUserDataPath } from './userDataPath'

describe('camera tester user-data isolation', () => {
  it('keeps an explicit --user-data-dir authoritative over the historical default', () => {
    const explicit = '/tmp/prism-camera-isolated-profile'

    expect(resolveCameraUserDataPath(
      ['Prism Camera Candidate', `--user-data-dir=${explicit}`],
      '/Users/example/Library/Application Support',
    )).toBe(explicit)
  })
})
