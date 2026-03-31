import { Building2, ClipboardList, Pill, Stethoscope, UserRound, UserRoundCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Separator } from '../../../components/ui/separator'
import type { CreatedResources } from '../../../types/fhir.d'

interface PrescriptionSummaryCardProps {
  resources: CreatedResources
  title?: string
  date?: string
}

interface SummaryFieldProps {
  label: string
  value?: string
  missingValue: string
}

interface SummarySectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  fields: Array<{ label: string; value?: string }>
  missingValue: string
}

function formatHumanName(names?: fhir4.HumanName[]): string | undefined {
  const primary = names?.[0]
  if (!primary) return undefined
  return primary.text || `${primary.family ?? ''}${primary.given?.join('') ?? ''}`.trim() || undefined
}

function formatQuantity(quantity?: fhir4.Quantity): string | undefined {
  if (quantity?.value === undefined || quantity?.value === null) return undefined
  return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

function SummaryField({ label, value, missingValue }: SummaryFieldProps): React.JSX.Element {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm ${value ? 'text-foreground' : 'text-muted-foreground'}`}>{value || missingValue}</p>
    </div>
  )
}

function SummarySection({ title, icon: Icon, fields, missingValue }: SummarySectionProps): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-background/80 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <SummaryField key={field.label} label={field.label} value={field.value} missingValue={missingValue} />
        ))}
      </div>
    </div>
  )
}

export default function PrescriptionSummaryCard({
  resources,
  title,
  date
}: PrescriptionSummaryCardProps): React.JSX.Element {
  const { t } = useTranslation('creator')
  const dosage = resources.medicationRequest?.dosageInstruction?.[0]
  const doseQuantity = dosage?.doseAndRate?.[0]?.doseQuantity
  const medicationCode = resources.medication?.code?.coding?.[0]?.code
  const medicationForm =
    resources.medication?.form?.text ||
    resources.medication?.form?.coding?.[0]?.display ||
    resources.medication?.form?.coding?.[0]?.code
  const frequency =
    dosage?.timing?.code?.text ||
    dosage?.timing?.code?.coding?.[0]?.display ||
    dosage?.timing?.code?.coding?.[0]?.code
  const route =
    dosage?.route?.text ||
    dosage?.route?.coding?.[0]?.display ||
    dosage?.route?.coding?.[0]?.code
  const duration = resources.medicationRequest?.dispenseRequest?.expectedSupplyDuration?.value
  const conditionCode =
    resources.condition?.code?.coding?.[0]?.code ||
    resources.condition?.code?.text
  const conditionDisplay =
    resources.condition?.code?.coding?.[0]?.display ||
    resources.condition?.code?.text
  const organizationType =
    resources.organization?.type?.[0]?.coding?.[0]?.display ||
    resources.organization?.type?.[0]?.coding?.[0]?.code
  const practitionerName = formatHumanName(resources.practitioner?.name)
  const patientName = formatHumanName(resources.patient?.name)
  const patientGender = resources.patient?.gender
    ? t(`forms.patient.gender.options.${resources.patient.gender}`)
    : undefined
  const missingValue = t('forms.composition.summary.missingValue')

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-background via-background to-muted/30 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{t('forms.composition.summary.title')}</CardTitle>
        <CardDescription>{t('forms.composition.summary.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummarySection
          title={t('forms.composition.summary.sections.patient')}
          icon={UserRound}
          missingValue={missingValue}
          fields={[
            { label: t('forms.composition.summary.fields.name'), value: patientName },
            { label: t('forms.composition.summary.fields.identifier'), value: resources.patient?.identifier?.[0]?.value },
            { label: t('forms.composition.summary.fields.gender'), value: patientGender },
            { label: t('forms.composition.summary.fields.birthDate'), value: resources.patient?.birthDate }
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <SummarySection
            title={t('forms.composition.summary.sections.practitioner')}
            icon={UserRoundCog}
            missingValue={missingValue}
            fields={[
              { label: t('forms.composition.summary.fields.name'), value: practitionerName },
              {
                label: t('forms.composition.summary.fields.licenseNumber'),
                value: resources.practitioner?.identifier?.[0]?.value
              },
              {
                label: t('forms.composition.summary.fields.qualification'),
                value: resources.practitioner?.qualification?.[0]?.code?.text
              }
            ]}
          />

          <SummarySection
            title={t('forms.composition.summary.sections.organization')}
            icon={Building2}
            missingValue={missingValue}
            fields={[
              { label: t('forms.composition.summary.fields.name'), value: resources.organization?.name },
              { label: t('forms.composition.summary.fields.identifier'), value: resources.organization?.identifier?.[0]?.value },
              { label: t('forms.composition.summary.fields.type'), value: organizationType }
            ]}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SummarySection
            title={t('forms.composition.summary.sections.condition')}
            icon={Stethoscope}
            missingValue={missingValue}
            fields={[
              { label: t('forms.composition.summary.fields.diagnosis'), value: conditionDisplay },
              { label: t('forms.composition.summary.fields.diagnosisCode'), value: conditionCode }
            ]}
          />

          <SummarySection
            title={t('forms.composition.summary.sections.medication')}
            icon={Pill}
            missingValue={missingValue}
            fields={[
              {
                label: t('forms.composition.summary.fields.medicationName'),
                value: resources.medication?.code?.text || resources.medicationRequest?.medicationReference?.display
              },
              { label: t('forms.composition.summary.fields.medicationCode'), value: medicationCode },
              { label: t('forms.composition.summary.fields.form'), value: medicationForm }
            ]}
          />
        </div>

        <SummarySection
          title={t('forms.composition.summary.sections.prescription')}
          icon={ClipboardList}
          missingValue={missingValue}
          fields={[
            { label: t('forms.composition.summary.fields.docTitle'), value: title },
            { label: t('forms.composition.summary.fields.date'), value: formatDate(date) },
            { label: t('forms.composition.summary.fields.dose'), value: formatQuantity(doseQuantity) },
            { label: t('forms.composition.summary.fields.frequency'), value: frequency },
            { label: t('forms.composition.summary.fields.route'), value: route },
            {
              label: t('forms.composition.summary.fields.duration'),
              value: duration ? t('forms.composition.summary.durationDays', { count: duration }) : undefined
            },
            { label: t('forms.composition.summary.fields.note'), value: dosage?.patientInstruction }
          ]}
        />

        <Separator />
        <p className="text-xs text-muted-foreground">{t('forms.composition.summary.reviewHint')}</p>
      </CardContent>
    </Card>
  )
}
