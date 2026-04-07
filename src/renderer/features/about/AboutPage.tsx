import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, GraduationCap, Code2, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import appIcon from '../../assets/icon.png'
import type { UpdateCheckResult } from '../../types/electron'

const APP_VERSION = __APP_VERSION__

type UpdateUiStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error'

export default function AboutPage(): React.JSX.Element {
  const { t } = useTranslation('settings')
  const [updateStatus, setUpdateStatus] = useState<UpdateUiStatus>('idle')
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)

  // On mount, retrieve any cached startup result in case the push was sent
  // before this page was open (the most common case).
  useEffect(() => {
    void window.rxfhir?.getCachedUpdateResult?.().then((result) => {
      if (result?.status === 'update-available') {
        setUpdateResult(result)
        setUpdateStatus('update-available')
      }
    })
  }, [])

  // Subscribe to the passive startup update check push from main process
  // (catches the case where About is already open when the check completes —
  //  updates the amber dot without re-firing a toast, which App.tsx handles).
  useEffect(() => {
    if (!window.rxfhir?.onUpdateResult) return
    const unsubscribe = window.rxfhir.onUpdateResult((result) => {
      if (result.status === 'update-available') {
        setUpdateResult(result)
        setUpdateStatus('update-available')
      }
    })
    return unsubscribe
  }, [])

  function openUrl(url: string): void {
    void window.rxfhir?.openExternalUrl(url)
  }

  async function handleCheckForUpdates(): Promise<void> {
    if (!window.rxfhir?.checkForUpdates) return
    setUpdateStatus('checking')
    setUpdateResult(null)
    const result = await window.rxfhir.checkForUpdates()
    setUpdateResult(result)
    if (result.status === 'update-available') setUpdateStatus('update-available')
    else if (result.status === 'up-to-date') setUpdateStatus('up-to-date')
    else setUpdateStatus('error')
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {/* Accessible landmark heading (visually hidden — Hero replaces it) */}
        <h1
          data-page-heading="true"
          tabIndex={-1}
          className="sr-only"
        >
          {t('about.title')}
        </h1>

        {/* ── Hero ── */}
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <img
            src={appIcon}
            alt="RxFHIR"
            className="w-20 h-20 rounded-2xl shadow-md ring-2 ring-primary/20 hover:scale-105 transition-transform duration-200"
          />
          <div className="mt-1 space-y-0.5">
            <p className="text-2xl font-bold tracking-tight">RxFHIR</p>
            <p className="text-sm text-muted-foreground">{t('about.tagline')}</p>
            <p className="text-xs text-muted-foreground">{t('about.description')}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-muted-foreground/70 font-mono">
              v{APP_VERSION}
            </span>
            {updateStatus === 'update-available' && (
              <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="Update available" />
            )}
          </div>
        </div>

        {/* ── Academic Background ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              {t('about.academicSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="space-y-1.5">
              {(['author', 'affiliation', 'department', 'course'] as const).map(key => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground w-[5.5rem] shrink-0 text-xs pt-0.5">
                    {t(`about.fields.${key}`)}
                  </span>
                  <span className="font-medium text-sm">{t(`about.values.${key}`)}</span>
                </div>
              ))}
            </div>

            <Separator />

            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">{t('about.fields.advisors')}</p>
              </div>
              <p className="text-[11px] text-muted-foreground/70 mb-2.5">{t('about.advisorsNote')}</p>
              <div className="flex flex-wrap gap-2">
                {(['kuo', 'lien', 'lee'] as const).map(key => (
                  <Badge key={key} variant="secondary" className="font-normal">
                    {t(`about.advisors.${key}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Technical Info ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              {t('about.techSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{t('about.fhirSpec')}</p>
              <p className="text-xs text-muted-foreground">{t('about.spec')}</p>
              <p className="text-xs text-muted-foreground">{t('about.techStack')}</p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{t('about.github')}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{t('about.githubRepo')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-3 text-xs shrink-0"
                  onClick={() => openUrl('https://github.com/swiftruru/rx-fhir')}
                >
                  <ExternalLink className="h-3 w-3" />
                  GitHub
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{t('about.homepage')}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t('about.homepageUrl')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-3 text-xs shrink-0"
                  onClick={() => openUrl('https://swift.moe')}
                >
                  <ExternalLink className="h-3 w-3" />
                  swift.moe
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── App Updates ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              {t('about.update.section')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('about.update.currentVersion')}</p>
                <p className="font-mono text-sm font-medium mt-0.5">v{APP_VERSION}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-3 text-xs shrink-0"
                disabled={updateStatus === 'checking'}
                onClick={() => { void handleCheckForUpdates() }}
              >
                <RefreshCw className={`h-3 w-3 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                {updateStatus === 'checking'
                  ? t('about.update.checking')
                  : t('about.update.checkButton')}
              </Button>
            </div>

            {/* Up-to-date */}
            {updateStatus === 'up-to-date' && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">{t('about.update.upToDate')}</span>
              </div>
            )}

            {/* Update available */}
            {updateStatus === 'update-available' && updateResult?.latestVersion && (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10 px-3 py-2.5 space-y-2">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  {t('about.update.available', { version: updateResult.latestVersion })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-3 text-xs border-amber-400/60 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/20"
                    onClick={() => openUrl(updateResult.releaseUrl ?? 'https://github.com/swiftruru/rx-fhir/releases')}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {t('about.update.openReleases')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    onClick={() => {
                      setUpdateStatus('idle')
                      setUpdateResult(null)
                    }}
                  >
                    {t('about.update.remindLater')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-3 text-xs text-amber-700/70 hover:text-amber-900 hover:bg-amber-100/60 dark:text-amber-400/70 dark:hover:text-amber-300 dark:hover:bg-amber-500/10"
                    onClick={() => {
                      void window.rxfhir?.skipUpdateVersion(updateResult.latestVersion!)
                      setUpdateStatus('idle')
                      setUpdateResult(null)
                    }}
                  >
                    {t('about.update.skipVersion')}
                  </Button>
                </div>
              </div>
            )}

            {/* Error */}
            {updateStatus === 'error' && (
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="text-xs">{t('about.update.failed')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Footer ── */}
        <p className="text-center text-[11px] text-muted-foreground/60 pb-2">
          {t('about.license')}
        </p>

      </div>
    </div>
  )
}
