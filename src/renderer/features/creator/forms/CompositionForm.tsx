import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Wand2, Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/button'
import { useHistoryStore } from '../../../features/history/store/historyStore'
import { useAppStore } from '../../../app/stores/appStore'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { Alert, AlertDescription } from '../../../shared/components/ui/alert'
import FormErrorSummary from '../components/FormErrorSummary'
import FhirErrorAlert from '../../../shared/components/FhirErrorAlert'
import FhirAuditReportCard from '../../../shared/components/FhirAuditReportCard'
import JsonViewer from '../../../shared/components/JsonViewer'
import { buildFormErrorSummaryItems } from '../lib/formErrorSummary'
import { getActiveLiveDemoSubmitRunId, isLiveDemoRunCurrent } from '../../../app/lib/liveDemoRuntime'
import { useCreatorMockFill, useLiveDemoTypedMockFill } from '../hooks/useCreatorMockFill'
import { useLiveDemoFormController } from '../hooks/useLiveDemoFormController'
import { mergeDraftValues, useCreatorDraftAutosave } from '../hooks/useCreatorDraft'
import { exportBundleJson, getBundleFileErrorMessage } from '../../../services/bundleFileService'
import { postResource, resetLoggedRequests } from '../../../services/fhirClient'
import { buildComposition, assembleDocumentBundle } from '../../../services/bundleService'
import { toDateTimeLocalValue } from '../../../domain/fhir/dateTime'
import { buildFhirAuditFingerprint, runHybridBundleAudit, runLocalBundleAudit, type FhirAuditIssue } from '../../../domain/fhir/validation'
import { useCreatorStore } from '../store/creatorStore'
import { useToastStore } from '../../../shared/stores/toastStore'
import PrescriptionSummaryCard from '../components/PrescriptionSummaryCard'
import { RESOURCE_STEPS } from '../../../types/fhir'

type FormData = {
  title: string
  date: string
}

interface Props {
  onBundleSuccess: (bundleId: string) => void
}

