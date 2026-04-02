import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Wifi, WifiOff, Loader2, CheckCircle2, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import FeatureShowcaseTarget from '../../components/FeatureShowcaseTarget'
import ShortcutSettingsPanel from './ShortcutSettingsPanel'
import { useAppStore, type MotionPreference, type TextScalePreference, type UiZoomPreference, type FocusPreference } from '../../store/appStore'
import { useAccessibilityStore } from '../../store/accessibilityStore'
import { useShortcutActionStore, type SettingsShortcutTab } from '../../store/shortcutActionStore'
import { checkServerHealth } from '../../services/fhirClient'

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

const MOTION_OPTIONS: MotionPreference[] = ['system', 'full', 'reduced']
const TEXT_SCALE_OPTIONS: TextScalePreference[] = ['scale100', 'scale112', 'scale125', 'scale137']
const UI_ZOOM_OPTIONS: UiZoomPreference[] = ['zoom100', 'zoom110', 'zoom125']
const FOCUS_OPTIONS: FocusPreference[] = ['standard', 'enhanced']

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
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
  const reducedMotion = useReducedMotion()
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const announceAssertive = useAccessibilityStore((state) => state.announceAssertive)
  const setSettingsActions = useShortcutActionStore((state) => state.setSettingsActions)
  const clearSettingsActions = useShortcutActionStore((state) => state.clearSettingsActions)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testResult, setTestResult] = useState<{ name?: string; version?: string }>({})
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsShortcutTab>('server')

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
    announcePolite(result.online ? t('server.testSuccessAnnouncement') : t('server.testFailAnnouncement'))
    if (shouldSyncGlobalStatus) {
      setServerStatus(result.online ? 'online' : 'offline', result.name, result.version)
    }
  }

  function handleSave(data: FormData): void {
    clearErrors('serverUrl')
    const sameUrl = normalizeUrl(data.serverUrl) === normalizeUrl(serverUrl)
    setServerUrl(data.serverUrl)
    setSaved(true)
    announcePolite(t('server.savedAnnouncement'))
    if (sameUrl && testStatus !== 'idle' && testStatus !== 'testing') {
      setServerStatus(testStatus === 'ok' ? 'online' : 'offline', testResult.name, testResult.version)
    } else {
      setServerStatus('unknown')
    }
    setTimeout(() => setSaved(false), 3000)
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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 data-page-heading="true" tabIndex={-1} className="text-xl font-bold outline-none">
          {t('page.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('page.description')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsShortcutTab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="server">{t('tabs.server')}</TabsTrigger>
          <TabsTrigger value="accessibility">{t('tabs.accessibility')}</TabsTrigger>
          <TabsTrigger value="shortcuts">{t('tabs.shortcuts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="space-y-6">
          <FeatureShowcaseTarget id="settings.serverCard">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('server.title')}</CardTitle>
                <CardDescription>{t('server.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-url">{t('server.urlLabel')}</Label>
                  <p id="server-url-hint" className="text-xs text-muted-foreground">
                    {t('server.urlHint')}
                  </p>
                  <Input
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
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          currentUrl === url
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={testStatus === 'testing'}
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
                  <Button type="submit">
                    <Save className="h-4 w-4" />
                    {tc('buttons.save')}
                  </Button>
                </div>

                {testStatus === 'ok' && (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      {t('server.testSuccess')}
                      {testResult.name && <> — {testResult.name}</>}
                      {testResult.version && <> (FHIR {testResult.version})</>}
                    </AlertDescription>
                  </Alert>
                )}
                {testStatus === 'fail' && (
                  <Alert variant="destructive">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>{t('server.testFail')}</AlertDescription>
                  </Alert>
                )}
                {saved && (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{t('server.saved')}</AlertDescription>
                  </Alert>
                )}
                </form>
              </CardContent>
            </Card>
          </FeatureShowcaseTarget>

          <FeatureShowcaseTarget id="settings.statusCard">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('status.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    serverStatus === 'online' ? 'bg-green-500' :
                    serverStatus === 'offline' ? 'bg-red-500' :
                    serverStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className="capitalize">{serverStatus}</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground break-all">{serverUrl}</div>
                {serverName && <div className="text-muted-foreground">{t('status.serverInfo')}: {serverName}</div>}
                {serverVersion && <div className="text-muted-foreground">{t('status.fhirVersion')}: R{serverVersion}</div>}
              </CardContent>
            </Card>
          </FeatureShowcaseTarget>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('accessibility.title')}</CardTitle>
              <CardDescription>{t('accessibility.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <section className="space-y-2 border-t border-border/70 pt-5">
                <h2 className="text-sm font-semibold text-foreground">{t('accessibility.contrast.title')}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t('accessibility.contrast.description')}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('accessibility.contrast.hint')}
                </p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortcuts">
          <ShortcutSettingsPanel />
        </TabsContent>
      </Tabs>

    </div>
    </div>
  )
}
