import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { conditionMocks } from '../../../mocks/mockPools'

const CONDITION_IDENTIFIER_SYSTEM = 'https://rxfhir.app/fhir/condition-key'

const COMMON_ICD10 = [
  { code: 'J06.9', display: '急性上呼吸道感染' },
  { code: 'I10',   display: '原發性高血壓' },
  { code: 'E11.9', display: '第2型糖尿病，無併發症' },
  { code: 'J18.9', display: '肺炎，未明示' },
  { code: 'K29.7', display: '胃炎，未明示' },
  { code: 'M54.5', display: '下背痛' }
]

type FormData = {
  icdCode: string
  icdDisplay: string
  clinicalStatus: 'active' | 'resolved' | 'inactive'
}

interface Props {
  onSuccess: (resource: fhir4.Condition) => void
}

export default function ConditionForm({ onSuccess }: Props): React.JSX.Element {
  const { resources, setFeedback, clearFeedback } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.condition as Partial<FormData> | undefined)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.condition)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.condition.${k}`)

  const schema = useMemo(() => z.object({
    icdCode:        z.string().min(1, f('icdCode.required')),
    icdDisplay:     z.string().min(1, f('diagnosisName.required')),
    clinicalStatus: z.enum(['active', 'resolved', 'inactive']).default('active')
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(resources.condition?.id)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'reused'>('created')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome }
    : persistedFeedback

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = conditionMocks[mockIndexRef.current % conditionMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    icdCode: resources.condition?.code?.coding?.[0]?.code ?? '',
    icdDisplay: resources.condition?.code?.coding?.[0]?.display ?? resources.condition?.code?.text ?? '',
    clinicalStatus: resources.condition?.clinicalStatus?.coding?.[0]?.code as FormData['clinicalStatus'] | undefined
  }, draftValues), [draftValues, resources.condition])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  useCreatorDraftAutosave('condition', watch)

  function applyPreset(code: string, display: string): void {
    setValue('icdCode', code)
    setValue('icdDisplay', display)
  }

  function buildConditionIdentifierValue(data: FormData): string {
    return JSON.stringify({
      patient: resources.patient?.identifier?.[0]?.value ?? resources.patient?.id ?? '',
      encounter: resources.encounter?.id ?? '',
      icdCode: data.icdCode,
      clinicalStatus: data.clinicalStatus
    })
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('condition')
    try {
      const resource: Omit<fhir4.Condition, 'id'> = {
        resourceType: 'Condition',
        identifier: [{
          system: CONDITION_IDENTIFIER_SYSTEM,
          value: buildConditionIdentifierValue(data)
        }],
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: data.clinicalStatus
          }]
        },
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: data.icdCode,
            display: data.icdDisplay
          }],
          text: data.icdDisplay
        },
        subject: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : { display: 'Unknown Patient' },
        encounter: resources.encounter
          ? { reference: `Encounter/${resources.encounter.id}` }
          : undefined,
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Condition-EP']
        }
      }
      const existingConditionId = resultId ?? resources.condition?.id
      let reused = false
      const created = existingConditionId
        ? await putResource<fhir4.Condition>('Condition', existingConditionId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Condition>(
              'Condition',
              {
                identifier: `${CONDITION_IDENTIFIER_SYSTEM}|${buildConditionIdentifierValue(data)}`
              },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      setSaveOutcome(reused ? 'reused' : 'created')
      setResultId(created.id)
      setStatus('success')
      setFeedback('condition', {
        id: created.id,
        outcome: reused ? 'reused' : 'created'
      })
      onSuccess(created)
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : tc('errors.unknown'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
          <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
        </Button>
      </div>
      <div className="space-y-2">
        <Label>{f('presetsTitle')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ICD10.map(({ code, display }) => (
            <button
              key={code}
              type="button"
              onClick={() => applyPreset(code, display)}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icd-code">{f('icdCode.label')} *</Label>
        <Input id="icd-code" placeholder={f('icdCode.placeholder')} {...register('icdCode')} className="font-mono" />
        {errors.icdCode && <p className="text-xs text-destructive">{errors.icdCode.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="icd-display">{f('diagnosisName.label')} *</Label>
        <Input id="icd-display" placeholder={f('diagnosisName.placeholder')} {...register('icdDisplay')} />
        {errors.icdDisplay && <p className="text-xs text-destructive">{errors.icdDisplay.message}</p>}
      </div>

      {feedback && status !== 'loading' && (
        <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {feedback.outcome === 'reused'
              ? tc('fhir.resourceReused', { resourceType: 'Condition', id: feedback.id })
              : (
                  <>
                    {f('success').replace('{{id}}', '')}
                    <code className="font-mono text-xs">{feedback.id}</code>
                  </>
                )}
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
