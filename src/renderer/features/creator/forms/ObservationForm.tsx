import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select'
import FormGuideCard from '../../../shared/components/FormGuideCard'
import FormErrorSummary from '../components/FormErrorSummary'
import CreatorFeedbackAlert from '../components/CreatorFeedbackAlert'
import FhirErrorAlert from '../../../shared/components/FhirErrorAlert'
import { buildFormErrorSummaryItems } from '../lib/formErrorSummary'
import { useCreatorMockFill, useLiveDemoTypedMockFill } from '../hooks/useCreatorMockFill'
import { useLiveDemoFormController } from '../hooks/useLiveDemoFormController'
import { mergeDraftValues, useCreatorDraftAutosave } from '../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource, resetLoggedRequests } from '../../../services/fhirClient'
import { useCreatorStore } from '../store/creatorStore'

const OBSERVATION_IDENTIFIER_SYSTEM = 'https://rxfhir.app/fhir/observation-key'

const COMMON_OBS = [
  { loincCode: '8867-4',  unit: 'beats/min' },
  { loincCode: '8480-6',  unit: 'mmHg' },
  { loincCode: '8462-4',  unit: 'mmHg' },
  { loincCode: '2345-7',  unit: 'mg/dL' },
  { loincCode: '2093-3',  unit: 'mg/dL' },
  { loincCode: '29463-7', unit: 'kg' }
]

type FormData = {
  loincCode: string
  display: string
  value: number
  unit: string
  status: 'final' | 'preliminary' | 'amended'
}

interface Props {
  onSuccess: (resource: fhir4.Observation) => void
}

