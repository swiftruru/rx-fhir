import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { useHistoryStore } from '../../../store/historyStore'
import { useAppStore } from '../../../store/appStore'
import { compositionMocks } from '../../../mocks/mockPools'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import FhirErrorAlert from '../../../components/FhirErrorAlert'
import JsonViewer from '../../../components/JsonViewer'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { postResource } from '../../../services/fhirClient'
import { buildComposition, assembleDocumentBundle } from '../../../services/bundleService'
import { useCreatorStore } from '../../../store/creatorStore'
import PrescriptionSummaryCard from '../components/PrescriptionSummaryCard'

type FormData = {
  title: string
  date: string
}

function toDateTimeLocalValue(value?: string): string {
  if (!value) return ''
  const normalized = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)?.[1]
  if (normalized) return normalized

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

interface Props {
  onBundleSuccess: (bundleId: string) => void
}

export default function CompositionForm({ onBundleSuccess }: Props): React.JSX.Element {
  const { resources, setResource, setBundleId, setBundleError, setSubmittingBundle, clearDraft } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.composition as Partial<FormData> | undefined)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.composition.${k}`)
  const addRecord = useHistoryStore((s) => s.addRecord)
  const serverUrl = useAppStore((s) => s.serverUrl)

  const schema = useMemo(() => z.object({
    title: z.string().min(1, f('docTitle.required')),
    date:  z.string().min(1, f('date.required'))
  }), [t])

  const [compStatus, setCompStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [bundleStatus, setBundleStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [compId, setCompId] = useState<string>()
  const [bundleResultId, setBundleResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = compositionMocks[mockIndexRef.current % compositionMocks.length]
    mockIndexRef.current += 1
    setValue('title', data.title)
    setValue('date', new Date().toISOString().slice(0, 16))
  }

  const initialValues = useMemo<FormData>(() => mergeDraftValues({
    title: resources.composition?.title ?? f('docTitle.placeholder'),
    date: toDateTimeLocalValue(resources.composition?.date) || new Date().toISOString().slice(0, 16)
  }, draftValues) as FormData, [draftValues, f, resources.composition])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  useCreatorDraftAutosave('composition', watch)
  const formData = watch()

  function getPreview(): fhir4.Bundle | null {
    if (!formData.title || !formData.date) return null
    const comp = buildComposition(resources, formData.title, formData.date)
    return assembleDocumentBundle(resources, comp)
  }

  async function onSubmit(data: FormData): Promise<void> {
    setCompStatus('loading')
    setErrorMsg(undefined)
    try {
      const fhirDate = data.date.length === 16 ? `${data.date}:00` : data.date
      const composition = buildComposition(resources, data.title, fhirDate)
      const createdComp = await postResource<fhir4.Composition>('Composition', composition)
      setResource('composition', createdComp)
      clearDraft('composition')
      setCompId(createdComp.id)
      setCompStatus('success')

      setBundleStatus('loading')
      setSubmittingBundle(true)
      const bundle = assembleDocumentBundle(resources, { ...composition, id: createdComp.id })

      const createdBundle = await postResource<fhir4.Bundle>('Bundle', bundle)
      setBundleResultId(createdBundle.id!)
      setBundleId(createdBundle.id!)
      setBundleStatus('success')
      onBundleSuccess(createdBundle.id!)

      const patient = resources.patient
      const org = resources.organization as fhir4.Organization | undefined
      const prac = resources.practitioner as fhir4.Practitioner | undefined
      const cond = resources.condition as fhir4.Condition | undefined
      addRecord({
        id: crypto.randomUUID(),
        type: 'bundle',
        bundleId: createdBundle.id!,
        patientName: patient ? `${patient.name?.[0]?.family ?? ''}${patient.name?.[0]?.given?.[0] ?? ''}` : '',
        patientIdentifier: patient?.identifier?.[0]?.value ?? '',
        organizationName: org?.name,
        organizationIdentifier: org?.identifier?.[0]?.value,
        practitionerName: prac ? `${prac.name?.[0]?.family ?? ''}${prac.name?.[0]?.given?.[0] ?? ''}` : undefined,
        conditionDisplay: cond?.code?.coding?.[0]?.display,
        submittedAt: new Date().toISOString(),
        serverUrl,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errors.unknown', { ns: 'common' })
      setErrorMsg(msg)
      if (compStatus !== 'success') setCompStatus('error')
      else setBundleStatus('error')
      setBundleError(msg)
    } finally {
      setSubmittingBundle(false)
    }
  }

  const preview = getPreview()
  const RESOURCE_CHECKLIST = [
    'organization', 'patient', 'practitioner', 'encounter',
    'condition', 'observation', 'coverage', 'medication', 'medicationRequest'
  ] as const

  return (
    <form id="composition-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
            <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="comp-title">{f('docTitle.label')} *</Label>
          <Input id="comp-title" placeholder={f('docTitle.placeholder')} {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="comp-date">{f('date.label')} *</Label>
          <Input id="comp-date" type="datetime-local" {...register('date')} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        <PrescriptionSummaryCard
          resources={resources}
          title={formData.title}
          date={formData.date}
        />

        <div className="p-3 rounded-md bg-muted space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">{f('resourcesTitle')}</p>
          {RESOURCE_CHECKLIST.map((key) => {
            const r = resources[key]
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                {r ? (
                  <span className="text-green-600 font-mono">{(r as fhir4.Resource).id}</span>
                ) : (
                  <span className="text-muted-foreground">{f('notCreated')}</span>
                )}
              </div>
            )
          })}
        </div>

        {compStatus === 'success' && bundleStatus === 'success' && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div>Composition ID: <code className="font-mono text-xs">{compId}</code></div>
              <div className="mt-1">Bundle ID: <code className="font-mono text-xs font-bold">{bundleResultId}</code></div>
            </AlertDescription>
          </Alert>
        )}

        <FhirErrorAlert error={errorMsg} />

        {preview && (
          <JsonViewer
            data={preview}
            title={f('previewTitle')}
            defaultCollapsed={true}
          />
        )}
    </form>
  )
}
