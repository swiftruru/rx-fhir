import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'

export default function AboutPage(): React.JSX.Element {
  const { t } = useTranslation('settings')

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{t('about.title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('about.title')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            {/* App description */}
            <div className="space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">{t('about.tagline')}</p>
              <p>{t('about.description')}</p>
              <p>{t('about.spec')}</p>
            </div>

            <Separator />

            {/* Author & course info */}
            <div className="space-y-1.5">
              {(['author', 'affiliation', 'department', 'course'] as const).map(key => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0 text-xs pt-0.5">{t(`about.fields.${key}`)}</span>
                  <span className="font-medium">{t(`about.values.${key}`)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Advisors */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t('about.fields.advisors')}</p>
              <div className="flex flex-wrap gap-2">
                {(['lien', 'kuo', 'lee'] as const).map(key => (
                  <span key={key} className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/40 text-foreground">
                    {t(`about.advisors.${key}`)}
                  </span>
                ))}
              </div>
            </div>

            <Separator />

            {/* Version */}
            <p className="text-xs opacity-60">{t('about.version')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
