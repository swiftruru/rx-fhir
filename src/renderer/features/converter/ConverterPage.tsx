import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Repeat2, CheckCircle2, AlertCircle, Wand2, Upload, Send, Loader2, Trash2, Download, Eye, EyeOff, XCircle, Camera, FileText } from 'lucide-react'
import { Button } from '../../shared/components/ui/button'
import { Label } from '../../shared/components/ui/label'
import { Badge } from '../../shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { Alert, AlertDescription } from '../../shared/components/ui/alert'
import JsonViewer from '../../shared/components/JsonViewer'
import JsonCodeEditor from '../../shared/components/JsonCodeEditor'
import FhirRequestInspector from '../creator/components/FhirRequestInspector'
import { useFhirInspectorStore } from '../creator/store/fhirInspectorStore'
import { useToastStore } from '../../shared/stores/toastStore'
import { convertCompetitionProblem, type CompetitionProblem, type ProvenanceEntry } from '../../domain/fhir/twcore/competitionConverter'
import { checkBundleConformance, parseExpectedCounts } from '../../domain/fhir/twcore/conformanceCheck'
import { buildCodeMappingTable } from '../../domain/fhir/twcore/codeMapping'
import {
  getCodeOverrides,
  saveCodeOverrides,
  clearCodeOverrides,
  mergeOverrides,
  learnFromGazelleErrors,
  countOverrides
} from '../../domain/fhir/twcore/codeLearning'
import {
  validateBundleResources,
  submitBundle,
  type ResourceValidation,
  type TransactionResult
} from '../../services/twcoreCompetitionService'
import { saveFile, captureScreenshot } from '../../services/bundleFileService'
import { buildProofReportHtml } from './proofReport'

const SAMPLE_PROBLEM: CompetitionProblem = {
  patients: [{
    id: '1', idSystem: 'https://www.tph.mohw.gov.tw', idNumber: 'V215757393', active: true,
    name: '林欣妤', telecomSystem: 'phone', telecomUse: 'mobile', telecomValue: '0907548171',
    gender: 'unknown', birthDate: '1953-02-04', address: '新北市板橋區四川路2段209巷228號', organization: '1'
  }],
  organizations: [{
    id: '1', identifierValue: '0131060029', idSystem: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/organization-identifier-tw',
    active: true, type: 'prov', name: '衛生福利部臺北醫院', telecomSystem: 'phone', telecomUse: 'work',
    telecomValue: '02-2555-3000', address: '新北市新莊區思源路127號'
  }],
  practitioners: [{
    id: '1', medicalLicenseNumber: '醫字第135790號', medicalLicenseSystem: 'https://www.tph.mohw.gov.tw/fhir/practitioner-license',
    active: true, name: '陳雅安', gender: 'female', birthday: '1958-10-27', qualificationCode: 'Qual-0001', qualificationIssuer: '1'
  }],
  practitionerroles: [{
    id: '1', identifierValue: 'KP00034', idSystem: 'https://www.tph.mohw.gov.tw', active: true,
    practitionerId: '1', organizationId: '1', roleCode: 'PR-0003', roleText: '家庭醫學科醫師', specialtyCode: 'Spec-0001'
  }],
  conditions: [{
    id: '1', clinicalStatus: 'active', verificationStatus: 'confirmed', category: 'encounter-diagnosis',
    severity: '255604002', conditionCode: 'Cond-0012', conditionText: '感冒/上呼吸道不適', patientId: '1',
    onsetDate: '2026-06-10T05:14:18.549Z', asserterId: '1', recorderId: '1', note: '主訴感冒、流鼻水與喉嚨痛。'
  }],
  encounters: [{
    id: '1', idSystem: 'https://www.tph.mohw.gov.tw/fhir/encounter', status: 'finished', class: 'AMB', type: 'AMB',
    serviceType: '01', serviceTypeText: '家醫科門診', patientId: '1', periodStart: '2026-06-10T05:14:18.549Z',
    periodEnd: '2026-06-10T05:39:18.549Z', serviceProviderId: '1', participantType: 'ATND', practitionerId: '1',
    conditionId: '1', diagnosisUse: 'AD'
  }]
}

