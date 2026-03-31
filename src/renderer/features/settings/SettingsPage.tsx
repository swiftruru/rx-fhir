import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Wifi, WifiOff, Loader2, CheckCircle2, Save } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { useAppStore } from '../../store/appStore'
import { checkServerHealth } from '../../services/fhirClient'

const PRESET_SERVERS = [
  { label: 'HAPI FHIR (International)', url: 'https://hapi.fhir.org/baseR4' },
  { label: 'HAPI FHIR TW', url: 'https://hapi.fhir.tw/fhir' }
]

interface FormData {
  serverUrl: string
}

export default function SettingsPage(): React.JSX.Element {
  const { serverUrl, setServerUrl, serverStatus, serverName, serverVersion, setServerStatus } =
    useAppStore()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testResult, setTestResult] = useState<{ name?: string; version?: string }>({})
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: { serverUrl }
  })

  const currentUrl = watch('serverUrl')

  async function handleTest(): Promise<void> {
    setTestStatus('testing')
    const result = await checkServerHealth(currentUrl)
    setTestResult({ name: result.name, version: result.version })
    setTestStatus(result.online ? 'ok' : 'fail')
  }

  function handleSave(data: FormData): void {
    setServerUrl(data.serverUrl)
    setSaved(true)
    setServerStatus('unknown')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="h-full overflow-auto">
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings — 系統設定</h1>
        <p className="text-sm text-muted-foreground mt-1">設定 FHIR Server 連線位址</p>
      </div>

      {/* Server URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">FHIR Server URL</CardTitle>
          <CardDescription>設定目標 HAPI FHIR Server 的基礎 URL（baseR4）</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-url">Server URL</Label>
              <Input
                id="server-url"
                className="font-mono text-sm"
                placeholder="https://hapi.fhir.org/baseR4"
                {...register('serverUrl', { required: true })}
              />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <Label>快速選擇預設伺服器</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_SERVERS.map(({ label, url }) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setValue('serverUrl', url)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      currentUrl === url
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                {testStatus !== 'testing' && (
                  testStatus === 'ok' ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : testStatus === 'fail' ? (
                    <WifiOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )
                )}
                測試連線
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4" />
                儲存設定
              </Button>
            </div>

            {testStatus === 'ok' && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  連線成功！
                  {testResult.name && <> — {testResult.name}</>}
                  {testResult.version && <> (FHIR {testResult.version})</>}
                </AlertDescription>
              </Alert>
            )}
            {testStatus === 'fail' && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>連線失敗，請確認 URL 是否正確，或網路是否暢通。</AlertDescription>
              </Alert>
            )}
            {saved && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>設定已儲存。</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">目前連線狀態</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              serverStatus === 'online' ? 'bg-green-500' :
              serverStatus === 'offline' ? 'bg-red-500' :
              serverStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="capitalize">{serverStatus}</span>
          </div>
          <div className="font-mono text-xs text-muted-foreground break-all">{serverUrl}</div>
          {serverName && <div className="text-muted-foreground">Server: {serverName}</div>}
          {serverVersion && <div className="text-muted-foreground">FHIR: R{serverVersion}</div>}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">關於 RxFHIR</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>℞ + FHIR = RxFHIR</p>
          <p>基於 TW Core 電子處方箋 Profile 的桌面應用程式</p>
          <p>依據衛福部 EMR-IG 電子處方箋 2.5 規範實作</p>
          <p className="text-xs mt-3 opacity-60">Version 1.0.0 · Electron + React + FHIR R4</p>
        </CardContent>
      </Card>
    </div>
    </div>
  )
}
