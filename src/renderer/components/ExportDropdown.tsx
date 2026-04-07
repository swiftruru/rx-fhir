import { useState, useRef } from 'react'
import { Download, ChevronDown, FileJson, Braces, FileText, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { exportBundleJson, exportBundlePostman, exportBundleHtml } from '../services/bundleFileService'
import { getBundleFileErrorMessage } from '../services/bundleFileService'
import { useAccessibilityStore } from '../store/accessibilityStore'
import { useAppStore } from '../store/appStore'

interface Props {
  bundle: fhir4.Bundle
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

type ExportFormat = 'json' | 'postman' | 'html'

export default function ExportDropdown({ bundle, onSuccess, onError }: Props): React.JSX.Element {
  const { t, i18n } = useTranslation('consumer')
  const { t: tc } = useTranslation('common')
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const serverUrl = useAppStore((state) => state.serverUrl)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<Set<ExportFormat>>(new Set())
  const [postmanProgress, setPostmanProgress] = useState<{ checked: number; total: number } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  function isLoading(format: ExportFormat): boolean {
    return loading.has(format)
  }

  function startLoading(format: ExportFormat): void {
    setLoading((prev) => new Set([...prev, format]))
  }

  function stopLoading(format: ExportFormat): void {
    setLoading((prev) => {
      const next = new Set(prev)
      next.delete(format)
      return next
    })
  }

  async function handleExport(format: ExportFormat): Promise<void> {
    if (isLoading(format)) return
    setOpen(false)
    startLoading(format)

    try {
      let result: { canceled?: boolean; fileName?: string }

      if (format === 'json') {
        result = await exportBundleJson(bundle)
        if (result.canceled || !result.fileName) return
        const message = t('detail.exportSuccess', { fileName: result.fileName })
        onSuccess?.(message)
        announcePolite(t('detail.exportSuccessAnnouncement', { fileName: result.fileName }))
      } else if (format === 'postman') {
        const controller = new AbortController()
        abortControllerRef.current = controller
        setPostmanProgress({ checked: 0, total: 0 })
        try {
          result = await exportBundlePostman(bundle, serverUrl, (checked, total) => {
            setPostmanProgress({ checked, total })
          }, controller.signal)
        } finally {
          abortControllerRef.current = null
        }
        setPostmanProgress(null)
        if (result.canceled || !result.fileName) return
        const message = t('detail.exportPostmanSuccess', { fileName: result.fileName })
        onSuccess?.(message)
        announcePolite(message)
      } else {
        result = await exportBundleHtml(bundle, i18n.language)
        if (result.canceled || !result.fileName) return
        const message = t('detail.exportHtmlSuccess', { fileName: result.fileName })
        onSuccess?.(message)
        announcePolite(message)
      }
    } catch (error) {
      setPostmanProgress(null)
      // AbortError means the user cancelled — don't show an error toast
      if (error instanceof Error && error.name === 'AbortError') return
      onError?.(getBundleFileErrorMessage(error, tc))
    } finally {
      stopLoading(format)
    }
  }

  const anyLoading = loading.size > 0
  const isPostmanProbing = postmanProgress !== null

  // While Postman is probing, replace the dropdown entirely with a cancel button
  if (isPostmanProbing) {
    const checked = postmanProgress!.checked
    const total = postmanProgress!.total
    const label = total === 0
      ? t('detail.exportPostmanChecking')
      : `${checked}/${total}`
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 rounded-xl px-3 border-destructive/40 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
        onClick={() => abortControllerRef.current?.abort()}
        aria-label={tc('buttons.cancel')}
        title={tc('buttons.cancel')}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{label}</span>
        <X className="h-3 w-3 shrink-0 text-destructive/70" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-xl px-3"
          disabled={anyLoading}
          aria-label={t('detail.exportDropdownLabel')}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0">{t('detail.exportDropdownLabel')}</span>
          {anyLoading ? (
            <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
          ) : (
            <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-56 p-1.5"
      >
        <div className="flex flex-col gap-0.5">
          <ExportItem
            icon={<FileJson className="h-3.5 w-3.5" />}
            label={t('detail.exportJson')}
            loading={isLoading('json')}
            onClick={() => void handleExport('json')}
          />
          <ExportItem
            icon={<Braces className="h-3.5 w-3.5" />}
            label={t('detail.exportPostman')}
            loading={isLoading('postman')}
            onClick={() => void handleExport('postman')}
          />
          <ExportItem
            icon={<FileText className="h-3.5 w-3.5" />}
            label={t('detail.exportHtml')}
            loading={isLoading('html')}
            onClick={() => void handleExport('html')}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ExportItem({
  icon,
  label,
  loading,
  onClick
}: {
  icon: React.ReactNode
  label: string
  loading: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        'text-foreground hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-50'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {loading && (
        <span className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
      )}
    </button>
  )
}
