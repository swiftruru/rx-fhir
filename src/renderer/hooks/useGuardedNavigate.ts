import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom'

interface GuardedNavigateOptions extends NavigateOptions {
  force?: boolean
  label?: string
}

export function useGuardedNavigate(): (to: string, options?: GuardedNavigateOptions) => void {
  const location = useLocation()
  const navigate = useNavigate()

  return (to: string, options?: GuardedNavigateOptions) => {
    if (!to || to === location.pathname) return
    const { force: _force, label: _label, ...navigateOptions } = options ?? {}
    navigate(to, navigateOptions)
  }
}
