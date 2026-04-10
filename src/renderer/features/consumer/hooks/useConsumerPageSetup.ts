import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { SearchParams } from '../../../types/fhir'
import type { ConsumerShortcutActions } from '../../../shared/stores/shortcutActionStore'
import type {
  SearchPrefill,
  SearchTab
} from '../searchState'
import type { ConsumerLaunchState } from '../searchState'
import type { SearchFormHandle } from '../SearchForm'
import { getConsumerBasicMocks } from '../../../mocks/mockPools'

interface UseConsumerPageSetupArgs {
  locationState: unknown
  locale: string
  historyCount: number
  savedSearchCount: number
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  t: (key: string, options?: Record<string, unknown>) => string
  announcePolite: (message: string) => void
  pushToast: (toast: { variant: 'info'; description: string }) => void
  searchFormRef: RefObject<SearchFormHandle | null>
  setConsumerActions: (actions: Partial<ConsumerShortcutActions>) => void
  clearConsumerActions: (keys?: Array<keyof ConsumerShortcutActions>) => void
  setIsSearching: (value: boolean) => void
  setActiveTab: (tab: SearchTab) => void
  setPrefill: (prefill: SearchPrefill | null) => void
  setAutoSearch: (params: SearchParams | null) => void
  setTargetBundleId: (bundleId: string | null) => void
  setMiddleTab: (tab: 'results' | 'quickstart' | 'history') => void
  setPrefillNotice: (notice: { message: string; variant?: 'info' | 'warning' } | null) => void
  setDashboardRecentOpen: (open: boolean) => void
  setDashboardSavedOpen: (open: boolean) => void
  refreshRecentFiles: () => Promise<void>
  handleOpenRecentFile: (filePath: string) => Promise<void>
}

export function useConsumerPageSetup({
  announcePolite,
  clearConsumerActions,
  handleOpenRecentFile,
  historyCount,
  locale,
  locationState,
  navigate,
  pushToast,
  refreshRecentFiles,
  savedSearchCount,
  searchFormRef,
  setActiveTab,
  setAutoSearch,
  setConsumerActions,
  setDashboardRecentOpen,
  setDashboardSavedOpen,
  setIsSearching,
  setMiddleTab,
  setPrefill,
  setPrefillNotice,
  setTargetBundleId,
  t
}: UseConsumerPageSetupArgs): void {
  useEffect(() => {
    const launchState = locationState as ConsumerLaunchState | null
    if (!launchState) return
    const recentBundleFilePath = launchState.recentBundleFilePath ?? null
    const quickStartScenario = launchState.quickStartScenario ?? null

    if (launchState.prefill) {
      setActiveTab(launchState.prefill.tab)
      setPrefill(launchState.prefill)
    }
    if (launchState.autoSearch) setAutoSearch(launchState.autoSearch)
    if (launchState.targetBundleId) setTargetBundleId(launchState.targetBundleId)

    navigate('/consumer', { replace: true, state: null })

    if (recentBundleFilePath) {
      void handleOpenRecentFile(recentBundleFilePath)
    }

    if (quickStartScenario === 'example-query') {
      const example = getConsumerBasicMocks(locale as 'zh-TW' | 'en')[0]
      setMiddleTab('quickstart')
      setActiveTab('basic')
      if (example) {
        setPrefill({ tab: 'basic', searchBy: example.searchBy, value: example.value })
      }
      const message = t('page.quickStartScenario.exampleLoaded')
      setPrefillNotice({ variant: 'info', message })
      announcePolite(message)
      pushToast({
        variant: 'info',
        description: message
      })
    }
  }, [announcePolite, handleOpenRecentFile, locale, locationState, navigate, pushToast, setActiveTab, setAutoSearch, setMiddleTab, setPrefill, setPrefillNotice, setTargetBundleId, t])

  useEffect(() => {
    setDashboardRecentOpen(historyCount > 0)
  }, [historyCount, setDashboardRecentOpen])

  useEffect(() => {
    setDashboardSavedOpen(savedSearchCount > 0)
  }, [savedSearchCount, setDashboardSavedOpen])

  useEffect(() => {
    void refreshRecentFiles()
  }, [refreshRecentFiles])

  useEffect(() => {
    setConsumerActions({
      focusSearch: () => searchFormRef.current?.focusPrimaryInput(),
      submitSearch: () => void searchFormRef.current?.submit(),
      importBundle: () => searchFormRef.current?.importBundle(),
      fillExample: () => searchFormRef.current?.fillMock(),
      setSearchTab: setActiveTab,
      setMiddleTab
    })

    return () => {
      clearConsumerActions([
        'focusSearch',
        'submitSearch',
        'importBundle',
        'fillExample',
        'setSearchTab',
        'setMiddleTab'
      ])
      setIsSearching(false)
    }
  }, [clearConsumerActions, searchFormRef, setActiveTab, setConsumerActions, setIsSearching, setMiddleTab])
}
