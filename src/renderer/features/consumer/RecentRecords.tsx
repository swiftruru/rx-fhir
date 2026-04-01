import { ChevronDown, ChevronRight, FileText, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useHistoryStore, type SubmissionRecord } from '../../store/historyStore'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'

interface Props {
  onFill: (record: SubmissionRecord) => void
  open: boolean
  onToggle: () => void
  variant?: 'sidebar' | 'dashboard'
}

export default function RecentRecords({
  onFill,
  open,
  onToggle,
  variant = 'sidebar'
}: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { records, clearHistory, removeRecord } = useHistoryStore()
  const bundleRecords = records.filter((record) => record.type === 'bundle')
  const rootClassName = variant === 'dashboard'
    ? 'overflow-hidden rounded-xl border border-border bg-background shadow-sm'
    : 'border-b border-border bg-gradient-to-b from-primary/8 to-background'
  const contentMaxHeightClass = variant === 'dashboard' ? 'max-h-80' : 'max-h-40'

  if (bundleRecords.length === 0) return <></>

  return (
    <div className={rootClassName}>
      <div className="flex items-start gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left hover:text-foreground transition-colors"
        >
          <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background/90 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary shadow-sm">
            <FileText className="h-3 w-3" />
            {t('recent.typeLabel')}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            {t('recent.title')}
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{bundleRecords.length}</Badge>
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {t('recent.description')}
          </span>
          <span className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="h-5 gap-1 rounded-full border-primary/20 bg-background/80 px-2 font-normal">
              <FileText className="h-3 w-3 text-primary" />
              {t('recent.countLabel', { count: bundleRecords.length })}
            </Badge>
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); clearHistory() }}
          className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/60 hover:bg-background hover:text-destructive transition-colors"
          title={t('recent.clearAll')}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {open && (
        <div className={`${contentMaxHeightClass} space-y-2 overflow-y-auto border-t border-primary/10 px-3 pb-3 pt-3`}>
          {bundleRecords.map((rec) => (
            <div
              key={rec.id}
              className="group flex items-center justify-between gap-2 rounded-lg border border-primary/15 bg-background/85 px-3 py-2 transition-colors hover:bg-background"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">
                  {rec.patientName || rec.patientIdentifier}
                  {rec.patientName && rec.patientIdentifier && (
                    <span className="text-muted-foreground ml-1 font-normal">({rec.patientIdentifier})</span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {rec.type === 'resource'
                    ? `Patient · ${rec.patientIdentifier}`
                    : `${new Date(rec.submittedAt).toLocaleDateString()}${rec.organizationName ? ` · ${rec.organizationName}` : ''}`
                  }
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={t('recent.fillSearch')}
                  onClick={() => onFill(rec)}
                >
                  <Search className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
                  title={t('recent.deleteRecord')}
                  onClick={(e) => { e.stopPropagation(); removeRecord(rec.id) }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
