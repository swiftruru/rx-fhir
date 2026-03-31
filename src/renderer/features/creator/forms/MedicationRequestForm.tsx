import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import FormGuideCard from '../../../components/FormGuideCard'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { medicationRequestMocks } from '../../../mocks/mockPools'

const MEDICATION_REQUEST_IDENTIFIER_SYSTEM = 'https://rxfhir.app/fhir/medication-request-key'

const ROUTE_CODES = ['26643006', '47625008', '78421000', '6064005', '46713006'] as const
const FREQ_CODES = ['QD', 'BID', 'TID', 'QID', 'PRN'] as const

type FormData = {
  doseValue: number
  doseUnit: string
  frequency: string
  route: string
  durationDays?: number
  note?: string
}

interface Props {
  onSuccess: (resource: fhir4.MedicationRequest) => void
}

export default function MedicationRequestForm({ onSuccess }: Props): React.JSX.Element {
  const { resources, setFeedback, clearFeedback } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.medicationRequest as Partial<FormData> | undefined)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.medicationRequest)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.medicationRequest.${k}`)

  const schema = useMemo(() => z.object({
    doseValue:    z.coerce.number({ invalid_type_error: f('doseValue.required') }).positive(f('doseValue.positive')),
    doseUnit:     z.string().min(1, f('doseUnit.required')),
    frequency:    z.string().min(1, f('frequency.required')),
    route:        z.string().min(1, f('route.required')),
    durationDays: z.coerce.number().int().positive().optional(),
    note:         z.string().optional()
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(resources.medicationRequest?.id)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'reused'>('created')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome }
    : persistedFeedback

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = medicationRequestMocks[mockIndexRef.current % medicationRequestMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => {
    const dosage = resources.medicationRequest?.dosageInstruction?.[0]
    const doseQuantity = dosage?.doseAndRate?.[0]?.doseQuantity
    const supplyDuration = resources.medicationRequest?.dispenseRequest?.expectedSupplyDuration?.value

    return mergeDraftValues({
      doseValue: doseQuantity?.value,
      doseUnit: doseQuantity?.unit ?? 'mg',
      frequency: dosage?.timing?.code?.coding?.[0]?.code ?? '',
      route: dosage?.route?.coding?.[0]?.code ?? '',
      durationDays: typeof supplyDuration === 'number' ? supplyDuration : undefined,
      note: dosage?.patientInstruction ?? ''
    }, draftValues)
  }, [draftValues, resources.medicationRequest])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  useCreatorDraftAutosave('medicationRequest', watch)
  const selectedFreq = watch('frequency')
  const selectedRoute = watch('route')

  function buildMedicationRequestIdentifierValue(data: FormData): string {
    return JSON.stringify({
      patient: resources.patient?.identifier?.[0]?.value ?? resources.patient?.id ?? '',
      medication: resources.medication?.code?.coding?.[0]?.code ?? resources.medication?.id ?? '',
      encounter: resources.encounter?.id ?? '',
      requester: resources.practitioner?.id ?? '',
      doseValue: data.doseValue,
      doseUnit: data.doseUnit,
      frequency: data.frequency,
      route: data.route,
      durationDays: data.durationDays ?? '',
      note: data.note ?? ''
    })
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('medicationRequest')
    try {
      if (!resources.medication) throw new Error(f('missingMedication'))
      if (!resources.patient) throw new Error(tc('errors.unknown'))

      const routeDisplay = t(`forms.medicationRequest.route.options.${data.route}`)
      const freqDisplay = t(`forms.medicationRequest.frequency.options.${data.frequency}`)

      const dosageInstruction: fhir4.Dosage = {
        text: `${data.doseValue} ${data.doseUnit} ${data.frequency}`,
        route: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: data.route,
            display: routeDisplay
          }]
        },
        doseAndRate: [{
          doseQuantity: {
            value: data.doseValue,
            unit: data.doseUnit,
            system: 'http://unitsofmeasure.org'
          }
        }],
        timing: {
          code: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation',
              code: data.frequency
            }],
            text: freqDisplay
          }
        }
      }

      if (data.note) dosageInstruction.patientInstruction = data.note

      const resource: Omit<fhir4.MedicationRequest, 'id'> = {
        resourceType: 'MedicationRequest',
        identifier: [{
          system: MEDICATION_REQUEST_IDENTIFIER_SYSTEM,
          value: buildMedicationRequestIdentifierValue(data)
        }],
        status: 'active',
        intent: 'order',
        medicationReference: {
          reference: `Medication/${resources.medication.id}`,
          display: resources.medication.code?.text
        },
        subject: { reference: `Patient/${resources.patient.id}` },
        requester: resources.practitioner
          ? { reference: `Practitioner/${resources.practitioner.id}` }
          : undefined,
        encounter: resources.encounter
          ? { reference: `Encounter/${resources.encounter.id}` }
          : undefined,
        dosageInstruction: [dosageInstruction],
        dispenseRequest: data.durationDays ? {
          expectedSupplyDuration: {
            value: data.durationDays,
            unit: 'days',
            system: 'http://unitsofmeasure.org',
            code: 'd'
          }
        } : undefined,
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/MedicationRequest-EP']
        }
      }

      const existingMedicationRequestId = resultId ?? resources.medicationRequest?.id
      let reused = false
      const created = existingMedicationRequestId
        ? await putResource<fhir4.MedicationRequest>('MedicationRequest', existingMedicationRequestId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.MedicationRequest>(
              'MedicationRequest',
              {
                identifier: `${MEDICATION_REQUEST_IDENTIFIER_SYSTEM}|${buildMedicationRequestIdentifierValue(data)}`
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
      setFeedback('medicationRequest', {
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
      {resources.medication && (
        <div className="p-3 rounded-md bg-muted text-sm">
          {f('medicationPreview')}<strong>{resources.medication.code?.text || resources.medication.id}</strong>
        </div>
      )}
      {!resources.medication && (
        <Alert variant="warning">
          <AlertDescription>{f('missingMedication')}</AlertDescription>
        </Alert>
      )}

      <FormGuideCard title={f('introTitle')} description={f('introHint')} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dose-val">{f('doseValue.label')} *</Label>
          <Input id="dose-val" type="number" step="any" placeholder={f('doseValue.placeholder')} {...register('doseValue')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('doseValue.hint')}</p>
          {errors.doseValue && <p className="text-xs text-destructive">{errors.doseValue.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dose-unit">{f('doseUnit.label')} *</Label>
          <Input id="dose-unit" placeholder={f('doseUnit.placeholder')} {...register('doseUnit')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('doseUnit.hint')}</p>
          {errors.doseUnit && <p className="text-xs text-destructive">{errors.doseUnit.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{f('frequency.label')} *</Label>
        <Select value={selectedFreq} onValueChange={(v) => setValue('frequency', v)}>
          <SelectTrigger>
            <SelectValue placeholder={f('frequency.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {FREQ_CODES.map(code => (
              <SelectItem key={code} value={code}>{f(`frequency.options.${code}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('frequency.hint')}</p>
        {errors.frequency && <p className="text-xs text-destructive">{errors.frequency.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{f('route.label')} *</Label>
        <Select value={selectedRoute} onValueChange={(v) => setValue('route', v)}>
          <SelectTrigger>
            <SelectValue placeholder={f('route.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {ROUTE_CODES.map(code => (
              <SelectItem key={code} value={code}>{f(`route.options.${code}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('route.hint')}</p>
        {errors.route && <p className="text-xs text-destructive">{errors.route.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="duration">{f('durationDays.label')}</Label>
          <Input id="duration" type="number" placeholder={f('durationDays.placeholder')} {...register('durationDays')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('durationDays.hint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">{f('note.label')}</Label>
          <Input id="note" placeholder={f('note.placeholder')} {...register('note')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('note.hint')}</p>
        </div>
      </div>

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

      {feedback && status !== 'loading' && (
        <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {feedback.outcome === 'reused'
              ? tc('fhir.resourceReused', { resourceType: 'MedicationRequest', id: feedback.id })
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

      <Button type="submit" disabled={status === 'loading' || !resources.medication} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
