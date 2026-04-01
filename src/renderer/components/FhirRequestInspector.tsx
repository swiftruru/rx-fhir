import { AlertCircle, CheckCircle2, CircleAlert, Clock3, Link2, SendHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import JsonViewer from './JsonViewer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import ExternalUrlLink from './ExternalUrlLink'
import type { FhirRequestEntry } from '../store/fhirInspectorStore'

interface Props {
  request?: FhirRequestEntry
  history?: FhirRequestEntry[]
}

function formatDateTime(value?: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function formatDuration(durationMs?: number): string | undefined {
  if (durationMs === undefined) return undefined
  return `${durationMs} ms`
}

function getBundleEntryCount(payload: unknown): number | undefined {
  if (!payload || typeof payload !== 'object') return undefined

  const bundle = payload as {
    resourceType?: string
    total?: number
    entry?: unknown[]
  }

  if (bundle.resourceType !== 'Bundle') return undefined
  if (typeof bundle.total === 'number') return bundle.total
  if (Array.isArray(bundle.entry)) return bundle.entry.length
  return undefined
}

function renderPayload(title: string, payload: unknown, emptyLabel: string): React.JSX.Element {
  if (payload === undefined || payload === null || payload === '') {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  if (typeof payload === 'string') {
    return (
      <div className="rounded-lg border border-border/70 bg-background/80">
        <div className="border-b px-3 py-2 text-[11px] font-medium text-muted-foreground">{title}</div>
        <ScrollArea className="max-h-56">
          <pre className="whitespace-pre-wrap break-words p-3 text-[11px] leading-5 text-foreground">{payload}</pre>
        </ScrollArea>
      </div>
    )
  }

  return <JsonViewer data={payload} title={title} defaultCollapsed={false} fontSize="sm" />
}

function getFlowTitle(
  entry: FhirRequestEntry,
  index: number,
  total: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const resourceType = entry.resourceType ?? t('stepper.requestFlow.fallbackResource')
  const singleStep = total <= 1

  switch (entry.reasonCode) {
    case 'check-existing':
      return t(singleStep ? 'stepper.requestFlow.singleCheckExisting' : 'stepper.requestFlow.stepCheckExisting', { index: index + 1, resourceType })
    case 'create':
      return t(singleStep ? 'stepper.requestFlow.singleCreate' : 'stepper.requestFlow.stepCreate', { index: index + 1, resourceType })
    case 'update':
      return t(singleStep ? 'stepper.requestFlow.singleUpdate' : 'stepper.requestFlow.stepUpdate', { index: index + 1, resourceType })
    case 'search':
      return t(singleStep ? 'stepper.requestFlow.singleSearch' : 'stepper.requestFlow.stepSearch', { index: index + 1, resourceType })
    default:
      return t(singleStep ? 'stepper.requestFlow.singleRequest' : 'stepper.requestFlow.stepRequest', { index: index + 1, resourceType })
  }
}

function getFlowNote(
  entry: FhirRequestEntry,
  nextEntry: FhirRequestEntry | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string | undefined {
  const resourceType = entry.resourceType ?? t('stepper.requestFlow.fallbackResource')

  switch (entry.reasonCode) {
    case 'check-existing': {
      const matchCount = getBundleEntryCount(entry.responseBody)
      if ((matchCount ?? 0) > 0) {
        return t('stepper.requestFlow.noteCheckExistingFound', {
          resourceType,
          count: matchCount
        })
      }
      if (nextEntry?.reasonCode === 'create') {
        return t('stepper.requestFlow.noteCheckExistingMissing', { resourceType })
      }
      return t('stepper.requestFlow.noteCheckExistingUnknown', { resourceType })
    }
    case 'create':
      return entry.ok
        ? t('stepper.requestFlow.noteCreate', { resourceType })
        : t('stepper.requestFlow.noteCreateFailed', { resourceType })
    case 'update':
      return entry.ok
        ? t('stepper.requestFlow.noteUpdate', { resourceType })
        : t('stepper.requestFlow.noteUpdateFailed', { resourceType })
    case 'search':
      return t('stepper.requestFlow.noteSearch')
    default:
      return undefined
  }
}

export default function FhirRequestInspector({ request, history }: Props): React.JSX.Element {
  const { t } = useTranslation('creator')
  const emptyLabel = t('stepper.requestNoContent')
  const flowEntries = history?.length ? [...history].reverse() : request ? [request] : []
  const sectionLabelClass = 'text-[10px] font-medium tracking-wide text-muted-foreground/70'
  const requestGuideItems = [
    {
      method: 'GET',
      title: t('stepper.requestGuideGetTitle'),
      description: t('stepper.requestGuideGetDescription'),
      badgeClass:
        'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300',
      cardClass:
        'border-sky-200/80 bg-sky-50/70 dark:border-sky-500/20 dark:bg-sky-500/5'
    },
    {
      method: 'POST',
      title: t('stepper.requestGuidePostTitle'),
      description: t('stepper.requestGuidePostDescription'),
      badgeClass:
        'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
      cardClass:
        'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/5'
    },
    {
      method: 'PUT',
      title: t('stepper.requestGuidePutTitle'),
      description: t('stepper.requestGuidePutDescription'),
      badgeClass:
        'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
      cardClass:
        'border-amber-200/80 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/5'
    }
  ] as const

  if (!request) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-background/70 px-4 py-10 text-center text-muted-foreground">
        <SendHorizontal className="mx-auto h-8 w-8 opacity-25" />
        <p className="mt-3 text-sm font-medium">{t('stepper.requestEmptyTitle')}</p>
        <p className="mt-1 text-xs">{t('stepper.requestEmptyDescription')}</p>

        <div className="mt-4 rounded-xl border border-border/70 bg-background/90 p-2.5 text-left shadow-sm">
          <p className={sectionLabelClass}>{t('stepper.requestGuideTitle')}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {requestGuideItems.map((item) => (
              <div
                key={item.method}
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm ${item.cardClass}`}
              >
                <Badge variant="outline" className={`font-mono text-[10px] ${item.badgeClass}`}>
                  {item.method}
                </Badge>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-snug">
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="text-muted-foreground/50">|</span>
                  <span className="text-muted-foreground">{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statusVariant = request.ok === undefined ? 'outline' : request.ok ? 'secondary' : 'destructive'
  const statusLabel = request.ok === undefined
    ? t('stepper.requestStatusPending')
    : request.ok
      ? t('stepper.requestStatusSuccess')
      : t('stepper.requestStatusError')
  const requestReason = request.reasonCode
    ? request.reasonCode === 'check-existing'
      ? t('stepper.requestReason.checkExisting')
      : request.reasonCode === 'create'
        ? t('stepper.requestReason.create')
        : request.reasonCode === 'update'
          ? t('stepper.requestReason.update')
          : t('stepper.requestReason.search')
    : undefined

  return (
    <div className="space-y-3">
      {flowEntries.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-background/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className={sectionLabelClass}>{t('stepper.requestFlow.title')}</p>
            <Badge variant="outline" className="text-[10px]">
              {flowEntries.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
            {flowEntries.map((entry, index) => {
              const note = getFlowNote(entry, flowEntries[index + 1], t)
              return (
                <div key={entry.id} className="space-y-1.5 rounded-lg bg-muted/10 px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {entry.method}
                    </Badge>
                    <p className="text-xs font-medium text-foreground">
                      {getFlowTitle(entry, index, flowEntries.length, t)}
                    </p>
                    {entry.responseStatus !== undefined && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {entry.responseStatus}
                      </Badge>
                    )}
                  </div>
                  <ExternalUrlLink url={entry.url} compact />
                  {note && <p className="text-[10px] italic text-muted-foreground/80">{note}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-background/90 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className={sectionLabelClass}>{t('stepper.requestLatestTitle')}</p>
          {request.resourceType && (
            <Badge variant="outline" className="text-[10px]">
              {request.resourceType}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {request.method}
              </Badge>
              <Badge variant={statusVariant} className="text-[10px]">
                {statusLabel}
              </Badge>
              {request.responseStatus !== undefined && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {request.responseStatus}
                </Badge>
              )}
              {requestReason && (
                <TooltipProvider delayDuration={120}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label={t('stepper.requestReasonLabel')}
                      >
                        <CircleAlert className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="end"
                      sideOffset={8}
                      collisionPadding={16}
                      className="max-w-xs text-xs leading-relaxed"
                    >
                      <p>{requestReason}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="min-w-0">
                <ExternalUrlLink url={request.url} className="text-[11px]" />
              </div>
            </div>
          </div>

          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{formatDateTime(request.startedAt)}</span>
            </div>
            {request.durationMs !== undefined && (
              <div className="text-right font-mono">{formatDuration(request.durationMs)}</div>
            )}
          </div>
        </div>

        {request.errorMessage && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{request.errorMessage}</span>
          </div>
        )}

        {request.ok && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {request.responseStatus !== undefined
                ? `${request.responseStatus} ${request.responseStatusText ?? ''}`.trim()
                : statusLabel}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {renderPayload(t('stepper.requestHeadersTitle'), request.requestHeaders, emptyLabel)}
        {renderPayload(t('stepper.requestBodyTitle'), request.requestBody, emptyLabel)}
        {renderPayload(t('stepper.responseHeadersTitle'), request.responseHeaders, emptyLabel)}
        {renderPayload(t('stepper.responseBodyTitle'), request.responseBody, emptyLabel)}
      </div>
    </div>
  )
}
