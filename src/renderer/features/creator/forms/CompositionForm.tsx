import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, AlertCircle, Package } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Alert, AlertDescription } from '../../../components/ui/alert'
import JsonViewer from '../../../components/JsonViewer'
import { postResource } from '../../../services/fhirClient'
import { buildComposition, assembleDocumentBundle } from '../../../services/bundleService'
import { useCreatorStore } from '../../../store/creatorStore'

const schema = z.object({
  title: z.string().min(1, '請輸入文件標題'),
  date: z.string().min(1, '請輸入處方日期')
})

type FormData = z.infer<typeof schema>

interface Props {
  onBundleSuccess: (bundleId: string) => void
}

export default function CompositionForm({ onBundleSuccess }: Props): React.JSX.Element {
  const { resources, setResource, setBundleId, setBundleError, setSubmittingBundle } = useCreatorStore()
  const [compStatus, setCompStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [bundleStatus, setBundleStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [compId, setCompId] = useState<string>()
  const [bundleResultId, setBundleResultId] = useState<string>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '電子處方箋',
      date: new Date().toISOString().slice(0, 16)
    }
  })

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
      // Step 1: POST Composition
      const composition = buildComposition(resources, data.title, data.date)
      const createdComp = await postResource<fhir4.Composition>('Composition', composition)
      setResource('composition', createdComp)
      setCompId(createdComp.id)
      setCompStatus('success')

      // Step 2: Assemble & POST Bundle
      setBundleStatus('loading')
      setSubmittingBundle(true)
      const bundle = assembleDocumentBundle(resources, { ...composition, id: createdComp.id })

      const createdBundle = await postResource<fhir4.Bundle>('Bundle', bundle)
      setBundleResultId(createdBundle.id!)
      setBundleId(createdBundle.id!)
      setBundleStatus('success')
      onBundleSuccess(createdBundle.id!)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '發生未知錯誤'
      setErrorMsg(msg)
      if (compStatus !== 'success') setCompStatus('error')
      else setBundleStatus('error')
      setBundleError(msg)
    } finally {
      setSubmittingBundle(false)
    }
  }

  const preview = getPreview()
  const isLoading = compStatus === 'loading' || bundleStatus === 'loading'

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="comp-title">文件標題 *</Label>
          <Input id="comp-title" placeholder="電子處方箋" {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="comp-date">處方日期 *</Label>
          <Input id="comp-date" type="datetime-local" {...register('date')} />
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        {/* Resource checklist */}
        <div className="p-3 rounded-md bg-muted space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">已建立的 Resources</p>
          {[
            { key: 'organization', label: 'Organization' },
            { key: 'patient', label: 'Patient' },
            { key: 'practitioner', label: 'Practitioner' },
            { key: 'encounter', label: 'Encounter' },
            { key: 'condition', label: 'Condition' },
            { key: 'observation', label: 'Observation' },
            { key: 'coverage', label: 'Coverage' },
            { key: 'medication', label: 'Medication' },
            { key: 'medicationRequest', label: 'MedicationRequest' }
          ].map(({ key, label }) => {
            const r = resources[key as keyof typeof resources]
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span>{label}</span>
                {r ? (
                  <span className="text-green-600 font-mono">{(r as fhir4.Resource).id}</span>
                ) : (
                  <span className="text-muted-foreground">未建立</span>
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

        {errorMsg && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={isLoading || !resources.patient}
          className="w-full"
          size="lg"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Package className="h-4 w-4" />
          {bundleStatus === 'success' ? '重新提交 Bundle' : '組裝並提交 Document Bundle'}
        </Button>
      </form>

      {/* Bundle Preview */}
      {preview && (
        <JsonViewer
          data={preview}
          title="Document Bundle 預覽（即時）"
          defaultCollapsed={true}
        />
      )}
    </div>
  )
}
