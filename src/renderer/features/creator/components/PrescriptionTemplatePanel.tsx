import { useMemo, useState } from 'react'
import { LayoutTemplate, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { getPrescriptionTemplateScenarios } from '../../../mocks/selectors'
import type { MockPrescriptionTemplate, MockScenarioCategory } from '../../../mocks/types'
import { buildTemplateDraftsFromScenario } from '../../../mocks/templateDrafts'
import { useAppStore } from '../../../store/appStore'
import { useCreatorStore } from '../../../store/creatorStore'
import { useMockStore } from '../../../store/mockStore'

interface Props {
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function PrescriptionTemplatePanel({
  disabled = false,
  open: controlledOpen,
  onOpenChange
}: Props): React.JSX.Element | null {
  const { t } = useTranslation('creator')
  const locale = useAppStore((s) => s.locale)
  const resources = useCreatorStore((s) => s.resources)
  const drafts = useCreatorStore((s) => s.drafts)
  const bundleId = useCreatorStore((s) => s.bundleId)
  const applyTemplateDrafts = useCreatorStore((s) => s.applyTemplateDrafts)
  const activateScenario = useMockStore((s) => s.activateScenario)
  const [category, setCategory] = useState<MockScenarioCategory | 'all'>('all')
  const [pendingTemplateId, setPendingTemplateId] = useState<string>()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen

  const templates = useMemo(() => getPrescriptionTemplateScenarios(locale), [locale])
  const filteredTemplates = useMemo(
    () => templates.filter((template) => category === 'all' || template.category === category),
    [category, templates]
  )

  const hasExistingWork = useMemo(
    () => Boolean(bundleId) || Object.values(resources).some(Boolean) || Object.values(drafts).some((draft) => draft && Object.keys(draft).length > 0),
    [bundleId, drafts, resources]
  )

  function setPanelOpen(next: boolean): void {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(next)
    }
    onOpenChange?.(next)
  }

  function applyTemplate(template: MockPrescriptionTemplate): void {
    applyTemplateDrafts(buildTemplateDraftsFromScenario(template.scenario))
    activateScenario(template.id)
    setPendingTemplateId(undefined)
    setPanelOpen(false)
  }

  function handleApplyTemplate(templateId: string): void {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return

    if (hasExistingWork) {
      setPendingTemplateId(template.id)
      return
    }

    applyTemplate(template)
  }

  if (templates.length === 0) return null

  const pendingTemplate = pendingTemplateId
    ? templates.find((template) => template.id === pendingTemplateId)
    : undefined

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setPanelOpen(true)} disabled={disabled}>
        <LayoutTemplate className="h-4 w-4" />
        {t('templates.trigger')}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-6 pb-6 pt-24">
          <button
            type="button"
            aria-label={t('templates.closePanel')}
            className="absolute inset-0 cursor-default"
            onClick={() => {
              setPendingTemplateId(undefined)
              setPanelOpen(false)
            }}
          />

          <Card className="relative z-10 flex max-h-[min(78vh,720px)] w-full max-w-5xl flex-col overflow-hidden shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                    {t('templates.title')}
                  </CardTitle>
                  <CardDescription>{t('templates.description')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    {t('templates.badge', { count: filteredTemplates.length })}
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setPendingTemplateId(undefined)
                      setPanelOpen(false)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto pb-6">
              <p className="text-xs text-muted-foreground">{t('templates.hint')}</p>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {t('templates.filterLabel')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={category === 'all' ? 'default' : 'outline'}
                    onClick={() => setCategory('all')}
                    disabled={disabled}
                  >
                    {t('templates.categories.all')}
                  </Button>
                  {(['foundation', 'acute', 'chronic', 'pediatric'] as const).map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      variant={category === item ? 'default' : 'outline'}
                      onClick={() => setCategory(item)}
                      disabled={disabled}
                    >
                      {t(`templates.categories.${item}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {pendingTemplate && (
                <Alert variant="warning">
                  <AlertDescription className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{t('templates.confirmTitle')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('templates.confirmDescription', { template: pendingTemplate.label })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setPendingTemplateId(undefined)}>
                        {t('templates.confirmCancel')}
                      </Button>
                      <Button type="button" size="sm" onClick={() => applyTemplate(pendingTemplate)}>
                        {t('templates.confirmApply')}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {filteredTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('templates.empty')}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-lg border border-border/80 bg-background p-3 shadow-sm transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-snug">{template.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
                        </div>
                        {template.isPrimaryDemo && (
                          <Badge variant="outline" className="shrink-0">
                            <Sparkles className="h-3 w-3" />
                            {t('templates.primary')}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge variant="secondary">{t(`templates.categories.${template.category}`)}</Badge>
                        <Button size="sm" onClick={() => handleApplyTemplate(template.id)} disabled={disabled}>
                          {t('templates.apply')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
