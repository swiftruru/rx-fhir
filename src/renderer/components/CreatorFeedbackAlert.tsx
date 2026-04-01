import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CreatorResourceFeedback } from '../store/creatorStore'
import { Alert, AlertDescription } from './ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface Props {
  feedback: CreatorResourceFeedback
  resourceType: string
}

export default function CreatorFeedbackAlert({ feedback, resourceType }: Props): React.JSX.Element {
  const { t } = useTranslation('common')

  const message =
    feedback.outcome === 'reused'
      ? t('fhir.resourceReused', { resourceType, id: feedback.id })
      : feedback.outcome === 'updated'
        ? t('fhir.resourceUpdated', { resourceType, id: feedback.id })
        : t('fhir.resourceCreated', { resourceType, id: feedback.id })

  const reason =
    feedback.outcome === 'reused'
      ? t('fhir.feedbackReason.reused', { resourceType })
      : feedback.outcome === 'updated'
        ? t('fhir.feedbackReason.updated', { resourceType })
        : t('fhir.feedbackReason.created', { resourceType })

  return (
    <Alert variant={feedback.outcome === 'reused' ? 'info' : 'success'}>
      <CheckCircle2 className="h-4 w-4" />
      <AlertDescription className="flex items-start gap-2">
        <span>{message}</span>
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-current/80 hover:text-current"
                aria-label={t('fhir.feedbackReason.label')}
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
              <p>{reason}</p>
              {feedback.requestMethod && (
                <p className="mt-1 font-mono text-[11px] opacity-80">
                  HTTP {feedback.requestMethod}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AlertDescription>
    </Alert>
  )
}
