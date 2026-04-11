import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Wifi, WifiOff, Loader2, CheckCircle2, RotateCcw, Save, Search, Download, Upload, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion'
import { Badge } from '../../shared/components/ui/badge'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import { Label } from '../../shared/components/ui/label'
import { Alert, AlertDescription } from '../../shared/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/tabs'
import FeatureShowcaseTarget from '../../app/components/FeatureShowcaseTarget'
import ShortcutSettingsPanel from './ShortcutSettingsPanel'
import {
  DEFAULT_FOCUS_PREFERENCE,
  DEFAULT_MOTION_PREFERENCE,
  DEFAULT_TEXT_SCALE,
  DEFAULT_UI_ZOOM,
  useAppStore,
  type MotionPreference,
  type TextScalePreference,
  type UiZoomPreference,
  type FocusPreference
} from '../../app/stores/appStore'
import { useAccessibilityStore } from '../../shared/stores/accessibilityStore'
import { useShortcutActionStore, type SettingsShortcutTab } from '../../shared/stores/shortcutActionStore'
import { useShortcutStore } from '../../app/stores/shortcutStore'
import { useToastStore } from '../../shared/stores/toastStore'
import { useOnboardingStore } from '../../app/stores/onboardingStore'
import { useQuickStartStore } from '../../app/stores/quickStartStore'
import { DEFAULT_SERVER_URL, checkServerHealth } from '../../services/fhirClient'
import {
  applyImportedPreferences,
  exportPreferencesJson,
  getPreferencesFileErrorMessage,
  importPreferencesJson
} from '../../services/preferencesService'

const PRESET_SERVERS = [
  { label: 'HAPI FHIR (International)', url: 'https://hapi.fhir.org/baseR4' },
  { label: 'HAPI FHIR TW', url: 'https://hapi.fhir.tw/fhir' }
]

interface FormData {
  serverUrl: string
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase()
}

const MOTION_OPTIONS: MotionPreference[] = ['system', 'full', 'reduced']
const TEXT_SCALE_OPTIONS: TextScalePreference[] = ['scale100', 'scale112', 'scale125', 'scale137']
const UI_ZOOM_OPTIONS: UiZoomPreference[] = ['zoom100', 'zoom110', 'zoom125']
const FOCUS_OPTIONS: FocusPreference[] = ['standard', 'enhanced']

interface SettingsLaunchState {
  quickStartScenario?: 'accessibility'
}

