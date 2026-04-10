import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, X, FileText, Eye, Search } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import { Badge } from '../../shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/components/ui/select'
import { useHistoryStore, type SubmissionRecord } from '../../features/history/store/historyStore'
import { cn } from '../../shared/lib/utils'

type SortKey = 'date-desc' | 'date-asc' | 'name-asc'

export interface SubmissionListProps {
  /** Called when user wants to view the full prescription detail */
  onSelect?: (record: SubmissionRecord) => void
  /** Called when user wants to fill the search form with this record's identifier */
  onFill?: (record: SubmissionRecord) => void
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

export default function SubmissionList({ onSelect, onFill }: SubmissionListProps): React.JSX.Element {
  const { t } = useTranslation('history')
  const records      = useHistoryStore((s) => s.records)
  const removeRecord = useHistoryStore((s) => s.removeRecord)

  const [filter, setFilter]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date-desc')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    // Only show bundle submissions (resource-type records are intermediate steps, not full prescriptions)
    const bundles = records.filter((r) => r.type === 'bundle')
    const base = q
      ? bundles.filter((r) =>
          r.patientName.toLowerCase().includes(q) ||
          r.patientIdentifier.toLowerCase().includes(q) ||
          (r.organizationName ?? '').toLowerCase().includes(q) ||
          (r.practitionerName ?? '').toLowerCase().includes(q)
        )
      : bundles

    return [...base].sort((a, b) => {
      if (sortKey === 'date-desc') return b.submittedAt.localeCompare(a.submittedAt)
      if (sortKey === 'date-asc')  return a.submittedAt.localeCompare(b.submittedAt)
      return a.patientName.localeCompare(b.patientName)
    })
  }, [records, filter, sortKey])

  if (records.filter((r) => r.type === 'bundle').length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">{t('submissions.empty')}</p>
        <p className="max-w-xs text-xs text-muted-foreground/70">{t('submissions.emptyHint')}</p>
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
            placeholder={t('submissions.filterPlaceholder')}
            className="h-8 pr-8 text-sm"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('submissions.filterClear')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 w-36 text-xs" aria-label={t('submissions.sortLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">{t('submissions.sortDateDesc')}</SelectItem>
            <SelectItem value="date-asc">{t('submissions.sortDateAsc')}</SelectItem>
            <SelectItem value="name-asc">{t('submissions.sortNameAsc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* No-match state */}
      {filter && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t('submissions.filterNoMatch')}</p>
          <Button variant="ghost" size="sm" onClick={() => setFilter('')}>
            {t('submissions.filterClear')}
          </Button>
        </div>
      )}

      {/* Record cards */}
      {filtered.map((record) => (
        <SubmissionCard
          key={record.id}
          record={record}
          onSelect={onSelect}
          onFill={onFill}
          onDelete={() => removeRecord(record.id)}
          t={t}
        />
      ))}
    </div>
  )
}

function SubmissionCard({
  record,
  onSelect,
  onFill,
  onDelete,
  t,
}: {
  record: SubmissionRecord
  onSelect?: (record: SubmissionRecord) => void
  onFill?: (record: SubmissionRecord) => void
  onDelete: () => void
  t: (key: string, opts?: Record<string, string>) => string
}): React.JSX.Element {
  return (
    <div className={cn(
      'rounded-[16px] border border-border/60 bg-card/60 px-4 py-3',
      'transition-colors hover:bg-card/90'
    )}>
      <div className="flex items-start justify-between gap-3">
        {/* Main content — clickable if onSelect is provided */}
        <button
          type="button"
          className={cn(
            'min-w-0 flex-1 space-y-1.5 text-left',
            onSelect ? 'cursor-pointer' : 'cursor-default'
          )}
          onClick={onSelect ? () => onSelect(record) : undefined}
          disabled={!onSelect}
        >
          {/* Row 1: Name + identifier + type badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-none text-foreground">
              {record.patientName}
            </span>
            <span className="text-xs text-muted-foreground">{record.patientIdentifier}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {record.type === 'bundle'
                ? t('submissions.typeBadgeBundle')
                : t('submissions.typeBadgeResource')}
            </Badge>
          </div>

          {/* Row 2: Meta fields */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {record.organizationName && (
              <span>
                <span className="font-medium text-foreground/70">{t('submissions.fieldOrg')}: </span>
                {record.organizationName}
              </span>
            )}
            {record.practitionerName && (
              <span>
                <span className="font-medium text-foreground/70">{t('submissions.fieldPractitioner')}: </span>
                {record.practitionerName}
              </span>
            )}
            {record.conditionDisplay && (
              <span>
                <span className="font-medium text-foreground/70">{t('submissions.fieldCondition')}: </span>
                {record.conditionDisplay}
              </span>
            )}
          </div>

          {/* Row 3: Date */}
          <p className="text-[11px] text-muted-foreground/60">
            <span className="font-medium">{t('submissions.fieldDate')}: </span>
            {formatDate(record.submittedAt)}
          </p>
        </button>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {onSelect && record.bundleId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onSelect(record)}
              aria-label={t('submissions.viewDetail')}
              title={t('submissions.viewDetail')}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {onFill && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onFill(record)}
              aria-label={t('submissions.fillSearch')}
              title={t('submissions.fillSearch')}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label={t('submissions.deleteRecord')}
            title={t('submissions.deleteRecord')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
