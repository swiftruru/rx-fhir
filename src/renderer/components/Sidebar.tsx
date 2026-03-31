import { NavLink } from 'react-router-dom'
import { FilePlus2, Search, Settings, Activity, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { useAppStore } from '../store/appStore'

type NavKey = 'creator' | 'consumer' | 'settings' | 'about'

const navItems: { to: string; key: NavKey; icon: React.ElementType }[] = [
  { to: '/creator',  key: 'creator',  icon: FilePlus2 },
  { to: '/consumer', key: 'consumer', icon: Search },
  { to: '/settings', key: 'settings', icon: Settings },
  { to: '/about',    key: 'about',    icon: Info }
]

export default function Sidebar(): React.JSX.Element {
  const { serverUrl } = useAppStore()
  const { t } = useTranslation('nav')

  const shortUrl = serverUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

  return (
    <aside className="w-56 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      {/* macOS traffic-light drag zone — same bg as sidebar so it blends in */}
      <div className="titlebar-drag-region" />

      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-rose-300">℞</span>
          <div>
            <h1 className="text-lg font-bold leading-none text-sidebar-foreground">RxFHIR</h1>
            <p className="text-[10px] text-sidebar-foreground/50 leading-tight mt-0.5">
              {t('appDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium leading-none">{t(`items.${key}.label`)}</div>
              <div className="text-[11px] opacity-60 mt-0.5">{t(`items.${key}.sublabel`)}</div>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Server info */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-1.5 text-[11px] text-sidebar-foreground/50">
          <Activity className="h-3 w-3" />
          <span className="truncate" title={serverUrl}>
            {shortUrl}
          </span>
        </div>
      </div>
    </aside>
  )
}
