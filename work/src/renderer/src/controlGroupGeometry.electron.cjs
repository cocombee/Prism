const { app, BrowserWindow } = require('electron')
const { buildSync } = require('esbuild')
const Module = require('node:module')
const fs = require('node:fs')
const path = require('node:path')

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const sharedBundle = buildSync({
  entryPoints: [path.resolve(__dirname, '../../shared/controlGroupLayout.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  logLevel: 'silent',
}).outputFiles[0].text
const sharedModule = new Module('control-group-layout-electron-harness')
sharedModule.filename = path.resolve(__dirname, '../../shared/controlGroupLayout.ts')
sharedModule.paths = module.paths
sharedModule._compile(sharedBundle, sharedModule.filename)
const { validatePaintedControlLayout } = sharedModule.exports

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const icon = (name, size = 14) => `<svg data-icon="${name}" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true"><path d="M3 8h10M8 3v10"/></svg>`

function selectorButton(control, className = 'grouped-menu-select') {
  const full = control.fullLabel || control.label || control.defaultLabel
  const compact = control.compactLabel || full
  const leading = control.leading ? `<span class="provider-company-logo" data-content-anchor="true">${icon('company', 14)}</span>` : ''
  const button = `<button class="${className}" data-default-label="${escapeHtml(control.defaultLabel || full)}" data-full-label="${escapeHtml(full)}" data-compact-label="${escapeHtml(compact)}"><span class="selected-label"><span class="selected-label-full">${escapeHtml(full)}</span><span class="selected-label-compact" aria-hidden="true">${escapeHtml(compact)}</span></span><svg class="selector-chevron" viewBox="0 0 10 10" width="10" height="10"><path d="M2 3l3 3 3-3"/></svg></button>`
  const markedButton = button.replace('<button ', `<button data-leading="${control.leading ? 'true' : 'false'}" `).replace('><span class="selected-label">', `>${leading}<span class="selected-label">`)
  return control.caption ? `<label class="fixture-labeled-control"><span class="fixture-label">${escapeHtml(control.caption)}</span>${markedButton}</label>` : markedButton
}

function quantity(control) {
  return `<div class="quantity-stepper"><span class="quantity-stepper-inner-cluster"><button aria-label="Decrease">${icon('minus', 11)}</button><span>${escapeHtml(control.value || 'x1')}</span><button aria-label="Increase">${icon('plus', 11)}</button></span></div>`
}

function controlMarkup(control, surface) {
  if (control.kind === 'selector') return surface === 'storyboard-panel'
    ? `<div class="storyboard-compact-select">${selectorButton(control, '')}</div>`
    : selectorButton(control)
  if (control.kind === 'bounded-elastic') {
    if (control.id === 'budget') return `<div class="storyboard-budget"><span></span><strong>${escapeHtml(control.value || '5 / 5s')}</strong></div>`
    return quantity(control)
  }
  if (control.id === 'sound') return `<label class="compact-toggle compact-sound"><span>Sound</span><input type="checkbox"><i></i></label>`
  if (control.id === 'save') return `<button class="storyboard-save" aria-label="Save Storyboard">${icon('save', 12)}<span>Save</span></button>`
  if (control.id === 'revamp') return `<button class="storyboard-revamp-all" aria-label="Revamp All">${icon('wand', 12)}<span>All</span></button>`
  if (control.id === 'settings') return `<button class="compact-settings compact-options" aria-label="Node Settings">${icon('settings')}</button>`
  if (['run', 'play', 'stop', 'rerun'].includes(control.id)) {
    const stateClass = control.id === 'stop' ? 'is-running' : control.id === 'rerun' ? 'is-rerun' : 'is-ready'
    return `<span class="play-tooltip-anchor"><button class="footer-run ${stateClass}" aria-label="${control.id}">${icon(control.id === 'run' ? 'play' : control.id)}</button></span>`
  }
  return `<button>${escapeHtml(control.label || control.id)}</button>`
}

function groupMarkup(group) {
  const rows = group.rows.map((row, rowIndex) => `<div class="fluid-control-group-row" data-row="${rowIndex}" style="grid-template-columns:${row.gridTemplateColumns};column-gap:${row.gap}px">${row.controls.map((control) => `<div data-fluid-control-id="${escapeHtml(control.id)}" data-fluid-kind="${control.kind}" data-fluid-label-tier="${control.labelTier || 'full'}" style="--control-symmetric-padding:${control.sidePadding || 0}px">${controlMarkup(control, group.surface)}</div>`).join('')}</div>`).join('')
  return `<section class="geometry-case compact-generator-footer"><div class="equalized-control-group ${escapeHtml(group.className)}" data-group="${escapeHtml(group.id)}" data-expect="${escapeHtml(group.expect || '')}" style="width:${group.width}px;--control-group-gap:${group.gap}px">${rows}</div></section>`
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1100, height: 1600, webPreferences: { sandbox: true, zoomFactor: 1 } })
  const css = fs.readFileSync(input.stylesPath, 'utf8')
  const html = `<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#111;color:#ddd}.geometry-case{padding:10px}.geometry-case .equalized-control-group{display:grid;grid-template-columns:1fr!important}.fluid-control-group-row{display:grid;align-items:end}.fixture-labeled-control{min-width:0;display:grid;gap:4px}</style><style>${css}</style></head><body>${input.groups.map(groupMarkup).join('')}</body></html>`
  await window.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`)
  await window.webContents.executeJavaScript('document.fonts.ready')
  const result = await window.webContents.executeJavaScript(`(() => {
    const numeric = value => Number.parseFloat(value) || 0
    const firstGlyphX = element => {
      if (!element) return null
      if (element.matches('svg,[data-content-anchor]')) return element.getBoundingClientRect().left
      const node = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) || element.firstChild
      if (!node) return element.getBoundingClientRect().left
      const text = node.textContent || ''
      const index = text.search(/\\S/)
      if (index < 0) return element.getBoundingClientRect().left
      const range = document.createRange(); range.setStart(node,index); range.setEnd(node,index+1)
      return range.getBoundingClientRect().left
    }
    const paintedElement = wrapper => wrapper.querySelector('[data-default-label],.quantity-stepper,.storyboard-budget,.compact-toggle,.play-tooltip-anchor,:scope>button,:scope>label') || wrapper
    return Object.fromEntries(Array.from(document.querySelectorAll('[data-group]')).map(group => {
      const groupRect = group.getBoundingClientRect(); const groupStyle = getComputedStyle(group)
      const usableLeft = groupRect.left + numeric(groupStyle.paddingLeft); const usableRight = groupRect.right - numeric(groupStyle.paddingRight)
      const controls = Array.from(group.querySelectorAll('[data-fluid-control-id]')).map(control => {
        const painted = paintedElement(control); const rect = painted.getBoundingClientRect()
        const button = control.querySelector('button[data-default-label]')
        const full = button?.querySelector('.selected-label-full'); const compact = button?.querySelector('.selected-label-compact')
        const visibleLabel = full && getComputedStyle(full).display !== 'none' ? full : compact
        const leading = button?.querySelector('[data-content-anchor]')
        const fieldLabel = control.querySelector('.fixture-label')
        const minus = control.querySelector('[data-icon="minus"]'); const plus = control.querySelector('[data-icon="plus"]')
        const settingsOrAction = control.querySelector('.compact-options,.footer-run')
        const icon = settingsOrAction?.querySelector('svg')
        const settingsRect = settingsOrAction?.getBoundingClientRect(); const iconRect = icon?.getBoundingClientRect()
        return {
          id: control.dataset.fluidControlId, kind: control.dataset.fluidKind, tier: control.dataset.fluidLabelTier,
          row: Number(control.parentElement.dataset.row), left: rect.left, right: rect.right, width: rect.width,
          visibleText: visibleLabel?.textContent?.trim() || null,
          visibleClientWidth: visibleLabel?.clientWidth ?? null, visibleScrollWidth: visibleLabel?.scrollWidth ?? null,
          labelGlyphX: firstGlyphX(fieldLabel), selectedGlyphX: firstGlyphX(leading || visibleLabel),
          quantityLeft: minus ? minus.getBoundingClientRect().left - rect.left : null,
          quantityRight: plus ? rect.right - plus.getBoundingClientRect().right : null,
          icons: Array.from(control.querySelectorAll('[data-icon]')).map(icon => icon.dataset.icon),
          diameter: settingsRect?.width ?? null, height: settingsRect?.height ?? null,
          iconWidth: iconRect?.width ?? null, iconHeight: iconRect?.height ?? null,
          radius: settingsOrAction ? getComputedStyle(settingsOrAction).borderRadius : getComputedStyle(painted).borderRadius,
          background: settingsOrAction ? getComputedStyle(settingsOrAction).backgroundColor : null,
        }
      })
      const rows = Array.from(group.querySelectorAll(':scope>.fluid-control-group-row')).map(row => Array.from(row.children).map(wrapper => {
        const rect = paintedElement(wrapper).getBoundingClientRect(); return { id: wrapper.dataset.fluidControlId, left: rect.left, right: rect.right }
      }))
      return [group.dataset.group,{ usableLeft,usableRight,gap:numeric(group.style.getPropertyValue('--control-group-gap')),expect:group.dataset.expect,controls,rows }]
    }))
  })()`)

  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  for (const [groupId, group] of Object.entries(result)) {
    const paintedValidation = validatePaintedControlLayout(groupId, group.usableLeft, group.usableRight, group.gap, group.rows)
    assert(paintedValidation.valid, paintedValidation.reasons.join('; '))
    for (const control of group.controls) {
      if (control.labelGlyphX !== null) assert(Math.abs(control.labelGlyphX - control.selectedGlyphX) <= 1, `${groupId}/${control.id}: label glyph misaligned by ${Math.abs(control.labelGlyphX - control.selectedGlyphX)}px`)
      if (control.quantityLeft !== null) assert(Math.abs(control.quantityLeft - control.quantityRight) <= 1, `${groupId}/${control.id}: quantity outer glyph distances differ (${control.quantityLeft}/${control.quantityRight})`)
    }
  }

  for (const id of ['video-compact','video-minimum']) {
    const group = result[id]
    const model = group.controls.find(control => control.id === 'model')
    assert(model.tier === (id === 'video-compact' ? 'compact' : 'minimum'), `${id}: wrong model tier`)
    for (const op of group.controls.filter(control => ['motion','resolution','ratio','duration'].includes(control.id))) {
      assert(op.visibleScrollWidth <= op.visibleClientWidth + .5, `${id}/${op.id}: operational value truncated`)
    }
  }
  assert(result['video-compact'].controls.find(control => control.id === 'model').visibleText === 'Seedance 2 Mini', 'Video compact label is not catalog shortLabel')
  assert(result['storyboard-footer'].controls.find(control => control.id === 'assistant-model').visibleText === 'Claude Opus 5', 'Storyboard full Claude Opus 5 is not visible')
  for (const id of ['quantity-x1','quantity-x99']) {
    const quantityControl = result[id].controls.find(control => control.id === 'quantity')
    assert(Math.abs(quantityControl.quantityLeft - quantityControl.quantityRight) <= 1, `${id}: quantity is not painted symmetric`)
  }
  const actions = result['terminal-actions'].controls
  assert(actions.every(control => Math.abs(control.diameter - 28) <= .5 && Math.abs(control.height - 28) <= .5), 'terminal action diameter is not 28px')
  assert(actions.every(control => Math.abs(control.iconWidth - 14) <= .5 && Math.abs(control.iconHeight - 14) <= .5), 'terminal icon envelope is not 14px')
  assert(actions.every(control => Number.parseFloat(control.radius) >= 13.5), 'terminal action is not circular')
  assert(new Set(actions.map(control => control.background)).size >= 3, 'terminal semantic state colors collapsed')
  const footer = result['storyboard-footer']
  const save = footer.controls.find(control => control.id === 'save'); const revamp = footer.controls.find(control => control.id === 'revamp')
  assert(save.icons.includes('save') && revamp.icons.includes('wand'), 'Storyboard Save/Revamp anatomy changed')
  assert(Math.abs(revamp.right - footer.usableRight) <= 1, 'Storyboard Revamp painted right misses usable right')
  process.stdout.write(`${Object.keys(result).length}/${Object.keys(result).length} real Electron painted geometry groups passed\n`)
  window.destroy(); app.exit(0)
}).catch((error) => { console.error(error); app.exit(1) })
