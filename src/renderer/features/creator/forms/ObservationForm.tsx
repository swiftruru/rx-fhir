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
import { observationMocks } from '../../../mocks/mockPools'

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
  const { resources } = useCreatorStore()
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
  const [errorMsg, setErrorMsg] = useState<string>()

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = observationMocks[mockIndexRef.current % observationMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => ({
    loincCode: resources.observation?.code?.coding?.[0]?.code ?? '',
    display: resources.observation?.code?.coding?.[0]?.display ?? resources.observation?.code?.text ?? '',
    value: resources.observation?.valueQuantity?.value,
    unit: resources.observation?.valueQuantity?.unit ?? '',
    status: resources.observation?.status as FormData['status'] | undefined
  }), [resources.observation])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  const selectedStatus = watch('status')

  function applyPreset(obs: (typeof COMMON_OBS)[0]): void {
    setValue('loincCode', obs.loincCode)
    setValue('display', t(`forms.observation.presets.${obs.loincCode}`))
    setValue('unit', obs.unit)
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const resource: Omit<fhir4.Observation, 'id'> = {
        resourceType: 'Observation',
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
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP']
        }
      }
      const existingObservationId = resultId ?? resources.observation?.id
      const created = existingObservationId
        ? await putResource<fhir4.Observation>('Observation', existingObservationId, resource)
        : await postResource<fhir4.Observation>('Observation', resource)
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="loinc">{f('loincCode.label')} *</Label>
          <Input id="loinc" placeholder={f('loincCode.placeholder')} {...register('loincCode')} className="font-mono" />
          {errors.loincCode && <p className="text-xs text-destructive">{errors.loincCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-display">{f('itemName.label')} *</Label>
          <Input id="obs-display" placeholder={f('itemName.placeholder')} {...register('display')} />
          {errors.display && <p className="text-xs text-destructive">{errors.display.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="obs-value">{f('value.label')} *</Label>
          <Input id="obs-value" type="number" step="any" placeholder={f('value.placeholder')} {...register('value')} />
          {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-unit">{f('unit.label')} *</Label>
          <Input id="obs-unit" placeholder={f('unit.placeholder')} {...register('unit')} />
          {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{f('status.label')}</Label>
        <Select value={selectedStatus} onValueChange={(v) => setValue('status', v as FormData['status'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['final', 'preliminary', 'amended'] as const).map(v => (
              <SelectItem key={v} value={v}>{f(`status.options.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
