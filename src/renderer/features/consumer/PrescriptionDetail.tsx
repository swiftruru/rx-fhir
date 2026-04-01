import { useState } from 'react'
import { X, Code2, Braces } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { ScrollArea } from '../../components/ui/scroll-area'
import JsonViewer from '../../components/JsonViewer'
import type { BundleSummary } from '../../types/fhir.d'

interface Props {
  summary: BundleSummary
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }): React.JSX.Element {
  if (!value) return <></>
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function PrescriptionDetail({ summary, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const [showJson, setShowJson] = useState(false)
  const bundle = summary.raw

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

  return (
    <div className="flex flex-col h-full border-l">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-background shrink-0">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-sm font-semibold">{t('detail.title')}</h2>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <code className="rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground font-mono">
              {summary.id}
            </code>
            <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1">
              <Button
                type="button"
                variant={!showJson ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-3"
                aria-pressed={!showJson}
                onClick={() => setShowJson(false)}
              >
                <Code2 className="h-3.5 w-3.5" />
                {t('detail.toggleStructured')}
              </Button>
              <Button
                type="button"
                variant={showJson ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5 px-3"
                aria-pressed={showJson}
                onClick={() => setShowJson(true)}
              >
                <Braces className="h-3.5 w-3.5" />
                {t('detail.toggleJson')}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showJson ? (
        <div className="flex-1 min-h-0 p-4">
          <JsonViewer
            data={bundle}
            title="Raw FHIR JSON"
            defaultCollapsed={false}
            fillHeight
            className="h-full"
          />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="space-y-5">
              {composition && (
                <Section title={s('prescription', 'title')}>
                  <Field label={s('prescription', 'docTitle')} value={composition.title} />
                  <Field label={s('prescription', 'date')} value={composition.date} />
                  <Field label={s('prescription', 'status')} value={composition.status} />
                  <Field label={s('prescription', 'bundleId')} value={summary.id} />
                </Section>
              )}

              <Separator />

              {patient && (
                <Section title={s('patient', 'title')}>
                  <Field label={s('patient', 'name')} value={patient.name?.[0]?.text} />
                  <Field label={s('patient', 'identifier')} value={patient.identifier?.[0]?.value} />
                  <Field label={s('patient', 'gender')} value={patient.gender} />
                  <Field label={s('patient', 'birthDate')} value={patient.birthDate} />
                </Section>
              )}

              <Separator />

              {practitioner && (
                <Section title={s('practitioner', 'title')}>
                  <Field label={s('practitioner', 'name')} value={practitioner.name?.[0]?.text} />
                  <Field label={s('practitioner', 'licenseNumber')} value={practitioner.identifier?.[0]?.value} />
                  <Field label={s('practitioner', 'qualification')} value={practitioner.qualification?.[0]?.code?.text} />
                </Section>
              )}

              {organization && (
                <>
                  <Separator />
                  <Section title={s('organization', 'title')}>
                    <Field label={s('organization', 'name')} value={organization.name} />
                    <Field label={s('organization', 'identifier')} value={organization.identifier?.[0]?.value} />
                    <Field label={s('organization', 'type')} value={organization.type?.[0]?.coding?.[0]?.display} />
                  </Section>
                </>
              )}

              {encounter && (
                <>
                  <Separator />
                  <Section title={s('encounter', 'title')}>
                    <Field label={s('encounter', 'type')} value={encounter.class?.display} />
                    <Field label={s('encounter', 'start')} value={encounter.period?.start} />
                    <Field label={s('encounter', 'end')} value={encounter.period?.end} />
                    <Field label={s('encounter', 'status')} value={encounter.status} />
                  </Section>
                </>
              )}

              {condition && (
                <>
                  <Separator />
                  <Section title={s('condition', 'title')}>
                    <div className="flex gap-2 flex-wrap">
                      {condition.code?.coding?.map((c, i) => (
                        <Badge key={i} variant="outline">
                          {c.code} — {c.display}
                        </Badge>
                      ))}
                    </div>
                    <Field label={s('condition', 'clinicalStatus')} value={condition.clinicalStatus?.coding?.[0]?.code} />
                  </Section>
                </>
              )}

              {observation && (
                <>
                  <Separator />
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
                </>
              )}

              {coverage && (
                <>
                  <Separator />
                  <Section title={s('coverage', 'title')}>
                    <Field label={s('coverage', 'type')} value={coverage.type?.text} />
                    <Field label={s('coverage', 'insuranceId')} value={coverage.subscriberId} />
                    <Field label={s('coverage', 'effectiveDate')} value={coverage.period?.start} />
                  </Section>
                </>
              )}

              {medication && (
                <>
                  <Separator />
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
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
