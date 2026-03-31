import { useState } from 'react'
import { ChevronDown, ChevronRight, Search, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useHistoryStore, type SubmissionRecord } from '../../store/historyStore'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'

interface Props {
  onFill: (record: SubmissionRecord) => void
}

export default function RecentRecords({ onFill }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { records, clearHistory, removeRecord } = useHistoryStore()
  const [open, setOpen] = useState(records.length > 0)

  if (records.length === 0) return <></>

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {t('recent.title')}
          <Badge variant="secondary" className="h-4 text-[10px] px-1">{records.length}</Badge>
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); clearHistory() }}
          className="text-muted-foreground/60 hover:text-destructive transition-colors"
          title={t('recent.clearAll')}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </button>

      {open && (
        <div className="max-h-48 overflow-y-auto">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 transition-colors group"
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
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
