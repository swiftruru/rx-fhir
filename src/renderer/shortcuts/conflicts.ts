import { SHORTCUT_DEFINITIONS } from './defaults'
import { normalizeBinding } from './normalize'
import type { ResolvedShortcutDefinition, ShortcutActionId, ShortcutConflict, ShortcutDefinition } from './types'

const RESERVED_BINDINGS = ['Mod+R', 'Mod+W', 'Mod+Q', 'Mod+T', 'Mod+L'].map((binding) => normalizeBinding(binding)!)

function scopesOverlap(a: ShortcutDefinition['scope'], b: ShortcutDefinition['scope']): boolean {
  return a === 'global' || b === 'global' || a === b
}

export function findShortcutConflict(
  actionId: ShortcutActionId,
  binding: string,
  definitions: ResolvedShortcutDefinition[]
): ShortcutConflict | null {
  const normalized = normalizeBinding(binding)
  if (!normalized) {
    return { type: 'invalid', binding }
  }

  if (RESERVED_BINDINGS.includes(normalized)) {
    return { type: 'reserved', binding: normalized }
  }

  const current = definitions.find((definition) => definition.id === actionId)
  if (!current) return null

  const conflictingIds = definitions
    .filter((definition) => (
      definition.id !== actionId
      && definition.binding === normalized
      && scopesOverlap(definition.scope, current.scope)
    ))
    .map((definition) => definition.id)

  if (conflictingIds.length > 0) {
    return {
      type: 'duplicate',
      binding: normalized,
      conflictsWith: conflictingIds
    }
  }

  return null
}

export function getCustomizableShortcutIds(): ShortcutActionId[] {
  return SHORTCUT_DEFINITIONS.filter((definition) => definition.customizable).map((definition) => definition.id)
}
