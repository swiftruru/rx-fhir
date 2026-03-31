import { CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Alert, AlertDescription } from '../../components/ui/alert'
import ResourceStepper from './ResourceStepper'
import { useCreatorStore } from '../../store/creatorStore'

export default function CreatorPage(): React.JSX.Element {
  const { bundleId, reset } = useCreatorStore()

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
        <div>
          <h1 className="text-xl font-bold">Creator — 建立處方箋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            依序建立各 FHIR Resource，最後組裝為 Document Bundle
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          重新開始
        </Button>
      </div>

      {/* Success banner */}
      {bundleId && (
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 shrink-0">
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Document Bundle 已成功提交！Bundle ID:{' '}
              <code className="font-mono font-bold text-sm">{bundleId}</code>
              <span className="ml-2 text-xs text-muted-foreground">
                可至 Consumer 模組查詢此處方箋
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Stepper */}
      <div className="flex-1 overflow-hidden">
        <ResourceStepper onBundleSuccess={(id) => console.log('Bundle created:', id)} />
      </div>
    </div>
  )
}
