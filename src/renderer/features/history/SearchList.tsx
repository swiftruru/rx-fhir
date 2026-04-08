import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Star, X, Search, Play } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { useSearchHistoryStore, type SavedSearchRecord } from '../../store/searchHistoryStore'
import type { SearchParams } from '../../types/fhir.d'
import { cn } from '../../lib/utils'

type SortKey = 'last-desc' | 'last-asc' | 'pinned-first'

export interface SearchListProps {
  /** Called when user wants to run this search in the Consumer search form */
  onRunSearch?: (params: SearchParams) => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export default function SearchList({ onRunSearch }: SearchListProps): React.JSX.Element {
  const { t } = useTranslation('history')
  const records      = useSearchHistoryStore((s) => s.records)
  const removeSearch = useSearchHistoryStore((s) => s.removeSearch)
  const togglePinned = useSearchHistoryStore((s) => s.togglePinned)

  const [filter, setFilter]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('last-desc')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const base = q
      ? records.filter((r) => {
          const p = r.params
          return (
            (p.identifier   ?? '').toLowerCase().includes(q) ||
            (p.name         ?? '').toLowerCase().includes(q) ||
            (p.organizationId ?? '').toLowerCase().includes(q) ||
            (p.authorName   ?? '').toLowerCase().includes(q)
          )
        })
      : records

    return [...base].sort((a, b) => {
      if (sortKey === 'pinned-first') {
        const pd = Number(b.pinned) - Number(a.pinned)
        return pd !== 0 ? pd : b.lastUsedAt.localeCompare(a.lastUsedAt)
      }
      if (sortKey === 'last-desc') return b.lastUsedAt.localeCompare(a.lastUsedAt)
      return a.lastUsedAt.localeCompare(b.lastUsedAt)
    })
  }, [records, filter, sortKey])

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Search className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">{t('searches.empty')}</p>
        <p className="max-w-xs text-xs text-muted-foreground/70">{t('searches.emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter + Sort toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('searches.filterPlaceholder')}
            className="h-8 pr-8 text-sm"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('searches.filterClear')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 w-40 text-xs" aria-label={t('searches.sortLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-desc">{t('searches.sortLastUsedDesc')}</SelectItem>
            <SelectItem value="last-asc">{t('searches.sortLastUsedAsc')}</SelectItem>
            <SelectItem value="pinned-first">{t('searches.sortPinnedFirst')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* No-match state */}
      {filter && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t('searches.filterNoMatch')}</p>
          <Button variant="ghost" size="sm" onClick={() => setFilter('')}>
            {t('searches.filterClear')}
          </Button>
        </div>
      )}

      {/* Search cards */}
      {filtered.map((record) => (
        <SearchCard
          key={record.id}
          record={record}
          onRunSearch={onRunSearch}
          onDelete={() => removeSearch(record.id)}
          onTogglePin={() => togglePinned(record.id)}
          t={t}
        />
      ))}
    </div>
  )
}

function buildCriteriaSummary(
  record: SavedSearchRecord,
  t: (key: string, opts?: Record<string, string>) => string
): string {
  const p = record.params
  const parts: string[] = []
  if (p.identifier)    parts.push(t('searches.criteria.identifier',   { value: p.identifier }))
  if (p.name)          parts.push(t('searches.criteria.name',          { value: p.name }))
  if (p.date)          parts.push(t('searches.criteria.date',          { value: p.date }))
  if (p.organizationId) parts.push(t('searches.criteria.organization', { value: p.organizationId }))
  if (p.authorName)    parts.push(t('searches.criteria.author',        { value: p.authorName }))
  return parts.join('  ·  ')
}

function SearchCard({
  record,
  onRunSearch,
  onDelete,
  onTogglePin,
  t,
}: {
  record: SavedSearchRecord
  onRunSearch?: (params: SearchParams) => void
  onDelete: () => void
  onTogglePin: () => void
  t: (key: string, opts?: Record<string, string>) => string
}): React.JSX.Element {
  const criteria = buildCriteriaSummary(record, t)

  return (
    <div className={cn(
      'rounded-[16px] border px-4 py-3',
      'flex items-start justify-between gap-3 transition-colors',
      record.pinned
        ? 'border-amber-300/50 bg-amber-50/20 hover:bg-amber-50/30 dark:bg-amber-900/10 dark:hover:bg-amber-900/20'
        : 'border-border/60 bg-card/60 hover:bg-card/90'
    )}>
      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Row 1: Mode badge + pinned badge */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal capitalize">
            {t(`searches.modes.${record.params.mode}`)}
          </Badge>
          {record.pinned && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-400/20 text-amber-700 dark:text-amber-400 border-amber-400/40 font-normal">
              {t('searches.pinnedBadge')}
            </Badge>
          )}
        </div>

        {/* Row 2: Criteria summary */}
        <p className="text-sm font-medium text-foreground leading-snug">
          {criteria || '—'}
        </p>

        {/* Row 3: Dates */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground/70">
          <span>
            <span className="font-medium text-muted-foreground">{t('searches.fieldLastUsed')}: </span>
            {formatDate(record.lastUsedAt)}
          </span>
          <span>
            <span className="font-medium text-muted-foreground">{t('searches.fieldCreated')}: </span>
            {formatDate(record.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        {onRunSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => onRunSearch(record.params)}
            aria-label={t('searches.runSearch')}
            title={t('searches.runSearch')}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            record.pinned
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-muted-foreground hover:text-amber-500'
          )}
          onClick={onTogglePin}
          aria-label={record.pinned ? t('searches.pinnedBadge') : t('searches.deleteSearch')}
          title={record.pinned ? t('searches.pinnedBadge') : t('searches.deleteSearch')}
        >
          <Star className={cn('h-3.5 w-3.5', record.pinned && 'fill-current')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={t('searches.deleteSearch')}
          title={t('searches.deleteSearch')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
