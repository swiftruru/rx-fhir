import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sun, Moon, Monitor, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import { TooltipProvider } from './components/ui/tooltip'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import CreatorPage from './features/creator/CreatorPage'
import ConsumerPage from './features/consumer/ConsumerPage'
import SettingsPage from './features/settings/SettingsPage'
import AboutPage from './features/about/AboutPage'
import LiveDemoCoach from './components/LiveDemoCoach'
import LiveDemoRunner from './components/LiveDemoRunner'
import FeatureShowcaseCoach from './components/FeatureShowcaseCoach'
import FeatureShowcaseRunner from './components/FeatureShowcaseRunner'
import FeatureShowcaseOverlay from './components/FeatureShowcaseOverlay'
import FeatureShowcaseTarget from './components/FeatureShowcaseTarget'
import ShortcutHelpDialog from './components/ShortcutHelpDialog'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useAppStore, type ThemeMode } from './store/appStore'
import { useLiveDemoStore } from './store/liveDemoStore'
import { useFeatureShowcaseStore } from './store/featureShowcaseStore'
import { FEATURE_SHOWCASE_STEPS } from './showcase/featureShowcaseScript'

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system']

function ThemeToggle({ disabled = false }: { disabled?: boolean }): React.JSX.Element {
  const { theme, setTheme } = useAppStore()
  const { t } = useTranslation('common')

  function cycleTheme(): void {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
    setTheme(next)
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label = theme === 'dark' ? t('theme.dark') : theme === 'light' ? t('theme.light') : t('theme.system')

  return (
    <button
      onClick={cycleTheme}
      title={label}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2 h-full text-foreground/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-[11px]">{label}</span>
    </button>
  )
}

function LanguageToggle({ disabled = false }: { disabled?: boolean }): React.JSX.Element {
  const { locale, setLocale } = useAppStore()
  const { t } = useTranslation('common')

  function toggle(): void {
    const next = locale === 'zh-TW' ? 'en' : 'zh-TW'
    setLocale(next)
    i18n.changeLanguage(next)
  }

  return (
    <button
      onClick={toggle}
      title={t('lang.current')}
      disabled={disabled}
      className="flex items-center px-2 h-full text-foreground/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 transition-colors text-[11px] font-medium"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {t('lang.toggle')}
    </button>
  )
}

function AppShellContent(): React.JSX.Element {
  const theme = useAppStore((s) => s.theme)
  const locale = useAppStore((s) => s.locale)
  const { t } = useTranslation('showcase')
  const liveDemoStatus = useLiveDemoStore((state) => state.status)
  const featureShowcaseStatus = useFeatureShowcaseStore((state) => state.status)
  const startFeatureShowcase = useFeatureShowcaseStore((state) => state.start)
  const featureShowcaseActive = featureShowcaseStatus === 'running' || featureShowcaseStatus === 'paused'
  const liveDemoActive = liveDemoStatus === 'running' || liveDemoStatus === 'paused'

  useKeyboardShortcuts()

  // Sync locale from persisted store on mount
  useEffect(() => {
    i18n.changeLanguage(locale)
  }, [locale])

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
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar (includes macOS traffic-light drag zone at top) */}
        <Sidebar />

        {/* Main content column */}
        <div className="relative flex flex-col flex-1 overflow-hidden">
          {/* macOS titlebar spacer — draggable, with controls pinned right */}
          <div className="titlebar-spacer flex items-center justify-end pr-1">
            <FeatureShowcaseTarget id="app.utilityControls">
              <div className="flex h-full items-center">
                <button
                  type="button"
                  onClick={() => startFeatureShowcase(FEATURE_SHOWCASE_STEPS.length)}
                  title={t('startButton')}
                  disabled={liveDemoActive || featureShowcaseActive}
                  className="flex items-center gap-1.5 px-2 h-full text-foreground/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 transition-colors text-[11px] font-medium"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{featureShowcaseActive ? t('runningButton') : t('startButton')}</span>
                </button>
                <div className="w-px h-3 bg-foreground/20 mx-1" />
                <ThemeToggle disabled={featureShowcaseActive} />
                <div className="w-px h-3 bg-foreground/20 mx-1" />
                <LanguageToggle disabled={featureShowcaseActive} />
              </div>
            </FeatureShowcaseTarget>
          </div>

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/creator" replace />} />
              <Route path="/creator" element={<CreatorPage />} />
              <Route path="/consumer" element={<ConsumerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>

          <LiveDemoRunner />
          <LiveDemoCoach />
          <FeatureShowcaseRunner />
          <FeatureShowcaseOverlay />
          <FeatureShowcaseCoach />
          <ShortcutHelpDialog />

          {/* Status bar at bottom */}
          <StatusBar />
        </div>
      </div>
    </TooltipProvider>
  )
}

export default function App(): React.JSX.Element {
  return (
    <Router>
      <AppShellContent />
    </Router>
  )
}
