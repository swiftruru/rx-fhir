import type { ShortcutDefinition } from './types'

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'global.openHelp',
    category: 'global',
    scope: 'global',
    defaultBinding: 'Mod+Slash',
    customizable: true,
    allowInInput: true,
    labelKey: 'actions.global.openHelp.label',
    descriptionKey: 'actions.global.openHelp.description'
  },
  {
    id: 'global.goCreator',
    category: 'global',
    scope: 'global',
    defaultBinding: 'Mod+1',
    customizable: true,
    labelKey: 'actions.global.goCreator.label',
    descriptionKey: 'actions.global.goCreator.description'
  },
  {
    id: 'global.goConsumer',
    category: 'global',
    scope: 'global',
    defaultBinding: 'Mod+2',
    customizable: true,
    labelKey: 'actions.global.goConsumer.label',
    descriptionKey: 'actions.global.goConsumer.description'
  },
  {
    id: 'global.goSettings',
    category: 'global',
    scope: 'global',
    defaultBinding: 'Mod+Comma',
    customizable: true,
    labelKey: 'actions.global.goSettings.label',
    descriptionKey: 'actions.global.goSettings.description'
  },
  {
    id: 'global.toggleTheme',
    category: 'global',
    scope: 'global',
    defaultBinding: 'Mod+Shift+T',
    customizable: true,
    labelKey: 'actions.global.toggleTheme.label',
    descriptionKey: 'actions.global.toggleTheme.description'
  },
  {
    id: 'global.toggleLocale',
    category: 'global',
    scope: 'global',
    defaultBinding: 'Mod+Shift+L',
    customizable: true,
    labelKey: 'actions.global.toggleLocale.label',
    descriptionKey: 'actions.global.toggleLocale.description'
  },
  {
    id: 'creator.prevStep',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Alt+ArrowUp',
    customizable: true,
    labelKey: 'actions.creator.prevStep.label',
    descriptionKey: 'actions.creator.prevStep.description'
  },
  {
    id: 'creator.nextStep',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Alt+ArrowDown',
    customizable: true,
    labelKey: 'actions.creator.nextStep.label',
    descriptionKey: 'actions.creator.nextStep.description'
  },
  {
    id: 'creator.firstStep',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Alt+Home',
    customizable: true,
    labelKey: 'actions.creator.firstStep.label',
    descriptionKey: 'actions.creator.firstStep.description'
  },
  {
    id: 'creator.lastStep',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Alt+End',
    customizable: true,
    labelKey: 'actions.creator.lastStep.label',
    descriptionKey: 'actions.creator.lastStep.description'
  },
  {
    id: 'creator.submitStep',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Enter',
    customizable: true,
    labelKey: 'actions.creator.submitStep.label',
    descriptionKey: 'actions.creator.submitStep.description'
  },
  {
    id: 'creator.fillMock',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Shift+M',
    customizable: true,
    labelKey: 'actions.creator.fillMock.label',
    descriptionKey: 'actions.creator.fillMock.description'
  },
  {
    id: 'creator.openTemplate',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Shift+P',
    customizable: true,
    labelKey: 'actions.creator.openTemplate.label',
    descriptionKey: 'actions.creator.openTemplate.description'
  },
  {
    id: 'creator.toggleRightPanel',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Shift+J',
    customizable: true,
    labelKey: 'actions.creator.toggleRightPanel.label',
    descriptionKey: 'actions.creator.toggleRightPanel.description'
  },
  {
    id: 'creator.toggleRightPanelMode',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Alt+J',
    customizable: true,
    labelKey: 'actions.creator.toggleRightPanelMode.label',
    descriptionKey: 'actions.creator.toggleRightPanelMode.description'
  },
  {
    id: 'creator.toggleLiveDemo',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Shift+D',
    customizable: true,
    labelKey: 'actions.creator.toggleLiveDemo.label',
    descriptionKey: 'actions.creator.toggleLiveDemo.description'
  },
  {
    id: 'creator.toggleFeatureShowcase',
    category: 'creator',
    scope: 'creator',
    defaultBinding: 'Mod+Shift+F',
    customizable: true,
    labelKey: 'actions.creator.toggleFeatureShowcase.label',
    descriptionKey: 'actions.creator.toggleFeatureShowcase.description'
  },
  {
    id: 'consumer.focusSearch',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Mod+F',
    customizable: true,
    labelKey: 'actions.consumer.focusSearch.label',
    descriptionKey: 'actions.consumer.focusSearch.description'
  },
  {
    id: 'consumer.searchBasic',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Alt+1',
    customizable: true,
    labelKey: 'actions.consumer.searchBasic.label',
    descriptionKey: 'actions.consumer.searchBasic.description'
  },
  {
    id: 'consumer.searchDate',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Alt+2',
    customizable: true,
    labelKey: 'actions.consumer.searchDate.label',
    descriptionKey: 'actions.consumer.searchDate.description'
  },
  {
    id: 'consumer.searchComplex',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Alt+3',
    customizable: true,
    labelKey: 'actions.consumer.searchComplex.label',
    descriptionKey: 'actions.consumer.searchComplex.description'
  },
  {
    id: 'consumer.submitSearch',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Mod+Enter',
    customizable: true,
    labelKey: 'actions.consumer.submitSearch.label',
    descriptionKey: 'actions.consumer.submitSearch.description'
  },
  {
    id: 'consumer.showResults',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Alt+R',
    customizable: true,
    labelKey: 'actions.consumer.showResults.label',
    descriptionKey: 'actions.consumer.showResults.description'
  },
  {
    id: 'consumer.showShortcuts',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Alt+H',
    customizable: true,
    labelKey: 'actions.consumer.showShortcuts.label',
    descriptionKey: 'actions.consumer.showShortcuts.description'
  },
  {
    id: 'consumer.importBundle',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Mod+Shift+I',
    customizable: true,
    labelKey: 'actions.consumer.importBundle.label',
    descriptionKey: 'actions.consumer.importBundle.description'
  },
  {
    id: 'consumer.fillExample',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Mod+Shift+E',
    customizable: true,
    labelKey: 'actions.consumer.fillExample.label',
    descriptionKey: 'actions.consumer.fillExample.description'
  },
  {
    id: 'consumer.toggleDetailView',
    category: 'consumer',
    scope: 'consumer',
    defaultBinding: 'Alt+S',
    customizable: true,
    labelKey: 'actions.consumer.toggleDetailView.label',
    descriptionKey: 'actions.consumer.toggleDetailView.description'
  },
  {
    id: 'settings.save',
    category: 'settings',
    scope: 'settings',
    defaultBinding: 'Mod+S',
    customizable: false,
    labelKey: 'actions.settings.save.label',
    descriptionKey: 'actions.settings.save.description'
  },
  {
    id: 'settings.testConnection',
    category: 'settings',
    scope: 'settings',
    defaultBinding: 'Mod+Shift+C',
    customizable: true,
    labelKey: 'actions.settings.testConnection.label',
    descriptionKey: 'actions.settings.testConnection.description'
  },
  {
    id: 'settings.tabServer',
    category: 'settings',
    scope: 'settings',
    defaultBinding: 'Alt+1',
    customizable: true,
    labelKey: 'actions.settings.tabServer.label',
    descriptionKey: 'actions.settings.tabServer.description'
  },
  {
    id: 'settings.tabShortcuts',
    category: 'settings',
    scope: 'settings',
    defaultBinding: 'Alt+2',
    customizable: true,
    labelKey: 'actions.settings.tabShortcuts.label',
    descriptionKey: 'actions.settings.tabShortcuts.description'
  }
]
