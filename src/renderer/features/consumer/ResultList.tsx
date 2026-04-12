import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, CalendarDays, Building2, Pill, Stethoscope, Lightbulb, SearchX, TriangleAlert, Loader2, Ban, X, Download, Columns2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { exportResultsCsv } from '../../services/bundleFileService'
import { useToastStore } from '../../shared/stores/toastStore'
import { Badge } from '../../shared/components/ui/badge'
import { Button } from '../../shared/components/ui/button'
import { Card, CardContent } from '../../shared/components/ui/card'
import { Input } from '../../shared/components/ui/input'
import { ScrollArea } from '../../shared/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/components/ui/select'
import type { AuditedBundleSummary } from '../../domain/fhir/validation'
import type { ConsumerSearchExecution } from './searchState'

type SortKey = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'

interface Props {
  results: AuditedBundleSummary[]
  total: number
  searchExecution?: ConsumerSearchExecution | null
  selected: AuditedBundleSummary | null
  onSelect: (summary: AuditedBundleSummary) => void
  onCompare?: (summary: AuditedBundleSummary) => void
  nextUrl?: string | null
  isLoadingMore?: boolean
  onLoadMore?: () => void
  isSearching?: boolean
}

function parseFilterCounts(querySteps: ConsumerSearchExecution['querySteps']): { fetched: number; matched: number } | null {
  for (const step of querySteps) {
    if (typeof step.fetchedCount === 'number' && typeof step.matchedCount === 'number') {
      return {
        fetched: step.fetchedCount,
        matched: step.matchedCount
      }
    }
    if (!step.note) continue
    const match = step.note.match(/取得\s+(\d+)\s+筆\s+→\s+符合\s+(\d+)\s+筆/)
    if (match) {
      return {
        fetched: Number(match[1]),
        matched: Number(match[2])
      }
    }
    const englishMatch = step.note.match(/Fetched\s+(\d+)\s+candidate.*matched\s+(\d+)/i)
    if (englishMatch) {
      return {
        fetched: Number(englishMatch[1]),
        matched: Number(englishMatch[2])
      }
    }
  }
  return null
}

function getCriteriaBadges(execution: ConsumerSearchExecution, t: (key: string, options?: Record<string, unknown>) => string): string[] {
  const { params } = execution
  switch (params.mode) {
    case 'basic':
      return params.identifier
        ? [t('results.criteria.identifier', { value: params.identifier })]
        : params.name
        ? [t('results.criteria.name', { value: params.name })]
        : []
    case 'date':
      return [
        params.identifier ? t('results.criteria.identifier', { value: params.identifier }) : '',
        params.date ? t('results.criteria.date', { value: params.date }) : ''
      ].filter(Boolean)
    case 'complex':
      return [
        params.identifier ? t('results.criteria.identifier', { value: params.identifier }) : '',
        params.complexSearchBy === 'organization' && params.organizationId
          ? t('results.criteria.organization', { value: params.organizationId })
          : '',
        params.complexSearchBy === 'author' && params.authorName
          ? t('results.criteria.author', { value: params.authorName })
          : ''
      ].filter(Boolean)
    default:
      return []
  }
}

function getReasonTexts(execution: ConsumerSearchExecution, t: (key: string, options?: Record<string, unknown>) => string): string[] {
  const { params, error } = execution
  if (error) return [t('results.errorHint')]

  const texts: string[] = []
  switch (params.mode) {
    case 'basic':
      if (params.identifier) texts.push(t('results.reasons.basicIdentifier', { identifier: params.identifier }))
      else if (params.name) texts.push(t('results.reasons.basicName', { name: params.name }))
      break
    case 'date':
      texts.push(t('results.reasons.date', { identifier: params.identifier, date: params.date }))
      break
    case 'complex':
      if (params.complexSearchBy === 'organization' && params.organizationId) {
        texts.push(t('results.reasons.complexOrganization', { identifier: params.identifier, organizationId: params.organizationId }))
      } else if (params.complexSearchBy === 'author' && params.authorName) {
        texts.push(t('results.reasons.complexAuthor', { identifier: params.identifier, authorName: params.authorName }))
      } else {
        texts.push(t('results.reasons.generic'))
      }
      break
    default:
      texts.push(t('results.reasons.generic'))
  }

  const counts = parseFilterCounts(execution.querySteps)
  if (counts && counts.fetched > 0) {
    texts.push(t('results.filterInsight', { fetched: counts.fetched, matched: counts.matched }))
  }

  return texts
}

