import { useEffect, useRef, useCallback } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Bell, Sun, Moon, Monitor, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from './i18n'
import { TooltipProvider } from './components/ui/tooltip'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import ScreenReaderAnnouncer from './components/ScreenReaderAnnouncer'
import CommandPaletteDialog from './components/CommandPaletteDialog'
import ActivityCenterDialog from './components/ActivityCenterDialog'
import CreatorLeaveGuardDialog from './components/CreatorLeaveGuardDialog'
import FirstRunOnboardingDialog from './components/FirstRunOnboardingDialog'
import QuickStartScenarioDialog from './components/QuickStartScenarioDialog'
import ToastViewport from './components/ToastViewport'
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
import { useActivityCenterStore } from './store/activityCenterStore'
import { useLiveDemoStore } from './store/liveDemoStore'
import { useFeatureShowcaseStore } from './store/featureShowcaseStore'
import { useToastStore } from './store/toastStore'
import type { UpdateCheckResult } from './types/electron'
import { getRouteNavKey } from './lib/routeMeta'
import { cn } from './lib/utils'
import { hasCreatorPersistableWork, useCreatorStore } from './store/creatorStore'
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
      className="flex h-6 min-w-[56px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-foreground/55 transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
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
      className="flex h-6 min-w-9 items-center justify-center rounded-full px-2.5 text-[11px] font-medium text-foreground/55 transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
  const creatorHasIncompleteWorkflow = useCreatorStore((state) => !state.bundleId && hasCreatorPersistableWork(state.resources, state.drafts))
  const location = useLocation()
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const { t } = useTranslation('showcase')
  const { t: tc } = useTranslation('common')
  const { t: tn } = useTranslation('nav')
  const liveDemoStatus = useLiveDemoStore((state) => state.status)
  const featureShowcaseStatus = useFeatureShowcaseStore((state) => state.status)
  const startFeatureShowcase = useFeatureShowcaseStore((state) => state.start)
  const toggleActivityCenter = useActivityCenterStore((state) => state.toggleCenter)
  const unreadActivityCount = useToastStore((state) => state.history.filter((item) => !item.read).length)
  const pushToast = useToastStore((state) => state.pushToast)
  const featureShowcaseActive = featureShowcaseStatus === 'running' || featureShowcaseStatus === 'paused'
  const liveDemoActive = liveDemoStatus === 'running' || liveDemoStatus === 'paused'
  const reducedMotion = useReducedMotion()
  const mainRef = useRef<HTMLElement>(null)
  const previousPathRef = useRef<string>()

  const { t: ts } = useTranslation('settings')

  const showUpdateToast = useCallback((result: UpdateCheckResult) => {
    if (result.status !== 'update-available') return
    pushToast({
      variant: 'info',
      title: ts('about.update.section'),
      description: ts('about.update.available', { version: result.latestVersion ?? '' }),
      durationMs: 12_000,
      actions: [
        {
          label: ts('about.update.openReleases'),
          onAction: () => {
            void window.rxfhir?.openExternalUrl(
              result.releaseUrl ?? 'https://github.com/swiftruru/rx-fhir/releases'
            )
          }
        },
        {
          label: ts('about.update.remindLater'),
          onAction: () => {
            // No-op: closes the toast without persisting anything.
            // Next startup the 5-second check will re-run and notify again.
          }
        },
        {
          label: ts('about.update.skipVersion'),
          onAction: () => {
            if (result.latestVersion) {
              void window.rxfhir?.skipUpdateVersion(result.latestVersion)
            }
          }
        }
      ]
    })
  }, [pushToast, ts])

  // App-level update check listener — fires regardless of which page is open.
  // 1. Query any cached result from the 5-second startup check (handles the
  //    case where the check completed before the renderer was ready).
  // 2. Subscribe to future pushes (handles the case where the check completes
  //    after the renderer mounts).
  useEffect(() => {
    void window.rxfhir?.getCachedUpdateResult?.().then((result) => {
      if (result) showUpdateToast(result)
    })
    const unsubscribe = window.rxfhir?.onUpdateResult?.(showUpdateToast)
    return unsubscribe
  }, [showUpdateToast])

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

  useEffect(() => {
    if (location.pathname !== '/creator' || !creatorHasIncompleteWorkflow) return

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [creatorHasIncompleteWorkflow, location.pathname])

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
        <ToastViewport />

        {/* Sidebar (includes macOS traffic-light drag zone at top) */}
        <Sidebar />

        {/* Main content column */}
        <div className="relative flex flex-col flex-1 overflow-hidden">
          {/* macOS titlebar spacer — draggable, with controls pinned right */}
          <div className="titlebar-spacer flex items-center justify-end pr-1">
            <FeatureShowcaseTarget id="app.utilityControls">
              <div className="flex items-center pr-1">
                <div className="flex h-7 items-center gap-0.5 rounded-full border border-border/60 bg-background/90 px-1 shadow-sm backdrop-blur">
                <button
                  type="button"
                  onClick={() => toggleActivityCenter()}
                  title={tc('activityCenter.open')}
                  disabled={featureShowcaseActive}
                  className={cn(
                    'relative flex h-6 min-w-[62px] items-center justify-center rounded-full text-[11px] font-medium text-foreground/55 transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40',
                    unreadActivityCount > 0 ? 'pl-2.5 pr-[30px]' : 'px-2.5'
                  )}
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  aria-label={
                    unreadActivityCount > 0
                      ? tc('activityCenter.openWithCount', { count: unreadActivityCount })
                      : tc('activityCenter.open')
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5" />
                    <span>{tc('activityCenter.button')}</span>
                  </span>
                  {unreadActivityCount > 0 && (
                    <span className="pointer-events-none absolute right-1.5 top-1/2 flex h-[15px] min-w-[15px] -translate-y-1/2 items-center justify-center rounded-full border border-background/80 bg-primary px-1 text-[9px] font-semibold leading-none tabular-nums text-primary-foreground shadow-sm">
                      {unreadActivityCount > 9 ? '9+' : unreadActivityCount}
                    </span>
                  )}
                </button>
                <div className="h-3.5 w-px bg-foreground/10" />
                <button
                  type="button"
                  onClick={() => startFeatureShowcase(FEATURE_SHOWCASE_STEPS.length)}
                  title={t('startButton')}
                  disabled={liveDemoActive || featureShowcaseActive}
                  className="flex h-6 min-w-[78px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-foreground/55 transition-colors hover:bg-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{featureShowcaseActive ? t('runningButton') : t('startButton')}</span>
                </button>
                <div className="h-3.5 w-px bg-foreground/10" />
                <ThemeToggle disabled={featureShowcaseActive} />
                <div className="h-3.5 w-px bg-foreground/10" />
                <LanguageToggle disabled={featureShowcaseActive} />
                </div>
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
          <CommandPaletteDialog />
          <ActivityCenterDialog />
          <CreatorLeaveGuardDialog />
          <QuickStartScenarioDialog />
          <FirstRunOnboardingDialog />

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
