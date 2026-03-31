import { useState } from 'react'
import SearchForm from './SearchForm'
import ResultList from './ResultList'
import PrescriptionDetail from './PrescriptionDetail'
import type { BundleSummary } from '../../types/fhir.d'

export default function ConsumerPage(): React.JSX.Element {
  const [results, setResults] = useState<BundleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<BundleSummary | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  function handleResults(r: BundleSummary[], t: number): void {
    setResults(r)
    setTotal(t)
    setSelected(null)
    setHasSearched(true)
  }

  return (
    <div className="flex h-full">
      {/* Left panel: Search form */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="px-4 py-4 border-b bg-background shrink-0">
          <h1 className="text-base font-bold">Consumer — 查詢處方箋</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            以多種條件查詢 FHIR Server 上的處方箋
          </p>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <SearchForm onResults={handleResults} />
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
              <p className="text-sm">請輸入查詢條件</p>
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
