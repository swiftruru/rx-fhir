import { Compass, Search, Settings2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Button } from './ui/button'
import { useQuickStartStore } from '../store/quickStartStore'
import { useQuickStartActions } from '../hooks/useQuickStartActions'
import type { QuickStartScenarioId } from '../lib/quickStart'

const SCENARIOS: Array<{
  id: QuickStartScenarioId
  icon: typeof Sparkles
}> = [
  { id: 'creator-primary-template', icon: Compass },
  { id: 'consumer-example-query', icon: Search },
  { id: 'settings-accessibility', icon: Settings2 }
]

export default function QuickStartScenarioDialog(): React.JSX.Element {
  const { t } = useTranslation('common')
  const open = useQuickStartStore((state) => state.open)
  const closeDialog = useQuickStartStore((state) => state.closeDialog)
  const { runScenario } = useQuickStartActions()

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('quickStart.title')}</DialogTitle>
          <DialogDescription>{t('quickStart.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-3">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon
            return (
              <article
                key={scenario.id}
                className="rounded-2xl border bg-card/80 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border bg-muted/30 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t(`quickStart.scenarios.${scenario.id}.title`)}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`quickStart.scenarios.${scenario.id}.description`)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('quickStart.highlights')}
                  </p>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    {[1, 2, 3].map((index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
                        <span>{t(`quickStart.scenarios.${scenario.id}.bullets.${index}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  type="button"
                  className="mt-5 w-full"
                  onClick={() => {
                    runScenario(scenario.id)
                    closeDialog()
                  }}
                >
                  {t(`quickStart.scenarios.${scenario.id}.action`)}
                </Button>
              </article>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
