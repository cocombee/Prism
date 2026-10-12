/** Public Kling Omni Video Reference docs duplicate the top-level Mode
 * declaration inside integer Duration. The human API guide declares them as
 * separate fields. Correct only that exact duplicate; unknown rules still pass
 * to the strict isolated compiler and can never acquire transport authority.
 * https://open.higgsfield.ai/models/kling-video/omni/video-reference/api-reference
 */
export function higgsfieldPublishedSchema(endpointId: string, published: Record<string, unknown>): Record<string, unknown> {
  const schema = structuredClone(published)
  if (endpointId !== 'kling-video/omni/video-reference') return schema
  const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  const properties = object(schema.properties) ? schema.properties : undefined
  const duration = properties && object(properties.duration) ? properties.duration : undefined
  if (!duration || !Object.hasOwn(duration, 'mode')) return schema
  const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : object(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value
  const expected = JSON.stringify(stable({ enum: ['std', 'pro'], type: 'string', default: 'pro' }))
  if (duration.type !== 'integer' || JSON.stringify(stable(duration.mode)) !== expected || JSON.stringify(stable(properties!.mode)) !== expected) {
    throw new Error('The public Kling Omni duplicate Mode declaration changed. Preserve the saved inputs and review the provider contract.')
  }
  delete duration.mode
  return schema
}
