import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { postResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'

const ROUTES = [
  { code: '26643006', display: '口服 (Oral)' },
  { code: '47625008', display: '靜脈注射 (IV)' },
  { code: '78421000', display: '肌肉注射 (IM)' },
  { code: '6064005', display: '局部外用 (Topical)' },
  { code: '46713006', display: '鼻腔給藥 (Nasal)' }
]

const FREQ_MAP = {
  'QD': '每日一次 (QD)',
  'BID': '每日兩次 (BID)',
  'TID': '每日三次 (TID)',
  'QID': '每日四次 (QID)',
  'PRN': '需要時給藥 (PRN)'
}

const schema = z.object({
  doseValue: z.coerce.number({ invalid_type_error: '請輸入劑量數值' }).positive('劑量必須大於 0'),
  doseUnit: z.string().min(1, '請輸入劑量單位'),
  frequency: z.string().min(1, '請選擇給藥頻率'),
  route: z.string().min(1, '請選擇給藥途徑'),
  durationDays: z.coerce.number().int().positive('天數必須大於 0').optional(),
  note: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.MedicationRequest) => void
}

export default function MedicationRequestForm({ onSuccess }: Props): React.JSX.Element {
  const { resources } = useCreatorStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { doseValue: undefined, doseUnit: 'mg', frequency: '', route: '', durationDays: undefined, note: '' }
  })

  const selectedFreq = watch('frequency')
  const selectedRoute = watch('route')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      if (!resources.medication) throw new Error('請先建立 Medication Resource')
      if (!resources.patient) throw new Error('請先建立 Patient Resource')

      const routeInfo = ROUTES.find(r => r.code === data.route)

      const dosageInstruction: fhir4.Dosage = {
        text: `${data.doseValue} ${data.doseUnit} ${data.frequency}`,
        route: routeInfo ? {
          coding: [{
            system: 'http://snomed.info/sct',
            code: routeInfo.code,
            display: routeInfo.display
          }]
        } : undefined,
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
            text: FREQ_MAP[data.frequency as keyof typeof FREQ_MAP] || data.frequency
          }
        }
      }

      if (data.note) dosageInstruction.patientInstruction = data.note

      const resource: Omit<fhir4.MedicationRequest, 'id'> = {
        resourceType: 'MedicationRequest',
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

      const created = await postResource<fhir4.MedicationRequest>('MedicationRequest', resource)
      setResultId(created.id)
      setStatus('success')
      onSuccess(created)
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : '發生未知錯誤')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {resources.medication && (
        <div className="p-3 rounded-md bg-muted text-sm">
          藥品：<strong>{resources.medication.code?.text || resources.medication.id}</strong>
        </div>
      )}
      {!resources.medication && (
        <Alert variant="warning">
          <AlertDescription>請先完成步驟 8「藥品資訊」再建立處方箋。</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dose-val">劑量 *</Label>
          <Input id="dose-val" type="number" step="any" placeholder="例：500" {...register('doseValue')} />
          {errors.doseValue && <p className="text-xs text-destructive">{errors.doseValue.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dose-unit">單位 *</Label>
          <Input id="dose-unit" placeholder="例：mg" {...register('doseUnit')} />
          {errors.doseUnit && <p className="text-xs text-destructive">{errors.doseUnit.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>給藥頻率 *</Label>
        <Select value={selectedFreq} onValueChange={(v) => setValue('frequency', v)}>
          <SelectTrigger>
            <SelectValue placeholder="選擇頻率" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FREQ_MAP).map(([code, label]) => (
              <SelectItem key={code} value={code}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.frequency && <p className="text-xs text-destructive">{errors.frequency.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>給藥途徑 *</Label>
        <Select value={selectedRoute} onValueChange={(v) => setValue('route', v)}>
          <SelectTrigger>
            <SelectValue placeholder="選擇給藥途徑" />
          </SelectTrigger>
          <SelectContent>
            {ROUTES.map(r => (
              <SelectItem key={r.code} value={r.code}>{r.display}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.route && <p className="text-xs text-destructive">{errors.route.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="duration">給藥天數（選填）</Label>
          <Input id="duration" type="number" placeholder="例：7" {...register('durationDays')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">用藥說明（選填）</Label>
          <Input id="note" placeholder="例：飯後服用" {...register('note')} />
        </div>
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            MedicationRequest 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={status === 'loading' || !resources.medication} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? '重新提交' : 'POST 至 FHIR Server'}
      </Button>
    </form>
  )
}
