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

const schema = z.object({
  name: z.string().min(1, '請輸入機構名稱'),
  identifier: z.string().min(1, '請輸入機構代碼'),
  type: z.enum(['hospital', 'clinic', 'pharmacy'], { required_error: '請選擇機構類型' })
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Organization) => void
  defaultValues?: Partial<FormData>
}

const TYPE_MAP = {
  hospital: { code: 'HOSP', display: '醫院' },
  clinic: { code: 'PROV', display: '診所' },
  pharmacy: { code: 'PHARM', display: '藥局' }
}

export default function OrganizationForm({ onSuccess, defaultValues }: Props): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: '', identifier: '', type: undefined }
  })

  const selectedType = watch('type')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const typeInfo = TYPE_MAP[data.type]
      const resource: Omit<fhir4.Organization, 'id'> = {
        resourceType: 'Organization',
        active: true,
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/organization-type',
            code: typeInfo.code,
            display: typeInfo.display
          }]
        }],
        name: data.name,
        identifier: [{
          system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/organization-identifier',
          value: data.identifier
        }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP']
        }
      }
      const created = await postResource<fhir4.Organization>('Organization', resource)
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
        <Label htmlFor="org-name">機構名稱 *</Label>
        <Input id="org-name" placeholder="例：臺大醫院" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-id">機構代碼 *</Label>
        <Input id="org-id" placeholder="例：0101020011" {...register('identifier')} />
        {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>機構類型 *</Label>
        <Select value={selectedType} onValueChange={(v) => setValue('type', v as FormData['type'])}>
          <SelectTrigger>
            <SelectValue placeholder="選擇機構類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hospital">醫院</SelectItem>
            <SelectItem value="clinic">診所</SelectItem>
            <SelectItem value="pharmacy">藥局</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Organization 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
