import { useState, useMemo } from 'react'
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
import { useCreatorMockFill, useLiveDemoTypedMockFill } from '../../../hooks/useCreatorMockFill'
import { useLiveDemoFormController } from '../../../hooks/useLiveDemoFormController'
import { mergeDraftValues, useCreatorDraftAutosave } from '../../../hooks/useCreatorDraft'
import { findOrCreateDetailed, putResource, resetLoggedRequests } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'

const COMMON_MEDS = [
  { code: 'N02BE01' },
  { code: 'J01CA04' },
  { code: 'C09AA05' },
  { code: 'A02BC01' },
  { code: 'N02AA01' }
]

const DOSE_FORM_CODES = ['TAB', 'CAP', 'SOL', 'INJ', 'CRM'] as const
type DoseFormCode = (typeof DOSE_FORM_CODES)[number]

const SYSTEM_MAP = {
  atc: 'http://www.whocc.no/atc',
  nhi: 'https://www.nhi.gov.tw/drug-code'
}

type FormData = {
  code: string
  display: string
  codeSystem: 'atc' | 'nhi'
  form: string
}

interface Props {
  onSuccess: (resource: fhir4.Medication) => void
}

export default function MedicationForm({ onSuccess }: Props): React.JSX.Element {
  const existingMedication = useCreatorStore((s) => s.resources.medication as fhir4.Medication | undefined)
  const existingMedicationId = existingMedication?.id
  const setFeedback = useCreatorStore((s) => s.setFeedback)
  const clearFeedback = useCreatorStore((s) => s.clearFeedback)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.medication)
  const draftValues = useCreatorStore((s) => s.drafts.medication as Partial<FormData> | undefined)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.medication.${k}`)

  const schema = useMemo(() => z.object({
    code:       z.string().min(1, f('code.required')),
    display:    z.string().min(1, f('name.required')),
    codeSystem: z.enum(['atc', 'nhi']).default('atc'),
    form:       z.string().min(1, f('form.required'))
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(existingMedicationId)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'updated' | 'reused'>('created')
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST' | 'PUT'>(persistedFeedback?.requestMethod ?? 'POST')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome, requestMethod }
    : persistedFeedback

  const initialValues = useMemo<Partial<FormData>>(() => {
    const existingSystem = existingMedication?.code?.coding?.[0]?.system
    const existingCodeSystem = Object.entries(SYSTEM_MAP).find(([, value]) => value === existingSystem)?.[0] as FormData['codeSystem'] | undefined

    return mergeDraftValues({
      code: existingMedication?.code?.coding?.[0]?.code ?? '',
      display: existingMedication?.code?.coding?.[0]?.display ?? existingMedication?.code?.text ?? '',
      codeSystem: existingCodeSystem ?? 'atc',
      form: existingMedication?.form?.coding?.[0]?.code ?? ''
    }, draftValues)
  }, [draftValues, existingMedication])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  const fillMock = useCreatorMockFill<FormData>('medication', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })
  const fillDemo = useLiveDemoTypedMockFill<FormData>('medication', (key, value) => {
    setValue(key as keyof FormData, value as never)
  })

  useCreatorDraftAutosave('medication', watch)
  const codeSystem = watch('codeSystem')
  const selectedForm = watch('form')

  function applyPreset(med: (typeof COMMON_MEDS)[0]): void {
    setValue('code', med.code)
    setValue('display', t(`forms.medication.presets.${med.code}`))
  }

  async function onSubmit(data: FormData): Promise<void> {
    resetLoggedRequests()
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('medication')
    try {
      const formCode = data.form as DoseFormCode
      const formDisplay = t(`forms.medication.form.options.${formCode}`)
      const resource: Omit<fhir4.Medication, 'id'> = {
        resourceType: 'Medication',
        code: {
          coding: [{
            system: SYSTEM_MAP[data.codeSystem],
            code: data.code,
            display: data.display
          }],
          text: data.display
        },
        form: formCode ? {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm',
            code: formCode,
            display: formDisplay
          }],
          text: formDisplay
        } : undefined,
        status: 'active',
        meta: {
          profile: ['https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP']
        }
      }
      const medicationId = resultId ?? existingMedicationId
      const medicationCodeSystem = SYSTEM_MAP[data.codeSystem]
      let reused = false
      const created = medicationId
        ? await putResource<fhir4.Medication>('Medication', medicationId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Medication>(
              'Medication',
              { code: `${medicationCodeSystem}|${data.code}` },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      const outcome = medicationId ? 'updated' : reused ? 'reused' : 'created'
      const method = medicationId ? 'PUT' : reused ? 'GET' : 'POST'
      setSaveOutcome(outcome)
      setRequestMethod(method)
      setResultId(created.id)
      setStatus('success')
      setFeedback('medication', {
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

  useLiveDemoFormController('medication', fillMock, handleSubmit, onSubmit, fillDemo)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
          <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
        </Button>
      </div>

      <FormGuideCard title={f('introTitle')} description={f('introHint')} />

      <div className="space-y-2">
        <Label>{f('presetsTitle')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_MEDS.map(med => (
            <button
              key={med.code}
              type="button"
              onClick={() => applyPreset(med)}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
            >
              {t(`forms.medication.presets.${med.code}`)}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('presetsHint')}</p>
      </div>

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
        <Label>{f('codeSystem.label')}</Label>
        <Select value={codeSystem} onValueChange={(v) => setValue('codeSystem', v as FormData['codeSystem'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="atc">{f('codeSystem.options.ATC')}</SelectItem>
            <SelectItem value="nhi">{f('codeSystem.options.NHI')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('codeSystem.hint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="med-code">{f('code.label')} *</Label>
          <Input id="med-code" placeholder={f('code.placeholder')} {...register('code')} className="font-mono" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('code.hint')}</p>
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-display">{f('name.label')} *</Label>
          <Input id="med-display" placeholder={f('name.placeholder')} {...register('display')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('name.hint')}</p>
          {errors.display && <p className="text-xs text-destructive">{errors.display.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{f('form.label')} *</Label>
        <Select value={selectedForm} onValueChange={(v) => setValue('form', v)}>
          <SelectTrigger>
            <SelectValue placeholder={f('form.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {DOSE_FORM_CODES.map(code => (
              <SelectItem key={code} value={code}>{f(`form.options.${code}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{f('form.hint')}</p>
        {errors.form && <p className="text-xs text-destructive">{errors.form.message}</p>}
      </div>

      {feedback && status !== 'loading' && <CreatorFeedbackAlert feedback={feedback} resourceType="Medication" />}
      {status === 'error' && <FhirErrorAlert error={errorMsg} />}

      <Button type="submit" disabled={status === 'loading'} variant={status === 'success' ? 'outline' : 'default'} className="w-full">
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' ? tc('buttons.resubmit') : tc('buttons.submit')}
      </Button>
    </form>
  )
}
