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
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { useHistoryStore } from '../../../store/historyStore'
import { useAppStore } from '../../../store/appStore'
import { patientMocks } from '../../../mocks/mockPools'

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
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'reused'>('created')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome }
    : persistedFeedback

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = patientMocks[mockIndexRef.current % patientMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

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

  useCreatorDraftAutosave('patient', watch)
  const selectedGender = watch('gender')

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('patient')
    try {
      const resource: Omit<fhir4.Patient, 'id'> = {
        resourceType: 'Patient',
        identifier: [{
          use: 'official',
          system: 'https://www.moe.edu.tw/student-id',
          value: data.studentId,
          type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'SB', display: 'Student Number' }] }
        }],
        name: [{ use: 'official', text: `${data.familyName}${data.givenName}`, family: data.familyName, given: [data.givenName] }],
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
      setSaveOutcome(reused ? 'reused' : 'created')
      setResultId(created.id)
      setStatus('success')
      setFeedback('patient', {
        id: created.id,
        outcome: reused ? 'reused' : 'created'
      })
      onSuccess(created)
      addRecord({
        id: crypto.randomUUID(),
        type: 'resource',
        resourceType: 'Patient',
        resourceId: created.id,
        patientName: `${data.familyName}${data.givenName}`,
        patientIdentifier: data.studentId,
        submittedAt: new Date().toISOString(),
        serverUrl,
      })
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="family-name">{f('familyName.label')} *</Label>
          <Input id="family-name" placeholder={f('familyName.placeholder')} {...register('familyName')} />
          {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="given-name">{f('givenName.label')} *</Label>
          <Input id="given-name" placeholder={f('givenName.placeholder')} {...register('givenName')} />
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
        {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="birth-date">{f('birthDate.label')} *</Label>
        <Input id="birth-date" type="date" {...register('birthDate')} />
        {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
      </div>

      {feedback && status !== 'loading' && (
        <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {feedback.outcome === 'reused'
              ? tc('fhir.resourceReused', { resourceType: 'Patient', id: feedback.id })
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
