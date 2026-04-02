import { SHORTCUT_DEFINITIONS } from './defaults'
import { normalizeBinding, parseBinding } from './normalize'
import type {
  ResolvedShortcutDefinition,
  ShortcutActionId,
  ShortcutCategory,
  ShortcutOverrideMap,
  ShortcutScope
} from './types'

export function getShortcutScopeFromPathname(pathname: string): ShortcutScope {
  if (pathname.startsWith('/creator')) return 'creator'
  if (pathname.startsWith('/consumer')) return 'consumer'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'global'
}

export function getResolvedShortcuts(overrides: ShortcutOverrideMap): ResolvedShortcutDefinition[] {
  return SHORTCUT_DEFINITIONS.map((definition) => {
    const normalizedBinding = normalizeBinding(overrides[definition.id] ?? definition.defaultBinding)
      ?? normalizeBinding(definition.defaultBinding)
      ?? definition.defaultBinding
    const parsedBinding = parseBinding(normalizedBinding)

    if (!parsedBinding) {
      throw new Error(`Invalid shortcut binding: ${normalizedBinding}`)
    }

    return {
      ...definition,
      binding: normalizedBinding,
      parsedBinding
    }
  })
}

export function getResolvedShortcutMap(overrides: ShortcutOverrideMap): Record<ShortcutActionId, ResolvedShortcutDefinition> {
  return Object.fromEntries(
    getResolvedShortcuts(overrides).map((definition) => [definition.id, definition])
  ) as Record<ShortcutActionId, ResolvedShortcutDefinition>
}

export function getShortcutsByCategory(
  overrides: ShortcutOverrideMap
): Record<ShortcutCategory, ResolvedShortcutDefinition[]> {
  const resolved = getResolvedShortcuts(overrides)

  return {
    global: resolved.filter((definition) => definition.category === 'global'),
    creator: resolved.filter((definition) => definition.category === 'creator'),
    consumer: resolved.filter((definition) => definition.category === 'consumer'),
    settings: resolved.filter((definition) => definition.category === 'settings')
  }
}
