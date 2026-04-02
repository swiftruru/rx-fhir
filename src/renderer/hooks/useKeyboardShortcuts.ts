import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import i18n from '../i18n'
import { FEATURE_SHOWCASE_STEPS } from '../showcase/featureShowcaseScript'
import { useAppStore, type ThemeMode } from '../store/appStore'
import { useCreatorStore } from '../store/creatorStore'
import { useFeatureShowcaseStore } from '../store/featureShowcaseStore'
import { useLiveDemoStore } from '../store/liveDemoStore'
import { useShortcutActionStore } from '../store/shortcutActionStore'
import { useShortcutStore } from '../store/shortcutStore'
import { RESOURCE_STEPS } from '../types/fhir.d'
import { LIVE_DEMO_STEPS } from '../demo/liveDemoScript'
import { bindingMatchesEvent } from '../shortcuts/normalize'
import { getResolvedShortcutMap, getShortcutScopeFromPathname } from '../shortcuts/resolver'
import type { ShortcutActionId, ShortcutScope } from '../shortcuts/types'

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system']

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
  )
}

function scopesMatch(currentScope: ShortcutScope, shortcutScope: ShortcutScope): boolean {
  return shortcutScope === 'global' || shortcutScope === currentScope
}

function cycleTheme(theme: ThemeMode): ThemeMode {
  return THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
}

function toggleLocale(locale: ReturnType<typeof useAppStore.getState>['locale']): ReturnType<typeof useAppStore.getState>['locale'] {
  return locale === 'zh-TW' ? 'en' : 'zh-TW'
}

export function useKeyboardShortcuts(): void {
  const location = useLocation()
  const navigate = useNavigate()
  const overrides = useShortcutStore((state) => state.overrides)

  useEffect(() => {
    function dispatchShortcut(actionId: ShortcutActionId): void {
      const appState = useAppStore.getState()
      const creatorState = useCreatorStore.getState()
      const liveDemoState = useLiveDemoStore.getState()
      const featureShowcaseState = useFeatureShowcaseStore.getState()
      const shortcutStore = useShortcutStore.getState()
      const actionStore = useShortcutActionStore.getState()

      switch (actionId) {
        case 'global.openHelp':
          shortcutStore.toggleHelp()
          return
        case 'global.goCreator':
          navigate('/creator')
          return
        case 'global.goConsumer':
          navigate('/consumer')
          return
        case 'global.goSettings':
          navigate('/settings')
          return
        case 'global.toggleTheme':
          appState.setTheme(cycleTheme(appState.theme))
          return
        case 'global.toggleLocale': {
          const nextLocale = toggleLocale(appState.locale)
          appState.setLocale(nextLocale)
          void i18n.changeLanguage(nextLocale)
          return
        }
        case 'creator.prevStep':
          creatorState.setStep(Math.max(0, creatorState.currentStep - 1))
          return
        case 'creator.nextStep':
          creatorState.setStep(Math.min(RESOURCE_STEPS.length - 1, creatorState.currentStep + 1))
          return
        case 'creator.firstStep':
          creatorState.setStep(0)
          return
        case 'creator.lastStep':
          creatorState.setStep(RESOURCE_STEPS.length - 1)
          return
        case 'creator.submitStep': {
          const currentKey = RESOURCE_STEPS[creatorState.currentStep]?.key
          if (!currentKey) return
          void liveDemoState.controllers[currentKey]?.submit?.()
          return
        }
        case 'creator.fillMock': {
          const currentKey = RESOURCE_STEPS[creatorState.currentStep]?.key
          if (!currentKey) return
          void liveDemoState.controllers[currentKey]?.fillMock?.()
          return
        }
        case 'creator.openTemplate':
          actionStore.creator.openTemplates?.()
          return
        case 'creator.toggleRightPanel':
          actionStore.creator.toggleRightPanel?.()
          return
        case 'creator.toggleRightPanelMode':
          actionStore.creator.toggleRightPanelMode?.()
          return
        case 'creator.toggleLiveDemo':
          if (liveDemoState.status === 'running' || liveDemoState.status === 'paused') {
            liveDemoState.stop()
          } else {
            liveDemoState.start(LIVE_DEMO_STEPS.length, 'manual')
          }
          return
        case 'creator.toggleFeatureShowcase':
          if (featureShowcaseState.status === 'running' || featureShowcaseState.status === 'paused') {
            featureShowcaseState.stop()
          } else {
            featureShowcaseState.start(FEATURE_SHOWCASE_STEPS.length)
          }
          return
        case 'consumer.focusSearch':
          actionStore.consumer.focusSearch?.()
          return
        case 'consumer.searchBasic':
          actionStore.consumer.setSearchTab?.('basic')
          return
        case 'consumer.searchDate':
          actionStore.consumer.setSearchTab?.('date')
          return
        case 'consumer.searchComplex':
          actionStore.consumer.setSearchTab?.('complex')
          return
        case 'consumer.submitSearch':
          void actionStore.consumer.submitSearch?.()
          return
        case 'consumer.showResults':
          actionStore.consumer.setMiddleTab?.('results')
          return
        case 'consumer.showShortcuts':
          actionStore.consumer.setMiddleTab?.('quickstart')
          return
        case 'consumer.importBundle':
          void actionStore.consumer.importBundle?.()
          return
        case 'consumer.fillExample':
          actionStore.consumer.fillExample?.()
          return
        case 'consumer.toggleDetailView':
          actionStore.consumer.toggleDetailView?.()
          return
        case 'settings.save':
          actionStore.settings.save?.()
          return
        case 'settings.testConnection':
          void actionStore.settings.testConnection?.()
          return
        case 'settings.tabServer':
          actionStore.settings.setTab?.('server')
          return
        case 'settings.tabShortcuts':
          actionStore.settings.setTab?.('shortcuts')
          return
        default:
          return
      }
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.isComposing) return

      const shortcutStore = useShortcutStore.getState()
      if (event.key === 'Escape' && shortcutStore.helpOpen) {
        event.preventDefault()
        shortcutStore.closeHelp()
        return
      }

      const currentScope = getShortcutScopeFromPathname(location.pathname)
      const resolvedMap = getResolvedShortcutMap(useShortcutStore.getState().overrides)
      const editable = isEditableElement(event.target)

      const matched = Object.values(resolvedMap).find((definition) => (
        scopesMatch(currentScope, definition.scope)
        && bindingMatchesEvent(definition.parsedBinding, event)
        && (!editable || definition.allowInInput)
      ))

      if (!matched) return

      event.preventDefault()
      dispatchShortcut(matched.id)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [location.pathname, navigate, overrides])
}
