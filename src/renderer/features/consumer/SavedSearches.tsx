import { useMemo } from 'react'
import { ChevronDown, ChevronRight, Clock3, Search, Star, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useSearchHistoryStore, type SavedSearchRecord } from '../../store/searchHistoryStore'
import type { SearchParams } from '../../types/fhir.d'

interface Props {
  onRun: (params: SearchParams) => void
  open: boolean
  onToggle: () => void
  variant?: 'sidebar' | 'dashboard'
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
  const rowClassName = record.pinned
    ? 'border-amber-200/70 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10'
    : 'border-border/70 bg-background/70 hover:bg-muted/50'
  const actionsClassName = record.pinned
    ? 'opacity-100'
    : 'opacity-60 group-hover:opacity-100'

  return (
    <div className={`group flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${rowClassName}`}>
      <button
        type="button"
        onClick={() => onRun(record.params)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="text-xs font-medium truncate">{formatSearchTitle(record, t)}</div>
        <div className="text-[10px] text-muted-foreground truncate">{formatSearchMeta(record, t)}</div>
      </button>

      <div className={`flex items-center gap-1 shrink-0 transition-opacity ${actionsClassName}`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={t('saved.runSearch')}
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
          aria-label={record.pinned ? t('saved.unpin') : t('saved.pin')}
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
          aria-label={t('saved.deleteSearch')}
          title={t('saved.deleteSearch')}
          onClick={() => removeSearch(record.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export default function SavedSearches({
  onRun,
  open,
  onToggle,
  variant = 'sidebar'
}: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { records, clearRecentSearches } = useSearchHistoryStore()
  const rootClassName = variant === 'dashboard'
    ? 'overflow-hidden rounded-xl border border-border bg-background shadow-sm'
    : 'border-b border-border bg-gradient-to-b from-muted/35 to-background'
  const contentMaxHeightClass = variant === 'dashboard' ? 'max-h-80' : 'max-h-44'
  const sectionId = `saved-searches-${variant}`

  const { pinnedRecords, recentRecords } = useMemo(() => ({
    pinnedRecords: records.filter((record) => record.pinned),
    recentRecords: records.filter((record) => !record.pinned)
  }), [records])

  if (records.length === 0) return <></>

  return (
    <div className={rootClassName}>
      <div className="flex items-start gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={sectionId}
          className="min-w-0 flex-1 text-left hover:text-foreground transition-colors"
        >
          <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground shadow-sm">
            <Search className="h-3 w-3" />
            {t('saved.typeLabel')}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            {t('saved.title')}
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{records.length}</Badge>
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t('saved.description')}
          </span>
          <span className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="h-5 gap-1 rounded-full px-2 font-normal">
              <Star className="h-3 w-3 text-amber-500" />
              {t('saved.favoritesCount', { count: pinnedRecords.length })}
            </Badge>
            <Badge variant="outline" className="h-5 gap-1 rounded-full px-2 font-normal">
              <Clock3 className="h-3 w-3" />
              {t('saved.recentCount', { count: recentRecords.length })}
            </Badge>
          </span>
        </button>
        {recentRecords.length > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              clearRecentSearches()
            }}
            aria-label={t('saved.clearRecent')}
            className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/60 hover:bg-background hover:text-destructive transition-colors"
            title={t('saved.clearRecent')}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div id={sectionId} className={`${contentMaxHeightClass} space-y-3 overflow-y-auto border-t border-border/60 px-3 pb-3 pt-3`}>
          {pinnedRecords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <Star className="h-3 w-3 fill-current" />
                {t('saved.favorites')}
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{pinnedRecords.length}</Badge>
              </div>
              <div className="space-y-2">
                {pinnedRecords.map((record) => (
                  <SearchRow key={record.id} record={record} onRun={onRun} />
                ))}
              </div>
            </div>
          )}

          {recentRecords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {t('saved.recent')}
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{recentRecords.length}</Badge>
              </div>
              <div className="space-y-2">
                {recentRecords.map((record) => (
                  <SearchRow key={record.id} record={record} onRun={onRun} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
