import { useEffect, useMemo, useState } from 'react'
import { Bell, Command, Globe2, HelpCircle, Languages, MoonStar, Search, Settings2, Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { Input } from './ui/input'
import { cn } from '../lib/utils'
import { useAppStore, type ThemeMode } from '../store/appStore'
import { useShortcutStore } from '../store/shortcutStore'
import { useCommandPaletteStore } from '../store/commandPaletteStore'
import { useLiveDemoStore } from '../store/liveDemoStore'
import { useShortcutActionStore } from '../store/shortcutActionStore'
import { useActivityCenterStore } from '../store/activityCenterStore'
import { useOnboardingStore } from '../store/onboardingStore'
import { useQuickStartStore } from '../store/quickStartStore'
import { useGuardedNavigate } from '../hooks/useGuardedNavigate'
import { LIVE_DEMO_STEPS } from '../demo/liveDemoScript'
import { listRecentBundleJsonFiles } from '../services/bundleFileService'
import type { RecentBundleFileEntry } from '../types/electron'

interface PaletteAction {
  id: string
  group: string
  label: string
  description: string
  keywords: string[]
  icon: typeof Search
  run: () => void
}

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system']

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase()
}

function matchesAction(query: string, action: PaletteAction): boolean {
  if (!query) return true
  return [action.label, action.description, ...action.keywords].some((part) =>
    part.toLowerCase().includes(query)
  )
}

