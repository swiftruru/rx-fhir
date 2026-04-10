import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGuardedNavigate } from '../../shared/hooks/useGuardedNavigate'
import { useQuickStartStore } from '../stores/quickStartStore'
import type { QuickStartScenarioId } from '../lib/quickStart'

export function useQuickStartActions(): {
  openQuickStartDialog: () => void
  runScenario: (scenarioId: QuickStartScenarioId) => void
} {
  const location = useLocation()
  const rawNavigate = useNavigate()
  const navigate = useGuardedNavigate()
  const openQuickStartDialog = useQuickStartStore((state) => state.openDialog)
  const { t: tn } = useTranslation('nav')

  function routeTo(targetPath: string, state: Record<string, unknown>, label: string): void {
    if (location.pathname === targetPath) {
      rawNavigate(targetPath, { state })
      return
    }

    navigate(targetPath, { label, state })
  }

  function runScenario(scenarioId: QuickStartScenarioId): void {
    switch (scenarioId) {
      case 'creator-overview':
        routeTo('/creator', { quickStartScenario: 'overview' }, tn('items.creator.label'))
        return
      case 'consumer-example-query':
        routeTo('/consumer', { quickStartScenario: 'example-query' }, tn('items.consumer.label'))
        return
      case 'settings-accessibility':
        routeTo('/settings', { quickStartScenario: 'accessibility' }, tn('items.settings.label'))
        return
    }
  }

  return {
    openQuickStartDialog,
    runScenario
  }
}
