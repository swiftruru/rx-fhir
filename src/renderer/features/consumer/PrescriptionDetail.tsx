import { useEffect, useRef, useState } from 'react'
import { X, Code2, Braces } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../shared/components/ui/button'
import { Badge } from '../../shared/components/ui/badge'
import { ScrollArea } from '../../shared/components/ui/scroll-area'
import { Alert, AlertDescription } from '../../shared/components/ui/alert'
import FhirErrorAlert from '../../shared/components/FhirErrorAlert'
import FhirAuditReportCard from '../../shared/components/FhirAuditReportCard'
import JsonViewer from '../../shared/components/JsonViewer'
import ExportDropdown from './components/ExportDropdown'
import FeatureShowcaseTarget from '../../app/components/FeatureShowcaseTarget'
import type { AuditedBundleSummary } from '../../domain/fhir/validation'
import { useFeatureShowcaseStore } from '../../app/stores/featureShowcaseStore'
import { useShortcutActionStore } from '../../shared/stores/shortcutActionStore'
import { shouldAuditConsumerBundle } from './lib/bundleAudit'

interface Props {
  summary: AuditedBundleSummary
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="space-y-3 rounded-[22px] border border-border/70 bg-background/90 p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }): React.JSX.Element {
  if (!value) return <></>
  return (
    <div className="grid grid-cols-[5.5rem,minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  )
}

export default function PrescriptionDetail({ summary, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const showcaseStatus = useFeatureShowcaseStore((state) => state.status)
  const showcaseUi = useFeatureShowcaseStore((state) => state.ui)
  const setConsumerActions = useShortcutActionStore((state) => state.setConsumerActions)
  const clearConsumerActions = useShortcutActionStore((state) => state.clearConsumerActions)
  const [showJson, setShowJson] = useState(false)
  const [fileMessage, setFileMessage] = useState<string>()
  const [fileError, setFileError] = useState<string>()
  const showcaseBackupRef = useRef<boolean>()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const showcaseActive = showcaseStatus === 'running' || showcaseStatus === 'paused'
  const bundle = summary.raw
  const showAudit = shouldAuditConsumerBundle(summary)

  const entries = bundle.entry || []
  const getResource = <T extends fhir4.Resource>(type: string): T | undefined =>
    entries.find(e => e.resource?.resourceType === type)?.resource as T | undefined

  const patient = getResource<fhir4.Patient>('Patient')
  const practitioner = getResource<fhir4.Practitioner>('Practitioner')
  const organization = getResource<fhir4.Organization>('Organization')
  const encounter = getResource<fhir4.Encounter>('Encounter')
  const condition = getResource<fhir4.Condition>('Condition')
  const observation = getResource<fhir4.Observation>('Observation')
  const coverage = getResource<fhir4.Coverage>('Coverage')
  const medication = getResource<fhir4.Medication>('Medication')
  const medicationRequest = getResource<fhir4.MedicationRequest>('MedicationRequest')
  const composition = getResource<fhir4.Composition>('Composition')

  const s = (section: string, key: string) => t(`detail.sections.${section}.${key}`)

  useEffect(() => {
    if (showcaseActive && showcaseBackupRef.current === undefined) {
      showcaseBackupRef.current = showJson
      return
    }

    if (!showcaseActive && showcaseBackupRef.current !== undefined) {
      setShowJson(showcaseBackupRef.current)
      showcaseBackupRef.current = undefined
    }
  }, [showJson, showcaseActive])

  useEffect(() => {
    if (!showcaseActive) return
    const detailView = showcaseUi.consumer?.detailView
    if (detailView) {
      setShowJson(detailView === 'json')
    }
  }, [showcaseActive, showcaseUi.consumer?.detailView])

  useEffect(() => {
    setConsumerActions({
      toggleDetailView: () => setShowJson((current) => !current)
    })

    return () => {
      clearConsumerActions(['toggleDetailView'])
    }
  }, [clearConsumerActions, setConsumerActions])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [summary.id])

  return (
    <section
      data-testid="consumer.detail"
      aria-labelledby="prescription-detail-heading"
      className="flex h-full min-h-0 flex-col overflow-hidden border-t bg-muted/[0.08] xl:border-l xl:border-t-0"
    >
      <div className="shrink-0 border-b bg-background/90 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-2">
              <h2
                id="prescription-detail-heading"
                ref={headingRef}
                tabIndex={-1}
                className="text-base font-semibold outline-none"
              >
                {t('detail.title')}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-xl border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground font-mono">
                  {summary.id}
                </code>
                {summary.source === 'imported' && (
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {t('detail.importedBadge')}
                  </Badge>
                )}
                {summary.source === 'preview' && (
                  <Badge data-testid="consumer.detail.preview-badge" variant="warning" className="rounded-full text-[10px]">
                    {t('detail.previewBadge')}
                  </Badge>
                )}
                {summary.fileName && (
                  <span className="truncate rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground max-w-[220px]" title={summary.fileName}>
                    {summary.fileName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label={t('detail.viewModeLabel')}
                className="inline-flex items-center rounded-xl border border-border/70 bg-muted/40 p-1"
              >
                <Button
                  data-testid="consumer.detail.view.structured"
                  type="button"
                  variant={!showJson ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-3"
                  aria-pressed={!showJson}
                  onClick={() => setShowJson(false)}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {t('detail.toggleStructured')}
                </Button>
                <Button
                  data-testid="consumer.detail.view.json"
                  type="button"
                  variant={showJson ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg px-3"
                  aria-pressed={showJson}
                  onClick={() => setShowJson(true)}
                >
                  <Braces className="h-3.5 w-3.5" />
                  {t('detail.toggleJson')}
                </Button>
              </div>
              <FeatureShowcaseTarget id="consumer.exportButton">
                <ExportDropdown
                  bundle={bundle}
                  onSuccess={(message) => { setFileError(undefined); setFileMessage(message) }}
                  onError={(message) => { setFileMessage(undefined); setFileError(message) }}
                />
              </FeatureShowcaseTarget>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('detail.closeButton')}
              className="h-8 w-8 rounded-xl"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {(fileMessage || fileError) && (
        <div className="border-b bg-background px-4 py-3 shrink-0 space-y-3">
          {fileMessage && (
            <Alert variant="success" role="status" aria-live="polite">
              <AlertDescription>{fileMessage}</AlertDescription>
            </Alert>
          )}
          <FhirErrorAlert error={fileError} />
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-4 pr-7 sm:px-5 sm:py-5 sm:pr-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {showAudit && (
              <FhirAuditReportCard
                report={summary.auditReport}
                title={t('detail.audit.title')}
                description={
                  summary.source === 'preview'
                    ? t('detail.audit.previewDescription')
                    : t('detail.audit.importedDescription')
                }
                emptyTitle={t('detail.audit.emptyTitle')}
                emptyDescription={t('detail.audit.emptyDescription')}
                testId="consumer.detail.audit"
              />
            )}

            {showJson ? (
              <JsonViewer
                key={summary.id}
                data={bundle}
                title={t('detail.rawJsonTitle')}
                defaultCollapsed={false}
              />
            ) : (
              <>
                {composition && (
                  <Section title={s('prescription', 'title')}>
                    <Field label={s('prescription', 'docTitle')} value={composition.title} />
                    <Field label={s('prescription', 'date')} value={composition.date} />
                    <Field label={s('prescription', 'status')} value={composition.status} />
                    <Field label={s('prescription', 'bundleId')} value={summary.id} />
                  </Section>
                )}

                {patient && (
                  <Section title={s('patient', 'title')}>
                    <Field label={s('patient', 'name')} value={patient.name?.[0]?.text} />
                    <Field label={s('patient', 'identifier')} value={patient.identifier?.[0]?.value} />
                    <Field label={s('patient', 'gender')} value={patient.gender} />
                    <Field label={s('patient', 'birthDate')} value={patient.birthDate} />
                  </Section>
                )}

                {practitioner && (
                  <Section title={s('practitioner', 'title')}>
                    <Field label={s('practitioner', 'name')} value={practitioner.name?.[0]?.text} />
                    <Field label={s('practitioner', 'licenseNumber')} value={practitioner.identifier?.[0]?.value} />
                    <Field label={s('practitioner', 'qualification')} value={practitioner.qualification?.[0]?.code?.text} />
                  </Section>
                )}

                {organization && (
                  <Section title={s('organization', 'title')}>
                    <Field label={s('organization', 'name')} value={organization.name} />
                    <Field label={s('organization', 'identifier')} value={organization.identifier?.[0]?.value} />
                    <Field label={s('organization', 'type')} value={organization.type?.[0]?.coding?.[0]?.display} />
                  </Section>
                )}

                {encounter && (
                  <Section title={s('encounter', 'title')}>
                    <Field label={s('encounter', 'type')} value={encounter.class?.display} />
                    <Field label={s('encounter', 'start')} value={encounter.period?.start} />
                    <Field label={s('encounter', 'end')} value={encounter.period?.end} />
                    <Field label={s('encounter', 'status')} value={encounter.status} />
                  </Section>
                )}

                {condition && (
                  <Section title={s('condition', 'title')}>
                    <div className="flex flex-wrap gap-2">
                      {condition.code?.coding?.map((c, i) => (
                        <Badge key={i} variant="outline" className="rounded-full">
                          {c.code} — {c.display}
                        </Badge>
                      ))}
                    </div>
                    <Field label={s('condition', 'clinicalStatus')} value={condition.clinicalStatus?.coding?.[0]?.code} />
                  </Section>
                )}

                {observation && (
                  <Section title={s('observation', 'title')}>
                    <Field label={s('observation', 'item')} value={observation.code?.text} />
                    <Field
                      label={s('observation', 'result')}
                      value={observation.valueQuantity
                        ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit}`
                        : undefined}
                    />
                    <Field label={s('observation', 'status')} value={observation.status} />
                  </Section>
                )}

                {coverage && (
                  <Section title={s('coverage', 'title')}>
                    <Field label={s('coverage', 'type')} value={coverage.type?.text} />
                    <Field label={s('coverage', 'insuranceId')} value={coverage.subscriberId} />
                    <Field label={s('coverage', 'effectiveDate')} value={coverage.period?.start} />
                  </Section>
                )}

                {medication && (
                  <Section title={s('medicationAndRequest', 'title')}>
                    <Field label={s('medicationAndRequest', 'medicationName')} value={medication.code?.text} />
                    <Field label={s('medicationAndRequest', 'medicationCode')} value={medication.code?.coding?.[0]?.code} />
                    <Field label={s('medicationAndRequest', 'form')} value={medication.form?.text} />
                    {medicationRequest && (
                      <>
                        <Field
                          label={s('medicationAndRequest', 'dose')}
                          value={medicationRequest.dosageInstruction?.[0]?.text}
                        />
                        <Field
                          label={s('medicationAndRequest', 'route')}
                          value={medicationRequest.dosageInstruction?.[0]?.route?.coding?.[0]?.display}
                        />
                      </>
                    )}
                  </Section>
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </section>
  )
}
