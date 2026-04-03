import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom'
import { hasCreatorPersistableWork, useCreatorStore } from '../store/creatorStore'
import { useNavigationGuardStore } from '../store/navigationGuardStore'

interface GuardedNavigateOptions extends NavigateOptions {
  force?: boolean
  label?: string
}

export function useGuardedNavigate(): (to: string, options?: GuardedNavigateOptions) => void {
  const location = useLocation()
  const navigate = useNavigate()
  const requestNavigation = useNavigationGuardStore((state) => state.requestNavigation)
  const resources = useCreatorStore((state) => state.resources)
  const drafts = useCreatorStore((state) => state.drafts)
  const bundleId = useCreatorStore((state) => state.bundleId)
  const draftStatus = useCreatorStore((state) => state.draftStatus)

  return (to: string, options?: GuardedNavigateOptions) => {
    if (!to || to === location.pathname) return
    const { force, label, ...navigateOptions } = options ?? {}

    const leavingCreator = location.pathname === '/creator' && to !== '/creator'
    const hasIncompleteCreatorWorkflow = !bundleId && hasCreatorPersistableWork(resources, drafts)

    if (force || !leavingCreator || !hasIncompleteCreatorWorkflow) {
      navigate(to, navigateOptions)
      return
    }

    requestNavigation({
      to,
      replace: navigateOptions.replace,
      state: navigateOptions.state,
      label,
      draftStatus
    })
  }
}
