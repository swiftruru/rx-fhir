import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sun, Moon, Monitor } from 'lucide-react'
import { TooltipProvider } from './components/ui/tooltip'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import CreatorPage from './features/creator/CreatorPage'
import ConsumerPage from './features/consumer/ConsumerPage'
import SettingsPage from './features/settings/SettingsPage'
import { useAppStore, type ThemeMode } from './store/appStore'

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system']

function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useAppStore()

  function cycleTheme(): void {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? '暗色' : theme === 'light' ? '亮色' : '系統'

  return (
    <button
      onClick={cycleTheme}
      title={`目前：${label}，點擊切換`}
      className="flex items-center gap-1.5 px-2.5 h-full text-foreground/50 hover:text-foreground transition-colors -webkit-app-region-no-drag"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[11px]">{label}</span>
    </button>
  )
}

export default function App(): React.JSX.Element {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
      return
    }
    if (theme === 'light') {
      root.classList.remove('dark')
      return
    }

    // system
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e: MediaQueryList | MediaQueryListEvent): void => {
      root.classList.toggle('dark', e.matches)
    }
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return (
    <Router>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
          {/* Sidebar (includes macOS traffic-light drag zone at top) */}
          <Sidebar />

          {/* Main content column */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* macOS titlebar spacer — draggable, with theme toggle pinned right */}
            <div className="titlebar-spacer flex items-center justify-end pr-2">
              <ThemeToggle />
            </div>

            <main className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/creator" replace />} />
                <Route path="/creator" element={<CreatorPage />} />
                <Route path="/consumer" element={<ConsumerPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>

            {/* Status bar at bottom */}
            <StatusBar />
          </div>
        </div>
      </TooltipProvider>
    </Router>
  )
}
