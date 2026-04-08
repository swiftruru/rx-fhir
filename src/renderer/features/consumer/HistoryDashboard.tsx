import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { Progress } from '../../components/ui/progress'
import { useHistoryStore } from '../../store/historyStore'
import { cn } from '../../lib/utils'

const DAY_MS = 86_400_000

export default function HistoryDashboard(): React.JSX.Element | null {
  const { t } = useTranslation('consumer')
  const records = useHistoryStore((s) => s.records)
  const [expanded, setExpanded] = useState(false)

  const stats = useMemo(() => {
    if (records.length === 0) return null

    const now = Date.now()
    const thisWeek  = records.filter((r) => now - new Date(r.submittedAt).getTime() < 7  * DAY_MS).length
    const thisMonth = records.filter((r) => now - new Date(r.submittedAt).getTime() < 30 * DAY_MS).length

    const patientMap: Record<string, { name: string; count: number }> = {}
    for (const r of records) {
      const key = r.patientIdentifier
      if (!patientMap[key]) patientMap[key] = { name: r.patientName, count: 0 }
      patientMap[key].count++
    }
    const topPatients = Object.values(patientMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    const orgMap: Record<string, number> = {}
    for (const r of records) {
      if (r.organizationName) {
        orgMap[r.organizationName] = (orgMap[r.organizationName] ?? 0) + 1
      }
    }
    const topOrgs = Object.entries(orgMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      total:          records.length,
      bundles:        records.filter((r) => r.type === 'bundle').length,
      uniquePatients: new Set(records.map((r) => r.patientIdentifier)).size,
      uniqueOrgs:     new Set(records.map((r) => r.organizationName).filter(Boolean)).size,
      thisWeek,
      thisMonth,
      topPatients,
      topOrgs,
      maxPatientCount: topPatients[0]?.count ?? 1,
      maxOrgCount:     topOrgs[0]?.count ?? 1,
    }
  }, [records])

  if (!stats) return null

  return (
    <div className="rounded-[18px] border border-border/60 bg-muted/20 overflow-hidden">
      {/* Collapsed header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'hover:bg-muted/30 transition-colors',
          expanded && 'border-b border-border/40'
        )}
        aria-expanded={expanded}
        aria-label={t('dashboard.toggleLabel')}
      >
        <BarChart3 className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
          {t('dashboard.title')}
        </span>

        {/* Inline mini stats */}
        <div className="flex items-center gap-3 ml-1 flex-1 min-w-0">
          {([
            { value: stats.total,          label: t('dashboard.total') },
            { value: stats.bundles,        label: t('dashboard.bundles') },
            { value: stats.uniquePatients, label: t('dashboard.patients') },
            { value: stats.uniqueOrgs,     label: t('dashboard.orgs') },
          ] as const).map(({ value, label }) => (
            <span key={label} className="text-[11px] text-foreground/80 whitespace-nowrap">
              <span className="font-semibold">{value}</span>
              <span className="text-muted-foreground ml-0.5">{label}</span>
            </span>
          ))}
        </div>

        {expanded
          ? <ChevronUp  className="h-3 w-3 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-2.5 space-y-3">

          {/* Recent activity */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('dashboard.recentActivity')}
            </p>
            {([
              { label: t('dashboard.thisWeek'),  value: stats.thisWeek },
              { label: t('dashboard.thisMonth'), value: stats.thisMonth },
            ] as const).map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] text-muted-foreground">{label}</span>
                <Progress value={(value / stats.total) * 100} className="h-1.5 flex-1" />
                <span className="w-5 text-right text-[11px] font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Top patients */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('dashboard.topPatients')}
            </p>
            {stats.topPatients.map(({ name, count }) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[11px] text-foreground">{name}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-muted/40" style={{ height: '6px' }}>
                  <div
                    className="h-full rounded-full bg-primary/50 transition-all duration-300"
                    style={{ width: `${(count / stats.maxPatientCount) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-right text-[11px] font-medium">{count}</span>
              </div>
            ))}
          </div>

          {/* Top orgs — hidden when no org data */}
          {stats.topOrgs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('dashboard.topOrgs')}
              </p>
              {stats.topOrgs.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-[11px] text-foreground">{name}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted/40" style={{ height: '6px' }}>
                    <div
                      className="h-full rounded-full bg-amber-400/60 transition-all duration-300"
                      style={{ width: `${(count / stats.maxOrgCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-4 text-right text-[11px] font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
