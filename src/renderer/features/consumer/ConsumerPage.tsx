import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileUp, Upload, Wand2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import FeatureShowcaseTarget from '../../components/FeatureShowcaseTarget'
import SearchForm, { type SearchFormHandle } from './SearchForm'
import ResultList from './ResultList'
import PrescriptionDetail from './PrescriptionDetail'
import RecentRecords from './RecentRecords'
import SavedSearches from './SavedSearches'
import RecentBundleFiles from './RecentBundleFiles'
import type { BundleSummary, SearchParams } from '../../types/fhir.d'
import type { RecentBundleFileEntry } from '../../types/electron'
import { useHistoryStore, type SubmissionRecord } from '../../store/historyStore'
import { useSearchHistoryStore } from '../../store/searchHistoryStore'
import { useLiveDemoStore } from '../../store/liveDemoStore'
import { useFeatureShowcaseStore } from '../../store/featureShowcaseStore'
import { useShortcutActionStore } from '../../store/shortcutActionStore'
import { useAccessibilityStore } from '../../store/accessibilityStore'
import { useToastStore } from '../../store/toastStore'
import { useAppStore } from '../../store/appStore'
import { getBundleFileErrorMessage, importBundleJsonFile, listRecentBundleJsonFiles, openRecentBundleJson, rememberRecentBundleJson } from '../../services/bundleFileService'
import { fetchBundleById } from '../../services/fhirClient'
import { extractBundleHistoryMetadata } from '../../services/searchService'
import {
  buildSearchPrefillFromParams,
  getSearchTabFromParams,
  type ConsumerLaunchState,
  type ConsumerSearchExecution,
  type SearchPrefill,
  type SearchTab
} from './searchState'
import { getConsumerBasicMocks } from '../../mocks/mockPools'

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
  middleTab: 'results' | 'quickstart'
  activeComplexBy: 'organization' | 'author'
  prefillNotice: { message: string; variant?: 'info' | 'warning' } | null
}

