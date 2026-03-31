import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import FormGuideCard from '../../../components/FormGuideCard'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
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
  const existingOrganization = useCreatorStore((s) => s.resources.organization as fhir4.Organization | undefined)
  const existingOrganizationId = existingOrganization?.id
  const setFeedback = useCreatorStore((s) => s.setFeedback)
  const clearFeedback = useCreatorStore((s) => s.clearFeedback)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.organization)
  const draftValues = useCreatorStore((s) => s.drafts.organization as Partial<FormData> | undefined)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.organization.${k}`)

  const schema = useMemo(() => z.object({
    name:       z.string().min(1, f('name.required')),
    identifier: z.string().min(1, f('identifier.required')),
    type:       z.enum(['hospital', 'clinic', 'pharmacy'], { required_error: f('type.required') })
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(existingOrganizationId)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'reused'>('created')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome }
    : persistedFeedback

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = organizationMocks[mockIndexRef.current % organizationMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => {
    const existingType = Object.entries(TYPE_MAP).find(([, value]) => (
      value.code === existingOrganization?.type?.[0]?.coding?.[0]?.code
    ))?.[0] as FormData['type'] | undefined

    return mergeDraftValues({
      name: existingOrganization?.name ?? '',
      identifier: existingOrganization?.identifier?.[0]?.value ?? '',
      type: existingType,
      ...defaultValues
    }, draftValues)
  }, [defaultValues, draftValues, existingOrganization])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  useCreatorDraftAutosave('organization', watch)
  const selectedType = watch('type')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('organization')
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
      const organizationId = resultId ?? existingOrganizationId
      let reused = false
      const created = organizationId
        ? await putResource<fhir4.Organization>('Organization', organizationId, resource)
        : await (async () => {
          const result = await findOrCreateDetailed<fhir4.Organization>(
          'Organization',
          { identifier: `https://twcore.mohw.gov.tw/ig/emr/CodeSystem/organization-identifier|${data.identifier}` },
          resource
        )
          reused = result.reused
          return result.resource
        })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      setSaveOutcome(reused ? 'reused' : 'created')
      setResultId(created.id)
      setStatus('success')
      setFeedback('organization', {
        id: created.id,
        outcome: reused ? 'reused' : 'created'
      })
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

      <FormGuideCard title={f('introTitle')} description={f('introHint')} />

      <FormGuideCard title={f('examplesTitle')} variant="examples">
        <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
          {[f('example1'), f('example2')].map((example) => (
            <li key={example} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span>{example}</span>
            </li>
          ))}
        </ul>
      </FormGuideCard>

      <div className="space-y-2">
        <Label htmlFor="org-name">{f('name.label')} *</Label>
        <Input id="org-name" placeholder={f('name.placeholder')} {...register('name')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('name.hint')}</p>
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-id">{f('identifier.label')} *</Label>
        <Input id="org-id" placeholder={f('identifier.placeholder')} {...register('identifier')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('identifier.hint')}</p>
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
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('type.hint')}</p>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      {feedback && status !== 'loading' && (
        <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {feedback.outcome === 'reused'
              ? tc('fhir.resourceReused', { resourceType: 'Organization', id: feedback.id })
              : (
                  <>
                    {f('success').replace('{{id}}', '')}
                    <code className="font-mono text-xs">{feedback.id}</code>
                  </>
                )}
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
