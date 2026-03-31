import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { postResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'

// Common ICD-10 codes for quick selection
const COMMON_ICD10 = [
  { code: 'J06.9', display: '急性上呼吸道感染' },
  { code: 'I10', display: '原發性高血壓' },
  { code: 'E11.9', display: '第2型糖尿病，無併發症' },
  { code: 'J18.9', display: '肺炎，未明示' },
  { code: 'K29.7', display: '胃炎，未明示' },
  { code: 'M54.5', display: '下背痛' }
]

const schema = z.object({
  icdCode: z.string().min(1, '請輸入 ICD-10 診斷碼'),
  icdDisplay: z.string().min(1, '請輸入診斷名稱'),
  clinicalStatus: z.enum(['active', 'resolved', 'inactive']).default('active')
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Condition) => void
}

export default function ConditionForm({ onSuccess }: Props): React.JSX.Element {
  const { resources } = useCreatorStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { icdCode: '', icdDisplay: '', clinicalStatus: 'active' }
  })

  function applyPreset(code: string, display: string): void {
    setValue('icdCode', code)
    setValue('icdDisplay', display)
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const resource: Omit<fhir4.Condition, 'id'> = {
        resourceType: 'Condition',
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
      const created = await postResource<fhir4.Condition>('Condition', resource)
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
      {/* Quick presets */}
      <div className="space-y-2">
        <Label>常用診斷碼（快速選擇）</Label>
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
        <Label htmlFor="icd-code">ICD-10 診斷碼 *</Label>
        <Input id="icd-code" placeholder="例：J06.9" {...register('icdCode')} className="font-mono" />
        {errors.icdCode && <p className="text-xs text-destructive">{errors.icdCode.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="icd-display">診斷名稱 *</Label>
        <Input id="icd-display" placeholder="例：急性上呼吸道感染" {...register('icdDisplay')} />
        {errors.icdDisplay && <p className="text-xs text-destructive">{errors.icdDisplay.message}</p>}
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Condition 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
