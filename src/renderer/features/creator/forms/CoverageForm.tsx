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

const COVERAGE_TYPES = [
  { code: 'EHCPOL', display: '全民健保（NHI）', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
  { code: 'PAY', display: '自費', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' },
  { code: 'PUBLICPOL', display: '公務人員保險', system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode' }
]

const schema = z.object({
  type: z.string().min(1, '請選擇保險類型'),
  subscriberId: z.string().min(1, '請輸入保險 ID / 健保卡號'),
  periodStart: z.string().min(1, '請輸入保險生效日期'),
  periodEnd: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Coverage) => void
}

export default function CoverageForm({ onSuccess }: Props): React.JSX.Element {
  const { resources } = useCreatorStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: '', subscriberId: '', periodStart: '', periodEnd: '' }
  })

  const selectedType = watch('type')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const typeInfo = COVERAGE_TYPES.find(t => t.code === data.type) || COVERAGE_TYPES[0]
      const resource: Omit<fhir4.Coverage, 'id'> = {
        resourceType: 'Coverage',
        status: 'active',
        type: {
          coding: [{
            system: typeInfo.system,
            code: typeInfo.code,
            display: typeInfo.display
          }],
          text: typeInfo.display
        },
        subscriber: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : undefined,
        beneficiary: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : { display: 'Unknown' },
        subscriberId: data.subscriberId,
        period: {
          start: data.periodStart,
          ...(data.periodEnd ? { end: data.periodEnd } : {})
        },
        payor: [{
          display: '全民健康保險'
        }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EP']
        }
      }
      const created = await postResource<fhir4.Coverage>('Coverage', resource)
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
        <Label>保險類型 *</Label>
        <Select value={selectedType} onValueChange={(v) => setValue('type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="選擇保險類型" />
          </SelectTrigger>
          <SelectContent>
            {COVERAGE_TYPES.map(t => (
              <SelectItem key={t.code} value={t.code}>{t.display}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subscriber-id">健保卡號 / 保險 ID *</Label>
        <Input id="subscriber-id" placeholder="例：A123456789" {...register('subscriberId')} />
        {errors.subscriberId && <p className="text-xs text-destructive">{errors.subscriberId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cov-start">生效日期 *</Label>
          <Input id="cov-start" type="date" {...register('periodStart')} />
          {errors.periodStart && <p className="text-xs text-destructive">{errors.periodStart.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cov-end">到期日期（選填）</Label>
          <Input id="cov-end" type="date" {...register('periodEnd')} />
        </div>
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Coverage 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
