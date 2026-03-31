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

const COMMON_MEDS = [
  { code: 'N02BE01', display: '乙醯胺酚 (Acetaminophen)', system: 'atc' },
  { code: 'J01CA04', display: '安莫西林 (Amoxicillin)', system: 'atc' },
  { code: 'C09AA05', display: '雷米普利 (Ramipril)', system: 'atc' },
  { code: 'A02BC01', display: '奥美拉唑 (Omeprazole)', system: 'atc' },
  { code: 'N02AA01', display: '嗎啡 (Morphine)', system: 'atc' }
]

const DOSE_FORMS = [
  { code: 'TAB', display: '錠 (Tablet)' },
  { code: 'CAP', display: '膠囊 (Capsule)' },
  { code: 'SOL', display: '溶液 (Solution)' },
  { code: 'INJ', display: '注射劑 (Injection)' },
  { code: 'CRM', display: '乳膏 (Cream)' }
]

const schema = z.object({
  code: z.string().min(1, '請輸入藥品代碼'),
  display: z.string().min(1, '請輸入藥品名稱'),
  codeSystem: z.enum(['atc', 'nhi']).default('atc'),
  form: z.string().min(1, '請選擇劑型')
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Medication) => void
}

export default function MedicationForm({ onSuccess }: Props): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', display: '', codeSystem: 'atc', form: '' }
  })

  const codeSystem = watch('codeSystem')
  const selectedForm = watch('form')

  const SYSTEM_MAP = {
    atc: 'http://www.whocc.no/atc',
    nhi: 'https://www.nhi.gov.tw/drug-code'
  }

  function applyPreset(med: (typeof COMMON_MEDS)[0]): void {
    setValue('code', med.code)
    setValue('display', med.display)
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const formInfo = DOSE_FORMS.find(f => f.code === data.form)
      const resource: Omit<fhir4.Medication, 'id'> = {
        resourceType: 'Medication',
        code: {
          coding: [{
            system: SYSTEM_MAP[data.codeSystem],
            code: data.code,
            display: data.display
          }],
          text: data.display
        },
        form: formInfo ? {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
            code: formInfo.code,
            display: formInfo.display
          }],
          text: formInfo.display
        } : undefined,
        status: 'active',
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP']
        }
      }
      const created = await postResource<fhir4.Medication>('Medication', resource)
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
        <Label>常用藥品（快速選擇）</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_MEDS.map(med => (
            <button
              key={med.code}
              type="button"
              onClick={() => applyPreset(med)}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              {med.display.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>代碼系統</Label>
        <Select value={codeSystem} onValueChange={(v) => setValue('codeSystem', v as FormData['codeSystem'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="atc">ATC Code (WHO)</SelectItem>
            <SelectItem value="nhi">NHI Drug Code（健保藥碼）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="med-code">藥品代碼 *</Label>
          <Input id="med-code" placeholder="例：N02BE01" {...register('code')} className="font-mono" />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-display">藥品名稱 *</Label>
          <Input id="med-display" placeholder="例：乙醯胺酚" {...register('display')} />
          {errors.display && <p className="text-xs text-destructive">{errors.display.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>劑型 *</Label>
        <Select value={selectedForm} onValueChange={(v) => setValue('form', v)}>
          <SelectTrigger>
            <SelectValue placeholder="選擇劑型" />
          </SelectTrigger>
          <SelectContent>
            {DOSE_FORMS.map(f => (
              <SelectItem key={f.code} value={f.code}>{f.display}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.form && <p className="text-xs text-destructive">{errors.form.message}</p>}
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Medication 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
