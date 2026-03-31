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

const schema = z.object({
  class: z.enum(['AMB', 'EMER', 'IMP'], { required_error: '請選擇就診類型' }),
  periodStart: z.string().min(1, '請選擇就診日期'),
  periodEnd: z.string().optional()
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Encounter) => void
}

export default function EncounterForm({ onSuccess }: Props): React.JSX.Element {
  const { resources } = useCreatorStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { class: undefined, periodStart: '', periodEnd: '' }
  })

  const selectedClass = watch('class')

  const CLASS_MAP = {
    AMB: { display: '門診 (Ambulatory)' },
    EMER: { display: '急診 (Emergency)' },
    IMP: { display: '住院 (Inpatient)' }
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
          display: CLASS_MAP[data.class].display
        },
        subject: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : undefined,
        period: {
          start: data.periodStart,
          ...(data.periodEnd ? { end: data.periodEnd } : {})
        },
        serviceProvider: resources.organization
          ? { reference: `Organization/${resources.organization.id}` }
          : undefined,
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Encounter-EP']
        }
      }
      const created = await postResource<fhir4.Encounter>('Encounter', resource)
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
        <Label>就診類型 *</Label>
        <Select value={selectedClass} onValueChange={(v) => setValue('class', v as FormData['class'])}>
          <SelectTrigger>
            <SelectValue placeholder="選擇就診類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AMB">門診 (Ambulatory)</SelectItem>
            <SelectItem value="EMER">急診 (Emergency)</SelectItem>
            <SelectItem value="IMP">住院 (Inpatient)</SelectItem>
          </SelectContent>
        </Select>
        {errors.class && <p className="text-xs text-destructive">{errors.class.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-start">就診開始日期 *</Label>
        <Input id="period-start" type="datetime-local" {...register('periodStart')} />
        {errors.periodStart && <p className="text-xs text-destructive">{errors.periodStart.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="period-end">就診結束日期（選填）</Label>
        <Input id="period-end" type="datetime-local" {...register('periodEnd')} />
      </div>

      {resources.patient && (
        <p className="text-xs text-muted-foreground">
          關聯病人：{resources.patient.name?.[0]?.text || 'Patient'} ({resources.patient.id})
        </p>
      )}

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Encounter 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
