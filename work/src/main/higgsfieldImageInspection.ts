import sharp from 'sharp'
/** Metadata decode only; original managed bytes are uploaded without normalization or re-encoding. */
export async function inspectHiggsfieldImage(bytes:Uint8Array,declaredType:string):Promise<void>{
  try{
    const metadata=await sharp(bytes,{limitInputPixels:100_000_000}).metadata()
    const formats: Record<string,string> = {jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}
    const actual=formats[metadata.format || '']
    if(actual!==declaredType||!metadata.width||!metadata.height)throw new Error('Incompatible image')
  }catch{throw new Error('Higgsfield image references must be decodable and match their managed file format.')}
}
