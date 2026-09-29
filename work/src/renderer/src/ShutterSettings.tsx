import type { ShutterMode } from '../../shared/shutter'
import { SHUTTER_ANGLE_GROUPS, resolvedShutter, shutterSpeedGroups } from '../../shared/shutter'
import { GroupedMenuSelect, type GroupedMenuGroup } from './NodeCardNext'

export const SHUTTER_TOOLTIP = 'Controls motion blur per frame. 180° gives natural cinematic motion; lower angles look crisper and more staccato, while higher angles produce more smear. Equivalent shutter speed updates with FPS. Results depend on provider support.'
export const SHUTTER_UTILITY_TOOLTIP = 'Sync Utility values are timing conveniences, not universal anti-flicker settings.'

export type ShutterSettingsPatch = { shutterMode: ShutterMode } | { shutterAngle: number }

export function nextShutterSettingsPatch(kind: 'mode' | 'value', value: string, _currentAngle: number): ShutterSettingsPatch {
  return kind === 'mode'
    ? { shutterMode: value === 'speed' ? 'speed' : 'angle' }
    : { shutterAngle: Number(value) }
}

function menuGroups(mode: ShutterMode, fps: number): GroupedMenuGroup[] {
  const groups = mode === 'angle' ? SHUTTER_ANGLE_GROUPS : shutterSpeedGroups(fps)
  return groups.map((group) => ({
    label: group.label,
    options: group.options.map((option) => ({ value: option.value, label: option.label })),
  }))
}

export function ShutterSettings({ mode, angle, fps, onChange }: {
  mode: ShutterMode
  angle: number
  fps: number
  onChange: (patch: ShutterSettingsPatch) => void
}) {
  const resolved = resolvedShutter(angle, fps)
  const displayLabel = mode === 'angle' ? `${angle}°` : resolved.speed
  return <div className="inspector-wide shutter-settings" title={SHUTTER_TOOLTIP}>
    <span className="shutter-settings-label">Shutter Mode<sup>*</sup></span>
    <div className="inspector-segmented shutter-mode-segmented" role="group" aria-label="Shutter mode">
      <button type="button" aria-pressed={mode === 'angle'} className={mode === 'angle' ? 'is-active' : ''} onClick={() => onChange(nextShutterSettingsPatch('mode', 'angle', angle))}>Angle</button>
      <button type="button" aria-pressed={mode === 'speed'} className={mode === 'speed' ? 'is-active' : ''} onClick={() => onChange(nextShutterSettingsPatch('mode', 'speed', angle))}>Speed</button>
    </div>
    <GroupedMenuSelect
      className="shutter-value-select"
      menuClassName="shutter-value-menu"
      ariaLabel={mode === 'angle' ? 'Shutter angle' : 'Shutter speed'}
      accessibleLabel={`${displayLabel}. ${resolved.display}`}
      displayLabel={displayLabel}
      value={String(angle)}
      groups={menuGroups(mode, fps)}
      onChange={(value) => onChange(nextShutterSettingsPatch('value', value, angle))}
    />
    <span className="shutter-resolved">Resolved: {resolved.display}</span>
    <span className="shutter-utility-note" title={SHUTTER_UTILITY_TOOLTIP}>{SHUTTER_UTILITY_TOOLTIP}</span>
  </div>
}
