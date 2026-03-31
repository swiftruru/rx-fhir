import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import FormGuideCard from '../../../components/FormGuideCard'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { practitionerMocks } from '../../../mocks/mockPools'

type FormData = {
  familyName: string
  givenName: string
  licenseNumber: string
  qualification: string
}

interface Props {
  onSuccess: (resource: fhir4.Practitioner) => void
}

export default function PractitionerForm({ onSuccess }: Props): React.JSX.Element {
  const existingPractitioner = useCreatorStore((s) => s.resources.practitioner as fhir4.Practitioner | undefined)
  const existingPractitionerId = existingPractitioner?.id
  const setFeedback = useCreatorStore((s) => s.setFeedback)
  const clearFeedback = useCreatorStore((s) => s.clearFeedback)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.practitioner)
  const draftValues = useCreatorStore((s) => s.drafts.practitioner as Partial<FormData> | undefined)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.practitioner.${k}`)

  const schema = useMemo(() => z.object({
    familyName:    z.string().min(1, f('familyName.required')),
    givenName:     z.string().min(1, f('givenName.required')),
    licenseNumber: z.string().min(1, f('licenseNumber.required')),
    qualification: z.string().min(1, f('qualification.required'))
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(existingPractitionerId)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'reused'>('created')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome }
    : persistedFeedback

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = practitionerMocks[mockIndexRef.current % practitionerMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    familyName: existingPractitioner?.name?.[0]?.family ?? '',
    givenName: existingPractitioner?.name?.[0]?.given?.[0] ?? '',
    licenseNumber: existingPractitioner?.identifier?.[0]?.value ?? '',
    qualification: existingPractitioner?.qualification?.[0]?.code?.text ?? ''
  }, draftValues), [draftValues, existingPractitioner])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  useCreatorDraftAutosave('practitioner', watch)

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('practitioner')
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
      const practitionerId = resultId ?? existingPractitionerId
      let reused = false
      const created = practitionerId
        ? await putResource<fhir4.Practitioner>('Practitioner', practitionerId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Practitioner>(
              'Practitioner',
              { identifier: `https://www.mohw.gov.tw/practitioner-license|${data.licenseNumber}` },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      setSaveOutcome(reused ? 'reused' : 'created')
      setResultId(created.id)
      setStatus('success')
      setFeedback('practitioner', {
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prac-family">{f('familyName.label')} *</Label>
          <Input id="prac-family" placeholder={f('familyName.placeholder')} {...register('familyName')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('familyName.hint')}</p>
          {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="prac-given">{f('givenName.label')} *</Label>
          <Input id="prac-given" placeholder={f('givenName.placeholder')} {...register('givenName')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('givenName.hint')}</p>
          {errors.givenName && <p className="text-xs text-destructive">{errors.givenName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="license">{f('licenseNumber.label')} *</Label>
        <Input id="license" placeholder={f('licenseNumber.placeholder')} {...register('licenseNumber')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('licenseNumber.hint')}</p>
        {errors.licenseNumber && <p className="text-xs text-destructive">{errors.licenseNumber.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualification">{f('qualification.label')} *</Label>
        <Input id="qualification" placeholder={f('qualification.placeholder')} {...register('qualification')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('qualification.hint')}</p>
        {errors.qualification && <p className="text-xs text-destructive">{errors.qualification.message}</p>}
      </div>

      {feedback && status !== 'loading' && (
        <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {feedback.outcome === 'reused'
              ? tc('fhir.resourceReused', { resourceType: 'Practitioner', id: feedback.id })
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
