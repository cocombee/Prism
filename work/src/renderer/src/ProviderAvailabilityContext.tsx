import { createContext } from 'react'
import type { ProviderSelectionAvailability } from '../../shared/providerAvailability'

/** Selected-account readiness; prompt and media connections may have different capabilities. */
export const ProviderAvailabilityContext = createContext<ProviderSelectionAvailability>({ mediaConnected: {}, promptConnected: {} })
