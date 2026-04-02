export type ShortcutScope = 'global' | 'creator' | 'consumer' | 'settings'

export type ShortcutCategory = 'global' | 'creator' | 'consumer' | 'settings'

export type ShortcutActionId =
  | 'global.openHelp'
  | 'global.goCreator'
  | 'global.goConsumer'
  | 'global.goSettings'
  | 'global.toggleTheme'
  | 'global.toggleLocale'
  | 'creator.prevStep'
  | 'creator.nextStep'
  | 'creator.firstStep'
  | 'creator.lastStep'
  | 'creator.submitStep'
  | 'creator.fillMock'
  | 'creator.openTemplate'
  | 'creator.toggleRightPanel'
  | 'creator.toggleRightPanelMode'
  | 'creator.toggleLiveDemo'
  | 'creator.toggleFeatureShowcase'
  | 'consumer.focusSearch'
  | 'consumer.searchBasic'
  | 'consumer.searchDate'
  | 'consumer.searchComplex'
  | 'consumer.submitSearch'
  | 'consumer.showResults'
  | 'consumer.showShortcuts'
  | 'consumer.importBundle'
  | 'consumer.fillExample'
  | 'consumer.toggleDetailView'
  | 'settings.save'
  | 'settings.testConnection'
  | 'settings.tabServer'
  | 'settings.tabShortcuts'

export interface ShortcutBindingParts {
  key: string
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

export interface ShortcutDefinition {
  id: ShortcutActionId
  category: ShortcutCategory
  scope: ShortcutScope
  defaultBinding: string
  customizable: boolean
  allowInInput?: boolean
  labelKey: string
  descriptionKey: string
}

export type ShortcutOverrideMap = Partial<Record<ShortcutActionId, string>>

export interface ResolvedShortcutDefinition extends ShortcutDefinition {
  binding: string
  parsedBinding: ShortcutBindingParts
}

export interface ShortcutConflict {
  type: 'invalid' | 'reserved' | 'duplicate'
  binding: string
  conflictsWith?: ShortcutActionId[]
}
