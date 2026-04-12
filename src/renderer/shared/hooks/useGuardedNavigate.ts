import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom'
import { useConsumerSearchStore } from '../../features/consumer/store/consumerSearchStore'
import { useToastStore } from '../stores/toastStore'
import i18n from '../../i18n'

interface GuardedNavigateOptions extends NavigateOptions {
  force?: boolean
  label?: string
}

export function useGuardedNavigate(): (to: string, options?: GuardedNavigateOptions) => void {
  const location = useLocation()
  const navigate = useNavigate()
  const isSearching = useConsumerSearchStore((state) => state.isSearching)
  const pushToast = useToastStore((state) => state.pushToast)

  return (to: string, options?: GuardedNavigateOptions) => {
    if (!to || (to === location.pathname && options?.state === undefined)) return

    const { force: _force, label: _label, ...navigateOptions } = options ?? {}
    const leavingConsumerDuringSearch = location.pathname === '/consumer' && isSearching

    if (leavingConsumerDuringSearch && !options?.force) {
      pushToast({
        variant: 'info',
        title: i18n.t('consumer:page.searchingGuard.title'),
        description: i18n.t('consumer:page.searchingGuard.toastDescription'),
        durationMs: 8_000,
        actions: [
          {
            label: i18n.t('consumer:page.searchingGuard.leaveAction'),
            onAction: () => navigate(to, navigateOptions)
          }
        ]
      })
      return
    }

    navigate(to, navigateOptions)
  }
}
