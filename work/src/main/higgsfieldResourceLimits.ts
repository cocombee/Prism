/** Finite Prism transport/recovery guards, not provider-advertised allowances.
 * Fifty8192-character URLs plus an authored prompt must fit both the exact
 * wire receipt and its original-input/replay envelope without truncation. */
export const HIGGSFIELD_RESOURCE_LIMITS = Object.freeze({
  wireBytes: 1024 * 1024,
  requestEnvelopeBytes: 3 * 1024 * 1024,
  // Base64 plus bounded secure-storage overhead for the envelope above.
  sealedRequestCharacters: 4 * 1024 * 1024 + 64 * 1024,
  journalPayloadBytes: 32 * 1024 * 1024,
  journalEnvelopeBytes: 40 * 1024 * 1024,
  journalFileBytes: 56 * 1024 * 1024,
})
