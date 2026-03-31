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
import { extensionMocks } from '../../../mocks/mockPools'

const BASIC_EXTENSION_IDENTIFIER_SYSTEM = 'https://rxfhir.app/fhir/basic-extension-key'

type FormData = {
  codeCode: string
  codeDisplay: string
  ext1Url: string
  ext1Value: string
  ext2Url?: string
  ext2Value?: string
}

interface Props {
  onSuccess: (resource: fhir4.Basic) => void
}

export default function ExtensionForm({ onSuccess }: Props): React.JSX.Element {
  const { resources, setFeedback, clearFeedback } = useCreatorStore()
  const draftValues = useCreatorStore((s) => s.drafts.extension as Partial<FormData> | undefined)
  const persistedFeedback = useCreatorStore((s) => s.feedbacks.extension)
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')
  const f = (k: string) => t(`forms.extension.${k}`)

  const schema = useMemo(() => z.object({
    codeCode:    z.string().min(1, f('codeCode.required')),
    codeDisplay: z.string().min(1, f('codeDisplay.required')),
    ext1Url:     z.string().min(1, f('ext1Url.required')),
    ext1Value:   z.string().min(1, f('ext1Value.required')),
    ext2Url:     z.string().optional(),
    ext2Value:   z.string().optional()
  }), [t])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultId, setResultId] = useState<string | undefined>(resources.extension?.id)
  const [saveOutcome, setSaveOutcome] = useState<'created' | 'reused'>('created')
  const [errorMsg, setErrorMsg] = useState<string>()
  const feedback = status === 'success' && resultId
    ? { id: resultId, outcome: saveOutcome }
    : persistedFeedback

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = extensionMocks[mockIndexRef.current % extensionMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => mergeDraftValues({
    codeCode: resources.extension?.code?.coding?.[0]?.code ?? '',
    codeDisplay: resources.extension?.code?.coding?.[0]?.display ?? resources.extension?.code?.text ?? '',
    ext1Url: resources.extension?.extension?.[0]?.url ?? '',
    ext1Value: resources.extension?.extension?.[0]?.valueString ?? '',
    ext2Url: resources.extension?.extension?.[1]?.url ?? '',
    ext2Value: resources.extension?.extension?.[1]?.valueString ?? ''
  }, draftValues), [draftValues, resources.extension])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  useCreatorDraftAutosave('extension', watch)

  function buildExtensionIdentifierValue(data: FormData): string {
    return JSON.stringify({
      patient: resources.patient?.identifier?.[0]?.value ?? resources.patient?.id ?? '',
      code: data.codeCode,
      ext1Url: data.ext1Url,
      ext1Value: data.ext1Value,
      ext2Url: data.ext2Url ?? '',
      ext2Value: data.ext2Value ?? ''
    })
  }

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    clearFeedback('extension')
    try {
      const extensions: fhir4.Extension[] = [
        { url: data.ext1Url, valueString: data.ext1Value }
      ]
      if (data.ext2Url && data.ext2Value) {
        extensions.push({ url: data.ext2Url, valueString: data.ext2Value })
      }

      const resource: Omit<fhir4.Basic, 'id'> = {
        resourceType: 'Basic',
        identifier: [{
          system: BASIC_EXTENSION_IDENTIFIER_SYSTEM,
          value: buildExtensionIdentifierValue(data)
        }],
        code: {
          coding: [{
            system: 'https://twcore.mohw.gov.tw/ig/emr/CodeSystem/extension-type',
            code: data.codeCode,
            display: data.codeDisplay
          }],
          text: data.codeDisplay
        },
        subject: resources.patient
          ? { reference: `Patient/${resources.patient.id}` }
          : undefined,
        extension: extensions
      }
      const existingExtensionId = resultId ?? resources.extension?.id
      let reused = false
      const created = existingExtensionId
        ? await putResource<fhir4.Basic>('Basic', existingExtensionId, resource)
        : await (async () => {
            const result = await findOrCreateDetailed<fhir4.Basic>(
              'Basic',
              {
                identifier: `${BASIC_EXTENSION_IDENTIFIER_SYSTEM}|${buildExtensionIdentifierValue(data)}`
              },
              resource
            )
            reused = result.reused
            return result.resource
          })()
      if (!created.id) throw new Error(tc('errors.unknown'))
      setSaveOutcome(reused ? 'reused' : 'created')
      setResultId(created.id)
      setStatus('success')
      setFeedback('extension', {
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
          {[f('example1'), f('example2'), f('example3')].map((example) => (
            <li key={example} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span>{example}</span>
            </li>
          ))}
        </ul>
      </FormGuideCard>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ext-code-code">{f('codeCode.label')} *</Label>
          <Input id="ext-code-code" placeholder={f('codeCode.placeholder')} {...register('codeCode')} className="font-mono" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('codeCode.hint')}</p>
          {errors.codeCode && <p className="text-xs text-destructive">{errors.codeCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext-code-display">{f('codeDisplay.label')} *</Label>
          <Input id="ext-code-display" placeholder={f('codeDisplay.placeholder')} {...register('codeDisplay')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('codeDisplay.hint')}</p>
          {errors.codeDisplay && <p className="text-xs text-destructive">{errors.codeDisplay.message}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground font-medium">Extension (1) *</p>
        <div className="space-y-2">
          <Label htmlFor="ext1-url">{f('ext1Url.label')}</Label>
          <Input id="ext1-url" placeholder={f('ext1Url.placeholder')} {...register('ext1Url')} className="font-mono text-xs" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('ext1Url.hint')}</p>
          {errors.ext1Url && <p className="text-xs text-destructive">{errors.ext1Url.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext1-value">{f('ext1Value.label')}</Label>
          <Input id="ext1-value" placeholder={f('ext1Value.placeholder')} {...register('ext1Value')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('ext1Value.hint')}</p>
          {errors.ext1Value && <p className="text-xs text-destructive">{errors.ext1Value.message}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground font-medium">Extension (2) — {t('forms.shared.optional')}</p>
        <div className="space-y-2">
          <Label htmlFor="ext2-url">{f('ext2Url.label')}</Label>
          <Input id="ext2-url" placeholder={f('ext2Url.placeholder')} {...register('ext2Url')} className="font-mono text-xs" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('ext2Url.hint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext2-value">{f('ext2Value.label')}</Label>
          <Input id="ext2-value" placeholder={f('ext2Value.placeholder')} {...register('ext2Value')} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{f('ext2Value.hint')}</p>
        </div>
      </div>

      {feedback && status !== 'loading' && (
        <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {feedback.outcome === 'reused'
              ? tc('fhir.resourceReused', { resourceType: 'Basic', id: feedback.id })
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