export default function ObservationForm({ onSuccess }: Props): React.JSX.Element {
  const { resources, setFeedback, clearFeedback } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.observation as Partial<FormData> | undefined)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.observation)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.observation.${k}`)

  const schema = useMemo(() => z.object({
    loincCode: z.string().min(1, f('loincCode.required')),
    display:   z.string().min(1, f('itemName.required')),
    value:     z.coerce.number({ invalid_type_error: f('value.required') }),
    unit:      z.string().min(1, f('unit.required')),
    status:    z.enum(['final', 'preliminary', 'amended']).default('final')
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(resources.observation?.id)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'updated' | 'reused'>('created')
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT'>(persistedFeedback?.requestMethod ?? 'POST')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome, requestMethod }
    : persistedFeedback

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    loincCode: resources.observation?.code?.coding?.[0]?.code ?? '',
    display: resources.observation?.code?.coding?.[0]?.display ?? resources.observation?.code?.text ?? '',
    value: resources.observation?.valueQuantity?.value,
    unit: resources.observation?.valueQuantity?.unit ?? '',
    status: resources.observation?.status as FormData['status'] | undefined
  }, draftValues), [draftValues, resources.observation])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })
  const errorSummaryItems = useMemo(
    () => buildFormErrorSummaryItems<FormData>(errors, [
      { name: 'loincCode', fieldId: 'loinc', label: f('loincCode.label') },
      { name: 'display', fieldId: 'obs-display', label: f('itemName.label') },
      { name: 'value', fieldId: 'obs-value', label: f('value.label') },
      { name: 'unit', fieldId: 'obs-unit', label: f('unit.label') }
    ]),
    [errors, t]
  )

  const fillMock = useCreatorMockFill<FormData>('observation', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })
  const fillDemo = useLiveDemoTypedMockFill<FormData>('observation', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('observation', watch)
  const selectedStatus = watch('status')

  function applyPreset(obs: (typeof COMMON_OBS)[0]): void {
    setValue('loincCode', obs.loincCode)
    setValue('display', t(`forms.observation.presets.${obs.loincCode}`))
    setValue('unit', obs.unit)
  }

  function buildObservationIdentifierValue(data: FormData): string {
    return JSON.stringify({
      patient: resources.patient?.identifier?.[0]?.value ?? resources.patient?.id ?? '',
      encounter: resources.encounter?.id ?? '',
      loincCode: data.loincCode,
      value: data.value,
      unit: data.unit,
      status: data.status
    })
  }

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('observation')
    try {
      const resource: Omit<fhir4.Observation, 'id'> = {
        resourceType: 'Observation',
        identifier: [{
          system: OBSERVATION_IDENTIFIER_SYSTEM,
          value: buildObservationIdentifierValue(data)
        }],
        status: data.status,
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: data.loincCode,
            display: data.display
          }],
          text: data.display
        },
        subject: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : undefined,
        encounter: resources.encounter
          ? { reference: `Encounter/${resources.encounter.id}` }
          : undefined,
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: {
          value: data.value,
          unit: data.unit,
          system: 'http://unitsofmeasure.org'
        },
        meta: {
          profile: [
            data.loincCode === '29463-7'
              ? 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP-BodyWeight'
              : 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP'
          ]
        }
      }
      const existingObservationId = resultId ?? resources.observation?.id
      let reused = false
      const created = existingObservationId
        ? await putResource<fhir4.Observation>('Observation', existingObservationId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Observation>(
              'Observation',
              {
                identifier: `${OBSERVATION_IDENTIFIER_SYSTEM}|${buildObservationIdentifierValue(data)}`
              },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      const outcome = existingObservationId ? 'updated' : reused ? 'reused' : 'created'
      const method = existingObservationId ? 'PUT' : reused ? 'GET' : 'POST'
      setSaveOutcome(outcome)
      setRequestMethod(method)
      setResultId(created.id)
      setStatus('success')
      setFeedback('observation', {
        id: created.id,
        outcome,
        requestMethod: method
      })
      onSuccess(created)
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : tc('errors.unknown'))
    }
  }

  useLiveDemoFormController('observation', fillMock, handleSubmit, onSubmit, fillDemo)

  return (
    <form data-live-demo-form="observation" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
          <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
        </Button>
      </div>
      <FormGuideCard title={f('introTitle')} description={f('introHint')} />
      <div className="space-y-2">
        <Label>{f('presetsTitle')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_OBS.map((obs) => (
            <button
              key={obs.loincCode}
              type="button"
              onClick={() => applyPreset(obs)}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              {t(`forms.observation.presets.${obs.loincCode}`)}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('presetsHint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="loinc">{f('loincCode.label')} *</Label>
          <Input id="loinc" placeholder={f('loincCode.placeholder')} {...register('loincCode')} className="font-mono" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('loincCode.hint')}</p>
          {errors.loincCode && <p className="text-xs text-destructive">{errors.loincCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-display">{f('itemName.label')} *</Label>
          <Input id="obs-display" placeholder={f('itemName.placeholder')} {...register('display')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('itemName.hint')}</p>
          {errors.display && <p className="text-xs text-destructive">{errors.display.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="obs-value">{f('value.label')} *</Label>
          <Input id="obs-value" type="number" step="any" placeholder={f('value.placeholder')} {...register('value')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('value.hint')}</p>
          {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-unit">{f('unit.label')} *</Label>
          <Input id="obs-unit" placeholder={f('unit.placeholder')} {...register('unit')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('unit.hint')}</p>
          {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
        </div>
      </div>

      <FormGuideCard title={f('examplesTitle')} variant="examples">
        <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
          {[f('example1'), f('example2'), f('example3')].map((example) => (
            <li key={example} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span>{example}</span>
            </li>
          ))}
        </ul>
      </FormGuideCard>

      <FormErrorSummary
        title={t('forms.shared.errorSummaryTitle', { count: errorSummaryItems.length })}
        description={t('forms.shared.errorSummaryDescription')}
        items={errorSummaryItems}
      />

      <div className="space-y-2">
        <Label>{f('status.label')}</Label>
        <Select value={selectedStatus} onValueChange={(v) => setValue('status', v as FormData['status'])}>
          <SelectTrigger data-live-demo-field="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['final', 'preliminary', 'amended'] as const).map(v => (
              <SelectItem key={v} value={v}>{f(`status.options.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {feedback && status !== 'loading' && <CreatorFeedbackAlert feedback={feedback} resourceType="Observation" />}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button data-live-demo-submit="observation" type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