export default function CommandPaletteDialog(): React.JSX.Element {
  const { t } = useTranslation('common')
  const { t: tn } = useTranslation('nav')
  const location = useLocation()
  const navigate = useGuardedNavigate()
  const open = useCommandPaletteStore((state) => state.open)
  const closePalette = useCommandPaletteStore((state) => state.closePalette)
  const openActivityCenter = useActivityCenterStore((state) => state.openCenter)
  const openOnboarding = useOnboardingStore((state) => state.openOnboarding)
  const openQuickStart = useQuickStartStore((state) => state.openDialog)
  const setTheme = useAppStore((state) => state.setTheme)
  const theme = useAppStore((state) => state.theme)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const openHelp = useShortcutStore((state) => state.openHelp)
  const creatorActions = useShortcutActionStore((state) => state.creator)
  const consumerActions = useShortcutActionStore((state) => state.consumer)
  const settingsActions = useShortcutActionStore((state) => state.settings)
  const liveDemoStatus = useLiveDemoStore((state) => state.status)
  const startLiveDemo = useLiveDemoStore((state) => state.start)
  const stopLiveDemo = useLiveDemoStore((state) => state.stop)
  const [query, setQuery] = useState('')
  const [recentFiles, setRecentFiles] = useState<RecentBundleFileEntry[]>([])
  const normalizedQuery = normalizeQuery(query)
  const liveDemoActive = liveDemoStatus === 'running' || liveDemoStatus === 'paused'
  const onCreatorPage = location.pathname === '/creator'
  const onConsumerPage = location.pathname === '/consumer'
  const onSettingsPage = location.pathname === '/settings'

  useEffect(() => {
    if (!open) {
      setQuery('')
      setRecentFiles([])
      return
    }

    void listRecentBundleJsonFiles()
      .then((files) => setRecentFiles(files.slice(0, 5)))
      .catch(() => setRecentFiles([]))
  }, [open])

  const actions = useMemo<PaletteAction[]>(() => [
    {
      id: 'route.creator',
      group: t('commandPalette.groups.navigation'),
      label: tn('items.creator.label'),
      description: tn('items.creator.sublabel'),
      keywords: ['creator', 'build', 'prescription', '建立', '處方'],
      icon: Sparkles,
      run: () => navigate('/creator', { label: tn('items.creator.label') })
    },
    {
      id: 'route.consumer',
      group: t('commandPalette.groups.navigation'),
      label: tn('items.consumer.label'),
      description: tn('items.consumer.sublabel'),
      keywords: ['consumer', 'query', 'search', '查詢'],
      icon: Search,
      run: () => navigate('/consumer', { label: tn('items.consumer.label') })
    },
    {
      id: 'route.settings',
      group: t('commandPalette.groups.navigation'),
      label: tn('items.settings.label'),
      description: tn('items.settings.sublabel'),
      keywords: ['settings', 'preferences', '設定'],
      icon: Settings2,
      run: () => navigate('/settings', { label: tn('items.settings.label') })
    },
    {
      id: 'route.about',
      group: t('commandPalette.groups.navigation'),
      label: tn('items.about.label'),
      description: tn('items.about.sublabel'),
      keywords: ['about', 'info', '關於'],
      icon: Globe2,
      run: () => navigate('/about', { label: tn('items.about.label') })
    },
    {
      id: 'global.activityCenter',
      group: t('commandPalette.groups.actions'),
      label: t('commandPalette.actions.activityCenter.label'),
      description: t('commandPalette.actions.activityCenter.description'),
      keywords: ['activity', 'notifications', 'history', '通知', '活動'],
      icon: Bell,
      run: () => openActivityCenter()
    },
    {
      id: 'global.onboarding',
      group: t('commandPalette.groups.actions'),
      label: t('commandPalette.actions.onboarding.label'),
      description: t('commandPalette.actions.onboarding.description'),
      keywords: ['onboarding', 'guide', 'tour', '新手', '快速上手'],
      icon: Sparkles,
      run: () => openOnboarding('welcome')
    },
    {
      id: 'global.quickStart',
      group: t('commandPalette.groups.actions'),
      label: t('commandPalette.actions.quickStart.label'),
      description: t('commandPalette.actions.quickStart.description'),
      keywords: ['quick start', 'task', 'scenario', '任務', '情境'],
      icon: Sparkles,
      run: () => openQuickStart()
    },
    ...recentFiles.map((file) => ({
      id: `recent.${file.filePath}`,
      group: t('commandPalette.groups.recent'),
      label: file.fileName,
      description: t('commandPalette.actions.openRecentBundle.description', { fileName: file.fileName }),
      keywords: ['recent', 'bundle', 'local', '最近', '本機', file.fileName, file.filePath],
      icon: Globe2,
      run: () => navigate('/consumer', {
        label: tn('items.consumer.label'),
        state: { recentBundleFilePath: file.filePath }
      })
    })),
    {
      id: 'global.shortcutHelp',
      group: t('commandPalette.groups.actions'),
      label: t('commandPalette.actions.shortcutHelp.label'),
      description: t('commandPalette.actions.shortcutHelp.description'),
      keywords: ['shortcut', 'keyboard', 'help', '快速鍵'],
      icon: HelpCircle,
      run: () => openHelp()
    },
    {
      id: 'global.toggleTheme',
      group: t('commandPalette.groups.actions'),
      label: t('commandPalette.actions.toggleTheme.label'),
      description: t('commandPalette.actions.toggleTheme.description'),
      keywords: ['theme', 'dark', 'light', '主題'],
      icon: MoonStar,
      run: () => {
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
        setTheme(next)
      }
    },
    {
      id: 'global.toggleLocale',
      group: t('commandPalette.groups.actions'),
      label: t('commandPalette.actions.toggleLocale.label'),
      description: t('commandPalette.actions.toggleLocale.description'),
      keywords: ['language', 'locale', '語言', '語系'],
      icon: Languages,
      run: () => {
        const nextLocale = locale === 'zh-TW' ? 'en' : 'zh-TW'
        setLocale(nextLocale)
        void i18n.changeLanguage(nextLocale)
      }
    },
    ...(onCreatorPage ? [
      {
        id: 'creator.templates',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.openTemplates.label'),
        description: t('commandPalette.actions.openTemplates.description'),
        keywords: ['template', 'mock', 'creator', '範本'],
        icon: Sparkles,
        run: () => creatorActions.openTemplates?.()
      },
      {
        id: 'creator.liveDemo',
        group: t('commandPalette.groups.currentPage'),
        label: liveDemoActive
          ? t('commandPalette.actions.stopLiveDemo.label')
          : t('commandPalette.actions.startLiveDemo.label'),
        description: liveDemoActive
          ? t('commandPalette.actions.stopLiveDemo.description')
          : t('commandPalette.actions.startLiveDemo.description'),
        keywords: ['live demo', 'demo', '導覽', '示範'],
        icon: Sparkles,
        run: () => {
          if (liveDemoActive) {
            stopLiveDemo()
            return
          }
          startLiveDemo(LIVE_DEMO_STEPS.length, 'manual')
        }
      },
      {
        id: 'creator.toggleInspector',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.toggleInspector.label'),
        description: t('commandPalette.actions.toggleInspector.description'),
        keywords: ['panel', 'inspector', 'json', 'request', '右側面板'],
        icon: Sparkles,
        run: () => creatorActions.toggleRightPanel?.()
      },
      {
        id: 'creator.toggleInspectorMode',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.toggleInspectorMode.label'),
        description: t('commandPalette.actions.toggleInspectorMode.description'),
        keywords: ['panel mode', 'request', 'json', '切換面板'],
        icon: Sparkles,
        run: () => creatorActions.toggleRightPanelMode?.()
      }
    ] : []),
    ...(onConsumerPage ? [
      {
        id: 'consumer.focusSearch',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.focusSearch.label'),
        description: t('commandPalette.actions.focusSearch.description'),
        keywords: ['search', 'consumer', 'focus', '查詢'],
        icon: Search,
        run: () => consumerActions.focusSearch?.()
      },
      {
        id: 'consumer.importBundle',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.importBundle.label'),
        description: t('commandPalette.actions.importBundle.description'),
        keywords: ['import', 'bundle', 'consumer', '匯入'],
        icon: Globe2,
        run: () => void consumerActions.importBundle?.()
      }
    ] : []),
    ...(onSettingsPage ? [
      {
        id: 'settings.testConnection',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.testConnection.label'),
        description: t('commandPalette.actions.testConnection.description'),
        keywords: ['settings', 'server', 'test', 'connection', '連線測試'],
        icon: Globe2,
        run: () => void settingsActions.testConnection?.()
      },
      {
        id: 'settings.save',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.saveSettings.label'),
        description: t('commandPalette.actions.saveSettings.description'),
        keywords: ['settings', 'save', 'preferences', '儲存設定'],
        icon: Settings2,
        run: () => void settingsActions.save?.()
      },
      {
        id: 'settings.shortcuts',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.openShortcutSettings.label'),
        description: t('commandPalette.actions.openShortcutSettings.description'),
        keywords: ['settings', 'shortcuts', 'keyboard', '快捷鍵設定'],
        icon: HelpCircle,
        run: () => settingsActions.setTab?.('shortcuts')
      },
      {
        id: 'settings.accessibility',
        group: t('commandPalette.groups.currentPage'),
        label: t('commandPalette.actions.openAccessibilitySettings.label'),
        description: t('commandPalette.actions.openAccessibilitySettings.description'),
        keywords: ['settings', 'accessibility', 'motion', 'zoom', '無障礙'],
        icon: Sparkles,
        run: () => settingsActions.setTab?.('accessibility')
      }
    ] : [])
  ], [
    consumerActions.focusSearch,
    consumerActions.importBundle,
    creatorActions.openTemplates,
    creatorActions.toggleRightPanel,
    creatorActions.toggleRightPanelMode,
    liveDemoActive,
    locale,
    navigate,
    onConsumerPage,
    onCreatorPage,
    onSettingsPage,
    openActivityCenter,
    openOnboarding,
    openQuickStart,
    openHelp,
    recentFiles,
    setLocale,
    settingsActions.save,
    settingsActions.setTab,
    settingsActions.testConnection,
    setTheme,
    startLiveDemo,
    stopLiveDemo,
    t,
    theme,
    tn
  ])

  const filtered = useMemo(
    () => actions.filter((action) => matchesAction(normalizedQuery, action)),
    [actions, normalizedQuery]
  )

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, PaletteAction[]>>((acc, action) => {
      acc[action.group] = [...(acc[action.group] ?? []), action]
      return acc
    }, {})
  }, [filtered])

  function runAction(action: PaletteAction): void {
    action.run()
    closePalette()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closePalette()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('commandPalette.title')}</DialogTitle>
          <DialogDescription>{t('commandPalette.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Command className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('commandPalette.placeholder')}
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filtered[0]) {
                  event.preventDefault()
                  runAction(filtered[0])
                }
              }}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              {t('commandPalette.empty')}
            </div>
          ) : (
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {Object.entries(grouped).map(([group, items]) => (
                <section key={group} className="space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group}
                  </h3>
                  <div className="space-y-2">
                    {items.map((action, index) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => runAction(action)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors',
                            'hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            index === 0 && 'border-primary/30'
                          )}
                        >
                          <div className="rounded-lg border bg-muted/30 p-2 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{action.label}</div>
                            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {action.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
