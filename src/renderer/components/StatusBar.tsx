import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Wifi, WifiOff, Loader2, ServerCrash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAccessibilityStore } from '../store/accessibilityStore'
import { getRouteNavKey } from '../lib/routeMeta'
import { checkServerHealth } from '../services/fhirClient'
import FeatureShowcaseTarget from './FeatureShowcaseTarget'

export default function StatusBar(): React.JSX.Element {
  const { serverUrl, serverStatus, serverName, serverVersion, setServerStatus } = useAppStore()
  const location = useLocation()
  const { t: tc } = useTranslation('common')
  const { t: tn } = useTranslation('nav')
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const previousServerStatusRef = useRef(serverStatus)

  useEffect(() => {
    setServerStatus('checking')
    checkServerHealth(serverUrl).then(({ online, name, version }) => {
      setServerStatus(online ? 'online' : 'offline', name, version)
    })
  }, [serverUrl])

  const modeKey = getRouteNavKey(location.pathname)

  const statusAnnouncement = useMemo(() => {
    if (serverStatus === 'online') {
      const details = [serverName, serverVersion ? `FHIR ${serverVersion}` : undefined]
        .filter(Boolean)
        .join(', ')

      return details
        ? `${tc('server.online')}, ${details}`
        : tc('server.online')
    }

    if (serverStatus === 'offline') {
      return `${tc('server.offline')}, ${serverUrl}`
    }

    return ''
  }, [serverName, serverStatus, serverUrl, serverVersion, tc])

  useEffect(() => {
    const previousStatus = previousServerStatusRef.current

    if (
      previousStatus
      && previousStatus !== serverStatus
      && serverStatus !== 'unknown'
      && serverStatus !== 'checking'
      && statusAnnouncement
    ) {
      announcePolite(statusAnnouncement)
    }

    previousServerStatusRef.current = serverStatus
  }, [announcePolite, serverStatus, statusAnnouncement])

  return (
    <FeatureShowcaseTarget id="app.statusBar">
      <footer
        aria-label={tc('accessibility.statusBar')}
        className="h-7 flex items-center justify-between px-4 bg-primary text-primary-foreground text-[11px] shrink-0"
      >
        {/* Left: server status */}
        <div className="flex items-center gap-1.5">
          {serverStatus === 'checking' && (
            <>
              <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
              <span>{tc('server.checking')}</span>
            </>
          )}
          {serverStatus === 'online' && (
            <>
              <Wifi aria-hidden="true" className="h-3 w-3 text-green-300" />
              <span className="text-green-300">{tc('server.online')}</span>
              {serverName && <span className="opacity-70">— {serverName}</span>}
              {serverVersion && <span className="opacity-50">FHIR {serverVersion}</span>}
            </>
          )}
          {serverStatus === 'offline' && (
            <>
              <WifiOff aria-hidden="true" className="h-3 w-3 text-rose-300" />
              <span className="text-rose-300">{tc('server.offline')}</span>
              <span className="opacity-60 truncate max-w-[200px]">{serverUrl}</span>
            </>
          )}
          {serverStatus === 'unknown' && (
            <>
              <ServerCrash aria-hidden="true" className="h-3 w-3 opacity-50" />
              <span className="opacity-50">{tc('server.unknown')}</span>
            </>
          )}
        </div>

        {/* Right: mode */}
        {modeKey && (
          <div className="opacity-80 font-medium">{tn(`modeLabels.${modeKey}`)}</div>
        )}
      </footer>
    </FeatureShowcaseTarget>
  )
}
