import { useEffect, useMemo, useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import { Copy, Check, ChevronDown, ChevronUp, FileJson, ListTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { buildJsonSummary } from '../lib/jsonSummary'

interface JsonViewerProps {
  data: unknown
  title?: string
  defaultCollapsed?: boolean
  defaultViewMode?: 'summary' | 'raw'
  className?: string
  fontSize?: 'sm' | 'md' | 'lg'
  fillHeight?: boolean
  collapseSync?: {
    value: boolean
    token: number
  }
}

export default function JsonViewer({
  data,
  title,
  defaultCollapsed = false,
  defaultViewMode = 'raw',
  className,
  fontSize = 'sm',
  fillHeight = false,
  collapseSync
}: JsonViewerProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [viewMode, setViewMode] = useState<'summary' | 'raw'>(defaultViewMode)
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  )

  useEffect(() => {
    const root = document.documentElement
    const updateTheme = (): void => setIsDark(root.classList.contains('dark'))

    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!collapseSync) return
    setCollapsed(collapseSync.value)
  }, [collapseSync?.token, collapseSync?.value])

  useEffect(() => {
    setViewMode(defaultViewMode)
  }, [defaultViewMode])

  const jsonTheme = useMemo(() => ({
    ...defaultStyles,
    container: cn(
      'font-mono leading-6 !whitespace-pre-wrap break-all',
      fontSize === 'sm' && 'text-[11px]',
      fontSize === 'md' && 'text-xs',
      fontSize === 'lg' && 'text-[13px]',
      isDark ? 'text-slate-100' : 'text-slate-700'
    ),
    basicChildStyle: 'ml-4',
    label: isDark ? 'text-rose-300 mr-1' : 'text-rose-700 mr-1',
    nullValue: 'text-muted-foreground',
    undefinedValue: 'text-muted-foreground',
    numberValue: isDark ? 'text-amber-300' : 'text-amber-700',
    stringValue: isDark ? 'text-emerald-300' : 'text-emerald-700',
    booleanValue: isDark ? 'text-fuchsia-300' : 'text-fuchsia-700',
    otherValue: isDark ? 'text-slate-200' : 'text-slate-700',
    punctuation: 'text-muted-foreground',
    expandIcon: 'text-muted-foreground cursor-pointer',
    collapseIcon: 'text-muted-foreground cursor-pointer',
    noQuotesForStringValues: false
  }), [fontSize, isDark])

  const summary = useMemo(() => buildJsonSummary(data, t), [data, t])

  const headerClasses = isDark
    ? 'bg-card border-border'
    : 'bg-secondary/70 border-border'

  const contentClasses = isDark
    ? 'bg-background/95'
    : 'bg-white/90'

  function handleCopy(): void {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex w-full flex-col rounded-lg border border-border bg-background overflow-hidden shadow-sm', className)}>
      {/* Header bar */}
      <div className={cn('flex items-center justify-between px-3 py-2 border-b transition-colors', headerClasses)}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
            {title && <span className="font-mono font-medium">{title}</span>}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            role="group"
            aria-label={t('jsonViewer.viewModeLabel')}
            className="inline-flex items-center rounded-md border border-border/70 bg-background/80 p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              aria-pressed={viewMode === 'summary'}
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                viewMode === 'summary'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListTree className="h-3.5 w-3.5" />
              <span>{t('jsonViewer.summary')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              aria-pressed={viewMode === 'raw'}
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                viewMode === 'raw'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileJson className="h-3.5 w-3.5" />
              <span>{t('jsonViewer.raw')}</span>
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-background/70"
            onClick={handleCopy}
            title={t('jsonViewer.copy')}
            aria-label={t('jsonViewer.copy')}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* JSON content */}
      {!collapsed && (
        <div
          className={cn(
            'w-full min-w-0 overflow-x-auto overflow-y-auto rounded-b-lg text-xs transition-colors',
            fillHeight ? 'flex-1 min-h-0' : 'max-h-[500px]',
            contentClasses
          )}
        >
          {viewMode === 'summary' ? (
            <div className="space-y-4 p-3 text-xs text-foreground">
              {summary.overview.length > 0 && (
                <section aria-label={t('jsonViewer.overview')} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('jsonViewer.overview')}
                  </p>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {summary.overview.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                        <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-foreground break-words">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {summary.fields.length > 0 && (
                <section aria-label={t('jsonViewer.fields')} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('jsonViewer.fields')}
                  </p>
                  <dl className="space-y-2">
                    {summary.fields.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                        <dt className="text-[11px] font-medium text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="mt-1 break-words text-sm text-foreground">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {summary.preview && (
                <section aria-label={t('jsonViewer.preview')} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('jsonViewer.preview')}
                  </p>
                  <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                      {summary.preview}
                    </p>
                  </div>
                </section>
              )}

              {summary.overview.length === 0 && summary.fields.length === 0 && !summary.preview && (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                  {t('jsonViewer.noSummary')}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-full p-3">
              <JsonView
                data={data as never}
                shouldExpandNode={allExpanded}
                style={jsonTheme}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
