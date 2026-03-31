import { useState } from 'react'
import { X, Code2 } from 'lucide-react'
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
  const [showJson, setShowJson] = useState(false)
  const bundle = summary.raw

  // Extract resources from bundle entries
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

  return (
    <div className="flex flex-col h-full border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div>
          <h2 className="text-sm font-semibold">處方箋詳情</h2>
          <code className="text-[11px] text-muted-foreground font-mono">{summary.id}</code>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showJson ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowJson(!showJson)}
          >
            <Code2 className="h-3.5 w-3.5" />
            {showJson ? '結構化' : 'JSON'}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {showJson ? (
            <JsonViewer data={bundle} title="Raw FHIR JSON" defaultCollapsed={false} />
          ) : (
            <div className="space-y-5">
              {/* Composition info */}
              {composition && (
                <Section title="處方箋資訊">
                  <Field label="標題" value={composition.title} />
                  <Field label="日期" value={composition.date} />
                  <Field label="狀態" value={composition.status} />
                  <Field label="Bundle ID" value={summary.id} />
                </Section>
              )}

              <Separator />

              {/* Patient */}
              {patient && (
                <Section title="病人資料">
                  <Field label="姓名" value={patient.name?.[0]?.text} />
                  <Field label="識別碼" value={patient.identifier?.[0]?.value} />
                  <Field label="性別" value={patient.gender} />
                  <Field label="出生日期" value={patient.birthDate} />
                </Section>
              )}

              <Separator />

              {/* Practitioner */}
              {practitioner && (
                <Section title="醫師資料">
                  <Field label="姓名" value={practitioner.name?.[0]?.text} />
                  <Field label="證號" value={practitioner.identifier?.[0]?.value} />
                  <Field label="專科" value={practitioner.qualification?.[0]?.code?.text} />
                </Section>
              )}

              {/* Organization */}
              {organization && (
                <>
                  <Separator />
                  <Section title="醫事機構">
                    <Field label="名稱" value={organization.name} />
                    <Field label="代碼" value={organization.identifier?.[0]?.value} />
                    <Field label="類型" value={organization.type?.[0]?.coding?.[0]?.display} />
                  </Section>
                </>
              )}

              {/* Encounter */}
              {encounter && (
                <>
                  <Separator />
                  <Section title="就診資料">
                    <Field label="類型" value={encounter.class?.display} />
                    <Field label="開始時間" value={encounter.period?.start} />
                    <Field label="結束時間" value={encounter.period?.end} />
                    <Field label="狀態" value={encounter.status} />
                  </Section>
                </>
              )}

              {/* Condition */}
              {condition && (
                <>
                  <Separator />
                  <Section title="診斷">
                    <div className="flex gap-2 flex-wrap">
                      {condition.code?.coding?.map((c, i) => (
                        <Badge key={i} variant="outline">
                          {c.code} — {c.display}
                        </Badge>
                      ))}
                    </div>
                    <Field label="狀態" value={condition.clinicalStatus?.coding?.[0]?.code} />
                  </Section>
                </>
              )}

              {/* Observation */}
              {observation && (
                <>
                  <Separator />
                  <Section title="檢驗檢查">
                    <Field label="項目" value={observation.code?.text} />
                    <Field
                      label="結果"
                      value={observation.valueQuantity
                        ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit}`
                        : undefined}
                    />
                    <Field label="狀態" value={observation.status} />
                  </Section>
                </>
              )}

              {/* Coverage */}
              {coverage && (
                <>
                  <Separator />
                  <Section title="保險資訊">
                    <Field label="類型" value={coverage.type?.text} />
                    <Field label="保險 ID" value={coverage.subscriberId} />
                    <Field label="生效日" value={coverage.period?.start} />
                  </Section>
                </>
              )}

              {/* Medication & MedicationRequest */}
              {medication && (
                <>
                  <Separator />
                  <Section title="藥品與處方">
                    <Field label="藥品名稱" value={medication.code?.text} />
                    <Field label="藥品代碼" value={medication.code?.coding?.[0]?.code} />
                    <Field label="劑型" value={medication.form?.text} />
                    {medicationRequest && (
                      <>
                        <Field
                          label="劑量"
                          value={medicationRequest.dosageInstruction?.[0]?.text}
                        />
                        <Field
                          label="給藥途徑"
                          value={medicationRequest.dosageInstruction?.[0]?.route?.coding?.[0]?.display}
                        />
                      </>
                    )}
                  </Section>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