export default function SettingsPage(): React.JSX.Element {
  const {
    serverUrl,
    setServerUrl,
    serverStatus,
    serverName,
    serverVersion,
    setServerStatus,
    motionPreference,
    setMotionPreference,
    textScale,
    setTextScale,
    uiZoom,
    setUiZoom,
    focusPreference,
    setFocusPreference
  } =
    useAppStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const reducedMotion = useReducedMotion()
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const announceAssertive = useAccessibilityStore((state) => state.announceAssertive)
  const pushToast = useToastStore((state) => state.pushToast)
  const openOnboarding = useOnboardingStore((state) => state.openOnboarding)
  const openQuickStartDialog = useQuickStartStore((state) => state.openDialog)
  const setSettingsActions = useShortcutActionStore((state) => state.setSettingsActions)
  const clearSettingsActions = useShortcutActionStore((state) => state.clearSettingsActions)
  const shortcutOverrideCount = useShortcutStore((state) => Object.keys(state.overrides).length)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testResult, setTestResult] = useState<{ name?: string; version?: string }>({})
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsShortcutTab>('server')
  const [settingsQuery, setSettingsQuery] = useState('')
  const [preferencesStatus, setPreferencesStatus] = useState<'idle' | 'exporting' | 'importing'>('idle')

  const { register, handleSubmit, setValue, setError, clearErrors, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { serverUrl }
  })

  const currentUrl = watch('serverUrl')
  const effectiveMotionDescription = motionPreference === 'system'
    ? reducedMotion
      ? t('accessibility.effectiveSystemReduced')
      : t('accessibility.effectiveSystemFull')
    : reducedMotion
      ? t('accessibility.effectiveReduced')
      : t('accessibility.effectiveFull')
  const currentTextScaleLabel = t(`accessibility.textScale.options.${textScale}.label`)
  const currentZoomLabel = t(`accessibility.zoom.options.${uiZoom}.label`)
  const currentFocusLabel = t(`accessibility.focus.options.${focusPreference}.label`)
  const normalizedCurrentUrl = normalizeUrl(currentUrl)
  const normalizedSavedServerUrl = normalizeUrl(serverUrl)
  const normalizedDefaultServerUrl = normalizeUrl(DEFAULT_SERVER_URL)
  const normalizedSettingsQuery = normalizeQuery(settingsQuery)
  const serverHasUnsavedChanges = normalizedCurrentUrl !== normalizedSavedServerUrl
  const serverUsesCustomUrl = normalizedSavedServerUrl !== normalizedDefaultServerUrl
  const accessibilityCustomized =
    motionPreference !== DEFAULT_MOTION_PREFERENCE
    || textScale !== DEFAULT_TEXT_SCALE
    || uiZoom !== DEFAULT_UI_ZOOM
    || focusPreference !== DEFAULT_FOCUS_PREFERENCE

  const serverMainVisible = useMemo(() => {
    if (!normalizedSettingsQuery) return true
    return [
      t('tabs.server'),
      t('server.title'),
      t('server.description'),
      t('server.urlLabel'),
      t('server.presetsLabel')
    ].some((value) => value.toLowerCase().includes(normalizedSettingsQuery))
  }, [normalizedSettingsQuery, t])

  const serverStatusVisible = useMemo(() => {
    if (!normalizedSettingsQuery) return true
    return [
      t('tabs.server'),
      t('status.title'),
      t('status.serverInfo'),
      t('status.fhirVersion')
    ].some((value) => value.toLowerCase().includes(normalizedSettingsQuery))
  }, [normalizedSettingsQuery, t])

  const accessibilityVisibility = useMemo(() => {
    if (!normalizedSettingsQuery) {
      return {
        motion: true,
        textScale: true,
        zoom: true,
        focus: true,
        contrast: true
      }
    }

    const matches = (parts: string[]): boolean =>
      parts.some((value) => value.toLowerCase().includes(normalizedSettingsQuery))

    return {
      motion: matches([
        t('tabs.accessibility'),
        t('accessibility.title'),
        t('accessibility.motionTitle'),
        t('accessibility.motionDescription')
      ]),
      textScale: matches([
        t('tabs.accessibility'),
        t('accessibility.textScale.title'),
        t('accessibility.textScale.description')
      ]),
      zoom: matches([
        t('tabs.accessibility'),
        t('accessibility.zoom.title'),
        t('accessibility.zoom.description')
      ]),
      focus: matches([
        t('tabs.accessibility'),
        t('accessibility.focus.title'),
        t('accessibility.focus.description')
      ]),
      contrast: matches([
        t('tabs.accessibility'),
        t('accessibility.contrast.title'),
        t('accessibility.contrast.description')
      ])
    }
  }, [normalizedSettingsQuery, t])

  const shortcutsVisible = useMemo(() => {
    if (!normalizedSettingsQuery) return true
    return [
      t('tabs.shortcuts'),
      t('page.description')
    ].some((value) => value.toLowerCase().includes(normalizedSettingsQuery))
  }, [normalizedSettingsQuery, t])

  const workspaceToolsVisible = useMemo(() => {
    if (!normalizedSettingsQuery) return true
    return [
      t('workspaceTools.title'),
      t('workspaceTools.description'),
      t('workspaceTools.preferences.title'),
      t('workspaceTools.preferences.description'),
      t('workspaceTools.onboarding.title'),
      t('workspaceTools.onboarding.description'),
      t('workspaceTools.quickStart.title'),
      t('workspaceTools.quickStart.description')
    ].some((value) => value.toLowerCase().includes(normalizedSettingsQuery))
  }, [normalizedSettingsQuery, t])

  const tabVisibility = {
    server: serverMainVisible || serverStatusVisible,
    accessibility: Object.values(accessibilityVisibility).some(Boolean),
    shortcuts: shortcutsVisible || workspaceToolsVisible
  } satisfies Record<SettingsShortcutTab, boolean>

  useEffect(() => {
    if (!normalizedSettingsQuery || tabVisibility[activeTab]) return

    const nextTab = (Object.entries(tabVisibility).find(([, visible]) => visible)?.[0] ?? activeTab) as SettingsShortcutTab
    if (nextTab !== activeTab) {
      setActiveTab(nextTab)
    }
  }, [activeTab, normalizedSettingsQuery, tabVisibility])

  useEffect(() => {
    const launchState = location.state as SettingsLaunchState | null
    if (!launchState?.quickStartScenario) return

    navigate('/settings', { replace: true, state: null })

    if (launchState.quickStartScenario === 'accessibility') {
      setActiveTab('accessibility')
      setSettingsQuery('')
      announcePolite(t('quickStartOpened'))
    }
  }, [announcePolite, location.state, navigate, t])

  function showSettingsToast(
    variant: 'success' | 'info',
    description: string
  ): void {
    pushToast({ variant, description })
  }

  async function handleTest(): Promise<void> {
    if (!normalizeUrl(currentUrl)) {
      const message = t('server.urlRequired')
      setError('serverUrl', { type: 'required', message })
      announceAssertive(message)
      return
    }

    clearErrors('serverUrl')
    announcePolite(t('server.testingAnnouncement'))
    const shouldSyncGlobalStatus = normalizeUrl(currentUrl) === normalizeUrl(serverUrl)
    setTestStatus('testing')
    if (shouldSyncGlobalStatus) {
      setServerStatus('checking')
    }
    const result = await checkServerHealth(currentUrl)
    setTestResult({ name: result.name, version: result.version })
    setTestStatus(result.online ? 'ok' : 'fail')
    const message = result.online ? t('server.testSuccessAnnouncement') : t('server.testFailAnnouncement')
    announcePolite(message)
    pushToast({
      variant: result.online ? 'success' : 'error',
      description: message
    })
    if (shouldSyncGlobalStatus) {
      setServerStatus(result.online ? 'online' : 'offline', result.name, result.version)
    }
  }

  function handleSave(data: FormData): void {
    clearErrors('serverUrl')
    const sameUrl = normalizeUrl(data.serverUrl) === normalizeUrl(serverUrl)
    setServerUrl(data.serverUrl)
    setSaved(true)
    const message = t('server.savedAnnouncement')
    announcePolite(message)
    pushToast({
      variant: 'success',
      description: message
    })
    if (sameUrl && testStatus !== 'idle' && testStatus !== 'testing') {
      setServerStatus(testStatus === 'ok' ? 'online' : 'offline', testResult.name, testResult.version)
    } else {
      setServerStatus('unknown')
    }
    setTimeout(() => setSaved(false), 3000)
  }

  function handleResetServerSection(): void {
    const alreadyDefault =
      normalizedCurrentUrl === normalizedDefaultServerUrl
      && normalizedSavedServerUrl === normalizedDefaultServerUrl

    if (alreadyDefault) {
      const message = t('sectionReset.serverAlreadyDefault')
      announcePolite(message)
      showSettingsToast('info', message)
      return
    }

    clearErrors('serverUrl')
    setValue('serverUrl', DEFAULT_SERVER_URL)
    setServerUrl(DEFAULT_SERVER_URL)
    setServerStatus('unknown')
    setTestStatus('idle')
    setTestResult({})
    setSaved(true)
    const message = t('sectionReset.serverDone')
    announcePolite(message)
    showSettingsToast('success', message)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleResetAccessibilitySection(): void {
    if (!accessibilityCustomized) {
      const message = t('sectionReset.accessibilityAlreadyDefault')
      announcePolite(message)
      showSettingsToast('info', message)
      return
    }

    setMotionPreference(DEFAULT_MOTION_PREFERENCE)
    setTextScale(DEFAULT_TEXT_SCALE)
    setUiZoom(DEFAULT_UI_ZOOM)
    setFocusPreference(DEFAULT_FOCUS_PREFERENCE)
    const message = t('sectionReset.accessibilityDone')
    announcePolite(message)
    showSettingsToast('success', message)
  }

  function handleMotionPreferenceChange(nextPreference: MotionPreference): void {
    setMotionPreference(nextPreference)
    announcePolite(
      t('accessibility.savedAnnouncement', {
        mode: t(`accessibility.options.${nextPreference}.label`)
      })
    )
  }

  function handleTextScaleChange(nextScale: TextScalePreference): void {
    setTextScale(nextScale)
    announcePolite(
      t('accessibility.textScale.savedAnnouncement', {
        scale: t(`accessibility.textScale.options.${nextScale}.label`)
      })
    )
  }

  function handleZoomChange(nextZoom: UiZoomPreference): void {
    setUiZoom(nextZoom)
    announcePolite(
      t('accessibility.zoom.savedAnnouncement', {
        scale: t(`accessibility.zoom.options.${nextZoom}.label`)
      })
    )
  }

  function handleFocusChange(nextFocus: FocusPreference): void {
    setFocusPreference(nextFocus)
    announcePolite(
      t('accessibility.focus.savedAnnouncement', {
        mode: t(`accessibility.focus.options.${nextFocus}.label`)
      })
    )
  }

  async function handleExportPreferences(): Promise<void> {
    setPreferencesStatus('exporting')

    try {
      const result = await exportPreferencesJson()
      if (result.canceled) return

      const message = t('workspaceTools.preferences.exportSuccess', {
        fileName: result.fileName ?? 'preferences.json'
      })
      announcePolite(message)
      pushToast({
        variant: 'success',
        description: message
      })
    } catch (error) {
      const message = getPreferencesFileErrorMessage(error, t)
      announceAssertive(message)
      pushToast({
        variant: 'error',
        description: message
      })
    } finally {
      setPreferencesStatus('idle')
    }
  }

  async function handleImportPreferences(): Promise<void> {
    setPreferencesStatus('importing')

    try {
      const result = await importPreferencesJson()
      if (!result) return

      applyImportedPreferences(result.snapshot)
      setValue('serverUrl', result.snapshot.app.serverUrl)
      clearErrors('serverUrl')
      setTestStatus('idle')
      setTestResult({})
      setSaved(false)

      const message = t('workspaceTools.preferences.importSuccess', {
        fileName: result.fileName
      })
      announcePolite(message)
      pushToast({
        variant: 'success',
        description: message
      })
    } catch (error) {
      const message = getPreferencesFileErrorMessage(error, t)
      announceAssertive(message)
      pushToast({
        variant: 'error',
        description: message
      })
    } finally {
      setPreferencesStatus('idle')
    }
  }

  function handleReplayOnboarding(): void {
    openOnboarding('welcome')
    announcePolite(t('workspaceTools.onboarding.openedAnnouncement'))
  }

  useEffect(() => {
    setSettingsActions({
      save: () => {
        void handleSubmit(handleSave)()
      },
      testConnection: handleTest,
      setTab: setActiveTab
    })

    return () => {
      clearSettingsActions(['save', 'testConnection', 'setTab'])
    }
  }, [clearSettingsActions, handleSubmit, setSettingsActions, currentUrl, serverUrl, testStatus, testResult.name, testResult.version])

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsShortcutTab)} className="space-y-5">
          <section className="rounded-[28px] border border-border/70 bg-card/70 p-5 shadow-sm ring-1 ring-border/40 backdrop-blur-sm sm:p-6">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h1 data-page-heading="true" tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
                    {t('page.title')}
                  </h1>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {t('page.description')}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                  <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('tabs.server')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {serverHasUnsavedChanges ? (
                        <Badge variant="warning">{t('badges.unsaved')}</Badge>
                      ) : serverUsesCustomUrl ? (
                        <Badge variant="outline">{t('badges.customized')}</Badge>
                      ) : (
                        <Badge variant="outline">{t('badges.default')}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('tabs.accessibility')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {accessibilityCustomized ? t('badges.customized') : t('badges.default')}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('tabs.shortcuts')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {shortcutOverrideCount > 0 ? (
                        <Badge variant="outline">
                          {t('badges.customizedCount', { count: shortcutOverrideCount })}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('badges.default')}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-search">{t('search.label')}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="settings-search"
                    value={settingsQuery}
                    onChange={(event) => setSettingsQuery(event.target.value)}
                    placeholder={t('search.placeholder')}
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{t('search.hint')}</p>
              </div>

              <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/45 p-2">
                <TabsTrigger data-testid="settings.tab.server" value="server" className="min-h-10 flex-1 basis-[calc(50%-0.25rem)] gap-2 rounded-xl sm:basis-auto sm:flex-none">
            <span>{t('tabs.server')}</span>
            {serverHasUnsavedChanges ? (
              <Badge variant="warning" className="px-2 py-0 text-[10px]">{t('badges.unsaved')}</Badge>
            ) : serverUsesCustomUrl ? (
              <Badge variant="outline" className="px-2 py-0 text-[10px]">{t('badges.customized')}</Badge>
            ) : null}
                </TabsTrigger>
                <TabsTrigger data-testid="settings.tab.accessibility" value="accessibility" className="min-h-10 flex-1 basis-[calc(50%-0.25rem)] gap-2 rounded-xl sm:basis-auto sm:flex-none">
            <span>{t('tabs.accessibility')}</span>
            {accessibilityCustomized && (
              <Badge variant="outline" className="px-2 py-0 text-[10px]">{t('badges.customized')}</Badge>
            )}
                </TabsTrigger>
                <TabsTrigger data-testid="settings.tab.shortcuts" value="shortcuts" className="min-h-10 flex-1 basis-full gap-2 rounded-xl sm:basis-auto sm:flex-none">
            <span>{t('tabs.shortcuts')}</span>
            {shortcutOverrideCount > 0 && (
              <Badge variant="outline" className="px-2 py-0 text-[10px]">
                {t('badges.customizedCount', { count: shortcutOverrideCount })}
              </Badge>
            )}
                </TabsTrigger>
              </TabsList>
            </div>
          </section>

        <TabsContent value="server" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          {serverMainVisible && (
            <FeatureShowcaseTarget id="settings.serverCard">
              <Card className="rounded-[26px] border-border/70 bg-card/75">
              <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{t('server.title')}</CardTitle>
                    {serverHasUnsavedChanges ? (
                      <Badge variant="warning">{t('badges.unsaved')}</Badge>
                    ) : serverUsesCustomUrl ? (
                      <Badge variant="outline">{t('badges.customized')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('badges.default')}</Badge>
                    )}
                  </div>
                  <CardDescription>{t('server.description')}</CardDescription>
                </div>
                <Button data-testid="settings.server.reset" type="button" variant="outline" size="sm" onClick={handleResetServerSection} className="w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4" />
                  {t('actions.resetSection')}
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(handleSave)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="server-url">{t('server.urlLabel')}</Label>
                  <p id="server-url-hint" className="text-xs leading-relaxed text-muted-foreground">
                    {t('server.urlHint')}
                  </p>
                  <Input
                    data-testid="settings.server.url-input"
                    id="server-url"
                    className="font-mono text-sm"
                    aria-invalid={Boolean(errors.serverUrl)}
                    aria-describedby={`server-url-hint${errors.serverUrl ? ' server-url-error' : ''}`}
                    placeholder="https://hapi.fhir.org/baseR4"
                    {...register('serverUrl', { required: t('server.urlRequired') })}
                  />
                  {errors.serverUrl?.message && (
                    <p id="server-url-error" role="alert" className="text-xs text-destructive">
                      {errors.serverUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('server.presetsLabel')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_SERVERS.map(({ label, url }) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setValue('serverUrl', url)}
                        className={`w-full rounded-xl border px-3 py-2 text-sm transition-colors sm:w-auto ${
                          currentUrl === url
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background/70 hover:bg-accent'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    data-testid="settings.server.test-connection"
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={testStatus === 'testing'}
                    className="w-full sm:w-auto"
                  >
                    {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {testStatus !== 'testing' && (
                      testStatus === 'ok' ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : testStatus === 'fail' ? (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Wifi className="h-4 w-4" />
                      )
                    )}
                    {tc('buttons.test')}
                  </Button>
                  <Button data-testid="settings.server.save" type="submit" className="w-full sm:w-auto">
                    <Save className="h-4 w-4" />
                    {tc('buttons.save')}
                  </Button>
                </div>

                {testStatus === 'ok' && (
                  <Alert data-testid="settings.server.test-success" variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      {t('server.testSuccess')}
                      {testResult.name && <> — {testResult.name}</>}
                      {testResult.version && <> (FHIR {testResult.version})</>}
                    </AlertDescription>
                  </Alert>
                )}
                {testStatus === 'fail' && (
                  <Alert data-testid="settings.server.test-fail" variant="destructive">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>{t('server.testFail')}</AlertDescription>
                  </Alert>
                )}
                {saved && (
                  <Alert data-testid="settings.server.saved" variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{t('server.saved')}</AlertDescription>
                  </Alert>
                )}
                </form>
              </CardContent>
            </Card>
            </FeatureShowcaseTarget>
          )}

          {serverStatusVisible && (
            <FeatureShowcaseTarget id="settings.statusCard">
              <Card className="rounded-[26px] border-border/70 bg-card/75">
              <CardHeader>
                <CardTitle className="text-base">{t('status.title')}</CardTitle>
              </CardHeader>
              <CardContent data-testid="settings.server.status-card" className="space-y-4 text-sm">
                <div data-testid="settings.server.status-indicator" className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    serverStatus === 'online' ? 'bg-green-500' :
                    serverStatus === 'offline' ? 'bg-red-500' :
                    serverStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className="capitalize">{serverStatus}</span>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="font-mono text-xs leading-relaxed text-muted-foreground break-all">{serverUrl}</div>
                </div>
                {serverName && <div className="text-muted-foreground">{t('status.serverInfo')}: {serverName}</div>}
                {serverVersion && <div className="text-muted-foreground">{t('status.fhirVersion')}: R{serverVersion}</div>}
              </CardContent>
            </Card>
            </FeatureShowcaseTarget>
          )}

          {!tabVisibility.server && (
            <Alert className="xl:col-span-2">
              <AlertDescription>{t('search.noResults')}</AlertDescription>
            </Alert>
          )}
          </div>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <Card className="rounded-[26px] border-border/70 bg-card/75">
            <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{t('accessibility.title')}</CardTitle>
                  {accessibilityCustomized ? (
                    <Badge variant="outline">{t('badges.customized')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('badges.default')}</Badge>
                  )}
                </div>
                <CardDescription>{t('accessibility.description')}</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleResetAccessibilitySection} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4" />
                {t('actions.resetSection')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {accessibilityVisibility.motion && (
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">{t('accessibility.motionTitle')}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t('accessibility.motionDescription')}</p>
                </div>

                <div
                  role="group"
                  aria-label={t('accessibility.groupLabel')}
                  className="grid gap-3 md:grid-cols-3"
                >
                  {MOTION_OPTIONS.map((option) => {
                    const selected = motionPreference === option

                    return (
                      <button
                        key={option}
                        type="button"
                        data-testid={`settings.accessibility.motion.${option}`}
                        aria-pressed={selected}
                        onClick={() => handleMotionPreferenceChange(option)}
                        className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-accent/35'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {t(`accessibility.options.${option}.label`)}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {t(`accessibility.options.${option}.description`)}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">{t('accessibility.effectiveTitle')}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{effectiveMotionDescription}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{t('accessibility.behaviorHint')}</p>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {accessibilityVisibility.textScale && (
              <section className="space-y-4 border-t border-border/70 pt-5">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">{t('accessibility.textScale.title')}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t('accessibility.textScale.description')}</p>
                </div>

                <div
                  role="group"
                  aria-label={t('accessibility.textScale.groupLabel')}
                  className="grid gap-3 md:grid-cols-2"
                >
                  {TEXT_SCALE_OPTIONS.map((option) => {
                    const selected = textScale === option

                    return (
                      <button
                        key={option}
                        type="button"
                        data-testid={`settings.accessibility.text-scale.${option}`}
                        aria-pressed={selected}
                        onClick={() => handleTextScaleChange(option)}
                        className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-accent/35'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {t(`accessibility.textScale.options.${option}.label`)}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {t(`accessibility.textScale.options.${option}.description`)}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">{t('accessibility.textScale.effectiveTitle')}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t('accessibility.textScale.effectiveDescription', { scale: currentTextScaleLabel })}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t('accessibility.textScale.behaviorHint')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {accessibilityVisibility.zoom && (
              <section className="space-y-2 border-t border-border/70 pt-5">
                <h2 className="text-sm font-semibold text-foreground">{t('accessibility.zoom.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('accessibility.zoom.description')}
                </p>

                <div
                  role="group"
                  aria-label={t('accessibility.zoom.groupLabel')}
                  className="grid gap-3 md:grid-cols-3"
                >
                  {UI_ZOOM_OPTIONS.map((option) => {
                    const selected = uiZoom === option

                    return (
                      <button
                        key={option}
                        type="button"
                        data-testid={`settings.accessibility.zoom.${option}`}
                        aria-pressed={selected}
                        onClick={() => handleZoomChange(option)}
                        className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-accent/35'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {t(`accessibility.zoom.options.${option}.label`)}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {t(`accessibility.zoom.options.${option}.description`)}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">{t('accessibility.zoom.effectiveTitle')}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t('accessibility.zoom.effectiveDescription', { scale: currentZoomLabel })}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t('accessibility.zoom.behaviorHint')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {accessibilityVisibility.focus && (
              <section className="space-y-2 border-t border-border/70 pt-5">
                <h2 className="text-sm font-semibold text-foreground">{t('accessibility.focus.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('accessibility.focus.description')}
                </p>

                <div
                  role="group"
                  aria-label={t('accessibility.focus.groupLabel')}
                  className="grid gap-3 md:grid-cols-2"
                >
                  {FOCUS_OPTIONS.map((option) => {
                    const selected = focusPreference === option

                    return (
                      <button
                        key={option}
                        type="button"
                        data-testid={`settings.accessibility.focus.${option}`}
                        aria-pressed={selected}
                        onClick={() => handleFocusChange(option)}
                        className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-accent/35'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {t(`accessibility.focus.options.${option}.label`)}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {t(`accessibility.focus.options.${option}.description`)}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground">{t('accessibility.focus.effectiveTitle')}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t('accessibility.focus.effectiveDescription', { mode: currentFocusLabel })}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t('accessibility.focus.behaviorHint')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {accessibilityVisibility.contrast && (
              <section className="space-y-2 border-t border-border/70 pt-5">
                <h2 className="text-sm font-semibold text-foreground">{t('accessibility.contrast.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('accessibility.contrast.description')}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('accessibility.contrast.hint')}
                </p>
              </section>
              )}

              {!tabVisibility.accessibility && (
                <Alert>
                  <AlertDescription>{t('search.noResults')}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortcuts" className="space-y-6">
          {tabVisibility.shortcuts ? (
            <div className="space-y-6">
              {shortcutsVisible && <ShortcutSettingsPanel />}

              {workspaceToolsVisible && (
                <Card className="rounded-[26px] border-border/70 bg-card/75">
                  <CardHeader>
                    <CardTitle className="text-base">{t('workspaceTools.title')}</CardTitle>
                    <CardDescription>{t('workspaceTools.description')}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 xl:grid-cols-3">
                    <section className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-foreground">
                          {t('workspaceTools.preferences.title')}
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {t('workspaceTools.preferences.description')}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleExportPreferences()}
                          disabled={preferencesStatus !== 'idle'}
                          className="w-full sm:w-auto"
                        >
                          {preferencesStatus === 'exporting' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {t('workspaceTools.preferences.export')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleImportPreferences()}
                          disabled={preferencesStatus !== 'idle'}
                          className="w-full sm:w-auto"
                        >
                          {preferencesStatus === 'importing' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {t('workspaceTools.preferences.import')}
                        </Button>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-foreground">
                          {t('workspaceTools.onboarding.title')}
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {t('workspaceTools.onboarding.description')}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button type="button" variant="outline" onClick={handleReplayOnboarding} className="w-full sm:w-auto">
                          <Sparkles className="h-4 w-4" />
                          {t('workspaceTools.onboarding.replay')}
                        </Button>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                      <div className="space-y-1">
                        <h2 className="text-sm font-semibold text-foreground">
                          {t('workspaceTools.quickStart.title')}
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {t('workspaceTools.quickStart.description')}
                        </p>
                      </div>
                      <div className="mt-4">
                        <Button type="button" variant="outline" onClick={openQuickStartDialog} className="w-full sm:w-auto">
                          <Sparkles className="h-4 w-4" />
                          {t('workspaceTools.quickStart.open')}
                        </Button>
                      </div>
                    </section>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Alert>
              <AlertDescription>{t('search.noResults')}</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

    </div>
    </div>
  )
}
