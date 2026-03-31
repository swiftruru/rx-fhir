import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, AlertCircle, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { findOrCreate, putResource } from '../../../services/fhirClient'
import { organizationMocks } from '../../../mocks/mockPools'

type FormData = { name: string; identifier: string; type: 'hospital' | 'clinic' | 'pharmacy' }

interface Props {
  onSuccess: (resource: fhir4.Organization) => void
  defaultValues?: Partial<FormData>
}

const TYPE_MAP = {
  hospital: { code: 'HOSP' },
  clinic:   { code: 'PROV' },
  pharmacy: { code: 'PHARM' }
}

export default function OrganizationForm({ onSuccess, defaultValues }: Props): React.JSX.Element {
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.organization.${k}`)

  const schema = useMemo(() => z.object({
    name:       z.string().min(1, f('name.required')),
    identifier: z.string().min(1, f('identifier.required')),
    type:       z.enum(['hospital', 'clinic', 'pharmacy'], { required_error: f('type.required') })
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = organizationMocks[mockIndexRef.current % organizationMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: '', identifier: '', type: undefined }
  })

  const selectedType = watch('type')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const typeCode = TYPE_MAP[data.type].code
      const typeDisplay = t(`forms.organization.type.options.${data.type}`)
      const resource: Omit<fhir4.Organization, 'id'> = {
        resourceType: 'Organization',
        active: true,
        type: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: typeCode, display: typeDisplay }] }],
        name: data.name,
        identifier: [{ system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/organization-identifier', value: data.identifier }],
        meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Organization-EP'] }
      }
      const created = resultId
        ? await putResource<fhir4.Organization>('Organization', resultId, resource)
        : await findOrCreate<fhir4.Organization>(
            'Organization',
            { identifier: `https://twcore.mohw.gov.tw/ig/emr/CodeSystem/organization-identifier|${data.identifier}` },
            resource
          )
      setResultId(created.id)
      setStatus('success')
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
      <div className="space-y-2">
        <Label htmlFor="org-name">{f('name.label')} *</Label>
        <Input id="org-name" placeholder={f('name.placeholder')} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-id">{f('identifier.label')} *</Label>
        <Input id="org-id" placeholder={f('identifier.placeholder')} {...register('identifier')} />
        {errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{f('type.label')} *</Label>
        <Select value={selectedType} onValueChange={(v) => setValue('type', v as FormData['type'])}>
          <SelectTrigger>
            <SelectValue placeholder={f('type.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {(['hospital', 'clinic', 'pharmacy'] as const).map(v => (
              <SelectItem key={v} value={v}>{f(`type.options.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      {status === 'success' && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {f('success').replace('{{id}}', '')}
            <code className="font-mono text-xs">{resultId}</code>
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
