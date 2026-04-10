import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import FormGuideCard from '../../../shared/components/FormGuideCard'
import FormErrorSummary from '../components/FormErrorSummary'
import CreatorFeedbackAlert from '../components/CreatorFeedbackAlert'
import FhirErrorAlert from '../../../shared/components/FhirErrorAlert'
import { buildFormErrorSummaryItems } from '../lib/formErrorSummary'
import { useCreatorMockFill, useLiveDemoTypedMockFill } from '../hooks/useCreatorMockFill'
import { useLiveDemoFormController } from '../hooks/useLiveDemoFormController'
import { mergeDraftValues, useCreatorDraftAutosave } from '../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource, resetLoggedRequests } from '../../../services/fhirClient'
import { useCreatorStore } from '../store/creatorStore'
import { useAppStore } from '../../../app/stores/appStore'

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
  const locale = useAppStore((s) => s.locale)
  const f = (k: string) => t(`forms.practitioner.${k}`)

  const schema = useMemo(() => z.object({
    familyName:    z.string().min(1, f('familyName.required')),
    givenName:     z.string().min(1, f('givenName.required')),
    licenseNumber: z.string().min(1, f('licenseNumber.required')),
    qualification: z.string().min(1, f('qualification.required'))
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(existingPractitionerId)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'updated' | 'reused'>('created')
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT'>(persistedFeedback?.requestMethod ?? 'POST')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome, requestMethod }
    : persistedFeedback

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
  const errorSummaryItems = useMemo(
    () => buildFormErrorSummaryItems<FormData>(errors, [
      { name: 'familyName', fieldId: 'prac-family', label: f('familyName.label') },
      { name: 'givenName', fieldId: 'prac-given', label: f('givenName.label') },
      { name: 'licenseNumber', fieldId: 'license', label: f('licenseNumber.label') },
      { name: 'qualification', fieldId: 'qualification', label: f('qualification.label') }
    ]),
    [errors, t]
  )

  const fillMock = useCreatorMockFill<FormData>('practitioner', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })
  const fillDemo = useLiveDemoTypedMockFill<FormData>('practitioner', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('practitioner', watch)

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('practitioner')
    try {
      const displayName = locale === 'en'
        ? `${data.familyName} ${data.givenName}`.trim()
        : `${data.familyName}${data.givenName}`.trim()
      const resource: Omit<fhir4.Practitioner, 'id'> = {
        resourceType: 'Practitioner',
        active: true,
        identifier: [{
          system: 'https://www.mohw.gov.tw/practitioner-license',
          value: data.licenseNumber
        }],
        name: [{
          use: 'official',
          text: displayName,
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
      const outcome = practitionerId ? 'updated' : reused ? 'reused' : 'created'
      const method = practitionerId ? 'PUT' : reused ? 'GET' : 'POST'
      setSaveOutcome(outcome)
      setRequestMethod(method)
      setResultId(created.id)
      setStatus('success')
      setFeedback('practitioner', {
        id: created.id,
        outcome,
        requestMethod: method
      })
      onSuccess(created)
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : tc('errors.unknown'))
    }
  }

  useLiveDemoFormController('practitioner', fillMock, handleSubmit, onSubmit, fillDemo)

  return (
    <form data-live-demo-form="practitioner" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      <FormErrorSummary
        title={t('forms.shared.errorSummaryTitle', { count: errorSummaryItems.length })}
        description={t('forms.shared.errorSummaryDescription')}
        items={errorSummaryItems}
      />

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

      {feedback && status !== 'loading' && <CreatorFeedbackAlert feedback={feedback} resourceType="Practitioner" />}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button data-live-demo-submit="practitioner" type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
