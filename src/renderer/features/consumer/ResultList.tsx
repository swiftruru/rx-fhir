import { FileText, CalendarDays, Building2, Pill, Stethoscope } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { ScrollArea } from '../../components/ui/scroll-area'
import type { BundleSummary } from '../../types/fhir.d'

interface Props {
  results: BundleSummary[]
  total: number
  selected: BundleSummary | null
  onSelect: (summary: BundleSummary) => void
}

export default function ResultList({ results, total, selected, onSelect }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-16">
        <FileText className="h-12 w-12 opacity-20" />
        <p className="text-sm">{t('results.empty')}</p>
        <p className="text-xs opacity-60">{t('results.emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-xs">{t('results.count', { total })}</Badge>
        {total !== results.length && (
          <span className="text-xs text-muted-foreground">{t('results.showing', { count: results.length })}</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {results.map((summary) => (
            <Card
              key={summary.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selected?.id === summary.id ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => onSelect(summary)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {summary.patientName || t('results.unknownPatient')}
                      </span>
                      {summary.patientIdentifier && (
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {summary.patientIdentifier}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {summary.date && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {summary.date.slice(0, 10)}
                        </span>
                      )}
                      {summary.organizationName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {summary.organizationName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(summary.conditions ?? []).slice(0, 2).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          <Stethoscope className="h-2.5 w-2.5 mr-1" />
                          {c}
                        </Badge>
                      ))}
                      {(summary.medications ?? []).slice(0, 2).map((m, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          <Pill className="h-2.5 w-2.5 mr-1" />
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <code className="text-[10px] text-muted-foreground font-mono shrink-0 max-w-[80px] truncate" title={summary.id}>
                    {summary.id}
                  </code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
