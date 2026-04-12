import { AlertCircle, AlertTriangle, CheckCircle2, Info, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from './ui/badge'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { getServerAuditMessageSummary } from '../lib/auditMessageSummary'
import type { FhirAuditIssue, FhirAuditReport } from '../../domain/fhir/validation'

interface Props {
  report?: FhirAuditReport
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  onIssueSelect?: (issue: FhirAuditIssue) => void
  className?: string
  testId?: string
}

function getSeverityBadgeVariant(severity: FhirAuditIssue['severity']): 'destructive' | 'warning' | 'secondary' {
  switch (severity) {
    case 'error':
      return 'destructive'
    case 'warning':
      return 'warning'
    default:
      return 'secondary'
  }
}

function getSourceLabel(issue: FhirAuditIssue, t: (key: string) => string): string {
  return issue.source === 'server' ? t('audit.source.server') : t('audit.source.local')
}

function getLocalizedServerStatusMessage(message: string, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (/downgraded to info because they reflect validator environment limits or best-practice recommendations rather than structural errors\./i.test(message)) {
    return t('audit.server.environmentDowngraded')
  }

  return message
}

export default function FhirAuditReportCard({
  report,
  title,
  description,
  emptyTitle,
  emptyDescription,
  onIssueSelect,
  className,
  testId
}: Props): React.JSX.Element {
  const { t } = useTranslation('common')

  if (!report) {
    return (
      <Alert variant="info" className={cn('min-w-0', className)} data-testid={testId}>
        <Info className="h-4 w-4" />
        <AlertTitle>{emptyTitle}</AlertTitle>
        <AlertDescription className="break-words [overflow-wrap:anywhere]">{emptyDescription}</AlertDescription>
      </Alert>
    )
  }

  const serverIssueSummaries = report.issues
    .filter((issue) => issue.source === 'server')
    .map((issue) => getServerAuditMessageSummary(issue.message))
  const environmentServerIssueCount = serverIssueSummaries.filter((summary) => (
    summary.category === 'environment' || summary.category === 'bestPractice'
  )).length
  const structuralServerIssueCount = serverIssueSummaries.filter((summary) => summary.category === 'structural').length
  const shouldShowEnvironmentSummary = environmentServerIssueCount > 0
  const hasOnlyNonStructuralServerIssues = shouldShowEnvironmentSummary && structuralServerIssueCount === 0 && report.errorCount === 0 && report.warningCount === 0

  const SummaryIcon = report.hasBlockingErrors
    ? AlertCircle
    : report.warningCount > 0
      ? AlertTriangle
      : CheckCircle2

  return (
    <div data-testid={testId} className={cn('min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <SummaryIcon className={cn(
              'h-4 w-4 shrink-0',
              report.hasBlockingErrors
                ? 'text-destructive'
                : report.warningCount > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            )} />
            <p className="text-sm font-semibold text-foreground">{title}</p>
          </div>
          <p className="break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={report.errorCount > 0 ? 'destructive' : 'outline'}>
            {t('audit.summary.errors', { count: report.errorCount })}
          </Badge>
          <Badge variant={report.warningCount > 0 ? 'warning' : 'outline'}>
            {t('audit.summary.warnings', { count: report.warningCount })}
          </Badge>
          <Badge variant="outline">
            {t('audit.summary.info', { count: report.infoCount })}
          </Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span>
          {report.status === 'hybrid' ? t('audit.status.hybrid') : t('audit.status.localOnly')}
        </span>
        <span>
          {report.sources.server.status === 'completed'
            ? t('audit.server.completed')
            : report.sources.server.status === 'unavailable'
              ? t('audit.server.unavailable')
              : t('audit.server.skipped')}
        </span>
      </div>

      {report.sources.server.message && (
        <Alert variant="info" className="mt-3">
          <Info className="h-4 w-4" />
          <AlertDescription className="break-words [overflow-wrap:anywhere]">
            {getLocalizedServerStatusMessage(report.sources.server.message, t)}
          </AlertDescription>
        </Alert>
      )}

      {shouldShowEnvironmentSummary && (
        <Alert variant="info" className="mt-3">
          <Info className="h-4 w-4" />
          <AlertTitle>{t('audit.serverEnvironment.title')}</AlertTitle>
          <AlertDescription className="break-words [overflow-wrap:anywhere]">
            {hasOnlyNonStructuralServerIssues
              ? t('audit.serverEnvironment.onlyEnvironmentIssues', { count: environmentServerIssueCount })
              : t('audit.serverEnvironment.partialEnvironmentIssues', { count: environmentServerIssueCount })}
          </AlertDescription>
        </Alert>
      )}

      {report.issues.length > 0 ? (
        <div className="mt-4 min-w-0 space-y-2">
          {report.issues.map((issue) => {
            const serverSummary = issue.source === 'server'
              ? getServerAuditMessageSummary(issue.message)
              : undefined

            const content = (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant={getSeverityBadgeVariant(issue.severity)} className="px-2 py-0 text-[10px]">
                    {t(`audit.severity.${issue.severity}`)}
                  </Badge>
                  <Badge variant="outline" className="px-2 py-0 text-[10px]">
                    {getSourceLabel(issue, t)}
                  </Badge>
                  {issue.stepKey && (
                    <span className="text-[11px] text-muted-foreground">
                      {t('audit.issue.step', { step: issue.stepKey })}
                    </span>
                  )}
                </div>
                {serverSummary ? (
                  <div className="min-w-0 space-y-1">
                    <p className="break-words text-sm text-foreground [overflow-wrap:anywhere]">
                      {t(serverSummary.key, serverSummary.params)}
                    </p>
                    <p className="break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                      {t('audit.issue.rawServerMessage', { message: issue.message })}
                    </p>
                  </div>
                ) : (
                  <p className="break-words text-sm text-foreground [overflow-wrap:anywhere]">{issue.message}</p>
                )}
                {(issue.resourceType || issue.fieldPath) && (
                  <p className="break-words text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                    {[issue.resourceType && issue.resourceId ? `${issue.resourceType}/${issue.resourceId}` : issue.resourceType, issue.fieldPath]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </>
            )

            if (onIssueSelect && issue.stepKey) {
              return (
                <Button
                  key={issue.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full min-w-0 justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-3 text-left hover:bg-accent/30"
                  onClick={() => onIssueSelect(issue)}
                >
                  <div className="min-w-0 flex-1 space-y-2">{content}</div>
                  <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              )
            }

            return (
              <div
                key={issue.id}
                className="min-w-0 rounded-xl border border-border/70 bg-background/70 px-3 py-3"
              >
                <div className="min-w-0 space-y-2">{content}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <Alert variant="success" className="mt-4">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{t('audit.summary.noIssues')}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
