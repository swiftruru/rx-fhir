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
  const historyCount = useHistoryStore((state) => state.records.length)
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
    if (targetBundleId) {
      setSelected(r.find((summary) => summary.id === targetBundleId) ?? (r.length === 1 ? r[0] : null))
      setTargetBundleId(null)
    } else {
      setSelected(null)
    }
    setHasSearched(true)
  }

  function getSearchIdentifier(rec: SubmissionRecord): string {
    return rec.patientIdentifier || rec.bundleId || ''
  }

  function getSearchDate(rec: SubmissionRecord): string {
    return rec.submittedAt.slice(0, 10)
  }

  function handleFill(rec: SubmissionRecord): void {
    const identifier = getSearchIdentifier(rec)

    if (activeTab === 'date') {
      setPrefill({ tab: 'date', identifier, date: getSearchDate(rec) })
      return
    }

    if (activeTab === 'complex') {
      if (rec.organizationIdentifier) {
        setPrefill({
          tab: 'complex',
          identifier,
          complexBy: 'organization',
          orgId: rec.organizationIdentifier
        })
        return
      }

      if (rec.practitionerName) {
        setPrefill({
          tab: 'complex',
          identifier,
          complexBy: 'author',
          authorName: rec.practitionerName
        })
        return
      }

      setPrefill({ tab: 'complex', identifier })
      return
    }

    setPrefill({ tab: 'basic', searchBy: 'identifier', value: identifier })
  }

  function handleRunSavedSearch(params: SearchParams): void {
    setActiveTab(getSearchTabFromParams(params))
    setPrefill(buildSearchPrefillFromParams(params))
    setAutoSearch(params)
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
              onTabChange={setActiveTab}
              onResults={handleResults}
              prefill={prefill}
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
