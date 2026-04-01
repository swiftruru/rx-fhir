import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import FormGuideCard from '../../../components/FormGuideCard'
import CreatorFeedbackAlert from '../../../components/CreatorFeedbackAlert'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { useLiveDemoTypedMockFill } from '../../../hooks/useCreatorMockFill'
import { useLiveDemoFormController } from '../../../hooks/useLiveDemoFormController'
import { getPrimaryDemoScenarioId, getScenarioMock } from '../../../mocks/selectors'
import { findOrCreateDetailed, putResource, resetLoggedRequests } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { useHistoryStore } from '../../../store/historyStore'
import { useAppStore } from '../../../store/appStore'
import { useMockStore } from '../../../store/mockStore'

type FormData = {
  familyName: string
  givenName: string
  studentId: string
  gender: 'male' | 'female' | 'other' | 'unknown'
  birthDate: string
}

interface Props {
  onSuccess: (resource: fhir4.Patient) => void
}

export default function PatientForm({ onSuccess }: Props): React.JSX.Element {
  const existingPatient = useCreatorStore((s) => s.resources.patient as fhir4.Patient | undefined)
  const existingPatientId = existingPatient?.id
  const setFeedback = useCreatorStore((s) => s.setFeedback)
  const clearFeedback = useCreatorStore((s) => s.clearFeedback)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.patient)
  const draftValues = useCreatorStore((s) => s.drafts.patient as Partial<FormData> | undefined)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const addRecord = useHistoryStore((s) => s.addRecord)
  const serverUrl = useAppStore((s) => s.serverUrl)
  const locale = useAppStore((s) => s.locale)
  const activateScenario = useMockStore((s) => s.activateScenario)
  const getRandomCreatorMock = useMockStore((s) => s.getRandomCreatorMock)
  const f = (k: string) => t(`forms.patient.${k}`)

  const schema = useMemo(() => z.object({
    familyName: z.string().min(1, f('familyName.required')),
    givenName:  z.string().min(1, f('givenName.required')),
    studentId:  z.string().min(1, f('studentId.required')),
    gender:     z.enum(['male', 'female', 'other', 'unknown'], { required_error: f('gender.required') }),
    birthDate:  z.string().min(1, f('birthDate.required'))
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(existingPatientId)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'updated' | 'reused'>('created')
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT'>(persistedFeedback?.requestMethod ?? 'POST')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome, requestMethod }
    : persistedFeedback

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    familyName: existingPatient?.name?.[0]?.family ?? '',
    givenName: existingPatient?.name?.[0]?.given?.[0] ?? '',
    studentId: existingPatient?.identifier?.[0]?.value ?? '',
    gender: existingPatient?.gender as FormData['gender'] | undefined,
    birthDate: existingPatient?.birthDate ?? ''
  }, draftValues), [draftValues, existingPatient])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  const firstMockRef = useRef(true)
  function applyMock(data?: Partial<FormData>): void {
    if (!data) return
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof FormData, value as never)
    })
  }

  function fillMock(): void {
    const primaryScenarioId = getPrimaryDemoScenarioId()

    if (firstMockRef.current) {
      firstMockRef.current = false
      if (primaryScenarioId) {
        activateScenario(primaryScenarioId, 'patient')
        applyMock(getScenarioMock(primaryScenarioId, 'patient', locale))
        return
      }
    }

    applyMock(getRandomCreatorMock('patient', locale))
  }
  const fillDemo = useLiveDemoTypedMockFill<FormData>('patient', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('patient', watch)
  const selectedGender = watch('gender')

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('patient')
    try {
      const displayName = locale === 'en'
        ? `${data.familyName} ${data.givenName}`.trim()
        : `${data.familyName}${data.givenName}`.trim()
      const resource: Omit<fhir4.Patient, 'id'> = {
        resourceType: 'Patient',
        identifier: [{
          use: 'official',
          system: 'https://www.moe.edu.tw/student-id',
          value: data.studentId,
          type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'SB', display: 'Student Number' }] }
        }],
        name: [{ use: 'official', text: displayName, family: data.familyName, given: [data.givenName] }],
        gender: data.gender,
        birthDate: data.birthDate,
        meta: { profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP'] }
      }
      const patientId = resultId ?? existingPatientId
      let reused = false
      const created = patientId
        ? await putResource<fhir4.Patient>('Patient', patientId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Patient>(
              'Patient',
              { identifier: `https://www.moe.edu.tw/student-id|${data.studentId}` },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      const outcome = patientId ? 'updated' : reused ? 'reused' : 'created'
      const method = patientId ? 'PUT' : reused ? 'GET' : 'POST'
      setSaveOutcome(outcome)
      setRequestMethod(method)
      setResultId(created.id)
      setStatus('success')
      setFeedback('patient', {
        id: created.id,
        outcome,
        requestMethod: method
      })
      onSuccess(created)
      addRecord({
        id: crypto.randomUUID(),
        type: 'resource',
        resourceType: 'Patient',
        resourceId: created.id,
        patientName: displayName,
        patientIdentifier: data.studentId,
        submittedAt: new Date().toISOString(),
        serverUrl,
      })
    } catch (e) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : tc('errors.unknown'))
    }
  }

  useLiveDemoFormController('patient', fillMock, handleSubmit, onSubmit, fillDemo)

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
          <Label htmlFor="family-name">{f('familyName.label')} *</Label>
          <Input id="family-name" placeholder={f('familyName.placeholder')} {...register('familyName')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('familyName.hint')}</p>
          {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="given-name">{f('givenName.label')} *</Label>
          <Input id="given-name" placeholder={f('givenName.placeholder')} {...register('givenName')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('givenName.hint')}</p>
          {errors.givenName && <p className="text-xs text-destructive">{errors.givenName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="student-id">{f('studentId.label')} *</Label>
        <Input id="student-id" placeholder={f('studentId.placeholder')} {...register('studentId')} className="font-mono" />
        <p className="text-[11px] text-muted-foreground">{f('studentId.hint')}</p>
        {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{f('gender.label')} *</Label>
        <Select value={selectedGender} onValueChange={(v) => setValue('gender', v as FormData['gender'])}>
          <SelectTrigger>
            <SelectValue placeholder={f('gender.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {(['male', 'female', 'other', 'unknown'] as const).map(v => (
              <SelectItem key={v} value={v}>{f(`gender.options.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('gender.hint')}</p>
        {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth-date">{f('birthDate.label')} *</Label>
        <Input id="birth-date" type="date" {...register('birthDate')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('birthDate.hint')}</p>
        {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
      </div>

      {feedback && status !== 'loading' && (
        <CreatorFeedbackAlert feedback={feedback} resourceType="Patient" />
      )}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
