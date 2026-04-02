import { useEffect, useRef } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Sun, Moon, Monitor, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import { TooltipProvider } from './components/ui/tooltip'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import ScreenReaderAnnouncer from './components/ScreenReaderAnnouncer'
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
import { useReducedMotion } from './hooks/useReducedMotion'
import { TEXT_SCALE_VALUES, UI_ZOOM_VALUES, useAppStore, type ThemeMode } from './store/appStore'
import { useAccessibilityStore } from './store/accessibilityStore'
import { useLiveDemoStore } from './store/liveDemoStore'
import { useFeatureShowcaseStore } from './store/featureShowcaseStore'
import { getRouteNavKey } from './lib/routeMeta'
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
  const textScale = useAppStore((s) => s.textScale)
  const uiZoom = useAppStore((s) => s.uiZoom)
  const focusPreference = useAppStore((s) => s.focusPreference)
  const location = useLocation()
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const { t } = useTranslation('showcase')
  const { t: tc } = useTranslation('common')
  const { t: tn } = useTranslation('nav')
  const liveDemoStatus = useLiveDemoStore((state) => state.status)
  const featureShowcaseStatus = useFeatureShowcaseStore((state) => state.status)
  const startFeatureShowcase = useFeatureShowcaseStore((state) => state.start)
  const featureShowcaseActive = featureShowcaseStatus === 'running' || featureShowcaseStatus === 'paused'
  const liveDemoActive = liveDemoStatus === 'running' || liveDemoStatus === 'paused'
  const reducedMotion = useReducedMotion()
  const mainRef = useRef<HTMLElement>(null)
  const previousPathRef = useRef<string>()

  useKeyboardShortcuts()

  const routeKey = getRouteNavKey(location.pathname)
  const routeLabel = routeKey ? tn(`items.${routeKey}.label`) : tc('accessibility.appName')

  function focusCurrentPage(): void {
    window.requestAnimationFrame(() => {
      const pageHeading = document.querySelector<HTMLElement>('[data-page-heading="true"]')
      const target = pageHeading ?? mainRef.current
      target?.focus()
    })
  }

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

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'
  }, [reducedMotion])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.textScale = textScale
    root.style.setProperty('--app-font-scale', String(TEXT_SCALE_VALUES[textScale]))
  }, [textScale])

  useEffect(() => {
    document.documentElement.dataset.focus = focusPreference
  }, [focusPreference])

  useEffect(() => {
    if (!window.rxfhir?.setAppZoomFactor) return
    void window.rxfhir.setAppZoomFactor(UI_ZOOM_VALUES[uiZoom])
  }, [uiZoom])

  useEffect(() => {
    document.title = routeKey
      ? tc('accessibility.documentTitle', { page: routeLabel })
      : tc('accessibility.appName')
  }, [routeKey, routeLabel, tc])

  useEffect(() => {
    const routeChanged = previousPathRef.current !== location.pathname

    if (!routeChanged) return

    focusCurrentPage()

    if (previousPathRef.current && routeKey) {
      announcePolite(tc('accessibility.routeChanged', { page: routeLabel }))
    }

    previousPathRef.current = location.pathname
  }, [announcePolite, location.pathname, routeKey, routeLabel, tc])

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <button
          type="button"
          onClick={focusCurrentPage}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          {tc('accessibility.skipToMain')}
        </button>

        <ScreenReaderAnnouncer />

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

          <main
            ref={mainRef}
            id="app-main"
            tabIndex={-1}
            aria-label={tc('accessibility.mainContent')}
            className="flex-1 overflow-auto outline-none"
          >
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
