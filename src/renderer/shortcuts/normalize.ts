import type { ShortcutBindingParts } from './types'

const MODIFIER_SET = new Set(['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'])
const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'] as const

function normalizeKeyToken(raw: string): string | null {
  const token = raw.trim()
  if (!token) return null

  const lower = token.toLowerCase()

  switch (lower) {
    case 'mod':
    case 'cmdorctrl':
      return 'Mod'
    case 'cmd':
    case 'command':
      return 'Meta'
    case 'ctrl':
    case 'control':
      return 'Ctrl'
    case 'option':
    case 'opt':
    case 'alt':
      return 'Alt'
    case 'shift':
      return 'Shift'
    case 'esc':
    case 'escape':
      return 'Escape'
    case 'return':
    case 'enter':
      return 'Enter'
    case 'space':
    case 'spacebar':
      return 'Space'
    case 'comma':
    case ',':
      return 'Comma'
    case 'slash':
    case '/':
      return 'Slash'
    case 'up':
    case 'arrowup':
      return 'ArrowUp'
    case 'down':
    case 'arrowdown':
      return 'ArrowDown'
    case 'left':
    case 'arrowleft':
      return 'ArrowLeft'
    case 'right':
    case 'arrowright':
      return 'ArrowRight'
    case 'home':
      return 'Home'
    case 'end':
      return 'End'
    case 'tab':
      return 'Tab'
    case 'backspace':
      return 'Backspace'
    case 'delete':
    case 'del':
      return 'Delete'
    default:
      break
  }

  if (/^f\d{1,2}$/i.test(token)) return token.toUpperCase()
  if (/^[a-z]$/i.test(token)) return token.toUpperCase()
  if (/^\d$/.test(token)) return token

  return token.length === 1 ? token.toUpperCase() : token
}

export function normalizeBinding(binding: string): string | null {
  const parts = binding
    .split('+')
    .map((part) => normalizeKeyToken(part))
    .filter((part): part is string => Boolean(part))

  if (parts.length === 0) return null

  const unique = Array.from(new Set(parts))
  const modifiers = unique.filter((part) => MODIFIER_SET.has(part))
  const keys = unique.filter((part) => !MODIFIER_SET.has(part))

  if (keys.length !== 1) return null

  return [...MODIFIER_ORDER.filter((modifier) => modifiers.includes(modifier)), keys[0]].join('+')
}

export function parseBinding(binding: string): ShortcutBindingParts | null {
  const normalized = normalizeBinding(binding)
  if (!normalized) return null

  const parts = normalized.split('+')
  const key = parts[parts.length - 1]

  return {
    key,
    mod: parts.includes('Mod'),
    ctrl: parts.includes('Ctrl'),
    meta: parts.includes('Meta'),
    alt: parts.includes('Alt'),
    shift: parts.includes('Shift')
  }
}

export function eventKeyToToken(key: string): string | null {
  return normalizeKeyToken(key)
}

const MODIFIER_ONLY_KEYS = new Set(['Shift', 'Meta', 'Control', 'Alt'])

export function bindingFromEvent(event: KeyboardEvent): string | null {
  if (event.isComposing || MODIFIER_ONLY_KEYS.has(event.key)) return null

  const keyToken = eventKeyToToken(event.key)
  if (!keyToken) return null

  const parts: string[] = []
  if (event.metaKey || event.ctrlKey) {
    parts.push('Mod')
  } else {
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.metaKey) parts.push('Meta')
  }
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  parts.push(keyToken)

  const normalized = normalizeBinding(parts.join('+'))
  if (!normalized) return null

  const parsed = parseBinding(normalized)
  if (!parsed) return null

  const hasModifier = parsed.mod || parsed.ctrl || parsed.meta || parsed.alt || parsed.shift
  if (!hasModifier) return null

  return normalized
}

export function bindingMatchesEvent(binding: ShortcutBindingParts, event: KeyboardEvent): boolean {
  const eventKey = eventKeyToToken(event.key)
  if (!eventKey || eventKey !== binding.key) return false

  if (binding.alt !== event.altKey) return false
  if (binding.shift !== event.shiftKey) return false

  if (binding.mod) {
    if (!(event.metaKey || event.ctrlKey)) return false
  } else {
    if (binding.ctrl !== event.ctrlKey) return false
    if (binding.meta !== event.metaKey) return false
  }

  return true
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent)
}

export function formatBinding(binding: string): string {
  const normalized = normalizeBinding(binding)
  if (!normalized) return binding

  const mac = isMacPlatform()

  return normalized
    .split('+')
    .map((part) => {
      switch (part) {
        case 'Mod':
          return mac ? '⌘' : 'Ctrl'
        case 'Ctrl':
          return mac ? '⌃' : 'Ctrl'
        case 'Meta':
          return '⌘'
        case 'Alt':
          return mac ? '⌥' : 'Alt'
        case 'Shift':
          return mac ? '⇧' : 'Shift'
        case 'ArrowUp':
          return '↑'
        case 'ArrowDown':
          return '↓'
        case 'ArrowLeft':
          return '←'
        case 'ArrowRight':
          return '→'
        case 'Comma':
          return ','
        case 'Slash':
          return '/'
        case 'Space':
          return mac ? '␣' : 'Space'
        default:
          return part
      }
    })
    .join(mac ? ' ' : ' + ')
}
