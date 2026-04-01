import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import FormGuideCard from '../../../components/FormGuideCard'
import CreatorFeedbackAlert from '../../../components/CreatorFeedbackAlert'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { useCreatorMockFill, useLiveDemoTypedMockFill } from '../../../hooks/useCreatorMockFill'
import { useLiveDemoFormController } from '../../../hooks/useLiveDemoFormController'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource, resetLoggedRequests } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'

const ENCOUNTER_IDENTIFIER_SYSTEM = 'https://rxfhir.app/fhir/encounter-key'

type FormData = {
  class: 'AMB' | 'EMER' | 'IMP'
  periodStart: string
  periodEnd?: string
}

const CLASS_FHIR: Record<'AMB' | 'EMER' | 'IMP', string> = {
  AMB: 'Ambulatory',
  EMER: 'Emergency',
  IMP: 'Inpatient'
}

function toDateTimeLocalValue(value?: string): string {
  if (!value) return ''
  const normalized = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)?.[1]
  if (normalized) return normalized

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

interface Props {
  onSuccess: (resource: fhir4.Encounter) => void
}

export default function EncounterForm({ onSuccess }: Props): React.JSX.Element {
  const { resources, setFeedback, clearFeedback } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.encounter as Partial<FormData> | undefined)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.encounter)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.encounter.${k}`)

  const schema = useMemo(() => z.object({
    class:       z.enum(['AMB', 'EMER', 'IMP'], { required_error: f('type.required') }),
    periodStart: z.string().min(1, f('startDate.required')),
    periodEnd:   z.string().optional()
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(resources.encounter?.id)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'updated' | 'reused'>('created')
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT'>(persistedFeedback?.requestMethod ?? 'POST')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome, requestMethod }
    : persistedFeedback

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    class: resources.encounter?.class?.code as FormData['class'] | undefined,
    periodStart: toDateTimeLocalValue(resources.encounter?.period?.start),
    periodEnd: toDateTimeLocalValue(resources.encounter?.period?.end)
  }, draftValues), [draftValues, resources.encounter])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  const fillMock = useCreatorMockFill<FormData>('encounter', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })
  const fillDemo = useLiveDemoTypedMockFill<FormData>('encounter', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('encounter', watch)
  const selectedClass = watch('class')

  // datetime-local inputs return "YYYY-MM-DDTHH:MM" (no seconds);
  // FHIR requires at least "YYYY-MM-DDTHH:MM:SS".
  function toFhirDateTime(dt: string): string {
    return dt.length === 16 ? `${dt}:00` : dt
  }

  function buildEncounterIdentifierValue(data: FormData): string {
    return JSON.stringify({
      patient: resources.patient?.identifier?.[0]?.value ?? resources.patient?.id ?? '',
      organization: resources.organization?.identifier?.[0]?.value ?? resources.organization?.id ?? '',
      class: data.class,
      periodStart: toFhirDateTime(data.periodStart),
      periodEnd: data.periodEnd ? toFhirDateTime(data.periodEnd) : ''
    })
  }

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('encounter')
    try {
      const resource: Omit<fhir4.Encounter, 'id'> = {
        resourceType: 'Encounter',
        status: 'finished',
        identifier: [{
          system: ENCOUNTER_IDENTIFIER_SYSTEM,
          value: buildEncounterIdentifierValue(data)
        }],
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: data.class,
          display: CLASS_FHIR[data.class]
        },
        subject: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : undefined,
        period: {
          start: toFhirDateTime(data.periodStart),
          ...(data.periodEnd ? { end: toFhirDateTime(data.periodEnd) } : {})
        },
        serviceProvider: resources.organization
          ? { reference: `Organization/${resources.organization.id}` }
          : undefined,
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Encounter-EP']
        }
      }
      const existingEncounterId = resultId ?? resources.encounter?.id
      let reused = false
      const created = existingEncounterId
        ? await putResource<fhir4.Encounter>('Encounter', existingEncounterId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Encounter>(
              'Encounter',
              {
                identifier: `${ENCOUNTER_IDENTIFIER_SYSTEM}|${buildEncounterIdentifierValue(data)}`
              },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      const outcome = existingEncounterId ? 'updated' : reused ? 'reused' : 'created'
      const method = existingEncounterId ? 'PUT' : reused ? 'GET' : 'POST'
      setSaveOutcome(outcome)
      setRequestMethod(method)
      setResultId(created.id)
      setStatus('success')
      setFeedback('encounter', {
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

  useLiveDemoFormController('encounter', fillMock, handleSubmit, onSubmit, fillDemo)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
          <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
        </Button>
      </div>

      <FormGuideCard title={f('introTitle')} description={f('introHint')} />

      <FormGuideCard title={f('examplesTitle')} variant="examples">
        <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
          {[f('example1'), f('example2')].map((example) => (
            <li key={example} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span>{example}</span>
            </li>
          ))}
        </ul>
      </FormGuideCard>

      <div className="space-y-2">
        <Label>{f('type.label')} *</Label>
        <Select value={selectedClass} onValueChange={(v) => setValue('class', v as FormData['class'])}>
          <SelectTrigger>
            <SelectValue placeholder={f('type.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AMB">{f('type.options.ambulatory')}</SelectItem>
            <SelectItem value="EMER">{f('type.options.emergency')}</SelectItem>
            <SelectItem value="IMP">{f('type.options.inpatient')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('type.hint')}</p>
        {errors.class && <p className="text-xs text-destructive">{errors.class.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-start">{f('startDate.label')} *</Label>
        <Input id="period-start" type="datetime-local" {...register('periodStart')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('startDate.hint')}</p>
        {errors.periodStart && <p className="text-xs text-destructive">{errors.periodStart.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-end">{f('endDate.label')}</Label>
        <Input id="period-end" type="datetime-local" {...register('periodEnd')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('endDate.hint')}</p>
      </div>

      {resources.patient && (
        <p className="text-xs text-muted-foreground">
          {t('forms.encounter.patientInfo', {
            name: resources.patient.name?.[0]?.text || 'Patient',
            id: resources.patient.id
          })}
        </p>
      )}

      {feedback && status !== 'loading' && <CreatorFeedbackAlert feedback={feedback} resourceType="Encounter" />}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
