import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, AlertCircle, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { postResource, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { encounterMocks } from '../../../mocks/mockPools'

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

interface Props {
  onSuccess: (resource: fhir4.Encounter) => void
}

export default function EncounterForm({ onSuccess }: Props): React.JSX.Element {
  const { resources } = useCreatorStore()
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.encounter.${k}`)

  const schema = useMemo(() => z.object({
    class:       z.enum(['AMB', 'EMER', 'IMP'], { required_error: f('type.required') }),
    periodStart: z.string().min(1, f('startDate.required')),
    periodEnd:   z.string().optional()
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = encounterMocks[mockIndexRef.current % encounterMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { class: undefined, periodStart: '', periodEnd: '' }
  })

  const selectedClass = watch('class')

  // datetime-local inputs return "YYYY-MM-DDTHH:MM" (no seconds);
  // FHIR requires at least "YYYY-MM-DDTHH:MM:SS".
  function toFhirDateTime(dt: string): string {
    return dt.length === 16 ? `${dt}:00` : dt
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const resource: Omit<fhir4.Encounter, 'id'> = {
        resourceType: 'Encounter',
        status: 'finished',
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
      const created = resultId
        ? await putResource<fhir4.Encounter>('Encounter', resultId, resource)
        : await postResource<fhir4.Encounter>('Encounter', resource)
      setResultId(created.id)
      setStatus('success')
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
        {errors.class && <p className="text-xs text-destructive">{errors.class.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-start">{f('startDate.label')} *</Label>
        <Input id="period-start" type="datetime-local" {...register('periodStart')} />
        {errors.periodStart && <p className="text-xs text-destructive">{errors.periodStart.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-end">{f('endDate.label')}</Label>
        <Input id="period-end" type="datetime-local" {...register('periodEnd')} />
      </div>

      {resources.patient && (
        <p className="text-xs text-muted-foreground">
          {t('forms.encounter.patientInfo', {
            name: resources.patient.name?.[0]?.text || 'Patient',
            id: resources.patient.id
          })}
        </p>
      )}

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {f('success').replace('{{id}}', '')}
            <code className="font-mono text-xs">{resultId}</code>
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
