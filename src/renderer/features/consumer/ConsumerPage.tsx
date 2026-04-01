import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import SearchForm from './SearchForm'
import ResultList from './ResultList'
import PrescriptionDetail from './PrescriptionDetail'
import RecentRecords from './RecentRecords'
import SavedSearches from './SavedSearches'
import type { BundleSummary, SearchParams } from '../../types/fhir.d'
import { useHistoryStore, type SubmissionRecord } from '../../store/historyStore'
import { useSearchHistoryStore } from '../../store/searchHistoryStore'
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

export default function ConsumerPage(): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const location = useLocation()
  const navigate = useNavigate()
  const records = useHistoryStore((state) => state.records)
  const updateRecord = useHistoryStore((state) => state.updateRecord)
  const historyCount = records.filter((record) => record.type === 'bundle').length
  const savedSearchCount = useSearchHistoryStore((state) => state.records.length)
  const recordSearch = useSearchHistoryStore((state) => state.recordSearch)
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

  useEffect(() => {
    const launchState = location.state as ConsumerLaunchState | null
    if (!launchState) return

    if (launchState.prefill) {
      setActiveTab(launchState.prefill.tab)
      setPrefill(launchState.prefill)
    }
    if (launchState.autoSearch) setAutoSearch(launchState.autoSearch)
    if (launchState.targetBundleId) setTargetBundleId(launchState.targetBundleId)

    navigate('/consumer', { replace: true, state: null })
  }, [location.state, navigate])

  useEffect(() => {
    setDashboardRecentOpen(historyCount > 0)
  }, [historyCount])

  useEffect(() => {
    setDashboardSavedOpen(savedSearchCount > 0)
  }, [savedSearchCount])

  function handleResults(r: BundleSummary[], t: number, execution: ConsumerSearchExecution): void {
    setResults(r)
    setTotal(t)
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

  const showDetail = middleTab === 'results' && Boolean(selected)

  return (
    <div className="flex h-full">
      {/* Left panel: Search form */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="px-4 py-4 border-b bg-background shrink-0">
          <h1 className="text-base font-bold">{t('page.title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('page.description')}</p>
        </div>
        <div className="flex-1 overflow-auto bg-muted/10 px-4 py-4">
          <div className="rounded-xl border border-border/70 bg-background/95 p-3 shadow-sm">
            <SearchForm
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

      {/* Middle panel: Result list */}
      <div className="flex-1 min-w-0 border-r flex flex-col shrink-0">
        <div className="border-b bg-background px-4 py-3 shrink-0">
          <Tabs value={middleTab} onValueChange={(value) => setMiddleTab(value as 'results' | 'quickstart')}>
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="results">{t('page.middleTabs.results')}</TabsTrigger>
              <TabsTrigger value="quickstart">{t('page.middleTabs.quickStart')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {middleTab === 'results' ? (
          hasSearched ? (
            <ResultList
              results={results}
              total={total}
              searchExecution={searchExecution}
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <div className="text-4xl opacity-20">🔍</div>
                <p className="text-sm">{t('page.emptyPrompt')}</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-auto bg-muted/10 p-5">
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 px-5 py-4">
                <p className="text-sm font-semibold text-foreground">{t('page.quickStartTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('page.quickStartDescription')}</p>
              </div>

              {historyCount > 0 || savedSearchCount > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
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
        )}
      </div>

      {/* Right panel: Detail */}
      {showDetail && selected && (
        <div className="w-[clamp(26rem,42vw,44rem)] min-w-[26rem] max-w-[44rem] flex flex-col shrink-0">
          <PrescriptionDetail
            summary={selected}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  )
}
