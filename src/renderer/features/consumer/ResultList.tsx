import { useRef } from 'react'
import { FileText, CalendarDays, Building2, Pill, Stethoscope, Lightbulb, SearchX, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { ScrollArea } from '../../components/ui/scroll-area'
import type { BundleSummary } from '../../types/fhir.d'
import type { ConsumerSearchExecution } from './searchState'

interface Props {
  results: BundleSummary[]
  total: number
  searchExecution?: ConsumerSearchExecution | null
  selected: BundleSummary | null
  onSelect: (summary: BundleSummary) => void
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

export default function ResultList({ results, total, searchExecution, selected, onSelect }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = selected ? results.findIndex((summary) => summary.id === selected.id) : -1

  function focusOption(index: number): void {
    optionRefs.current[index]?.focus()
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex: number | null = null

    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(results.length - 1, index + 1)
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(0, index - 1)
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = results.length - 1
    }

    if (nextIndex === null || nextIndex === index) return

    event.preventDefault()
    focusOption(nextIndex)
  }

  if (results.length === 0) {
    const criteriaBadges = searchExecution ? getCriteriaBadges(searchExecution, t) : []
    const reasonTexts = searchExecution ? getReasonTexts(searchExecution, t) : [t('results.emptyHint')]
    const suggestionTexts = searchExecution ? getSuggestionTexts(searchExecution, t) : [t('results.suggestions.checkServer')]
    const hasError = Boolean(searchExecution?.error)

    return (
      <div className="h-full overflow-auto p-4">
        <Card className="border-dashed bg-muted/20">
          <CardContent className="p-5 space-y-5">
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
    <div className="flex flex-col h-full">
      <div role="status" aria-live="polite" className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-xs">{t('results.count', { total })}</Badge>
        {total !== results.length && (
          <span className="text-xs text-muted-foreground">{t('results.showing', { count: results.length })}</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div id="consumer-results-keyboard-hint" className="sr-only">
          {t('results.keyboardHint')}
        </div>
        <ul
          role="listbox"
          aria-label={t('results.listLabel')}
          aria-describedby="consumer-results-keyboard-hint"
          className="p-3 space-y-2"
        >
          {results.map((summary, index) => {
            const isSelected = selected?.id === summary.id
            const patientName = summary.patientName || t('results.unknownPatient')
            const optionTabIndex = selectedIndex >= 0 ? (selectedIndex === index ? 0 : -1) : index === 0 ? 0 : -1
            const optionDescriptionId = `consumer-result-${summary.id}-description`

            return (
              <li key={summary.id}>
                <Card className={isSelected ? 'ring-2 ring-primary border-primary' : ''}>
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
                    className="w-full rounded-lg text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">
                              {patientName}
                            </span>
                            {isSelected && (
                              <Badge variant="default" className="text-[10px]">
                                {t('results.selectedBadge')}
                              </Badge>
                            )}
                            {summary.source === 'imported' && (
                              <Badge variant="secondary" className="text-[10px]">
                                {t('results.importedBadge')}
                              </Badge>
                            )}
                            {summary.patientIdentifier && (
                              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                {summary.patientIdentifier}
                              </Badge>
                            )}
                          </div>

                          <div id={optionDescriptionId} className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                <Stethoscope aria-hidden="true" className="h-2.5 w-2.5 mr-1" />
                                {c}
                              </Badge>
                            ))}
                            {(summary.medications ?? []).slice(0, 2).map((m, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                <Pill aria-hidden="true" className="h-2.5 w-2.5 mr-1" />
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <code className="text-[10px] text-muted-foreground font-mono shrink-0 max-w-[80px] truncate" title={summary.id}>
                          {summary.id}
                        </code>
                      </div>
                    </CardContent>
                  </button>
                </Card>
              </li>
            )
          })}
        </ul>
      </ScrollArea>
    </div>
  )
}
