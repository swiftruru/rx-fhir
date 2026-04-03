import { useLocation } from 'react-router-dom'
import { FilePlus2, Search, Settings, Activity, Info, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'
import { useGuardedNavigate } from '../hooks/useGuardedNavigate'
import FeatureShowcaseTarget from './FeatureShowcaseTarget'

type NavKey = 'creator' | 'consumer' | 'settings' | 'about'

const navItems: { to: string; key: NavKey; icon: React.ElementType }[] = [
  { to: '/creator',  key: 'creator',  icon: FilePlus2 },
  { to: '/consumer', key: 'consumer', icon: Search },
  { to: '/settings', key: 'settings', icon: Settings },
  { to: '/about',    key: 'about',    icon: Info }
]

export default function Sidebar(): React.JSX.Element {
  const { serverUrl, sidebarMode, setSidebarMode } = useAppStore()
  const { t } = useTranslation('nav')
  const { t: tc } = useTranslation('common')
  const location = useLocation()
  const navigate = useGuardedNavigate()

  const shortUrl = serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const compact = sidebarMode === 'compact'
  const ToggleIcon = compact ? PanelLeftOpen : PanelLeftClose

  function toggleSidebarMode(): void {
    setSidebarMode(compact ? 'expanded' : 'compact')
  }

  return (
    <FeatureShowcaseTarget
      id="app.sidebar"
      className={cn(
        'shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        compact ? 'w-20' : 'w-56'
      )}
    >
      <aside
        aria-label={tc('accessibility.sidebar')}
        className="flex h-full flex-col bg-sidebar text-sidebar-foreground"
      >
        {/* macOS traffic-light drag zone — same bg as sidebar so it blends in */}
        <div className="titlebar-drag-region" />

      {/* Logo */}
      <div className={cn('border-b border-sidebar-border', compact ? 'px-3 py-4' : 'px-4 py-4')}>
        <div className={cn('flex items-start', compact ? 'justify-center' : 'justify-between gap-2')}>
          <div className={cn('flex items-center gap-2', compact && 'flex-col gap-1 text-center')}>
          <span className="text-2xl font-bold text-rose-300">℞</span>
            {!compact && (
              <div>
                <h1 className="text-lg font-bold leading-none text-sidebar-foreground">RxFHIR</h1>
                <p className="text-[10px] text-sidebar-foreground/50 leading-tight mt-0.5">
                  {t('appDescription')}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebarMode}
            className={cn(
              'rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              compact && 'mt-2'
            )}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            aria-label={compact ? t('sidebarControls.expand') : t('sidebarControls.collapse')}
            title={compact ? t('sidebarControls.expand') : t('sidebarControls.collapse')}
          >
            <ToggleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label={tc('accessibility.primaryNavigation')} className={cn('flex-1 py-3 space-y-1', compact ? 'px-2' : 'px-2')}>
        {navItems.map(({ to, key, icon: Icon }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to, { label: t(`items.${key}.label`) })}
            aria-current={location.pathname === to ? 'page' : undefined}
            aria-label={compact ? t(`items.${key}.label`) : undefined}
            className={
              cn(
                'flex w-full rounded-md text-left transition-colors group',
                compact ? 'justify-center px-0 py-3' : 'items-center gap-3 px-3 py-2.5',
                location.pathname === to
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={compact ? `${t(`items.${key}.label`)} · ${t(`items.${key}.sublabel`)}` : undefined}
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            {!compact && (
              <div className="min-w-0">
                <div className="text-sm font-medium leading-none">{t(`items.${key}.label`)}</div>
                <div className="text-[11px] opacity-60 mt-0.5">{t(`items.${key}.sublabel`)}</div>
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Server info */}
      <div className={cn('border-t border-sidebar-border', compact ? 'px-2 py-3' : 'px-4 py-3')}>
        <div
          className={cn(
            'text-[11px] text-sidebar-foreground/50',
            compact ? 'flex items-center justify-center' : 'flex items-center gap-1.5'
          )}
          title={serverUrl}
        >
          <Activity aria-hidden="true" className="h-3 w-3" />
          {!compact && (
            <span className="truncate" title={serverUrl}>
              {shortUrl}
            </span>
          )}
        </div>
      </div>
      </aside>
    </FeatureShowcaseTarget>
  )
}
