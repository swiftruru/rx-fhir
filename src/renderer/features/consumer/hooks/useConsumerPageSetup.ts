import { useEffect, useRef } from 'react'
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
import type { ConsumerWorkspaceSnapshot } from '../store/consumerWorkspaceStore'

interface UseConsumerPageSetupArgs {
  locationState: unknown
  locale: string
  serverUrl: string
  workspaceHydrated: boolean
  workspaceSnapshot: ConsumerWorkspaceSnapshot
  hasSessionState: boolean
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
  setActiveComplexBy: (value: 'organization' | 'author') => void
  setPrefill: (prefill: SearchPrefill | null) => void
  setAutoSearch: (params: SearchParams | null) => void
  setTargetBundleId: (bundleId: string | null) => void
  setMiddleTab: (tab: 'results' | 'quickstart' | 'history') => void
  setPrefillNotice: (notice: { message: string; variant?: 'info' | 'warning' } | null) => void
  setDashboardRecentOpen: (open: boolean) => void
  setDashboardSavedOpen: (open: boolean) => void
  refreshRecentFiles: () => Promise<void>
  handleOpenRecentFile: (filePath: string) => Promise<void>
  handlePreviewBundle: (bundle: fhir4.Bundle) => void
  resetConsumerView: () => void
  clearWorkspace: () => void
  clearSession: () => void
}

export function useConsumerPageSetup({
  announcePolite,
  clearWorkspace,
  clearConsumerActions,
  handleOpenRecentFile,
  handlePreviewBundle,
  resetConsumerView,
  hasSessionState,
  historyCount,
  locale,
  locationState,
  navigate,
  pushToast,
  refreshRecentFiles,
  savedSearchCount,
  searchFormRef,
  workspaceHydrated,
  workspaceSnapshot,
  setActiveTab,
  setActiveComplexBy,
  setAutoSearch,
  setConsumerActions,
  setDashboardRecentOpen,
  setDashboardSavedOpen,
  setIsSearching,
  setMiddleTab,
  setPrefill,
  setPrefillNotice,
  setTargetBundleId,
  serverUrl,
  t,
  clearSession
}: UseConsumerPageSetupArgs): void {
  const restoredWorkspaceRef = useRef(false)

  useEffect(() => {
    const launchState = locationState as ConsumerLaunchState | null
    if (!launchState) return
    if (launchState.resetView === 'initial') {
      resetConsumerView()
      navigate('/consumer', { replace: true, state: null })
      return
    }
    clearSession()
    restoredWorkspaceRef.current = true
    const recentBundleFilePath = launchState.recentBundleFilePath ?? null
    const previewBundle = launchState.previewBundle ?? null
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

    if (previewBundle) {
      handlePreviewBundle(previewBundle)
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
  }, [announcePolite, clearSession, handleOpenRecentFile, handlePreviewBundle, locale, locationState, navigate, pushToast, resetConsumerView, setActiveTab, setAutoSearch, setMiddleTab, setPrefill, setPrefillNotice, setTargetBundleId, t])

  useEffect(() => {
    if (locationState || restoredWorkspaceRef.current || !workspaceHydrated) return

    restoredWorkspaceRef.current = true

    if (workspaceSnapshot.serverUrl && workspaceSnapshot.serverUrl !== serverUrl) {
      clearWorkspace()
      clearSession()
      return
    }

    setActiveTab(workspaceSnapshot.activeTab)
    setActiveComplexBy(workspaceSnapshot.activeComplexBy)
    setMiddleTab(workspaceSnapshot.middleTab)
    setPrefill(workspaceSnapshot.prefill)

    if (hasSessionState) {
      return
    }

    if (workspaceSnapshot.recentBundleFilePath) {
      void handleOpenRecentFile(workspaceSnapshot.recentBundleFilePath)
      return
    }

    if (workspaceSnapshot.autoSearch) {
      setAutoSearch(workspaceSnapshot.autoSearch)
    }

    if (workspaceSnapshot.targetBundleId) {
      setTargetBundleId(workspaceSnapshot.targetBundleId)
    }
  }, [
    clearSession,
    clearWorkspace,
    handleOpenRecentFile,
    hasSessionState,
    locationState,
    serverUrl,
    setActiveComplexBy,
    setActiveTab,
    setAutoSearch,
    setMiddleTab,
    setPrefill,
    setTargetBundleId,
    workspaceHydrated,
    workspaceSnapshot
  ])

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