type BundleType = 'transaction' | 'collection'

function shortSystem(url?: string): string {
  if (!url) return ''
  if (url.includes('snomed')) return 'SNOMED'
  if (url.includes('loinc')) return 'LOINC'
  if (url.includes('GTSAbbreviation')) return 'GTS'
  if (url.includes('service-type')) return 'service-type'
  if (url.includes('unitsofmeasure')) return 'UCUM'
  return url.split('/').pop() ?? url
}

function CheckRow({ ok, label }: { ok: boolean; label: string }): React.JSX.Element {
  return (
    <li className="flex items-start gap-1.5">
      {ok
        ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
        : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />}
      <span className={ok ? '' : 'text-destructive'}>{label}</span>
    </li>
  )
}

export default function ConverterPage(): React.JSX.Element {
  const { t } = useTranslation('converter')
  const pushToast = useToastStore((state) => state.pushToast)

  const [input, setInput] = useState('')
  const [bundleType, setBundleType] = useState<BundleType>('collection')
  const [bundle, setBundle] = useState<fhir4.Bundle | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [validations, setValidations] = useState<ResourceValidation[] | null>(null)
  const [submitResult, setSubmitResult] = useState<TransactionResult | null>(null)
  const [submittedAs, setSubmittedAs] = useState<'collection' | 'transaction' | null>(null)
  const [busy, setBusy] = useState<'idle' | 'validating' | 'submitting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [provenance, setProvenance] = useState<ProvenanceEntry[]>([])
  const [learnText, setLearnText] = useState('')
  const [dictSize, setDictSize] = useState(() => countOverrides(getCodeOverrides()))
  const [revealSecrets, setRevealSecrets] = useState(false)
  const [expectedCountsText, setExpectedCountsText] = useState('')

  // Only this page's own requests (submit / $validate / token exchange).
  const inspectorHistory = useFhirInspectorStore((s) => s.history)
  const converterRequests = useMemo(() => inspectorHistory.filter((e) => e.module === 'converter'), [inspectorHistory])

  const conformance = useMemo(
    () => (bundle ? checkBundleConformance(bundle, expectedCountsText.trim() ? parseExpectedCounts(expectedCountsText) : undefined) : null),
    [bundle, expectedCountsText]
  )
  const codeMap = useMemo(() => buildCodeMappingTable(provenance), [provenance])

  function resetResults(): void {
    setValidations(null)
    setSubmitResult(null)
    setSubmittedAs(null)
    setError(null)
  }

  function handleConvert(): void {
    resetResults()
    const trimmed = input.trim()
    if (!trimmed) {
      setError(t('errors.emptyInput'))
      return
    }
    let problem: CompetitionProblem
    try {
      problem = JSON.parse(trimmed) as CompetitionProblem
    } catch {
      setError(t('errors.invalidJson'))
      return
    }
    const { bundle: built, counts: builtCounts, provenance: prov } = convertCompetitionProblem(problem, { bundleType, codeOverrides: getCodeOverrides() })
    if (!built.entry?.length) {
      setBundle(null)
      setCounts({})
      setProvenance([])
      setError(t('errors.noResources'))
      return
    }
    setBundle(built)
    setCounts(builtCounts)
    setProvenance(prov)
  }

  function handleLearn(): void {
    if (!provenance.length) {
      setError(t('errors.convertFirst'))
      return
    }
    const learned = learnFromGazelleErrors(learnText, provenance)
    if (!learned.length) {
      pushToast({ variant: 'error', description: t('learnNone') })
      return
    }
    const merged = mergeOverrides(getCodeOverrides(), learned)
    saveCodeOverrides(merged)
    setDictSize(countOverrides(merged))
    // Re-convert with the freshly learned mappings applied.
    try {
      const problem = JSON.parse(input.trim()) as CompetitionProblem
      const { bundle: built, counts: builtCounts, provenance: prov } = convertCompetitionProblem(problem, { bundleType, codeOverrides: merged })
      setBundle(built)
      setCounts(builtCounts)
      setProvenance(prov)
      resetResults()
      pushToast({ variant: 'success', description: t('learnSuccess', { count: learned.length }) })
    } catch {
      setError(t('errors.invalidJson'))
    }
  }

  async function handleValidate(): Promise<void> {
    if (!bundle) {
      setError(t('errors.convertFirst'))
      return
    }
    setBusy('validating')
    setSubmitResult(null)
    try {
      const results = await validateBundleResources(bundle)
      setValidations(results)
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
      pushToast({
        variant: totalErrors === 0 ? 'success' : 'error',
        description: totalErrors === 0 ? t('validationPass') : t('submitFail')
      })
    } finally {
      setBusy('idle')
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!bundle) {
      setError(t('errors.convertFirst'))
      return
    }
    const isCollection = bundle.type === 'collection'
    setBusy('submitting')
    setValidations(null)
    try {
      const result = await submitBundle(bundle)
      setSubmitResult(result)
      // The Prism proxy captures the POSTed bundle for Gazelle even though HAPI
      // rejects the logical-reference collection with a 422 — so any non-auth
      // HTTP response means the bundle reached Prism. Only 401/403 (auth) fails.
      const reachedPrism = result.httpStatus !== undefined && result.httpStatus !== 401 && result.httpStatus !== 403
      if (isCollection && reachedPrism) {
        setSubmittedAs('collection')
        pushToast({ variant: 'success', description: t('submittedToGazelle') })
      } else if (isCollection) {
        setSubmittedAs('transaction') // render the error branch
        pushToast({ variant: 'error', description: t('submitFail') })
      } else {
        setSubmittedAs('transaction')
        pushToast({
          variant: result.ok ? 'success' : 'error',
          description: result.ok ? t('submitSuccess', { count: result.entries.length }) : t('submitFail')
        })
      }
    } catch (e) {
      // Only a network failure means the bundle never reached Prism.
      setSubmitResult({ ok: false, entries: [], errors: [e instanceof Error ? e.message : String(e)] })
      setSubmittedAs(null)
      pushToast({ variant: 'error', description: t('submitNetworkFail') })
    } finally {
      setBusy('idle')
    }
  }

  function handleLoadSample(): void {
    resetResults()
    setInput(JSON.stringify(SAMPLE_PROBLEM, null, 2))
    setBundle(null)
    setCounts({})
  }

  function handleClear(): void {
    resetResults()
    setInput('')
    setBundle(null)
    setCounts({})
  }

  async function handleDownload(): Promise<void> {
    if (!bundle) return
    try {
      // Save the bundle exactly as converted (no EMR self-contained transform).
      const result = await saveFile(JSON.stringify(bundle, null, 2), 'rxfhir-twcore-bundle.json', [{ name: 'JSON', extensions: ['json'] }])
      if (!result.canceled) pushToast({ variant: 'success', description: t('downloadSaved') })
    } catch (e) {
      pushToast({ variant: 'error', description: e instanceof Error ? e.message : String(e) })
    }
  }

  async function handleScreenshot(): Promise<void> {
    try {
      const result = await captureScreenshot()
      if (!result.canceled) pushToast({ variant: 'success', description: t('screenshotSaved') })
    } catch (e) {
      pushToast({ variant: 'error', description: e instanceof Error ? e.message : String(e) })
    }
  }

  async function handleExportReport(): Promise<void> {
    if (!bundle) return
    try {
      const html = buildProofReportHtml({
        generatedAt: new Date().toLocaleString(),
        counts,
        conformance,
        codeMap,
        submit: submitResult ? { httpStatus: submitResult.httpStatus, location: submitResult.entries[0]?.location, reachedPrism: submittedAs === 'collection' } : null
      })
      const result = await saveFile(html, 'rxfhir-proof-report.html', [{ name: 'HTML', extensions: ['html'] }])
      if (!result.canceled) pushToast({ variant: 'success', description: t('reportSaved') })
    } catch (e) {
      pushToast({ variant: 'error', description: e instanceof Error ? e.message : String(e) })
    }
  }

  const totalErrors = validations?.reduce((sum, r) => sum + r.errors.length, 0) ?? 0

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Repeat2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t('title')}</h1>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('inputLabel')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <JsonCodeEditor
              data-testid="converter.input"
              value={input}
              onChange={setInput}
              placeholder={t('inputPlaceholder')}
              className="h-72 focus-within:ring-2 focus-within:ring-ring"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleLoadSample}>
                <Wand2 className="h-4 w-4" />{t('loadSample')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClear} disabled={!input && !bundle}>
                <Trash2 className="h-4 w-4" />{t('clear')}
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="bundle-type" className="text-xs text-muted-foreground">{t('bundleType')}</Label>
                <select
                  id="bundle-type"
                  value={bundleType}
                  onChange={(e) => { setBundleType(e.target.value as BundleType); setBundle(null); resetResults() }}
                  className="rounded-md border border-border bg-background/70 px-2 py-1 text-xs"
                >
                  <option value="transaction">transaction</option>
                  <option value="collection">collection</option>
                </select>
              </div>
            </div>
            <Button type="button" onClick={handleConvert} className="w-full">
              <Upload className="h-4 w-4" />{t('convert')}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preview / actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('previewTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!bundle ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('previewEmpty')}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(counts).map(([type, n]) => (
                    <Badge key={type} variant="outline" className="font-mono text-[11px]">{type} × {n}</Badge>
                  ))}
                </div>

                {conformance && (
                  <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium">
                      {conformance.allPass && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      {t('conformanceTitle')}
                    </p>
                    <ul className="space-y-1 text-xs">
                      <CheckRow ok={conformance.isCollection} label={t('checkCollection', { type: conformance.bundleType ?? '—' })} />
                      <CheckRow ok={conformance.bundleHasProfile} label={t('checkBundleProfile')} />
                      <CheckRow
                        ok={conformance.entriesMissingProfile.length === 0}
                        label={conformance.entriesMissingProfile.length === 0
                          ? t('checkEntryProfiles')
                          : t('checkEntryProfilesMissing', { types: [...new Set(conformance.entriesMissingProfile)].join(', ') })}
                      />
                    </ul>
                    {conformance.countDiff && (
                      <ul className="space-y-0.5 pl-1 text-[11px] font-mono">
                        {conformance.countDiff.map((r) => (
                          <li key={r.type} className={r.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                            {r.ok ? '✓' : '✗'} {r.type} {r.actual}/{r.expected}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="expected-counts" className="whitespace-nowrap text-[11px] text-muted-foreground">{t('expectedCountsLabel')}</Label>
                      <input
                        id="expected-counts"
                        data-testid="converter.expected-counts"
                        value={expectedCountsText}
                        onChange={(e) => setExpectedCountsText(e.target.value)}
                        placeholder={t('expectedCountsPlaceholder')}
                        spellCheck={false}
                        className="flex-1 rounded-md border border-border bg-background/70 px-2 py-1 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                )}

                {codeMap.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-medium">
                      {t('codeMappingTitle')}
                      {codeMap.some((r) => !r.mapped) && (
                        <span className="text-[11px] font-normal text-amber-600 dark:text-amber-400">
                          {t('codeMappingUnmapped', { count: codeMap.filter((r) => !r.mapped).length })}
                        </span>
                      )}
                    </p>
                    <div className="max-h-56 overflow-auto rounded border border-border/60">
                      <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1 text-left font-medium">{t('codeMappingCategory')}</th>
                            <th className="px-2 py-1 text-left font-medium">{t('codeMappingLocal')}</th>
                            <th className="px-2 py-1 text-left font-medium">{t('codeMappingStandard')}</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {codeMap.map((r) => (
                            <tr key={`${r.category}-${r.competitionCode}`} className="border-t border-border/40">
                              <td className="px-2 py-1">{r.category}</td>
                              <td className="px-2 py-1">{r.competitionCode}</td>
                              <td className={`px-2 py-1 ${r.mapped ? '' : 'text-amber-600 dark:text-amber-400'}`}>
                                {r.mapped ? `${shortSystem(r.system)} | ${r.standardCode}` : t('codeMappingTextFallback')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleValidate} disabled={busy !== 'idle'}>
                    {busy === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t('validate')}
                  </Button>
                  <Button type="button" size="sm" onClick={handleSubmit} disabled={busy !== 'idle'}>
                    {busy === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {bundleType === 'collection' ? t('submitToServer') : t('submitTransaction')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />{t('download')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleScreenshot}>
                    <Camera className="h-4 w-4" />{t('screenshot')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleExportReport}>
                    <FileText className="h-4 w-4" />{t('exportReport')}
                  </Button>
                </div>

                {validations && (
                  <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                    <p className="text-xs font-medium">{t('validationTitle')}</p>
                    {totalErrors === 0 && (
                      <Alert variant="success">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>{t('validationPass')}</AlertDescription>
                      </Alert>
                    )}
                    <ul className="space-y-1.5 text-xs">
                      {validations.map((r, i) => (
                        <li key={i} className="space-y-0.5">
                          <span className={r.errors.length ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                            {r.errors.length
                              ? t('validationResourceFail', { type: r.resourceType, count: r.errors.length })
                              : t('validationResourceOk', { type: r.resourceType, warn: r.warnings ? t('validationWarnSuffix', { count: r.warnings }) : '' })}
                          </span>
                          {r.errors.slice(0, 4).map((msg, j) => (
                            <div key={j} className="pl-3 text-[11px] text-muted-foreground">✗ {msg}</div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {submitResult && (
                  <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                    <p className="text-xs font-medium">{t('submitTitle')}</p>
                    {submittedAs === 'collection' ? (
                      <Alert variant="success">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription className="space-y-1">
                          <p>{t('submittedToGazelle')}</p>
                          {submitResult.entries[0]?.location && (
                            <p className="font-mono text-[11px] text-muted-foreground">{submitResult.entries[0].location}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground">{t('submittedToGazelleNote')}</p>
                        </AlertDescription>
                      </Alert>
                    ) : submitResult.ok ? (
                      <>
                        <Alert variant="success">
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>{t('submitSuccess', { count: submitResult.entries.length })}</AlertDescription>
                        </Alert>
                        <ul className="space-y-0.5 text-[11px] font-mono text-muted-foreground">
                          {submitResult.entries.map((e, i) => (
                            <li key={i}>{e.status} · {e.location}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="space-y-1">
                          <p>{t('submitFail')}</p>
                          {submitResult.errors.slice(0, 5).map((msg, i) => (
                            <p key={i} className="text-[11px]">✗ {msg}</p>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <JsonViewer data={bundle} title={t('bundlePreview')} fontSize="sm" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request inspector — submit / $validate / OAuth token exchange */}
      {converterRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{t('inspectorTitle')}</CardTitle>
              <Button type="button" variant={revealSecrets ? 'secondary' : 'outline'} size="sm" onClick={() => setRevealSecrets((v) => !v)}>
                {revealSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {revealSecrets ? t('hideToken') : t('revealToken')}
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('inspectorSubtitle')}</p>
          </CardHeader>
          <CardContent>
            <FhirRequestInspector request={converterRequests[0]} history={converterRequests} revealSecrets={revealSecrets} />
          </CardContent>
        </Card>
      )}

      {/* Learn-from-errors */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t('learnTitle')}</CardTitle>
            <Badge variant="outline" className="text-[11px]">{t('learnDictSize', { count: dictSize })}</Badge>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('learnSubtitle')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            data-testid="converter.learn-input"
            value={learnText}
            onChange={(e) => setLearnText(e.target.value)}
            placeholder={t('learnPlaceholder')}
            spellCheck={false}
            className="h-40 w-full resize-y rounded-lg border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleLearn} disabled={!bundle || !learnText.trim()}>
              <Wand2 className="h-4 w-4" />{t('learnButton')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { clearCodeOverrides(); setDictSize(0); pushToast({ variant: 'success', description: t('learnCleared') }) }} disabled={!dictSize}>
              <Trash2 className="h-4 w-4" />{t('learnClear')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
