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
import { postResource, putResource } from '../../../services/fhirClient'
import { medicationMocks } from '../../../mocks/mockPools'

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
  const [resultId, setResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = medicationMocks[mockIndexRef.current % medicationMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', display: '', codeSystem: 'atc', form: '' }
  })

  const codeSystem = watch('codeSystem')
  const selectedForm = watch('form')

  function applyPreset(med: (typeof COMMON_MEDS)[0]): void {
    setValue('code', med.code)
    setValue('display', t(`forms.medication.presets.${med.code}`))
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
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
      const created = resultId
        ? await putResource<fhir4.Medication>('Medication', resultId, resource)
        : await postResource<fhir4.Medication>('Medication', resource)
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
      </div>

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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="med-code">{f('code.label')} *</Label>
          <Input id="med-code" placeholder={f('code.placeholder')} {...register('code')} className="font-mono" />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="med-display">{f('name.label')} *</Label>
          <Input id="med-display" placeholder={f('name.placeholder')} {...register('display')} />
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
        {errors.form && <p className="text-xs text-destructive">{errors.form.message}</p>}
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
