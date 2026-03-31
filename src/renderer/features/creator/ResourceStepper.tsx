import { useMemo, useState } from 'react'
import { Check, ChevronRight, Loader2, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { Badge } from '../../components/ui/badge'
import JsonViewer from '../../components/JsonViewer'
import { useCreatorStore } from '../../store/creatorStore'
import { RESOURCE_STEPS } from '../../types/fhir.d'
import type { CreatedResources, ResourceKey } from '../../types/fhir.d'

import OrganizationForm from './forms/OrganizationForm'
import PatientForm from './forms/PatientForm'
import PractitionerForm from './forms/PractitionerForm'
import EncounterForm from './forms/EncounterForm'
import ConditionForm from './forms/ConditionForm'
import ObservationForm from './forms/ObservationForm'
import CoverageForm from './forms/CoverageForm'
import MedicationForm from './forms/MedicationForm'
import MedicationRequestForm from './forms/MedicationRequestForm'
import ExtensionForm from './forms/ExtensionForm'
import CompositionForm from './forms/CompositionForm'

interface ResourceStepperProps {
  onBundleSuccess: (bundleId: string) => void
}

function compactText(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || undefined
}

function joinSummary(...parts: Array<string | undefined>): string | undefined {
  const values = parts.filter((part): part is string => !!compactText(part))
  return values.length ? values.join(' / ') : undefined
}

function formatHumanName(names?: fhir4.HumanName[]): string | undefined {
  const primary = names?.[0]
  if (!primary) return undefined
  return compactText(primary.text) || compactText(`${primary.family ?? ''}${primary.given?.join('') ?? ''}`)
}

function getIdentifierValue(resource?: { identifier?: fhir4.Identifier[] }): string | undefined {
  return resource?.identifier?.find((identifier) => compactText(identifier.value))?.value
}

function getCodeableText(concept?: fhir4.CodeableConcept): string | undefined {
  return compactText(concept?.text) || compactText(concept?.coding?.[0]?.display) || compactText(concept?.coding?.[0]?.code)
}

function formatQuantity(quantity?: fhir4.Quantity): string | undefined {
  if (quantity?.value === undefined || quantity?.value === null) return undefined
  return compactText(`${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`)
}

function formatShortDateTime(value?: string): string | undefined {
  const normalized = compactText(value)
  if (!normalized) return undefined

  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/)
  if (matched) {
    const [, date, time] = matched
    return `${date.replace(/-/g, '/')}${time ? ` ${time}` : ''}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const pad = (part: number) => String(part).padStart(2, '0')
  return `${parsed.getFullYear()}/${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function getEncounterTypeLabel(code: string | undefined, t: (key: string) => string): string | undefined {
  switch (code) {
    case 'AMB':
      return t('forms.encounter.type.options.ambulatory')
    case 'EMER':
      return t('forms.encounter.type.options.emergency')
    case 'IMP':
      return t('forms.encounter.type.options.inpatient')
    default:
      return undefined
  }
}

function getCoverageTypeLabel(code: string | undefined, t: (key: string) => string): string | undefined {
  switch (code) {
    case 'EHCPOL':
      return t('forms.coverage.type.options.EHCPOL')
    case 'PAY':
      return t('forms.coverage.type.options.PAY')
    case 'PUBLICPOL':
      return t('forms.coverage.type.options.PUBLICPOL')
    default:
      return undefined
  }
}

function getMedicationRequestFrequency(resource?: fhir4.MedicationRequest): string | undefined {
  return compactText(resource?.dosageInstruction?.[0]?.timing?.code?.text)
    || compactText(resource?.dosageInstruction?.[0]?.timing?.code?.coding?.[0]?.display)
    || compactText(resource?.dosageInstruction?.[0]?.timing?.code?.coding?.[0]?.code)
}

function getStepSummary(
  key: ResourceKey,
  resources: CreatedResources,
  bundleId: string | undefined,
  t: (key: string) => string
): string | undefined {
  switch (key) {
    case 'organization':
      return joinSummary(resources.organization?.name, getIdentifierValue(resources.organization))
    case 'patient':
      return joinSummary(formatHumanName(resources.patient?.name), getIdentifierValue(resources.patient))
    case 'practitioner':
      return joinSummary(formatHumanName(resources.practitioner?.name), getIdentifierValue(resources.practitioner))
    case 'encounter':
      return joinSummary(
        getEncounterTypeLabel(resources.encounter?.class?.code, t) || compactText(resources.encounter?.class?.display),
        formatShortDateTime(resources.encounter?.period?.start)
      )
    case 'condition':
      return joinSummary(getCodeableText(resources.condition?.code), compactText(resources.condition?.code?.coding?.[0]?.code))
    case 'observation':
      return joinSummary(getCodeableText(resources.observation?.code), formatQuantity(resources.observation?.valueQuantity))
    case 'coverage':
      return joinSummary(
        getCoverageTypeLabel(resources.coverage?.type?.coding?.[0]?.code, t) || getCodeableText(resources.coverage?.type),
        getIdentifierValue(resources.coverage)
      )
    case 'medication':
      return joinSummary(
        compactText(resources.medication?.code?.text) || compactText(resources.medication?.code?.coding?.[0]?.display),
        compactText(resources.medication?.code?.coding?.[0]?.code)
      )
    case 'medicationRequest': {
      const medicationName =
        compactText(resources.medicationRequest?.medicationReference?.display)
        || compactText(resources.medication?.code?.text)
        || compactText(resources.medication?.code?.coding?.[0]?.display)
      const dose = formatQuantity(resources.medicationRequest?.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity)
      const frequency = getMedicationRequestFrequency(resources.medicationRequest)
      const dosageSummary = [dose, frequency].filter((part): part is string => !!part).join(' · ')
      return joinSummary(medicationName, dosageSummary || undefined)
    }
    case 'extension':
      return joinSummary(
        getCodeableText(resources.extension?.code),
        compactText(resources.extension?.extension?.[0]?.valueString)
      )
    case 'composition':
      return joinSummary(resources.composition?.title, bundleId)
    default:
      return undefined
  }
}

export default function ResourceStepper({ onBundleSuccess }: ResourceStepperProps): React.JSX.Element {
  const {
    currentStep,
    setStep,
    resources,
    nextStep,
    prevStep,
    bundleId,
    submittingBundle,
    draftRevision,
    clearDraft,
    lastUpdatedResourceKey
  } = useCreatorStore()
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const [expandSeq, setExpandSeq] = useState(0)
  const [jsonFontSize, setJsonFontSize] = useState<'sm' | 'md' | 'lg'>('sm')
  const [showOnlyLastResource, setShowOnlyLastResource] = useState(false)
  const [collapseSyncToken, setCollapseSyncToken] = useState(0)
  const [collapseAll, setCollapseAll] = useState(false)

  function onResourceSuccess(key: string, resource: fhir4.Resource): void {
    useCreatorStore.getState().setResource(key as never, resource as never)
    clearDraft(key as keyof typeof resources)
    setExpandSeq(s => s + 1)
    setCollapseAll(false)
    setShowJsonPreview(true)
  }
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const stepSummaries = useMemo(
    () =>
      RESOURCE_STEPS.reduce<Partial<Record<ResourceKey, string>>>((acc, step) => {
        const summary = getStepSummary(step.key, resources, bundleId, t)
        if (summary) acc[step.key] = summary
        return acc
      }, {}),
    [bundleId, resources, t]
  )

  function isStepComplete(index: number): boolean {
    const step = RESOURCE_STEPS[index]
    if (step.key === 'composition') return !!bundleId
    return !!resources[step.key]
  }

  function renderForm(): React.JSX.Element {
    const step = RESOURCE_STEPS[currentStep]
    const formKey = `${step.key}-${draftRevision}`

    switch (step.key) {
      case 'organization':
        return <OrganizationForm key={formKey} onSuccess={(r) => onResourceSuccess('organization', r)} />
      case 'patient':
        return <PatientForm key={formKey} onSuccess={(r) => onResourceSuccess('patient', r)} />
      case 'practitioner':
        return <PractitionerForm key={formKey} onSuccess={(r) => onResourceSuccess('practitioner', r)} />
      case 'encounter':
        return <EncounterForm key={formKey} onSuccess={(r) => onResourceSuccess('encounter', r)} />
      case 'condition':
        return <ConditionForm key={formKey} onSuccess={(r) => onResourceSuccess('condition', r)} />
      case 'observation':
        return <ObservationForm key={formKey} onSuccess={(r) => onResourceSuccess('observation', r)} />
      case 'coverage':
        return <CoverageForm key={formKey} onSuccess={(r) => onResourceSuccess('coverage', r)} />
      case 'medication':
        return <MedicationForm key={formKey} onSuccess={(r) => onResourceSuccess('medication', r)} />
      case 'medicationRequest':
        return <MedicationRequestForm key={formKey} onSuccess={(r) => onResourceSuccess('medicationRequest', r)} />
      case 'extension':
        return <ExtensionForm key={formKey} onSuccess={(r) => onResourceSuccess('extension', r)} />
      case 'composition':
        return <CompositionForm key={formKey} onBundleSuccess={onBundleSuccess} />
      default:
        return <div>{t('stepper.unknownStep')}</div>
    }
  }

  const currentStepKey = RESOURCE_STEPS[currentStep].key
  const completedCount = RESOURCE_STEPS.filter((_, i) => isStepComplete(i)).length
  const currentStepSummary = stepSummaries[currentStepKey]
  const jsonEntries = useMemo(
    () => Object.entries(resources).filter((entry): entry is [ResourceKey, NonNullable<CreatedResources[ResourceKey]>] => Boolean(entry[1])),
    [resources]
  )
  const visibleJsonEntries = useMemo(() => {
    if (showOnlyLastResource && lastUpdatedResourceKey && resources[lastUpdatedResourceKey]) {
      return [[lastUpdatedResourceKey, resources[lastUpdatedResourceKey]!]] as Array<[ResourceKey, NonNullable<CreatedResources[ResourceKey]>]>
    }
    return jsonEntries
  }, [jsonEntries, lastUpdatedResourceKey, resources, showOnlyLastResource])

  function handleCollapseAll(): void {
    setCollapseAll(true)
    setCollapseSyncToken((token) => token + 1)
  }

  function handleToggleLastResourceView(): void {
    const next = !showOnlyLastResource
    setShowOnlyLastResource(next)
    if (next) {
      setCollapseAll(false)
      setCollapseSyncToken((token) => token + 1)
    }
  }

  return (
    <div className="flex h-full gap-0">
      {/* Left: Step indicator */}
      <div className="w-48 border-r bg-muted/30 flex flex-col">
        <div className="px-3 py-3 border-b">
          <div className="text-xs text-muted-foreground">{t('stepper.progress')}</div>
          <div className="text-sm font-semibold">{t('stepper.progressCount', { completed: completedCount, total: RESOURCE_STEPS.length })}</div>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {RESOURCE_STEPS.map((step, index) => {
              const complete = isStepComplete(index)
              const active = index === currentStep
              return (
                <button
                  key={step.key}
                  onClick={() => setStep(index)}
                  className={`w-full text-left flex items-start gap-2 px-2 py-2 rounded-md text-xs transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : complete
                      ? 'text-emerald-800 hover:bg-emerald-50'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    complete ? 'bg-emerald-600 text-white' : active ? 'bg-white/20 text-inherit' : 'bg-muted text-muted-foreground'
                  }`}>
                    {complete ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    {(() => {
                      const label = t(`steps.${step.key}.label`)
                      const labelEn = t(`steps.${step.key}.labelEn`)
                      const summary = complete ? stepSummaries[step.key] : undefined
                      return (
                        <>
                          <div className="font-medium truncate">{label}</div>
                          {label !== labelEn && <div className="text-[10px] opacity-60 truncate">{labelEn}</div>}
                          {summary && (
                            <div
                              className={`mt-0.5 text-[10px] truncate ${
                                active
                                  ? 'text-primary-foreground/80'
                                  : complete
                                  ? 'opacity-70'
                                  : 'text-muted-foreground'
                              }`}
                              title={summary}
                            >
                              {summary}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </button>
              )
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Right: Form area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-background">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {t('stepper.stepBadge', { current: currentStep + 1, total: RESOURCE_STEPS.length })}
              </Badge>
              <h2 className="text-base font-semibold">{t(`steps.${currentStepKey}.label`)}</h2>
              {t(`steps.${currentStepKey}.label`) !== t(`steps.${currentStepKey}.labelEn`) && (
                <span className="text-sm text-muted-foreground">{t(`steps.${currentStepKey}.labelEn`)}</span>
              )}
            </div>
            {currentStepSummary && (
              <p className="mt-1 text-xs text-muted-foreground truncate" title={currentStepSummary}>
                {currentStepSummary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showJsonPreview ? t('stepper.hideJson') : t('stepper.showJson')}
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className={showJsonPreview ? 'grid grid-cols-2 gap-0 h-full' : 'h-full'}>
            {/* Form */}
            <div className="flex flex-col h-full min-h-0">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-5">
                  {renderForm()}
                </div>
              </ScrollArea>
              {currentStepKey === 'composition' && (
                <div className="p-4 pt-2 border-t bg-background shrink-0">
                  <Button
                    type="submit"
                    form="composition-form"
                    disabled={submittingBundle || !resources.patient}
                    className="w-full"
                    size="lg"
                  >
                    {submittingBundle && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Package className="h-4 w-4" />
                    {bundleId
                      ? t('forms.composition.resubmitButton')
                      : t('forms.composition.submitButton')}
                  </Button>
                </div>
              )}
            </div>

            {/* JSON Preview panel */}
            {showJsonPreview && (
              <div className="border-l overflow-auto p-4 bg-muted/35 transition-colors">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{t('stepper.jsonPanelTitle')}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {showOnlyLastResource && lastUpdatedResourceKey
                        ? t('stepper.jsonShowingLast', { resource: t(`steps.${lastUpdatedResourceKey}.label`) })
                        : t('stepper.jsonShowingAll', { count: visibleJsonEntries.length })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <div className="flex items-center rounded-md border border-border bg-background/70 p-0.5">
                      {(['sm', 'md', 'lg'] as const).map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={jsonFontSize === size ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setJsonFontSize(size)}
                        >
                          {t(`stepper.jsonFontSizes.${size}`)}
                        </Button>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={handleCollapseAll}
                      disabled={visibleJsonEntries.length === 0}
                    >
                      {t('stepper.jsonCollapseAll')}
                    </Button>
                    <Button
                      type="button"
                      variant={showOnlyLastResource ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={handleToggleLastResourceView}
                      disabled={!lastUpdatedResourceKey || !resources[lastUpdatedResourceKey]}
                    >
                      {showOnlyLastResource ? t('stepper.jsonShowAllResources') : t('stepper.jsonShowLastOnly')}
                    </Button>
                  </div>
                </div>
                {visibleJsonEntries.map(([key, resource]) =>
                  resource ? (
                    <div key={key} className="mb-3">
                      <JsonViewer
                        key={key === lastUpdatedResourceKey ? `${key}-${expandSeq}` : key}
                        data={resource}
                        title={key}
                        defaultCollapsed={collapseAll || key !== lastUpdatedResourceKey}
                        collapseSync={{ value: collapseAll, token: collapseSyncToken }}
                        fontSize={jsonFontSize}
                      />
                    </div>
                  ) : null
                )}
                {visibleJsonEntries.length === 0 && (
                  <p className="text-muted-foreground text-xs">{t('stepper.jsonEmpty')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-t bg-background">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            {tc('buttons.prev')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextStep}
            disabled={currentStep === RESOURCE_STEPS.length - 1}
          >
            {tc('buttons.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
