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
  familyName: z.string().min(1, '請輸入姓氏'),
  givenName: z.string().min(1, '請輸入名字'),
  studentId: z.string().min(1, '請輸入學號（作為 identifier）'),
  gender: z.enum(['male', 'female', 'other', 'unknown'], { required_error: '請選擇性別' }),
  birthDate: z.string().min(1, '請輸入出生日期')
})

type FormData = z.infer<typeof schema>

interface Props {
  onSuccess: (resource: fhir4.Patient) => void
}

export default function PatientForm({ onSuccess }: Props): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { familyName: '', givenName: '', studentId: '', gender: undefined, birthDate: '' }
  })

  const selectedGender = watch('gender')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const resource: Omit<fhir4.Patient, 'id'> = {
        resourceType: 'Patient',
        identifier: [{
          use: 'official',
          system: 'https://www.moe.edu.tw/student-id',
          value: data.studentId,
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'SB',
              display: 'Student Number'
            }]
          }
        }],
        name: [{
          use: 'official',
          text: `${data.familyName}${data.givenName}`,
          family: data.familyName,
          given: [data.givenName]
        }],
        gender: data.gender,
        birthDate: data.birthDate,
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP']
        }
      }
      const created = await postResource<fhir4.Patient>('Patient', resource)
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
          <Label htmlFor="family-name">姓氏 *</Label>
          <Input id="family-name" placeholder="例：王" {...register('familyName')} />
          {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="given-name">名字 *</Label>
          <Input id="given-name" placeholder="例：小明" {...register('givenName')} />
          {errors.givenName && <p className="text-xs text-destructive">{errors.givenName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="student-id">學號 (Identifier) *</Label>
        <Input
          id="student-id"
          placeholder="例：B12345678"
          {...register('studentId')}
          className="font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          ★ 依規格要求，Patient.identifier 使用學號
        </p>
        {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>性別 *</Label>
        <Select value={selectedGender} onValueChange={(v) => setValue('gender', v as FormData['gender'])}>
          <SelectTrigger>
            <SelectValue placeholder="選擇性別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">男 (male)</SelectItem>
            <SelectItem value="female">女 (female)</SelectItem>
            <SelectItem value="other">其他 (other)</SelectItem>
            <SelectItem value="unknown">未知 (unknown)</SelectItem>
          </SelectContent>
        </Select>
        {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth-date">出生日期 *</Label>
        <Input id="birth-date" type="date" {...register('birthDate')} />
        {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Patient 已成功建立！ID: <code className="font-mono text-xs">{resultId}</code>
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
