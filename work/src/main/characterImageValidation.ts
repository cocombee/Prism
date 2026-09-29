import sharp from 'sharp'
import type { CharacterImageValidationResult, CharacterInputMode } from '../shared/types'
import { validateCharacterImageLayout } from '../shared/characterImageValidation'

export async function validateCharacterImageFile(path: string, mode: CharacterInputMode): Promise<CharacterImageValidationResult> {
  const decoded = await sharp(path)
    .rotate()
    .resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return validateCharacterImageLayout({
    data: new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
    width: decoded.info.width,
    height: decoded.info.height,
    channels: decoded.info.channels,
  }, mode)
}