export default function CompositionForm({ onBundleSuccess }: Props): React.JSX.Element {
  const {
    resources,
    drafts,
    setResource,
    markBundleSubmitted,
    setBundleError,
    setSubmittingBundle,
    setDraft,
    setStep,
    validationStatus,
    validationReport,
    validatedFingerprint,
    setValidationState,
    clearValidation
  } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.composition as Partial<FormData> | undefined)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const pushToast = useToastStore((state) => state.pushToast)
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
  const [fileMessage, setFileMessage] = useState<string>()
  const [exporting, setExporting] = useState(false)

  const initialValues = useMemo<FormData>(() => mergeDraftValues({
    title: resources.composition?.title ?? f('docTitle.placeholder'),
    date: toDateTimeLocalValue(resources.composition?.date) || toDateTimeLocalValue(new Date().toISOString())
  }, draftValues) as FormData, [draftValues, f, resources.composition])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })
  const errorSummaryItems = useMemo(
    () => buildFormErrorSummaryItems<FormData>(errors, [
      { name: 'title', fieldId: 'comp-title', label: f('docTitle.label') },
      { name: 'date', fieldId: 'comp-date', label: f('date.label') }
    ]),
    [errors, t]
  )

  const fillMock = useCreatorMockFill<FormData>('composition', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })
  const fillDemo = useLiveDemoTypedMockFill<FormData>('composition', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('composition', watch)
  const formData = watch()
  const preview = useMemo(() => {
    if (!formData.title || !formData.date) return null
    const composition = buildComposition(resources, formData.title, formData.date)
    return assembleDocumentBundle(resources, composition)
  }, [formData.date, formData.title, resources])
  const previewFingerprint = useMemo(
    () => (preview ? buildFhirAuditFingerprint(preview) : undefined),
    [preview]
  )

  useEffect(() => {
    if (!preview || !previewFingerprint) {
      clearValidation()
      return
    }

    if (validatedFingerprint === previewFingerprint && validationReport) {
      return
    }

    const localReport = runLocalBundleAudit(preview)
    setValidationState(localReport.status, localReport, previewFingerprint)
  }, [
    clearValidation,
    preview,
    previewFingerprint,
    setValidationState,
    validatedFingerprint,
    validationReport
  ])

  async function handleExportBundle(): Promise<void> {
    if (!preview) return

    setExporting(true)
    setErrorMsg(undefined)
    setFileMessage(undefined)

    try {
      const result = await exportBundleJson(preview)
      if (result.canceled || !result.fileName) return
      const message = t('forms.composition.export.success', { fileName: result.fileName })
      setFileMessage(message)
      pushToast({
        variant: 'success',
        description: message
      })
    } catch (error) {
      const message = getBundleFileErrorMessage(error, tc)
      setErrorMsg(message)
      pushToast({
        variant: 'error',
        description: message
      })
    } finally {
      setExporting(false)
    }
  }

  function handlePreviewInConsumer(): void {
    if (!preview) return

    setDraft('composition', {
      title: formData.title,
      date: formData.date
    })
    navigate('/consumer', {
      state: {
        previewBundle: preview
      }
    })
  }

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setErrorMsg(undefined)
    setFileMessage(undefined)

    try {
      if (!preview || !previewFingerprint) {
        throw new Error(f('validation.noPreview'))
      }

      setValidationState('running', validationReport, previewFingerprint)
      const auditReport = await runHybridBundleAudit(preview)
      setValidationState(auditReport.status, auditReport, previewFingerprint)

      if (auditReport.hasBlockingErrors) {
        setCompStatus('idle')
        setBundleStatus('idle')
        setBundleError(f('validation.blocked'))
        setErrorMsg(f('validation.blocked'))
        return
      }

      setCompStatus('loading')
      const composition = buildComposition(resources, data.title, data.date)
      const createdComp = await postResource<fhir4.Composition>('Composition', composition)
      const activeLiveDemoSubmitRun = getActiveLiveDemoSubmitRunId()
      if (activeLiveDemoSubmitRun !== null && !isLiveDemoRunCurrent(activeLiveDemoSubmitRun)) {
        return
      }
      setResource('composition', createdComp)
      setDraft('composition', { title: data.title, date: data.date })
      setCompId(createdComp.id)
      setCompStatus('success')

      setBundleStatus('loading')
      setSubmittingBundle(true)
      const bundle = assembleDocumentBundle(resources, { ...composition, id: createdComp.id })

      const createdBundle = await postResource<fhir4.Bundle>('Bundle', bundle)
      if (activeLiveDemoSubmitRun !== null && !isLiveDemoRunCurrent(activeLiveDemoSubmitRun)) {
        return
      }
      setBundleResultId(createdBundle.id!)
      markBundleSubmitted(createdBundle.id!, {
        ...drafts,
        composition: {
          title: data.title,
          date: data.date
        }
      })
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
        compositionDate: data.date?.slice(0, 10),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errors.unknown', { ns: 'common' })
      setErrorMsg(msg)
      if (compStatus === 'success') setBundleStatus('error')
      else setCompStatus('error')
      setBundleError(msg)
      pushToast({
        variant: 'error',
        description: msg
      })
    } finally {
      setSubmittingBundle(false)
    }
  }

  function handleValidationIssueSelect(issue: FhirAuditIssue): void {
    if (!issue.stepKey) return
    const targetStep = RESOURCE_STEPS.findIndex((step) => step.key === issue.stepKey)
    if (targetStep >= 0) {
      setStep(targetStep)
    }
  }

  const validationDescription = validationStatus === 'running'
    ? f('validation.running')
    : validationReport?.hasBlockingErrors
      ? f('validation.blocking')
      : validationReport?.warningCount
        ? f('validation.warning')
        : f('validation.ready')

  useLiveDemoFormController('composition', fillMock, handleSubmit, onSubmit, fillDemo)

  const RESOURCE_CHECKLIST = [
    'organization', 'patient', 'practitioner', 'encounter',
    'condition', 'observation', 'coverage', 'medication', 'medicationRequest'
  ] as const

  return (
    <form id="composition-form" data-live-demo-form="composition" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            data-testid="creator.preview-in-consumer"
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewInConsumer}
            disabled={!preview}
            className="h-7 px-2 text-xs"
          >
            {t('page.previewInConsumer')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleExportBundle()}
            disabled={!preview || exporting}
            className="h-7 px-2 text-xs"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {f('export.button')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
            <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
          </Button>
        </div>
        <FormErrorSummary
          title={t('forms.shared.errorSummaryTitle', { count: errorSummaryItems.length })}
          description={t('forms.shared.errorSummaryDescription')}
          items={errorSummaryItems}
        />
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

        <FhirAuditReportCard
          report={validationReport}
          title={f('validation.title')}
          description={validationDescription}
          emptyTitle={f('validation.emptyTitle')}
          emptyDescription={f('validation.emptyDescription')}
          onIssueSelect={handleValidationIssueSelect}
          testId="creator.composition.audit"
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

        {fileMessage && (
          <Alert variant="success">
            <AlertDescription>{fileMessage}</AlertDescription>
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
