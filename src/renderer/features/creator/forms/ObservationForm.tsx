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

const COMMON_OBS = [
  { loincCode: '8867-4', display: '心率', unit: 'beats/min', system: 'http://unitsofmeasure.org' },
  { loincCode: '8480-6', display: '收縮壓', unit: 'mmHg', system: 'http://unitsofmeasure.org' },
  { loincCode: '8462-4', display: '舒張壓', unit: 'mmHg', system: 'http://unitsofmeasure.org' },
  { loincCode: '2345-7', display: '血糖', unit: 'mg/dL', system: 'http://unitsofmeasure.org' },
  { loincCode: '2093-3', display: '總膽固醇', unit: 'mg/dL', system: 'http://unitsofmeasure.org' },
  { loincCode: '29463-7', display: '體重', unit: 'kg', system: 'http://unitsofmeasure.org' }
]

const schema = z.object({
  loincCode: z.string().min(1, '請輸入 LOINC 代碼'),
  display: z.string().min(1, '請輸入檢驗項目名稱'),
  value: z.coerce.number({ invalid_type_error: '請輸入數值' }),
  unit: z.string().min(1, '請輸入單位'),
  status: z.enum(['final', 'preliminary', 'amended']).default('final')
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Observation) => void
}

export default function ObservationForm({ onSuccess }: Props): React.JSX.Element {
  const { resources } = useCreatorStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { loincCode: '', display: '', value: undefined, unit: '', status: 'final' }
  })

  const selectedStatus = watch('status')

  function applyPreset(obs: (typeof COMMON_OBS)[0]): void {
    setValue('loincCode', obs.loincCode)
    setValue('display', obs.display)
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
      const created = await postResource<fhir4.Observation>('Observation', resource)
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
      <div className="space-y-2">
        <Label>常用檢驗項目（快速選擇）</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_OBS.map((obs) => (
            <button
              key={obs.loincCode}
              type="button"
              onClick={() => applyPreset(obs)}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              {obs.display}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="loinc">LOINC 代碼 *</Label>
          <Input id="loinc" placeholder="例：8867-4" {...register('loincCode')} className="font-mono" />
          {errors.loincCode && <p className="text-xs text-destructive">{errors.loincCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-display">項目名稱 *</Label>
          <Input id="obs-display" placeholder="例：心率" {...register('display')} />
          {errors.display && <p className="text-xs text-destructive">{errors.display.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="obs-value">數值 *</Label>
          <Input id="obs-value" type="number" step="any" placeholder="例：80" {...register('value')} />
          {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs-unit">單位 *</Label>
          <Input id="obs-unit" placeholder="例：beats/min" {...register('unit')} />
          {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>狀態</Label>
        <Select value={selectedStatus} onValueChange={(v) => setValue('status', v as FormData['status'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="final">final（最終結果）</SelectItem>
            <SelectItem value="preliminary">preliminary（初步結果）</SelectItem>
            <SelectItem value="amended">amended（已修訂）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Observation 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={status === 'loading'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? '重新提交' : 'POST 至 FHIR Server'}
      </Button>
    </form>
  )
}
