import { useState } from 'react'
import { Check, ChevronRight, Loader2, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { Badge } from '../../components/ui/badge'
import JsonViewer from '../../components/JsonViewer'
import { useCreatorStore } from '../../store/creatorStore'
import { RESOURCE_STEPS } from '../../types/fhir.d'

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

export default function ResourceStepper({ onBundleSuccess }: ResourceStepperProps): React.JSX.Element {
  const { currentStep, setStep, resources, nextStep, prevStep, bundleId, submittingBundle } = useCreatorStore()
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null)
  const [expandSeq, setExpandSeq] = useState(0)

  function onResourceSuccess(key: string, resource: fhir4.Resource): void {
    useCreatorStore.getState().setResource(key as never, resource as never)
    setLastCreatedKey(key)
    setExpandSeq(s => s + 1)
    setShowJsonPreview(true)
  }
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')

  function isStepComplete(index: number): boolean {
    const step = RESOURCE_STEPS[index]
    if (step.key === 'composition') return !!bundleId
    return !!resources[step.key]
  }

  function renderForm(): React.JSX.Element {
    const step = RESOURCE_STEPS[currentStep]

    switch (step.key) {
      case 'organization':
        return <OrganizationForm onSuccess={(r) => onResourceSuccess('organization', r)} />
      case 'patient':
        return <PatientForm onSuccess={(r) => onResourceSuccess('patient', r)} />
      case 'practitioner':
        return <PractitionerForm onSuccess={(r) => onResourceSuccess('practitioner', r)} />
      case 'encounter':
        return <EncounterForm onSuccess={(r) => onResourceSuccess('encounter', r)} />
      case 'condition':
        return <ConditionForm onSuccess={(r) => onResourceSuccess('condition', r)} />
      case 'observation':
        return <ObservationForm onSuccess={(r) => onResourceSuccess('observation', r)} />
      case 'coverage':
        return <CoverageForm onSuccess={(r) => onResourceSuccess('coverage', r)} />
      case 'medication':
        return <MedicationForm onSuccess={(r) => onResourceSuccess('medication', r)} />
      case 'medicationRequest':
        return <MedicationRequestForm onSuccess={(r) => onResourceSuccess('medicationRequest', r)} />
      case 'extension':
        return <ExtensionForm onSuccess={(r) => onResourceSuccess('extension', r)} />
      case 'composition':
        return <CompositionForm onBundleSuccess={onBundleSuccess} />
      default:
        return <div>{t('stepper.unknownStep')}</div>
    }
  }

  const currentStepKey = RESOURCE_STEPS[currentStep].key
  const completedCount = RESOURCE_STEPS.filter((_, i) => isStepComplete(i)).length

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
                  className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-md text-xs transition-colors ${
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
                      return (
                        <>
                          <div className="font-medium truncate">{label}</div>
                          {label !== labelEn && <div className="text-[10px] opacity-60 truncate">{labelEn}</div>}
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
              <div className="border-l overflow-auto p-4 bg-slate-950">
                <p className="text-xs text-slate-400 mb-3 font-mono">{t('stepper.jsonPanelTitle')}</p>
                {Object.entries(resources).map(([key, resource]) =>
                  resource ? (
                    <div key={key} className="mb-3">
                      <JsonViewer
                        key={key === lastCreatedKey ? `${key}-${expandSeq}` : key}
                        data={resource}
                        title={key}
                        defaultCollapsed={key !== lastCreatedKey}
                      />
                    </div>
                  ) : null
                )}
                {Object.values(resources).every(v => !v) && (
                  <p className="text-slate-500 text-xs">{t('stepper.jsonEmpty')}</p>
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
