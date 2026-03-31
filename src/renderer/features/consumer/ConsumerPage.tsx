import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SearchForm from './SearchForm'
import ResultList from './ResultList'
import PrescriptionDetail from './PrescriptionDetail'
import RecentRecords from './RecentRecords'
import type { BundleSummary } from '../../types/fhir.d'
import type { SubmissionRecord } from '../../store/historyStore'

export type SearchTab = 'basic' | 'date' | 'complex'

export type SearchPrefill =
  | { tab: 'basic'; searchBy: 'identifier' | 'name'; value: string }
  | { tab: 'date'; identifier: string; date: string }
  | {
      tab: 'complex'
      identifier: string
      complexBy?: 'organization' | 'author'
      orgId?: string
      authorName?: string
    }

export default function ConsumerPage(): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const [results, setResults] = useState<BundleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<BundleSummary | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<SearchTab>('basic')
  const [prefill, setPrefill] = useState<SearchPrefill | null>(null)

  function handleResults(r: BundleSummary[], t: number): void {
    setResults(r)
    setTotal(t)
    setSelected(null)
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

  return (
    <div className="flex h-full">
      {/* Left panel: Search form */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="px-4 py-4 border-b bg-background shrink-0">
          <h1 className="text-base font-bold">{t('page.title')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t('page.description')}</p>
        </div>
        <RecentRecords onFill={handleFill} />
        <div className="flex-1 overflow-auto p-4">
          <SearchForm
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onResults={handleResults}
            prefill={prefill}
            onPrefillConsumed={() => setPrefill(null)}
          />
        </div>
      </div>

      {/* Middle panel: Result list */}
      <div className={`${selected ? 'w-72' : 'flex-1'} border-r flex flex-col shrink-0`}>
        {hasSearched ? (
          <ResultList
            results={results}
            total={total}
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
        )}
      </div>

      {/* Right panel: Detail */}
      {selected && (
        <div className="flex-1 flex flex-col">
          <PrescriptionDetail
            summary={selected}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  )
}
