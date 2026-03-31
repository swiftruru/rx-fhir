import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
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
import CompositionForm from './forms/CompositionForm'

interface ResourceStepperProps {
  onBundleSuccess: (bundleId: string) => void
}

export default function ResourceStepper({ onBundleSuccess }: ResourceStepperProps): React.JSX.Element {
  const { currentStep, setStep, resources, nextStep, prevStep, bundleId } = useCreatorStore()
  const [showJsonPreview, setShowJsonPreview] = useState(false)

  function isStepComplete(index: number): boolean {
    const step = RESOURCE_STEPS[index]
    if (step.key === 'composition') return !!bundleId
    return !!resources[step.key]
  }

  function renderForm(): React.JSX.Element {
    const step = RESOURCE_STEPS[currentStep]

    switch (step.key) {
      case 'organization':
        return <OrganizationForm onSuccess={(r) => { useCreatorStore.getState().setResource('organization', r); nextStep() }} />
      case 'patient':
        return <PatientForm onSuccess={(r) => { useCreatorStore.getState().setResource('patient', r); nextStep() }} />
      case 'practitioner':
        return <PractitionerForm onSuccess={(r) => { useCreatorStore.getState().setResource('practitioner', r); nextStep() }} />
      case 'encounter':
        return <EncounterForm onSuccess={(r) => { useCreatorStore.getState().setResource('encounter', r); nextStep() }} />
      case 'condition':
        return <ConditionForm onSuccess={(r) => { useCreatorStore.getState().setResource('condition', r); nextStep() }} />
      case 'observation':
        return <ObservationForm onSuccess={(r) => { useCreatorStore.getState().setResource('observation', r); nextStep() }} />
      case 'coverage':
        return <CoverageForm onSuccess={(r) => { useCreatorStore.getState().setResource('coverage', r); nextStep() }} />
      case 'medication':
        return <MedicationForm onSuccess={(r) => { useCreatorStore.getState().setResource('medication', r); nextStep() }} />
      case 'medicationRequest':
        return <MedicationRequestForm onSuccess={(r) => { useCreatorStore.getState().setResource('medicationRequest', r); nextStep() }} />
      case 'composition':
        return <CompositionForm onBundleSuccess={onBundleSuccess} />
      default:
        return <div>未知步驟</div>
    }
  }

  const currentStepInfo = RESOURCE_STEPS[currentStep]
  const completedCount = RESOURCE_STEPS.filter((_, i) => isStepComplete(i)).length

  return (
    <div className="flex h-full gap-0">
      {/* Left: Step indicator */}
      <div className="w-48 border-r bg-muted/30 flex flex-col">
        <div className="px-3 py-3 border-b">
          <div className="text-xs text-muted-foreground">進度</div>
          <div className="text-sm font-semibold">{completedCount} / {RESOURCE_STEPS.length} 完成</div>
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
                    <div className="font-medium truncate">{step.label}</div>
                    <div className="text-[10px] opacity-60 truncate">{step.labelEn}</div>
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
                步驟 {currentStep + 1} / {RESOURCE_STEPS.length}
              </Badge>
              <h2 className="text-base font-semibold">{currentStepInfo.label}</h2>
              <span className="text-sm text-muted-foreground">{currentStepInfo.labelEn}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showJsonPreview ? '隱藏 JSON' : '顯示 JSON 預覽'}
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className={showJsonPreview ? 'grid grid-cols-2 gap-0 h-full' : 'h-full'}>
            {/* Form */}
            <ScrollArea className="h-full">
              <div className="p-5">
                {renderForm()}
              </div>
            </ScrollArea>

            {/* JSON Preview panel */}
            {showJsonPreview && (
              <div className="border-l overflow-auto p-4 bg-slate-950">
                <p className="text-xs text-slate-400 mb-3 font-mono">已建立的 Resources JSON</p>
                {Object.entries(resources).map(([key, resource]) =>
                  resource ? (
                    <div key={key} className="mb-3">
                      <JsonViewer
                        data={resource}
                        title={key}
                        defaultCollapsed={true}
                      />
                    </div>
                  ) : null
                )}
                {Object.values(resources).every(v => !v) && (
                  <p className="text-slate-500 text-xs">尚未建立任何 Resource</p>
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
            上一步
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextStep}
            disabled={currentStep === RESOURCE_STEPS.length - 1}
          >
            跳過 / 下一步
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
