import { useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, AlertCircle, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import { postResource, putResource } from '../../../services/fhirClient'
import { useCreatorStore } from '../../../store/creatorStore'
import { extensionMocks } from '../../../mocks/mockPools'

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
  const { resources } = useCreatorStore()
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
  const [errorMsg, setErrorMsg] = useState<string>()

  const mockIndexRef = useRef(0)
  function fillMock(): void {
    const data = extensionMocks[mockIndexRef.current % extensionMocks.length]
    mockIndexRef.current += 1
    Object.entries(data).forEach(([k, v]) => setValue(k as keyof FormData, v as never))
  }

  const initialValues = useMemo<Partial<FormData>>(() => ({
    codeCode: resources.extension?.code?.coding?.[0]?.code ?? '',
    codeDisplay: resources.extension?.code?.coding?.[0]?.display ?? resources.extension?.code?.text ?? '',
    ext1Url: resources.extension?.extension?.[0]?.url ?? '',
    ext1Value: resources.extension?.extension?.[0]?.valueString ?? '',
    ext2Url: resources.extension?.extension?.[1]?.url ?? '',
    ext2Value: resources.extension?.extension?.[1]?.valueString ?? ''
  }), [resources.extension])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialValues
  })

  async function onSubmit(data: FormData): Promise<void> {
    setStatus('loading')
    setErrorMsg(undefined)
    try {
      const extensions: fhir4.Extension[] = [
        { url: data.ext1Url, valueString: data.ext1Value }
      ]
      if (data.ext2Url && data.ext2Value) {
        extensions.push({ url: data.ext2Url, valueString: data.ext2Value })
      }

      const resource: Omit<fhir4.Basic, 'id'> = {
        resourceType: 'Basic',
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
      const created = existingExtensionId
        ? await putResource<fhir4.Basic>('Basic', existingExtensionId, resource)
        : await postResource<fhir4.Basic>('Basic', resource)
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ext-code-code">{f('codeCode.label')} *</Label>
          <Input id="ext-code-code" placeholder={f('codeCode.placeholder')} {...register('codeCode')} className="font-mono" />
          {errors.codeCode && <p className="text-xs text-destructive">{errors.codeCode.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext-code-display">{f('codeDisplay.label')} *</Label>
          <Input id="ext-code-display" placeholder={f('codeDisplay.placeholder')} {...register('codeDisplay')} />
          {errors.codeDisplay && <p className="text-xs text-destructive">{errors.codeDisplay.message}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground font-medium">Extension (1) *</p>
        <div className="space-y-2">
          <Label htmlFor="ext1-url">{f('ext1Url.label')}</Label>
          <Input id="ext1-url" placeholder={f('ext1Url.placeholder')} {...register('ext1Url')} className="font-mono text-xs" />
          {errors.ext1Url && <p className="text-xs text-destructive">{errors.ext1Url.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext1-value">{f('ext1Value.label')}</Label>
          <Input id="ext1-value" placeholder={f('ext1Value.placeholder')} {...register('ext1Value')} />
          {errors.ext1Value && <p className="text-xs text-destructive">{errors.ext1Value.message}</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground font-medium">Extension (2) — {t('forms.shared.optional')}</p>
        <div className="space-y-2">
          <Label htmlFor="ext2-url">{f('ext2Url.label')}</Label>
          <Input id="ext2-url" placeholder={f('ext2Url.placeholder')} {...register('ext2Url')} className="font-mono text-xs" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext2-value">{f('ext2Value.label')}</Label>
          <Input id="ext2-value" placeholder={f('ext2Value.placeholder')} {...register('ext2Value')} />
        </div>
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
