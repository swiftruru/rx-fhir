import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select'
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

const COVERAGE_TYPE_CODES = ['EHCPOL', 'PAY', 'PUBLICPOL'] as const
type CoverageTypeCode = (typeof COVERAGE_TYPE_CODES)[number]

const COVERAGE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
const COVERAGE_IDENTIFIER_SYSTEM = 'https://www.nhi.gov.tw/coverage-id'

type FormData = {
  type: string
  subscriberId: string
  periodStart: string
  periodEnd?: string
}

interface Props {
  onSuccess: (resource: fhir4.Coverage) => void
}

export default function CoverageForm({ onSuccess }: Props): React.JSX.Element {
  const { resources, setFeedback, clearFeedback } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.coverage as Partial<FormData> | undefined)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.coverage)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.coverage.${k}`)

  const schema = useMemo(() => z.object({
    type:         z.string().min(1, f('type.required')),
    subscriberId: z.string().min(1, f('insuranceId.required')),
    periodStart:  z.string().min(1, f('effectiveDate.required')),
    periodEnd:    z.string().optional()
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(resources.coverage?.id)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'updated' | 'reused'>('created')
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT'>(persistedFeedback?.requestMethod ?? 'POST')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome, requestMethod }
    : persistedFeedback

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    type: resources.coverage?.type?.coding?.[0]?.code ?? '',
    subscriberId: resources.coverage?.subscriberId ?? '',
    periodStart: resources.coverage?.period?.start ?? '',
    periodEnd: resources.coverage?.period?.end ?? ''
  }, draftValues), [draftValues, resources.coverage])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })
  const errorSummaryItems = useMemo(
    () => buildFormErrorSummaryItems<FormData>(errors, [
      { name: 'type', fieldId: 'coverage-type', label: f('type.label') },
      { name: 'subscriberId', fieldId: 'subscriber-id', label: f('insuranceId.label') },
      { name: 'periodStart', fieldId: 'cov-start', label: f('effectiveDate.label') },
      { name: 'periodEnd', fieldId: 'cov-end', label: f('expiryDate.label') }
    ]),
    [errors, t]
  )

  const fillMock = useCreatorMockFill<FormData>('coverage', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })
  const fillDemo = useLiveDemoTypedMockFill<FormData>('coverage', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('coverage', watch)
  const selectedType = watch('type')

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('coverage')
    try {
      const typeCode = data.type as CoverageTypeCode
      const typeDisplay = t(`forms.coverage.type.options.${typeCode}`)
      const resource: Omit<fhir4.Coverage, 'id'> = {
        resourceType: 'Coverage',
        status: 'active',
        identifier: [{
          system: COVERAGE_IDENTIFIER_SYSTEM,
          value: data.subscriberId
        }],
        type: {
          coding: [{
            system: COVERAGE_SYSTEM,
            code: typeCode,
            display: typeDisplay
          }],
          text: typeDisplay
        },
        subscriber: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : undefined,
        beneficiary: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : { display: 'Unknown' },
        subscriberId: data.subscriberId,
        period: {
          start: data.periodStart,
          ...(data.periodEnd ? { end: data.periodEnd } : {})
        },
        payor: [{ display: '全民健康保險' }],
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Coverage-EMR']
        }
      }
      const existingCoverageId = resultId ?? resources.coverage?.id
      let reused = false
      const created = existingCoverageId
        ? await putResource<fhir4.Coverage>('Coverage', existingCoverageId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Coverage>(
              'Coverage',
              { identifier: `${COVERAGE_IDENTIFIER_SYSTEM}|${data.subscriberId}` },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      const outcome = existingCoverageId ? 'updated' : reused ? 'reused' : 'created'
      const method = existingCoverageId ? 'PUT' : reused ? 'GET' : 'POST'
      setSaveOutcome(outcome)
      setRequestMethod(method)
      setResultId(created.id)
      setStatus('success')
      setFeedback('coverage', {
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

  useLiveDemoFormController('coverage', fillMock, handleSubmit, onSubmit, fillDemo)

  return (
    <form data-live-demo-form="coverage" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

      <div className="space-y-2">
        <Label>{f('type.label')} *</Label>
        <Select value={selectedType} onValueChange={(v) => setValue('type', v)}>
          <SelectTrigger id="coverage-type" data-live-demo-field="type">
            <SelectValue placeholder={f('type.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {COVERAGE_TYPE_CODES.map(code => (
              <SelectItem key={code} value={code}>{f(`type.options.${code}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('type.hint')}</p>
        {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subscriber-id">{f('insuranceId.label')} *</Label>
        <Input id="subscriber-id" placeholder={f('insuranceId.placeholder')} {...register('subscriberId')} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('insuranceId.hint')}</p>
        {errors.subscriberId && <p className="text-xs text-destructive">{errors.subscriberId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cov-start">{f('effectiveDate.label')} *</Label>
          <Input id="cov-start" type="date" {...register('periodStart')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('effectiveDate.hint')}</p>
          {errors.periodStart && <p className="text-xs text-destructive">{errors.periodStart.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cov-end">{f('expiryDate.label')}</Label>
          <Input id="cov-end" type="date" {...register('periodEnd')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('expiryDate.hint')}</p>
        </div>
      </div>

      {feedback && status !== 'loading' && <CreatorFeedbackAlert feedback={feedback} resourceType="Coverage" />}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button data-live-demo-submit="coverage" type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
