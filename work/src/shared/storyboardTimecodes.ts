/** Use the authored decimal precision for all windows, including bridge subwindows. */
export function storyboardTimecodes(values: number[]) {
  if (values.some(value => !Number.isFinite(value))) throw new Error('Storyboard timing must contain finite seconds.')
  const precision = Math.max(1, ...values.map(value => {
    const [mantissa, exponent = '0'] = String(value).split('e')
    return Math.max(0, (mantissa.split('.')[1]?.length || 0) - Number(exponent))
  }))
  if (precision > 100) throw new Error('Storyboard timing precision exceeds the supported decimal range.')
  const normalize = (value: number) => Number(value.toFixed(precision))
  return {
    sum: (...seconds: number[]) => normalize(seconds.reduce((total, value) => total + value, 0)),
    format: (value: number) => normalize(value).toFixed(precision).replace(/0+$/, '').replace(/\.$/, '.0'),
  }
}