function getSuggestionTexts(execution: ConsumerSearchExecution, t: (key: string, options?: Record<string, unknown>) => string): string[] {
  const { params, error } = execution
  const suggestions = new Set<string>()

  if (error) {
    suggestions.add(t('results.suggestions.retry'))
    suggestions.add(t('results.suggestions.checkServer'))
    return [...suggestions]
  }

  suggestions.add(t('results.suggestions.checkServer'))

  switch (params.mode) {
    case 'basic':
      if (params.identifier) {
        suggestions.add(t('results.suggestions.checkIdentifier'))
      } else if (params.name) {
        suggestions.add(t('results.suggestions.preferIdentifier'))
        suggestions.add(t('results.suggestions.checkServer'))
      }
      break
    case 'date':
      suggestions.add(t('results.suggestions.checkDate'))
      suggestions.add(t('results.suggestions.broadenSearch'))
      break
    case 'complex':
      suggestions.add(t('results.suggestions.broadenSearch'))
      if (params.complexSearchBy === 'organization') {
        suggestions.add(t('results.suggestions.checkOrganization'))
      }
      if (params.complexSearchBy === 'author') {
        suggestions.add(t('results.suggestions.checkAuthor'))
      }
      break
  }

  return [...suggestions]
}

export default function ResultList({ results, total, searchExecution, selected, onSelect, onCompare, nextUrl, isLoadingMore, onLoadMore, isSearching }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const pushToast = useToastStore((s) => s.pushToast)

  const [sortKey, setSortKey] = useState<SortKey>('date-desc')
  const [filterText, setFilterText] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Clear filter text on each new search (searchExecution is a new object each time)
  useEffect(() => {
    setFilterText('')
  }, [searchExecution])

  const sortedAndFiltered = useMemo(() => {
    const lower = filterText.trim().toLowerCase()
    const filtered = lower
      ? results.filter((r) =>
          [r.patientName, r.patientIdentifier, r.organizationName].some(
            (f) => f?.toLowerCase().includes(lower)
          )
        )
      : results

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'date-desc': return (b.date ?? '').localeCompare(a.date ?? '')
        case 'date-asc':  return (a.date ?? '').localeCompare(b.date ?? '')
        case 'name-asc':  return (a.patientName ?? '').localeCompare(b.patientName ?? '')
        case 'name-desc': return (b.patientName ?? '').localeCompare(a.patientName ?? '')
      }
    })
  }, [results, sortKey, filterText])

  const selectedIndex = selected ? sortedAndFiltered.findIndex((s) => s.id === selected.id) : -1
  const isFiltering = filterText.trim().length > 0

  async function handleExportCsv(): Promise<void> {
    setIsExporting(true)
    try {
      const result = await exportResultsCsv(sortedAndFiltered)
      if (!result.canceled && result.fileName) {
        pushToast({
          variant: 'success',
          description: t('results.exportCsvSuccess', { fileName: result.fileName })
        })
      }
    } catch {
      // silently ignore (e.g. bridge unavailable in web preview)
    } finally {
      setIsExporting(false)
    }
  }

  function focusOption(index: number): void {
    optionRefs.current[index]?.focus()
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex: number | null = null

    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(sortedAndFiltered.length - 1, index + 1)
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(0, index - 1)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = sortedAndFiltered.length - 1
    }

    if (nextIndex === null || nextIndex === index) return

    event.preventDefault()
    focusOption(nextIndex)
  }

  if (isSearching) {
    return (
      <div data-testid="consumer.results.loading" className="h-full overflow-auto bg-muted/[0.08] p-4">
        <Card className="rounded-[24px] border-dashed border-border/70 bg-background/85 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-4">
              <Loader2 className="h-10 w-10 animate-spin opacity-40" />
              <p className="text-sm font-medium text-foreground">{t('results.searching')}</p>
              <p className="text-xs opacity-60">{t('results.searchingHint')}</p>
            </div>
            <div className="mt-4 space-y-2.5">
              {[80, 60, 70].map((w) => (
                <div key={w} className="rounded-[18px] border border-border/40 bg-muted/30 p-4 space-y-2 animate-pulse">
                  <div className="flex gap-2 items-center">
                    <div className={`h-3.5 rounded-full bg-muted/60`} style={{ width: `${w}%` }} />
                    <div className="h-3.5 w-12 rounded-full bg-muted/40 ml-auto" />
                  </div>
                  <div className="h-3 w-2/5 rounded-full bg-muted/40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (results.length === 0 && searchExecution?.cancelled) {
    return (
      <div data-testid="consumer.results.cancelled" className="h-full overflow-auto bg-muted/[0.08] p-4">
        <Card className="rounded-[24px] border-dashed border-border/70 bg-background/85 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-4">
              <Ban className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium text-foreground">{t('results.cancelled')}</p>
              <p className="text-xs opacity-60">{t('results.cancelledHint')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (results.length === 0) {
    const criteriaBadges = searchExecution ? getCriteriaBadges(searchExecution, t) : []
    const reasonTexts = searchExecution ? getReasonTexts(searchExecution, t) : [t('results.emptyHint')]
    const suggestionTexts = searchExecution ? getSuggestionTexts(searchExecution, t) : [t('results.suggestions.checkServer')]
    const hasError = Boolean(searchExecution?.error)

    return (
      <div data-testid={hasError ? 'consumer.results.error' : 'consumer.results.empty'} className="h-full overflow-auto bg-muted/[0.08] p-4">
        <Card className="rounded-[24px] border-dashed border-border/70 bg-background/85 shadow-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-2 py-2">
              {hasError ? <TriangleAlert className="h-10 w-10 opacity-70 text-amber-600" /> : <SearchX className="h-10 w-10 opacity-30" />}
              <p className="text-sm font-medium text-foreground">{hasError ? t('results.errorTitle') : t('results.empty')}</p>
              <p className="text-xs opacity-70">{hasError ? t('results.errorHint') : t('results.emptyHint')}</p>
            </div>

            {criteriaBadges.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('results.criteriaTitle')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {criteriaBadges.map((badge) => (
                    <Badge key={badge} variant="outline" className="text-[10px]">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('results.reasonTitle')}</p>
              <div className="space-y-2">
                {reasonTexts.map((reason) => (
                  <div key={reason} className="flex items-start gap-2 rounded-md bg-background/70 p-2 text-xs text-foreground">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('results.suggestionsTitle')}</p>
              <div className="space-y-2">
                {suggestionTexts.map((suggestion) => (
                  <div key={suggestion} className="flex items-start gap-2 rounded-md border border-primary/15 bg-primary/5 p-2 text-xs text-foreground">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="consumer.results.root" className="flex flex-col h-full">
      {/* Header: count + filter match badge + filter input + sort */}
      <div
        data-testid="consumer.results.status"
        role="status"
        aria-live="polite"
        className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background/85 px-4 py-2.5 backdrop-blur"
      >
        <Badge variant="secondary" className="rounded-full px-2.5 text-[11px]">
          {t('results.count', { total })}
        </Badge>
        {total !== results.length && (
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
            {t('results.showing', { count: results.length })}
          </span>
        )}
        {isFiltering && sortedAndFiltered.length < results.length && (
          <button
            type="button"
            onClick={() => setFilterText('')}
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/10 transition-colors"
            aria-label={t('results.filterClear')}
          >
            {t('results.filterMatch', { count: sortedAndFiltered.length })}
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export CSV button */}
        {sortedAndFiltered.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            data-testid="consumer.results.export-csv"
            className="h-7 gap-1 rounded-full px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => { void handleExportCsv() }}
            disabled={isExporting}
            aria-label={t('results.exportCsvButton')}
            title={nextUrl
              ? t('results.exportCsvPartialHint', { count: sortedAndFiltered.length })
              : t('results.exportCsvButton')}
          >
            {isExporting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />
            }
          </Button>
        )}

        {/* Filter input */}
        <div className="relative">
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={t('results.filterPlaceholder')}
            className="h-7 w-36 rounded-full border-border/60 bg-background/80 pl-3 pr-7 text-[11px] focus-visible:w-48 transition-all duration-200"
            aria-label={t('results.filterPlaceholder')}
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t('results.filterClear')}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Sort select */}
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-7 w-36 rounded-full border-border/60 bg-background/80 text-[11px]" aria-label={t('results.sortLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc" className="text-xs">{t('results.sortDateDesc')}</SelectItem>
            <SelectItem value="date-asc"  className="text-xs">{t('results.sortDateAsc')}</SelectItem>
            <SelectItem value="name-asc"  className="text-xs">{t('results.sortNameAsc')}</SelectItem>
            <SelectItem value="name-desc" className="text-xs">{t('results.sortNameDesc')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 bg-muted/[0.08]">
        <div id="consumer-results-keyboard-hint" className="sr-only">
          {t('results.keyboardHint')}
        </div>

        {/* Filter no-match empty state */}
        {isFiltering && sortedAndFiltered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <SearchX className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t('results.filterNoMatch')}</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilterText('')}>
              {t('results.filterClear')}
            </Button>
          </div>
        ) : (
          <ul
            data-testid="consumer.results.list"
            role="listbox"
            aria-label={t('results.listLabel')}
            aria-describedby="consumer-results-keyboard-hint"
            className="space-y-3 p-4"
          >
            {sortedAndFiltered.map((summary, index) => {
              const isSelected = selected?.id === summary.id
              const patientName = summary.patientName || t('results.unknownPatient')
              const optionTabIndex = selectedIndex >= 0 ? (selectedIndex === index ? 0 : -1) : index === 0 ? 0 : -1
              const optionDescriptionId = `consumer-result-${summary.id}-description`

              return (
                <li key={summary.id}>
                  <Card
                    className={
                      isSelected
                        ? 'overflow-hidden rounded-[22px] border-primary bg-primary/[0.04] shadow-sm'
                        : 'overflow-hidden rounded-[22px] border-border/70 bg-background/90 shadow-sm transition-colors hover:border-primary/30 hover:bg-background'
                    }
                  >
                    <button
                      ref={(element) => {
                        optionRefs.current[index] = element
                      }}
                      type="button"
                      role="option"
                      data-result-id={summary.id}
                      aria-selected={isSelected}
                      aria-describedby={optionDescriptionId}
                      tabIndex={optionTabIndex}
                      onClick={() => onSelect(summary)}
                      onKeyDown={(event) => handleOptionKeyDown(event, index)}
                      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <CardContent className="p-0">
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm truncate">
                                {patientName}
                              </span>
                              {isSelected && (
                                <Badge variant="default" className="rounded-full text-[10px]">
                                  {t('results.selectedBadge')}
                                </Badge>
                              )}
                              {summary.source === 'imported' && (
                                <Badge variant="secondary" className="rounded-full text-[10px]">
                                  {t('results.importedBadge')}
                                </Badge>
                              )}
                                {summary.source === 'preview' && (
                                  <Badge data-testid={`consumer.results.preview-badge.${summary.id}`} variant="warning" className="rounded-full text-[10px]">
                                    {t('results.previewBadge')}
                                  </Badge>
                                )}
                              {summary.patientIdentifier && (
                                <Badge variant="outline" className="rounded-full text-[10px] font-mono shrink-0">
                                  {summary.patientIdentifier}
                                </Badge>
                              )}
                            </div>

                            <div
                              id={optionDescriptionId}
                              className="flex flex-wrap gap-3 rounded-2xl bg-muted/[0.25] px-3 py-2 text-xs text-muted-foreground"
                            >
                              {summary.fileName && (
                                <span className="truncate max-w-[180px]" title={summary.fileName}>
                                  {summary.fileName}
                                </span>
                              )}
                              {summary.date && (
                                <span className="flex items-center gap-1">
                                  <CalendarDays aria-hidden="true" className="h-3 w-3" />
                                  {summary.date.slice(0, 10)}
                                </span>
                              )}
                              {summary.organizationName && (
                                <span className="flex items-center gap-1">
                                  <Building2 aria-hidden="true" className="h-3 w-3" />
                                  {summary.organizationName}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {(summary.conditions ?? []).slice(0, 2).map((c, i) => (
                                <Badge key={i} variant="secondary" className="rounded-full text-[10px]">
                                  <Stethoscope aria-hidden="true" className="h-2.5 w-2.5 mr-1" />
                                  {c}
                                </Badge>
                              ))}
                              {(summary.medications ?? []).slice(0, 2).map((m, i) => (
                                <Badge key={i} variant="outline" className="rounded-full text-[10px]">
                                  <Pill aria-hidden="true" className="h-2.5 w-2.5 mr-1" />
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          </div>

                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <code
                                  className="rounded-xl border border-border/70 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground font-mono max-w-[96px] truncate"
                                  title={summary.id}
                                >
                                  {summary.id}
                                </code>
                                {onCompare && selected && selected.id !== summary.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`consumer.results.compare.${summary.id}`}
                                    className="h-6 rounded-lg px-2 text-[10px] font-medium text-muted-foreground gap-1 hover:text-primary hover:border-primary/60"
                                    onClick={(e) => { e.stopPropagation(); onCompare(summary) }}
                                    aria-label={t('results.compareButton')}
                                    title={t('results.compareButton')}
                                  >
                                    <Columns2 className="h-3 w-3" />
                                    {t('results.compareShortLabel')}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                      </CardContent>
                    </button>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        {nextUrl && (
          <div className="flex justify-center pb-4">
            <Button
              data-testid="consumer.results.load-more"
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl text-xs"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {isLoadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isLoadingMore ? t('results.loadingMore') : t('results.loadMore')}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
