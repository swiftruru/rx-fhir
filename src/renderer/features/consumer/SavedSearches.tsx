import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Star, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useSearchHistoryStore, type SavedSearchRecord } from '../../store/searchHistoryStore'
import type { SearchParams } from '../../types/fhir.d'

interface Props {
  onRun: (params: SearchParams) => void
}

function formatSearchTitle(record: SavedSearchRecord, t: (key: string, options?: Record<string, unknown>) => string): string {
  const { params } = record

  switch (params.mode) {
    case 'basic':
      if (params.identifier) return t('saved.criteria.identifier', { value: params.identifier })
      if (params.name) return t('saved.criteria.name', { value: params.name })
      return t('saved.emptyTitle')
    case 'date':
      return t('saved.patterns.date', {
        identifier: params.identifier ?? '—',
        date: params.date ?? '—'
      })
    case 'complex':
      if (params.complexSearchBy === 'organization') {
        return t('saved.patterns.organization', {
          identifier: params.identifier ?? '—',
          organizationId: params.organizationId ?? '—'
        })
      }

      return t('saved.patterns.author', {
        identifier: params.identifier ?? '—',
        authorName: params.authorName ?? '—'
      })
    default:
      return t('saved.emptyTitle')
  }
}

function formatSearchMeta(record: SavedSearchRecord, t: (key: string, options?: Record<string, unknown>) => string): string {
  const modeLabel = t(`saved.modes.${record.params.mode}`)
  return `${modeLabel} · ${new Date(record.lastUsedAt).toLocaleString()}`
}

function SearchRow({
  record,
  onRun
}: {
  record: SavedSearchRecord
  onRun: (params: SearchParams) => void
}): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const togglePinned = useSearchHistoryStore((state) => state.togglePinned)
  const removeSearch = useSearchHistoryStore((state) => state.removeSearch)

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors group">
      <button
        type="button"
        onClick={() => onRun(record.params)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="text-xs font-medium truncate">{formatSearchTitle(record, t)}</div>
        <div className="text-[10px] text-muted-foreground truncate">{formatSearchMeta(record, t)}</div>
      </button>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title={t('saved.runSearch')}
          onClick={() => onRun(record.params)}
        >
          <Search className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-6 w-6 ${record.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground/70'}`}
          title={record.pinned ? t('saved.unpin') : t('saved.pin')}
          onClick={() => togglePinned(record.id)}
        >
          <Star className={`h-3 w-3 ${record.pinned ? 'fill-current' : ''}`} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
          title={t('saved.deleteSearch')}
          onClick={() => removeSearch(record.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export default function SavedSearches({ onRun }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { records, clearRecentSearches } = useSearchHistoryStore()
  const [open, setOpen] = useState(records.length > 0)

  const { pinnedRecords, recentRecords } = useMemo(() => ({
    pinnedRecords: records.filter((record) => record.pinned),
    recentRecords: records.filter((record) => !record.pinned)
  }), [records])

  if (records.length === 0) return <></>

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {t('saved.title')}
          <Badge variant="secondary" className="h-4 text-[10px] px-1">{records.length}</Badge>
        </span>
        {recentRecords.length > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              clearRecentSearches()
            }}
            className="text-muted-foreground/60 hover:text-destructive transition-colors"
            title={t('saved.clearRecent')}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </button>

      {open && (
        <div className="max-h-56 overflow-y-auto">
          {pinnedRecords.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('saved.favorites')}
              </div>
              {pinnedRecords.map((record) => (
                <SearchRow key={record.id} record={record} onRun={onRun} />
              ))}
            </div>
          )}

          {recentRecords.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('saved.recent')}
              </div>
              {recentRecords.map((record) => (
                <SearchRow key={record.id} record={record} onRun={onRun} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
