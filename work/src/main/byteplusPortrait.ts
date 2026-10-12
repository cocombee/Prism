import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import type { BytePlusPortraitBinding, ImportedAsset, ServiceProfile } from '../shared/types'

type PortraitMediaType = BytePlusPortraitBinding['mediaType']
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const SHA256 = /^[a-f0-9]{64}$/
const failure = (message: string): never => { throw new Error(`BytePlus trusted asset: ${message}`) }
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
function time(value: unknown, label: string): number {
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) failure(`invalid ${label}.`)
  return Date.parse(value as string)
}
function owner(profile: ServiceProfile): void {
  if (profile.provider !== 'byteplus' || profile.status !== 'connected' || !profile.id.trim() || !profile.accountIdentifier.trim()) failure('select a connected BytePlus account first.')
}

export function portraitMediaType(mimeType: string): PortraitMediaType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return failure('the portrait link requires an Image or Video asset.')
}

/** Accept an ID, never a URL with a query, path, credential or fragment. */
export function bytePlusPortraitAssetId(raw: unknown): string {
  if (typeof raw !== 'string') failure('enter the existing console Asset ID.')
  const id = (raw as string).trim().replace(/^asset:\/\//i, '')
  if (!ID.test(id)) failure('enter a valid console Asset ID or asset:// URI.')
  return id
}

export function linkBytePlusPortrait(input: { consoleAssetId: unknown; consoleActiveConfirmed: unknown; expiresAt?: unknown }, profile: ServiceProfile, mimeType: string, bytes: Uint8Array, now = new Date().toISOString()): BytePlusPortraitBinding {
  owner(profile)
  if (input.consoleActiveConfirmed !== true) failure('confirm that this exact asset is Active in the selected account’s console.')
  if (!bytes.byteLength) failure('the source file is empty.')
  const linkedAt = new Date(time(now, 'link time')).toISOString()
  const expiry = input.expiresAt === undefined || input.expiresAt === '' ? undefined : time(input.expiresAt, 'expiry')
  if (expiry !== undefined && expiry <= Date.parse(linkedAt)) failure('the console asset has expired.')
  return { version: 1, provider: 'byteplus', region: 'ap-southeast-1', profileId: profile.id, accountIdentifier: profile.accountIdentifier, assetId: bytePlusPortraitAssetId(input.consoleAssetId), sourceSha256: digest(bytes), mediaType: portraitMediaType(mimeType), state: 'linked', linkedAt, ...(expiry !== undefined ? { expiresAt: new Date(expiry).toISOString() } : {}), consoleActiveConfirmed: true }
}

/** A recorded binding failure never falls back to sending the original bytes. */
export function resolveBytePlusPortrait(binding: unknown, profile: ServiceProfile, mimeType: string, bytes: Uint8Array, now = new Date().toISOString()): string {
  owner(profile)
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) failure('the saved link is invalid; review it before generation.')
  const value = binding as BytePlusPortraitBinding
  if (value.version !== 1 || value.provider !== 'byteplus' || value.region !== 'ap-southeast-1' || value.consoleActiveConfirmed !== true || !SHA256.test(value.sourceSha256 || '') || value.assetId !== bytePlusPortraitAssetId(value.assetId)) failure('the saved link is invalid; review it before generation.')
  if (value.state !== 'linked') failure('the local link is revoked. Review or replace it before generation.')
  if (value.profileId !== profile.id || value.accountIdentifier !== profile.accountIdentifier) failure('this link belongs to a different BytePlus account. Select its original account or link the correct console asset.')
  if (value.mediaType !== portraitMediaType(mimeType)) failure('the linked media type changed. Link the revised source before generation.')
  const currentTime = time(now, 'current time'), linkedAt = time(value.linkedAt, 'link time')
  if (linkedAt > currentTime) failure('the saved link time is in the future.')
  if (value.expiresAt !== undefined && time(value.expiresAt, 'expiry') <= currentTime) failure('the console asset has expired. Link an eligible asset before generation.')
  if (!bytes.byteLength || digest(bytes) !== value.sourceSha256) failure('the source file changed. Link the exact revised source before generation.')
  return `asset://${value.assetId}`
}

/** Ordinary Description or prompt edits cannot manufacture or remove a binding. */
export function preserveBytePlusPortraitMetadata(incoming: ImportedAsset['metadata'], current: ImportedAsset['metadata']): ImportedAsset['metadata'] {
  const supplied = incoming?.byteplusPortrait, existing = current?.byteplusPortrait
  if (supplied !== undefined && !isDeepStrictEqual(supplied, existing)) failure('use the dedicated trusted asset action to change the link.')
  const { byteplusPortrait: _ignored, ...ordinary } = incoming || {}
  return { ...ordinary, ...(existing ? { byteplusPortrait: existing } : {}) }
}

export function revokeBytePlusPortrait(binding: BytePlusPortraitBinding): BytePlusPortraitBinding {
  return { ...binding, state: 'revoked' }
}