export default function ConsumerPage(): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { t: tc } = useTranslation('common')
  const locale = useAppStore((state) => state.locale)
  const location = useLocation()
  const navigate = useNavigate()
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const pushToast = useToastStore((state) => state.pushToast)
  const records = useHistoryStore((state) => state.records)
  const updateRecord = useHistoryStore((state) => state.updateRecord)
  const historyCount = records.filter((record) => record.type === 'bundle').length
  const savedSearchCount = useSearchHistoryStore((state) => state.records.length)
  const recordSearch = useSearchHistoryStore((state) => state.recordSearch)
  const markConsumerSearchReady = useLiveDemoStore((state) => state.markConsumerSearchReady)
  const showcaseStatus = useFeatureShowcaseStore((state) => state.status)
  const showcaseUi = useFeatureShowcaseStore((state) => state.ui)
  const showcaseSnapshot = useFeatureShowcaseStore((state) => state.snapshot)
  const setConsumerActions = useShortcutActionStore((state) => state.setConsumerActions)
  const clearConsumerActions = useShortcutActionStore((state) => state.clearConsumerActions)
  const [results, setResults] = useState<BundleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<BundleSummary | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<SearchTab>('basic')
  const [prefill, setPrefill] = useState<SearchPrefill | null>(null)
  const [autoSearch, setAutoSearch] = useState<SearchParams | null>(null)
  const [targetBundleId, setTargetBundleId] = useState<string | null>(null)
  const [searchExecution, setSearchExecution] = useState<ConsumerSearchExecution | null>(null)
  const [dashboardRecentOpen, setDashboardRecentOpen] = useState(false)
  const [dashboardSavedOpen, setDashboardSavedOpen] = useState(false)
  const [middleTab, setMiddleTab] = useState<'results' | 'quickstart'>('quickstart')
  const [activeComplexBy, setActiveComplexBy] = useState<'organization' | 'author'>('organization')
  const [prefillNotice, setPrefillNotice] = useState<{ message: string; variant?: 'info' | 'warning' } | null>(null)
  const [dragDepth, setDragDepth] = useState(0)
  const [dropFeedback, setDropFeedback] = useState<{ message: string; variant: 'success' | 'destructive' } | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentBundleFileEntry[]>([])
  const showcaseBackupRef = useRef<ConsumerPageBackup>()
  const searchFormRef = useRef<SearchFormHandle>(null)
  const showcaseActive = showcaseStatus === 'running' || showcaseStatus === 'paused'
  const dragActive = dragDepth > 0

  useEffect(() => {
    const launchState = location.state as ConsumerLaunchState | null
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
      const example = getConsumerBasicMocks(locale)[0]
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
  }, [announcePolite, locale, location.state, navigate, pushToast, t])

  useEffect(() => {
    setDashboardRecentOpen(historyCount > 0)
  }, [historyCount])

  useEffect(() => {
    setDashboardSavedOpen(savedSearchCount > 0)
  }, [savedSearchCount])

  useEffect(() => {
    void refreshRecentFiles()
  }, [])

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
    }
  }, [clearConsumerActions, setConsumerActions])

  useEffect(() => {
    if (showcaseActive && !showcaseBackupRef.current) {
      showcaseBackupRef.current = {
        results,
        total,
        selected,
        hasSearched,
        activeTab,
        prefill,
        autoSearch,
        targetBundleId,
        searchExecution,
        dashboardRecentOpen,
        dashboardSavedOpen,
        middleTab,
        activeComplexBy,
        prefillNotice
      }
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
      showcaseBackupRef.current = undefined
    }
  }, [
    activeComplexBy,
    activeTab,
    autoSearch,
    dashboardRecentOpen,
    dashboardSavedOpen,
    hasSearched,
    middleTab,
    prefill,
    prefillNotice,
    results,
    searchExecution,
    selected,
    showcaseActive,
    targetBundleId,
    total
  ])

  useEffect(() => {
    if (!showcaseActive || !showcaseSnapshot) return

    const consumerUi = showcaseUi.consumer ?? {}
    const nextMiddleTab = consumerUi.middleTab ?? 'quickstart'
    const nextPrefill = consumerUi.prefill ?? showcaseSnapshot.consumer.quickSearchPrefill
    const nextActiveTab = consumerUi.activeTab ?? nextPrefill.tab
    const nextSelectedId = consumerUi.selectedBundleId ?? showcaseSnapshot.consumer.selectedBundleId
    const nextSelected = nextSelectedId
      ? showcaseSnapshot.consumer.results.find((summary) => summary.id === nextSelectedId) ?? null
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
    setSelected(consumerUi.showDetail && nextMiddleTab === 'results' ? nextSelected : null)
  }, [showcaseActive, showcaseSnapshot, showcaseUi.consumer])

  function handleResults(r: BundleSummary[], totalCount: number, execution: ConsumerSearchExecution): void {
    setResults(r)
    setTotal(totalCount)
    setSearchExecution(execution)
    recordSearch(execution.params)
    setMiddleTab('results')
    setPrefillNotice(null)
    if (targetBundleId) {
      setSelected(r.find((summary) => summary.id === targetBundleId) ?? (r.length === 1 ? r[0] : null))
      setTargetBundleId(null)
    } else {
      setSelected(null)
    }
    setHasSearched(true)
    markConsumerSearchReady()

    if (execution.error) {
      announcePolite(t('results.announcements.searchFailed'))
      return
    }

    if (r.length === 0) {
      announcePolite(t('results.announcements.noResults'))
      return
    }

    announcePolite(
      t(
        totalCount !== r.length
          ? 'results.announcements.searchCompletedFiltered'
          : 'results.announcements.searchCompleted',
        totalCount !== r.length
          ? { count: r.length, total: totalCount }
          : { count: r.length }
      )
    )
  }

  function handleImportedBundle(summary: BundleSummary): void {
    setResults([summary])
    setTotal(1)
    setSelected(summary)
    setHasSearched(true)
    setSearchExecution(null)
    setTargetBundleId(null)
    setMiddleTab('results')
    setPrefillNotice(null)
    announcePolite(
      t('results.announcements.bundleImported', {
        patient: summary.patientName || t('results.unknownPatient')
      })
    )
    void refreshRecentFiles()
  }

  async function refreshRecentFiles(): Promise<void> {
    try {
      const files = await listRecentBundleJsonFiles()
      setRecentFiles(files)
    } catch {
      setRecentFiles([])
    }
  }

  async function handleDropImport(files: FileList | File[]): Promise<void> {
    const firstFile = Array.from(files)[0]
    if (!firstFile) return

    setDropFeedback(null)

    try {
      const imported = await importBundleJsonFile(firstFile)
      const filePath = (firstFile as File & { path?: string }).path
      if (filePath) {
        await rememberRecentBundleJson(filePath)
      }
      handleImportedBundle(imported.summary)
      const message = t('search.importSuccess', { fileName: imported.fileName })
      setDropFeedback({ message, variant: 'success' })
      announcePolite(message)
      pushToast({
        variant: 'success',
        description: message
      })
      await refreshRecentFiles()
    } catch (error) {
      const message = getBundleFileErrorMessage(error, tc)
      setDropFeedback({ message, variant: 'destructive' })
      announcePolite(message)
      pushToast({
        variant: 'error',
        description: message
      })
    }
  }

  async function handleOpenRecentFile(filePath: string): Promise<void> {
    try {
      const imported = await openRecentBundleJson(filePath)
      if (!imported) return
      handleImportedBundle(imported.summary)
      const message = t('recentFiles.opened', { fileName: imported.fileName })
      setDropFeedback({ message, variant: 'success' })
      announcePolite(message)
      pushToast({
        variant: 'success',
        description: message
      })
      await refreshRecentFiles()
    } catch (error) {
      const message = getBundleFileErrorMessage(error, tc)
      setDropFeedback({ message, variant: 'destructive' })
      announcePolite(message)
      pushToast({
        variant: 'error',
        description: message
      })
      await refreshRecentFiles()
    }
  }

  function getSearchIdentifier(rec: SubmissionRecord): string {
    return rec.patientIdentifier || rec.bundleId || ''
  }

  function getSearchDate(rec: SubmissionRecord): string {
    return rec.submittedAt.slice(0, 10)
  }

  function findRelatedBundleRecord(
    rec: SubmissionRecord,
    target: 'organization' | 'author'
  ): SubmissionRecord | undefined {
    if (!rec.patientIdentifier) return undefined

    return records.find((candidate) => (
      candidate.type === 'bundle'
      && candidate.id !== rec.id
      && candidate.patientIdentifier === rec.patientIdentifier
      && (target === 'organization'
        ? Boolean(candidate.organizationIdentifier)
        : Boolean(candidate.practitionerName))
    ))
  }

  async function hydrateBundleRecordForComplexSearch(
    rec: SubmissionRecord,
    target: 'organization' | 'author'
  ): Promise<{ record: SubmissionRecord; hydrated: boolean }> {
    if (rec.type !== 'bundle' || !rec.bundleId) {
      return { record: rec, hydrated: false }
    }

    const alreadyHasTarget = target === 'organization'
      ? Boolean(rec.organizationIdentifier)
      : Boolean(rec.practitionerName)

    if (alreadyHasTarget) {
      return { record: rec, hydrated: false }
    }

    try {
      const bundle = await fetchBundleById(rec.bundleId, rec.serverUrl)
      const metadata = extractBundleHistoryMetadata(bundle)
      const patch: Partial<SubmissionRecord> = {
        patientName: metadata.patientName ?? rec.patientName,
        patientIdentifier: metadata.patientIdentifier ?? rec.patientIdentifier,
        organizationName: metadata.organizationName ?? rec.organizationName,
        organizationIdentifier: metadata.organizationIdentifier ?? rec.organizationIdentifier,
        practitionerName: metadata.practitionerName ?? rec.practitionerName,
        conditionDisplay: metadata.conditionDisplay ?? rec.conditionDisplay
      }

      const hydratedRecord = { ...rec, ...patch }

      if (
        patch.organizationIdentifier !== rec.organizationIdentifier
        || patch.practitionerName !== rec.practitionerName
        || patch.organizationName !== rec.organizationName
        || patch.patientName !== rec.patientName
        || patch.patientIdentifier !== rec.patientIdentifier
        || patch.conditionDisplay !== rec.conditionDisplay
      ) {
        updateRecord(rec.id, patch)
        return { record: hydratedRecord, hydrated: true }
      }

      return { record: hydratedRecord, hydrated: false }
    } catch {
      return { record: rec, hydrated: false }
    }
  }

  async function handleFill(rec: SubmissionRecord): Promise<void> {
    const identifier = getSearchIdentifier(rec)
    setPrefillNotice(null)

    if (activeTab === 'date') {
      setPrefill({ tab: 'date', identifier, date: getSearchDate(rec) })
      return
    }

    if (activeTab === 'complex') {
      const hydrated = await hydrateBundleRecordForComplexSearch(rec, activeComplexBy)
      const identifierForComplex = getSearchIdentifier(hydrated.record)
      const relatedBundle = rec.type === 'bundle'
        ? undefined
        : findRelatedBundleRecord(rec, activeComplexBy)
      const source = rec.type === 'bundle' ? hydrated.record : relatedBundle ?? rec

      if (activeComplexBy === 'organization' && source.organizationIdentifier) {
        setPrefill({
          tab: 'complex',
          identifier: identifierForComplex,
          complexBy: 'organization',
          orgId: source.organizationIdentifier,
          authorName: source.practitionerName
        })
        if (hydrated.hydrated) {
          setPrefillNotice({
            variant: 'info',
            message: t('recent.fillComplexHydratedOrganization')
          })
          return
        }
        if (rec.type !== 'bundle' && relatedBundle?.organizationIdentifier) {
          setPrefillNotice({
            variant: 'info',
            message: t('recent.fillComplexFromBundleOrganization')
          })
        }
        return
      }

      if (activeComplexBy === 'author' && source.practitionerName) {
        setPrefill({
          tab: 'complex',
          identifier: identifierForComplex,
          complexBy: 'author',
          orgId: source.organizationIdentifier,
          authorName: source.practitionerName
        })
        if (hydrated.hydrated) {
          setPrefillNotice({
            variant: 'info',
            message: t('recent.fillComplexHydratedAuthor')
          })
          return
        }
        if (rec.type !== 'bundle' && relatedBundle?.practitionerName) {
          setPrefillNotice({
            variant: 'info',
            message: t('recent.fillComplexFromBundleAuthor')
          })
        }
        return
      }

      setPrefill({ tab: 'complex', identifier: identifierForComplex, complexBy: activeComplexBy })
      setPrefillNotice({
        variant: 'warning',
        message: activeComplexBy === 'organization'
          ? t('recent.fillComplexOrganizationUnavailable')
          : t('recent.fillComplexAuthorUnavailable')
      })
      return
    }

    setPrefill({ tab: 'basic', searchBy: 'identifier', value: identifier })
  }

  function handleRunSavedSearch(params: SearchParams): void {
    setActiveTab(getSearchTabFromParams(params))
    setPrefill(buildSearchPrefillFromParams(params))
    setAutoSearch(params)
    setPrefillNotice(null)
  }

  function handleSearchTabChange(tab: SearchTab): void {
    setActiveTab(tab)
    setPrefillNotice(null)
  }

  function handleImportBundleFromShortcuts(): void {
    void searchFormRef.current?.importBundle()
  }

  function handleApplyQueryExample(): void {
    searchFormRef.current?.fillMock()
  }

  function handleCloseDetail(): void {
    const closingId = selected?.id
    setSelected(null)

    if (!closingId) return

    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-result-id="${closingId}"]`)?.focus()
    })
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    setDragDepth((current) => current + 1)
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    setDragDepth((current) => Math.max(0, current - 1))
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.dataTransfer.files.length) return
    event.preventDefault()
    event.stopPropagation()
    setDragDepth(0)
    void handleDropImport(event.dataTransfer.files)
  }

  const showDetail = middleTab === 'results' && Boolean(selected)

  return (
    <div
      className="relative flex h-full min-h-0 flex-col lg:flex-row"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-background/65 px-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-card/95 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                <FileUp className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">{t('page.dropzone.title')}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('page.dropzone.description')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('page.dropzone.hint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left panel: Search form */}
      <FeatureShowcaseTarget id="consumer.searchPanel" className="flex shrink-0 flex-col border-b lg:w-[22rem] lg:border-b-0 lg:border-r 2xl:w-[23rem]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b bg-background px-4 py-4 shrink-0">
            <h1 data-page-heading="true" tabIndex={-1} className="text-lg font-bold tracking-tight outline-none">
              {t('page.title')}
            </h1>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{t('page.description')}</p>
          </div>
          <div className="flex-1 overflow-auto bg-muted/[0.08] px-4 py-4">
            <div className="rounded-[24px] border border-border/70 bg-background/95 p-3 shadow-sm sm:p-4">
              {dropFeedback && (
                <Alert variant={dropFeedback.variant}>
                  <AlertDescription>{dropFeedback.message}</AlertDescription>
                </Alert>
              )}
              <SearchForm
                ref={searchFormRef}
                activeTab={activeTab}
                onTabChange={handleSearchTabChange}
                onComplexByChange={setActiveComplexBy}
                onResults={handleResults}
                onImportBundle={handleImportedBundle}
                prefill={prefill}
                prefillNotice={prefillNotice}
                onPrefillConsumed={() => setPrefill(null)}
                autoSearch={autoSearch}
                onAutoSearchConsumed={() => setAutoSearch(null)}
              />
            </div>
          </div>
        </div>
      </FeatureShowcaseTarget>

      {/* Middle panel: Result list */}
      <div className="flex min-w-0 flex-1 shrink-0 flex-col lg:border-r">
        <div className="border-b bg-background px-4 py-3 shrink-0">
          <Tabs value={middleTab} onValueChange={(value) => setMiddleTab(value as 'results' | 'quickstart')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/45 p-1 sm:max-w-xs">
                <TabsTrigger value="results" className="rounded-lg">{t('page.middleTabs.results')}</TabsTrigger>
                <TabsTrigger value="quickstart" className="rounded-lg">{t('page.middleTabs.quickStart')}</TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                  {t('page.metrics.records', { count: historyCount })}
                </span>
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                  {t('page.metrics.saved', { count: savedSearchCount })}
                </span>
                <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1">
                  {t('page.metrics.files', { count: recentFiles.length })}
                </span>
              </div>
            </div>
          </Tabs>
        </div>

        {middleTab === 'results' ? (
          <FeatureShowcaseTarget id="consumer.resultsPane" className="flex-1 min-h-0">
            {hasSearched ? (
              <ResultList
                results={results}
                total={total}
                searchExecution={searchExecution}
                selected={selected}
                onSelect={setSelected}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/[0.08] px-6 text-muted-foreground">
                <div className="w-full max-w-md rounded-[24px] border border-dashed border-border/70 bg-background/80 px-6 py-10 text-center shadow-sm">
                  <div className="text-4xl opacity-20">🔍</div>
                  <p className="mt-3 text-sm font-medium text-foreground">{t('page.middleTabs.results')}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('page.emptyPrompt')}</p>
                </div>
              </div>
            )}
          </FeatureShowcaseTarget>
        ) : (
          <FeatureShowcaseTarget id="consumer.quickStartPane" className="flex-1 min-h-0">
            <div className="h-full overflow-auto bg-muted/[0.08] p-4 sm:p-5">
              <div className="mx-auto max-w-5xl space-y-4">
                <div className="rounded-[24px] border border-dashed border-border/70 bg-background/80 px-5 py-4 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">{t('page.quickStartTitle')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('page.quickStartDescription')}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4 shadow-sm">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">
                      <Upload className="h-3 w-3" />
                      {t('page.shortcuts.sourceLabel')}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-foreground">{t('page.shortcuts.importTitle')}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('page.shortcuts.importDescription')}</p>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{t('page.shortcuts.importDropHint')}</p>
                    <Button type="button" variant="outline" className="mt-4 w-full justify-start" onClick={handleImportBundleFromShortcuts}>
                      <Upload className="h-4 w-4" />
                      {t('search.importButton')}
                    </Button>
                  </div>

                  <div className="rounded-[22px] border border-border/70 bg-background px-4 py-4 shadow-sm">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      <Wand2 className="h-3 w-3" />
                      {t('page.shortcuts.examplesLabel')}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-foreground">{t('page.shortcuts.examplesTitle')}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('page.shortcuts.examplesDescription')}</p>
                    <Button type="button" variant="outline" className="mt-4 w-full justify-start" onClick={handleApplyQueryExample}>
                      <Wand2 className="h-4 w-4" />
                      {t('page.shortcuts.examplesButton')}
                    </Button>
                  </div>
                </div>

                {historyCount > 0 || savedSearchCount > 0 || recentFiles.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RecentRecords
                      onFill={handleFill}
                      open={dashboardRecentOpen}
                      onToggle={() => setDashboardRecentOpen((value) => !value)}
                      variant="dashboard"
                    />
                    <SavedSearches
                      onRun={handleRunSavedSearch}
                      open={dashboardSavedOpen}
                      onToggle={() => setDashboardSavedOpen((value) => !value)}
                      variant="dashboard"
                    />
                    <div className="lg:col-span-2">
                      <RecentBundleFiles files={recentFiles} onOpen={(filePath) => void handleOpenRecentFile(filePath)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <div className="text-4xl opacity-20">🗂️</div>
                      <p className="text-sm">{t('page.quickStartEmpty')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FeatureShowcaseTarget>
        )}
      </div>

      {/* Right panel: Detail */}
      {showDetail && selected && (
        <FeatureShowcaseTarget id="consumer.detailPane" className="flex shrink-0 flex-col border-t xl:w-[clamp(24rem,40vw,42rem)] xl:min-w-[24rem] xl:max-w-[42rem] xl:border-t-0">
          <div className="flex h-full min-h-0 flex-col">
            <PrescriptionDetail
              summary={selected}
              onClose={handleCloseDetail}
            />
          </div>
        </FeatureShowcaseTarget>
      )}
    </div>
  )
}
