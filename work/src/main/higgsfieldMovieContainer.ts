/** Main-only byte/MIME classification. Header checks do not attest decoding or model output adherence. */
export type HiggsfieldMovieMime='video/mp4'|'video/quicktime'
export interface HiggsfieldMovieFormat { extension:'mp4'|'mov';contentType:HiggsfieldMovieMime }
export function higgsfieldMovieMime(value:unknown):HiggsfieldMovieMime|undefined {
 if(value===undefined||value===null)return undefined
 if(typeof value!=='string'||value.length>8192)throw new Error('Higgsfield output has an unsupported media type.')
 const type=value.split(';')[0].trim().toLowerCase()
 if(!type||type==='application/octet-stream')return undefined
 if(type!=='video/mp4'&&type!=='video/quicktime')throw new Error('Higgsfield output must be a supported MP4 or MOV video.')
 return type
}
export function higgsfieldMovieFormat(type:HiggsfieldMovieMime):HiggsfieldMovieFormat {
 if(type!=='video/mp4'&&type!=='video/quicktime')throw new Error('The saved Higgsfield movie type is unsupported.')
 return {extension:type==='video/quicktime'?'mov':'mp4',contentType:type}
}
const mp4Brand=(brand:string)=>/^(?:isom|iso[2-9a-c]|mp41|mp42|avc1|dash|M4V |msdh|msix|F4V |MSNV)$/.test(brand)
export function higgsfieldMovieHeaderBytes(prefix:Uint8Array):number {
 const header=Buffer.from(prefix)
 if(header.length<8||header.subarray(4,8).toString('ascii')!=='ftyp')throw new Error('Higgsfield output is not a supported MP4 or MOV container.')
 const size=header.readUInt32BE(0)
 if(size<16||size>64*1024||size%4!==0)throw new Error('Higgsfield output has an invalid movie header.')
 return size
}
export function higgsfieldMovieContainer(prefix:Uint8Array,totalBytes?:number,expected?:HiggsfieldMovieMime):HiggsfieldMovieFormat {
 const header=Buffer.from(prefix),boxBytes=higgsfieldMovieHeaderBytes(header)
 if(header.length<boxBytes||totalBytes!==undefined&&(!Number.isSafeInteger(totalBytes)||totalBytes<boxBytes))throw new Error('Higgsfield output has an incomplete movie header.')
 const major=header.subarray(8,12).toString('ascii'),compatible:string[]=[]
 for(let offset=16;offset<boxBytes;offset+=4)compatible.push(header.subarray(offset,offset+4).toString('ascii'))
 if(/^(?:M4A |M4B |M4P |avif|avis|heic|heix|hevc|hevx|mif1|msf1)$/.test(major))throw new Error('Higgsfield output has a nonvideo movie brand.')
 // QuickTime requires an explicit compatible qt brand. A major/compatible ISO brand permits MP4.
 const quickTime=compatible.includes('qt  '),mp4=mp4Brand(major)||compatible.some(mp4Brand)
 if(expected&&(expected==='video/quicktime'?!quickTime:!mp4))throw new Error('Higgsfield output MIME and movie container disagree. Preserve it for review.')
 const type=expected??(major==='qt  '&&quickTime?'video/quicktime':mp4Brand(major)?'video/mp4':quickTime?'video/quicktime':mp4?'video/mp4':undefined)
 if(!type)throw new Error('Higgsfield output has an unsupported movie brand.')
 return higgsfieldMovieFormat(type)
}
