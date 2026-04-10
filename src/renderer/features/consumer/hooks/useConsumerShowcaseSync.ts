import { useEffect, useRef } from 'react'
import type { BundleSummary, SearchParams } from '../../../types/fhir'
import type { ConsumerSearchExecution, SearchPrefill, SearchTab } from '../searchState'
import type { FeatureShowcaseConsumerOverride, FeatureShowcaseSnapshot } from '../../../showcase/types'

interface ConsumerPageBackup {
  results: BundleSummary[]
  total: number
  selected: BundleSummary | null
  hasSearched: boolean
  activeTab: SearchTab
  prefill: SearchPrefill | null
  autoSearch: SearchParams | null
  targetBundleId: string | null
  searchExecution: ConsumerSearchExecution | null
  dashboardRecentOpen: boolean
  dashboardSavedOpen: boolean
  middleTab: 'results' | 'quickstart' | 'history'
  activeComplexBy: 'organization' | 'author'
  prefillNotice: { message: string; variant?: 'info' | 'warning' } | null
}

interface UseConsumerShowcaseSyncArgs {
  showcaseActive: boolean
  showcaseSnapshot: FeatureShowcaseSnapshot | null | undefined
  showcaseConsumerUi: FeatureShowcaseConsumerOverride | undefined
  state: ConsumerPageBackup
  setResults: (results: BundleSummary[]) => void
  setTotal: (total: number) => void
  setSelected: (selected: BundleSummary | null) => void
  setHasSearched: (value: boolean) => void
  setActiveTab: (tab: SearchTab) => void
  setPrefill: (prefill: SearchPrefill | null) => void
  setAutoSearch: (params: SearchParams | null) => void
  setTargetBundleId: (bundleId: string | null) => void
  setSearchExecution: (execution: ConsumerSearchExecution | null) => void
  setDashboardRecentOpen: (open: boolean) => void
  setDashboardSavedOpen: (open: boolean) => void
  setMiddleTab: (tab: 'results' | 'quickstart' | 'history') => void
  setActiveComplexBy: (value: 'organization' | 'author') => void
  setPrefillNotice: (notice: { message: string; variant?: 'info' | 'warning' } | null) => void
  setDiffTarget: (summary: BundleSummary | null) => void
}

export function useConsumerShowcaseSync({
  setActiveComplexBy,
  setActiveTab,
  setAutoSearch,
  setDashboardRecentOpen,
  setDashboardSavedOpen,
  setDiffTarget,
  setHasSearched,
  setMiddleTab,
  setPrefill,
  setPrefillNotice,
  setResults,
  setSearchExecution,
  setSelected,
  setTargetBundleId,
  setTotal,
  showcaseActive,
  showcaseConsumerUi,
  showcaseSnapshot,
  state
}: UseConsumerShowcaseSyncArgs): void {
  const showcaseBackupRef = useRef<ConsumerPageBackup>()

  useEffect(() => {
    if (showcaseActive && !showcaseBackupRef.current) {
      showcaseBackupRef.current = state
      return
    }

    if (!showcaseActive && showcaseBackupRef.current) {
      const backup = showcaseBackupRef.current
      setResults(backup.results)
      setTotal(backup.total)
      setSelected(backup.selected)
      setHasSearched(backup.hasSearched)
      setActiveTab(backup.activeTab)
      setPrefill(backup.prefill)
      setAutoSearch(backup.autoSearch)
      setTargetBundleId(backup.targetBundleId)
      setSearchExecution(backup.searchExecution)
      setDashboardRecentOpen(backup.dashboardRecentOpen)
      setDashboardSavedOpen(backup.dashboardSavedOpen)
      setMiddleTab(backup.middleTab)
      setActiveComplexBy(backup.activeComplexBy)
      setPrefillNotice(backup.prefillNotice)
      setDiffTarget(null)
      showcaseBackupRef.current = undefined
    }
  }, [
    setActiveComplexBy,
    setActiveTab,
    setAutoSearch,
    setDashboardRecentOpen,
    setDashboardSavedOpen,
    setDiffTarget,
    setHasSearched,
    setMiddleTab,
    setPrefill,
    setPrefillNotice,
    setResults,
    setSearchExecution,
    setSelected,
    setTargetBundleId,
    setTotal,
    showcaseActive,
    state
  ])

  useEffect(() => {
    if (!showcaseActive || !showcaseSnapshot) return

    const consumerUi = showcaseConsumerUi ?? {}
    const nextMiddleTab = consumerUi.middleTab ?? 'quickstart'
    const nextPrefill = consumerUi.prefill ?? showcaseSnapshot.consumer.quickSearchPrefill
    const nextActiveTab = consumerUi.activeTab ?? nextPrefill.tab
    const nextSelectedId = consumerUi.selectedBundleId ?? showcaseSnapshot.consumer.selectedBundleId
    const nextSelected = nextSelectedId
      ? showcaseSnapshot.consumer.results.find((summary) => summary.id === nextSelectedId) ?? null
      : null
    const nextDiffTarget = consumerUi.bundleDiffTargetId
      ? showcaseSnapshot.consumer.results.find((summary) => summary.id === consumerUi.bundleDiffTargetId) ?? null
      : null

    setResults(showcaseSnapshot.consumer.results)
    setTotal(showcaseSnapshot.consumer.total)
    setSearchExecution(nextMiddleTab === 'results' ? showcaseSnapshot.consumer.quickSearchExecution : null)
    setHasSearched(nextMiddleTab === 'results')
    setActiveTab(nextActiveTab)
    setPrefill(nextPrefill)
    setAutoSearch(null)
    setTargetBundleId(null)
    setDashboardRecentOpen(true)
    setDashboardSavedOpen(true)
    setMiddleTab(nextMiddleTab)
    setActiveComplexBy(nextPrefill.tab === 'complex' ? nextPrefill.complexBy ?? 'organization' : 'organization')
    setPrefillNotice(null)
    setSelected(consumerUi.showDetail && nextMiddleTab === 'results' ? nextSelected : nextDiffTarget ? nextSelected : null)
    setDiffTarget(nextDiffTarget)
  }, [
    setActiveComplexBy,
    setActiveTab,
    setAutoSearch,
    setDashboardRecentOpen,
    setDashboardSavedOpen,
    setDiffTarget,
    setHasSearched,
    setMiddleTab,
    setPrefill,
    setPrefillNotice,
    setResults,
    setSearchExecution,
    setSelected,
    setTargetBundleId,
    setTotal,
    showcaseActive,
    showcaseConsumerUi,
    showcaseSnapshot
  ])
}
