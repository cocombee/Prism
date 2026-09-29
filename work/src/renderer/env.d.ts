/// <reference types="vite/client" />

import type { PrismAPI } from '../shared/types'

declare global {
  interface Window {
    prism: PrismAPI
  }
}

export {}
