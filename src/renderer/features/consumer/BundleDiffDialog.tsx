import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { ScrollArea } from '../../components/ui/scroll-area'
import type { BundleSummary } from '../../types/fhir.d'
import { diffBundles, type DiffField } from '../../lib/bundleDiff'
import { cn } from '../../lib/utils'

interface Props {
  bundleA: BundleSummary
  bundleB: BundleSummary
  open: boolean
  onClose: () => void
}

function DiffRow({ f, t }: { f: DiffField; t: (key: string) => string }): React.JSX.Element {
  const EMPTY = t('results.diffDialog.missingValue')
  return (
    <div className={cn(
      'grid grid-cols-[7rem,1fr,1fr] gap-x-3 rounded-lg px-3 py-2 text-xs',
      f.isDifferent
        ? 'bg-amber-50/70 dark:bg-amber-500/10'
        : 'bg-transparent'
    )}>
      <span className="text-muted-foreground truncate">{t(f.labelKey)}</span>
      <span className={cn(
        'break-words font-medium',
        f.isDifferent ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {f.valueA ?? <span className="italic text-muted-foreground/60">{EMPTY}</span>}
      </span>
      <span className={cn(
        'break-words font-medium',
        f.isDifferent ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {f.valueB ?? <span className="italic text-muted-foreground/60">{EMPTY}</span>}
      </span>
    </div>
  )
}

export default function BundleDiffDialog({ bundleA, bundleB, open, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const [swapped, setSwapped] = useState(false)

  const displayA = swapped ? bundleB : bundleA
  const displayB = swapped ? bundleA : bundleB
  const diff = diffBundles(displayA, displayB)

  const nameA = displayA.patientName ?? displayA.id
  const nameB = displayB.patientName ?? displayB.id

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">

        {/* ── Header ─────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          {/* pr-10 reserves space for the Dialog's built-in close button (absolute right-4 top-4) */}
          <div className="flex items-center justify-between gap-3 pr-10">
            <div className="flex items-center gap-2.5">
              <DialogTitle className="text-base font-semibold">
                {t('results.diffDialog.title')}
              </DialogTitle>
              <Badge
                variant={diff.totalDifferences > 0 ? 'default' : 'secondary'}
                className="rounded-full text-[11px] px-2"
              >
                {diff.totalDifferences > 0
                  ? t('results.diffDialog.differences', { count: diff.totalDifferences })
                  : t('results.diffDialog.noDifferences')}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-3 text-xs"
              onClick={() => setSwapped((v) => !v)}
              aria-label={t('results.diffDialog.swap')}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {t('results.diffDialog.swap')}
            </Button>
          </div>

          {/* Bundle A / B identity bar */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([
              { label: 'A', bundle: displayA, name: nameA },
              { label: 'B', bundle: displayB, name: nameB },
            ] as const).map(({ label, bundle, name }) => (
              <div
                key={label}
                className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                  {bundle.patientIdentifier && (
                    <Badge variant="outline" className="rounded-full text-[10px] font-mono shrink-0">
                      {bundle.patientIdentifier}
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {bundle.date && <span>{bundle.date.slice(0, 10)}</span>}
                  <code className="font-mono opacity-60 truncate">{bundle.id}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Column header labels */}
          <div className="mt-3 grid grid-cols-[7rem,1fr,1fr] gap-x-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>{t('results.diffDialog.fieldColumn')}</span>
            <span>{t('results.diffDialog.bundleA')}</span>
            <span>{t('results.diffDialog.bundleB')}</span>
          </div>
        </DialogHeader>

        {/* ── Scrollable content ──────────────────────────── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-5 px-5 py-4">
            {diff.totalDifferences === 0 && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                {t('results.diffDialog.noDifferences')}
              </div>
            )}

            {diff.sections.map((sec) => (
              <div key={sec.titleKey} className="space-y-1">
                {/* Section header */}
                <div className="flex items-center gap-2 pb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(sec.titleKey)}
                  </span>
                  {sec.hasDifference && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  )}
                </div>
                {/* Fields */}
                <div className="rounded-[16px] border border-border/60 bg-background/80 overflow-hidden divide-y divide-border/40">
                  {sec.fields.map((f) => (
                    <DiffRow key={f.labelKey} f={f} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

      </DialogContent>
    </Dialog>
  )
}
