import { useTranslation } from 'react-i18next'
import { BookOpen, GraduationCap, Code2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Separator } from '../../components/ui/separator'
import appIcon from '../../assets/icon.png'

const APP_VERSION = __APP_VERSION__

export default function AboutPage(): React.JSX.Element {
  const { t } = useTranslation('settings')

  function openUrl(url: string): void {
    void window.rxfhir?.openExternalUrl(url)
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
          <span className="text-[11px] text-muted-foreground/70 font-mono mt-1">
            v{APP_VERSION}
          </span>
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

        {/* ── Footer ── */}
        <p className="text-center text-[11px] text-muted-foreground/60 pb-2">
          {t('about.license')}
        </p>

      </div>
    </div>
  )
}
