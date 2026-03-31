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

const schema = z.object({
  familyName: z.string().min(1, '請輸入姓氏'),
  givenName: z.string().min(1, '請輸入名字'),
  licenseNumber: z.string().min(1, '請輸入醫師證號'),
  qualification: z.string().min(1, '請輸入專科資格')
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Practitioner) => void
}

export default function PractitionerForm({ onSuccess }: Props): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { familyName: '', givenName: '', licenseNumber: '', qualification: '' }
  })

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const resource: Omit<fhir4.Practitioner, 'id'> = {
        resourceType: 'Practitioner',
        active: true,
        identifier: [{
          system: 'https://www.mohw.gov.tw/practitioner-license',
          value: data.licenseNumber
        }],
        name: [{
          use: 'official',
          text: `${data.familyName}${data.givenName}`,
          family: data.familyName,
          given: [data.givenName]
        }],
        qualification: [{
          identifier: [{
            system: 'https://www.mohw.gov.tw/qualification',
            value: data.licenseNumber
          }],
          code: {
            coding: [{
              system: 'http://snomed.info/sct',
              code: '309343006',
              display: 'Physician'
            }],
            text: data.qualification
          }
        }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Practitioner-EP']
        }
      }
      const created = await postResource<fhir4.Practitioner>('Practitioner', resource)
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prac-family">姓氏 *</Label>
          <Input id="prac-family" placeholder="例：李" {...register('familyName')} />
          {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="prac-given">名字 *</Label>
          <Input id="prac-given" placeholder="例：大華" {...register('givenName')} />
          {errors.givenName && <p className="text-xs text-destructive">{errors.givenName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license">醫師證號 *</Label>
        <Input id="license" placeholder="例：MD123456" {...register('licenseNumber')} />
        {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualification">專科資格 *</Label>
        <Input id="qualification" placeholder="例：內科專科醫師" {...register('qualification')} />
        {errors.qualification && <p className="text-xs text-destructive">{errors.qualification.message}</p>}
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Practitioner 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
