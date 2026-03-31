import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Wifi, WifiOff, Loader2, CheckCircle2, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('common')
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
        <h1 className="text-xl font-bold">{t('page.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('page.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('server.title')}</CardTitle>
          <CardDescription>{t('server.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-url">{t('server.urlLabel')}</Label>
              <Input
                id="server-url"
                className="font-mono text-sm"
                placeholder="https://hapi.fhir.org/baseR4"
                {...register('serverUrl', { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('server.presetsLabel')}</Label>
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
                {tc('buttons.test')}
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4" />
                {tc('buttons.save')}
              </Button>
            </div>

            {testStatus === 'ok' && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {t('server.testSuccess')}
                  {testResult.name && <> — {testResult.name}</>}
                  {testResult.version && <> (FHIR {testResult.version})</>}
                </AlertDescription>
              </Alert>
            )}
            {testStatus === 'fail' && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>{t('server.testFail')}</AlertDescription>
              </Alert>
            )}
            {saved && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{t('server.saved')}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('status.title')}</CardTitle>
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
          {serverName && <div className="text-muted-foreground">{t('status.serverInfo')}: {serverName}</div>}
          {serverVersion && <div className="text-muted-foreground">{t('status.fhirVersion')}: R{serverVersion}</div>}
        </CardContent>
      </Card>

    </div>
    </div>
  )
}
