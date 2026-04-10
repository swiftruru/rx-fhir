import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { getFriendlyError } from '../lib/fhirError'

interface FhirErrorAlertProps {
  error?: string
}

export default function FhirErrorAlert({ error }: FhirErrorAlertProps): React.JSX.Element | null {
  const { t } = useTranslation('common')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [error])

  const friendlyError = useMemo(
    () => (error ? getFriendlyError(new Error(error), t) : undefined),
    [error, t]
  )

  if (!friendlyError) return null

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <p>{friendlyError.summary}</p>
        {friendlyError.diagnostic && (
          <p className="text-xs text-destructive/80">
            {t('errors.serverMessageLabel', { message: friendlyError.diagnostic })}
          </p>
        )}
        {friendlyError.rawDetails && (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((value) => !value)}
              className="h-8 text-xs"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? t('errors.hideRaw') : t('errors.showRaw')}
            </Button>
            {expanded && (
              <div className="rounded-md border border-destructive/30 bg-background/70 p-3">
                <p className="mb-2 text-xs font-medium text-foreground">{t('errors.rawLabel')}</p>
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">
                  {friendlyError.rawDetails}
                </pre>
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
