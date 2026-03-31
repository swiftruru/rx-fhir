import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Wifi, WifiOff, Loader2, ServerCrash } from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { checkServerHealth } from '../services/fhirClient'

const MODE_LABELS: Record<string, string> = {
  '/creator': 'Creator 模式',
  '/consumer': 'Consumer 模式',
  '/settings': 'Settings'
}

export default function StatusBar(): React.JSX.Element {
  const { serverUrl, serverStatus, serverName, serverVersion, setServerStatus } = useAppStore()
  const location = useLocation()

  useEffect(() => {
    setServerStatus('checking')
    checkServerHealth(serverUrl).then(({ online, name, version }) => {
      setServerStatus(online ? 'online' : 'offline', name, version)
    })
  }, [serverUrl])

  const modeLabel = MODE_LABELS[location.pathname] || ''

  return (
    <footer className="h-7 flex items-center justify-between px-4 bg-primary text-primary-foreground text-[11px] shrink-0">
      {/* Left: server status */}
      <div className="flex items-center gap-1.5">
        {serverStatus === 'checking' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>連線中…</span>
          </>
        )}
        {serverStatus === 'online' && (
          <>
            <Wifi className="h-3 w-3 text-green-300" />
            <span className="text-green-300">已連線</span>
            {serverName && <span className="opacity-70">— {serverName}</span>}
            {serverVersion && <span className="opacity-50">FHIR {serverVersion}</span>}
          </>
        )}
        {serverStatus === 'offline' && (
          <>
            <WifiOff className="h-3 w-3 text-rose-300" />
            <span className="text-rose-300">連線失敗</span>
            <span className="opacity-60 truncate max-w-[200px]">{serverUrl}</span>
          </>
        )}
        {serverStatus === 'unknown' && (
          <>
            <ServerCrash className="h-3 w-3 opacity-50" />
            <span className="opacity-50">未測試</span>
          </>
        )}
      </div>

      {/* Right: mode */}
      {modeLabel && (
        <div className="opacity-80 font-medium">{modeLabel}</div>
      )}
    </footer>
  )
}
