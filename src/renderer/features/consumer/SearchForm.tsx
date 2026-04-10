import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Search, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import { Label } from '../../shared/components/ui/label'
import { Alert, AlertDescription } from '../../shared/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/components/ui/select'
import FhirErrorAlert from '../../shared/components/FhirErrorAlert'
import ExternalUrlLink from '../../shared/components/ExternalUrlLink'
import { getBundleFileErrorMessage, importBundleJson } from '../../services/bundleFileService'
import { searchBundles, buildSearchUrl, type QueryStep } from '../../services/fhirClient'
import { extractSearchResults } from '../../services/searchService'
import { useAppStore } from '../../app/stores/appStore'
import { useHistoryStore } from '../../features/history/store/historyStore'
import { useSearchHistoryStore } from '../../features/history/store/searchHistoryStore'
import { useAccessibilityStore } from '../../shared/stores/accessibilityStore'
import { useToastStore } from '../../shared/stores/toastStore'
import type { BundleSummary, SearchParams } from '../../types/fhir'
import type { ConsumerSearchExecution, SearchPrefill, SearchTab } from './searchState'
import { getConsumerBasicMocks, getConsumerDateMocks, getConsumerComplexMocks } from '../../mocks/mockPools'

interface Props {
  activeTab: SearchTab
  onTabChange: (tab: SearchTab) => void
  onComplexByChange?: (value: 'organization' | 'author') => void
  onResults: (results: BundleSummary[], total: number, execution: ConsumerSearchExecution) => void
  onImportBundle: (summary: BundleSummary) => void
  onSearchStart?: () => void
  onBusyChange?: (busy: boolean) => void
  prefill?: SearchPrefill | null
  prefillNotice?: { message: string; variant?: 'info' | 'warning' } | null
  onPrefillConsumed?: () => void
  autoSearch?: SearchParams | null
  onAutoSearchConsumed?: () => void
}

export interface SearchFormHandle {
  fillMock: () => string | undefined
  importBundle: () => Promise<void>
  submit: () => Promise<void>
  focusPrimaryInput: () => void
}

interface BasicSearchFormValues {
  searchBy: 'identifier' | 'name'
  value: string
}

interface DateSearchFormValues {
  identifier: string
  date: string
}

interface ComplexSearchFormValues {
  identifier: string
  complexBy: 'organization' | 'author'
  orgId: string
  authorName: string
}

function joinDescribedBy(...ids: Array<string | false | undefined>): string | undefined {
  const resolved = ids.filter((id): id is string => Boolean(id))
  return resolved.length > 0 ? resolved.join(' ') : undefined
}

function buildIdealFhirUrl(params: SearchParams, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '')
  const enc = encodeURIComponent
  if (params.mode === 'basic') {
    if (params.identifier) {
      return `${base}/Bundle?composition.subject:Patient.identifier=${enc(params.identifier)}`
    } else if (params.name) {
      return `${base}/Bundle?composition.subject:Patient.name=${enc(params.name)}`
    }
  } else if (params.mode === 'date') {
    const parts = [`composition.subject:Patient.identifier=${enc(params.identifier ?? '')}`]
    if (params.date) parts.push(`composition.date=${enc(params.date)}`)
    return `${base}/Bundle?${parts.join('&')}`
  } else if (params.mode === 'complex') {
    const parts = [`composition.subject:Patient.identifier=${enc(params.identifier ?? '')}`]
    if (params.complexSearchBy === 'organization' && params.organizationId) {
      parts.push(`composition.custodian:Organization.identifier=${enc(params.organizationId)}`)
    } else if (params.complexSearchBy === 'author' && params.authorName) {
      parts.push(`composition.author:Practitioner.name=${enc(params.authorName)}`)
    }
    return `${base}/Bundle?${parts.join('&')}`
  }
  return ''
}

const SearchForm = forwardRef<SearchFormHandle, Props>(function SearchForm({
  activeTab,
  onTabChange,
  onComplexByChange,
  onResults,
  onImportBundle,
  onSearchStart,
  onBusyChange,
  prefill,
  prefillNotice,
  onPrefillConsumed,
  autoSearch,
  onAutoSearchConsumed
}, ref): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { t: tc } = useTranslation('common')
  const locale = useAppStore((s) => s.locale)
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const pushToast = useToastStore((state) => state.pushToast)
  const fhirBaseUrl = useAppStore((s) => s.serverUrl)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    onBusyChange?.(loading || importing)
  }, [loading, importing, onBusyChange])

  const [lastUrl, setLastUrl] = useState<string>()
  const [idealUrl, setIdealUrl] = useState<string>()
  const [querySteps, setQuerySteps] = useState<QueryStep[]>([])
  const [error, setError] = useState<string>()
  const [importMessage, setImportMessage] = useState<string>()

  const basicForm = useForm<BasicSearchFormValues>({ defaultValues: { searchBy: 'identifier', value: '' } })
  const dateForm = useForm<DateSearchFormValues>({ defaultValues: { identifier: '', date: '' } })
  const complexForm = useForm<ComplexSearchFormValues>({
    defaultValues: { identifier: '', complexBy: 'organization', orgId: '', authorName: '' }
  })

  const basicMockRef        = useRef(0)
  const dateMockRef         = useRef(0)
  const complexMockRef      = useRef(0)
  const abortControllerRef  = useRef<AbortController | null>(null)
  const consumedAutoSearchKeyRef = useRef<string>()
  const historyRecords = useHistoryStore((s) => s.records)
  const searchHistoryRecords = useSearchHistoryStore((s) => s.records)
  const consumerBasicMocks = useMemo(() => getConsumerBasicMocks(locale), [locale])
  const consumerDateMocks = useMemo(() => {
    const base = getConsumerDateMocks(locale)
    return base.map((mock) => {
      // 1st priority: compositionDate stored on submission record (populated for new submissions)
      const submissionMatch = historyRecords.find(
        (r) => r.type === 'bundle' && r.patientIdentifier === mock.identifier && r.compositionDate
      )
      if (submissionMatch?.compositionDate) return { ...mock, date: submissionMatch.compositionDate }

      // 2nd priority: most recently used date search for the same identifier
      const dateSearchMatch = searchHistoryRecords
        .filter((r) => r.params.mode === 'date' && r.params.identifier === mock.identifier && r.params.date)
        .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))[0]
      if (dateSearchMatch?.params.date) return { ...mock, date: dateSearchMatch.params.date }

      return mock
    })
  }, [locale, historyRecords, searchHistoryRecords])
  const consumerComplexMocks = useMemo(() => getConsumerComplexMocks(locale), [locale])
  const localizedQuerySteps = useMemo(
    () =>
      querySteps.map((step) => ({
        ...step,
        displayLabel: step.labelKey ? `${step.step}. ${t(step.labelKey)}` : step.label,
        displayNote: step.noteKey ? t(step.noteKey, step.noteOptions) : step.note
      })),
    [querySteps, t]
  )

  useEffect(() => {
    basicMockRef.current = 0
    dateMockRef.current = 0
    complexMockRef.current = 0
  }, [locale])

  function fillMock(): string | undefined {
    if (activeTab === 'basic') {
      if (consumerBasicMocks.length === 0) return undefined
      const d = consumerBasicMocks[basicMockRef.current % consumerBasicMocks.length]
      basicMockRef.current += 1
      basicForm.setValue('searchBy', d.searchBy)
      basicForm.setValue('value', d.value)
      return `${d.searchBy === 'identifier' ? t('search.basic.searchByOptions.identifier') : t('search.basic.searchByOptions.name')}: ${d.value}`
    } else if (activeTab === 'date') {
      if (consumerDateMocks.length === 0) return undefined
      const d = consumerDateMocks[dateMockRef.current % consumerDateMocks.length]
      dateMockRef.current += 1
      dateForm.setValue('identifier', d.identifier)
      dateForm.setValue('date', d.date)
      return `${d.identifier} / ${d.date}`
    } else {
      if (consumerComplexMocks.length === 0) return undefined
      const d = consumerComplexMocks[complexMockRef.current % consumerComplexMocks.length]
      complexMockRef.current += 1
      complexForm.setValue('identifier', d.identifier)
      complexForm.setValue('complexBy', d.complexBy)
      complexForm.setValue('orgId', d.orgId)
      complexForm.setValue('authorName', d.authorName)
      const extra = d.complexBy === 'organization' ? d.orgId : d.authorName
      return `${d.identifier} / ${extra}`
    }
  }

  useEffect(() => {
    if (!prefill) return

    if (prefill.tab === 'basic') {
      basicForm.setValue('searchBy', prefill.searchBy)
      basicForm.setValue('value', prefill.value)
    } else if (prefill.tab === 'date') {
      dateForm.setValue('identifier', prefill.identifier)
      dateForm.setValue('date', prefill.date)
    } else {
      complexForm.setValue('identifier', prefill.identifier)
      if (prefill.complexBy) {
        complexForm.setValue('complexBy', prefill.complexBy)
      }
      complexForm.setValue('orgId', prefill.orgId ?? '')
      complexForm.setValue('authorName', prefill.authorName ?? '')
    }

    onPrefillConsumed?.()
  }, [basicForm, complexForm, dateForm, onPrefillConsumed, prefill])

  useEffect(() => {
    if (!autoSearch) {
      consumedAutoSearchKeyRef.current = undefined
      return
    }

    const key = JSON.stringify(autoSearch)
    if (consumedAutoSearchKeyRef.current === key) return
    consumedAutoSearchKeyRef.current = key

    void doSearch(autoSearch)
    onAutoSearchConsumed?.()
  }, [autoSearch, onAutoSearchConsumed])

  function handleTabChange(value: string): void {
    onTabChange(value as SearchTab)
  }

  function focusPrimaryInput(): void {
    if (activeTab === 'basic') {
      basicForm.setFocus('value')
      return
    }

    if (activeTab === 'date') {
      dateForm.setFocus('identifier')
      return
    }

    complexForm.setFocus('identifier')
  }

  async function submitCurrentTab(): Promise<void> {
    if (activeTab === 'basic') {
      await basicForm.handleSubmit(handleBasicSubmit)()
      return
    }

    if (activeTab === 'date') {
      await dateForm.handleSubmit(handleDateSubmit)()
      return
    }

    await complexForm.handleSubmit(handleComplexSubmit)()
  }

  function cancelSearch(): void {
    abortControllerRef.current?.abort()
  }

  async function doSearch(
    params: SearchParams,
    searchOptions?: { ownedIdentifiers?: string[] }
  ): Promise<void> {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    onSearchStart?.()
    announcePolite(t('search.status.searching'))
    setLoading(true)
    setError(undefined)
    setImportMessage(undefined)
    setQuerySteps([])
    setIdealUrl(buildIdealFhirUrl(params, fhirBaseUrl))
    const isClientFilteredComplex =
      params.mode === 'complex' &&
      (
        (params.complexSearchBy === 'organization' && Boolean(params.organizationId)) ||
        (params.complexSearchBy === 'author' && Boolean(params.authorName))
      )
    const isNameSearch = params.mode === 'basic' && Boolean(params.name)
    if (!isClientFilteredComplex && !isNameSearch) {
      setLastUrl(buildSearchUrl(params))
    } else {
      setLastUrl(undefined)
    }
    const steps: QueryStep[] = []
    const buildExecution = (overrides?: Partial<ConsumerSearchExecution>): ConsumerSearchExecution => ({
      params,
      lastUrl: (isClientFilteredComplex || isNameSearch) ? undefined : buildSearchUrl(params),
      querySteps: [...steps],
      error: undefined,
      ...overrides
    })

    try {
      const bundle = await searchBundles(params, (step) => {
        const existingIndex = steps.findIndex((s) => s.step === step.step)
        if (existingIndex >= 0) {
          steps[existingIndex] = step
        } else {
          steps.push(step)
        }
        setQuerySteps([...steps])
      }, { ...searchOptions, signal: abortController.signal })
      const results = extractSearchResults(bundle)
      const total = bundle.total ?? results.length
      const nextUrl = bundle.link?.find((l: { relation: string; url: string }) => l.relation === 'next')?.url
      onResults(results, total, buildExecution({ nextUrl }))
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        onResults([], 0, buildExecution({ cancelled: true }))
        return
      }
      const message = e instanceof Error ? e.message : t('search.error')
      setError(message)
      onResults([], 0, buildExecution({ error: message }))
    } finally {
      setLoading(false)
    }
  }

  async function handleImportBundle(): Promise<void> {
    announcePolite(t('search.status.importing'))
    setImporting(true)
    setError(undefined)
    setImportMessage(undefined)
    setLastUrl(undefined)
    setIdealUrl(undefined)
    setQuerySteps([])

    try {
      const imported = await importBundleJson()
      if (!imported) return

      onImportBundle(imported.summary)
      const message = t('search.importSuccess', { fileName: imported.fileName })
      setImportMessage(message)
      announcePolite(message)
      pushToast({
        variant: 'success',
        description: message
      })
    } catch (e) {
      const message = getBundleFileErrorMessage(e, tc)
      setError(message)
      pushToast({
        variant: 'error',
        description: message
      })
    } finally {
      setImporting(false)
    }
  }

  async function handleBasicSubmit(data: BasicSearchFormValues): Promise<void> {
    const params = {
      mode: 'basic' as const,
      identifier: data.searchBy === 'identifier' ? data.value : undefined,
      name: data.searchBy === 'name' ? data.value : undefined
    }
    if (data.searchBy === 'name') {
      const ownedIdentifiers = historyRecords
        .map((r) => r.patientIdentifier)
        .filter((id): id is string => Boolean(id))
      await doSearch(params, { ownedIdentifiers })
    } else {
      await doSearch(params)
    }
  }

  async function handleDateSubmit(data: DateSearchFormValues): Promise<void> {
    await doSearch({ mode: 'date', identifier: data.identifier, date: data.date })
  }

  async function handleComplexSubmit(data: ComplexSearchFormValues): Promise<void> {
    await doSearch({
      mode: 'complex',
      identifier: data.identifier,
      complexSearchBy: data.complexBy,
      organizationId: data.orgId,
      authorName: data.authorName
    })
  }

  const searchByValue = basicForm.watch('searchBy')
  const complexBy = complexForm.watch('complexBy')
  const isBusy = loading || importing
  const basicValueError = basicForm.formState.errors.value?.message
  const dateIdentifierError = dateForm.formState.errors.identifier?.message
  const dateValueError = dateForm.formState.errors.date?.message
  const complexIdentifierError = complexForm.formState.errors.identifier?.message

  useEffect(() => {
    onComplexByChange?.(complexBy ?? 'organization')
  }, [complexBy, onComplexByChange])

  useImperativeHandle(ref, () => ({
    fillMock,
    importBundle: handleImportBundle,
    submit: submitCurrentTab,
    focusPrimaryInput
  }), [activeTab, basicForm, complexForm, consumerBasicMocks, consumerComplexMocks, consumerDateMocks, dateForm, importing, loading])

  return (
    <div className="space-y-4" aria-busy={isBusy}>
      {importMessage && (
        <Alert variant="success">
          <AlertDescription>{importMessage}</AlertDescription>
        </Alert>
      )}

      {prefillNotice && (
        <Alert variant={prefillNotice.variant ?? 'warning'}>
          <AlertDescription>{prefillNotice.message}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList
          aria-label={t('search.tabListLabel')}
          className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-muted/45 p-1.5"
        >
          <TabsTrigger value="basic" disabled={isBusy} className="rounded-xl px-3 py-2 text-xs sm:text-sm">
            {t('search.tabs.basic')}
          </TabsTrigger>
          <TabsTrigger value="date" disabled={isBusy} className="rounded-xl px-3 py-2 text-xs sm:text-sm">
            {t('search.tabs.date')}
          </TabsTrigger>
          <TabsTrigger value="complex" disabled={isBusy} className="rounded-xl px-3 py-2 text-xs sm:text-sm">
            {t('search.tabs.complex')}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic search */}
        <TabsContent value="basic" className="mt-4">
          <form
            noValidate
            onSubmit={basicForm.handleSubmit(handleBasicSubmit)}
            className="space-y-4 rounded-[22px] border border-border/70 bg-background/90 p-4 shadow-sm"
          >
            <div className="space-y-2">
              <Label id="basic-search-by-label">{t('search.basic.searchByLabel')}</Label>
              <Select
                value={searchByValue}
                onValueChange={(v) => basicForm.setValue('searchBy', v as BasicSearchFormValues['searchBy'])}
              >
                <SelectTrigger id="basic-search-by" aria-labelledby="basic-search-by-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identifier">{t('search.basic.searchByOptions.identifier')}</SelectItem>
                  <SelectItem value="name">{t('search.basic.searchByOptions.name')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="basic-value">
                {searchByValue === 'identifier' ? t('search.basic.identifierLabel') : t('search.basic.nameLabel')}
              </Label>
              <Input
                id="basic-value"
                aria-invalid={Boolean(basicValueError)}
                aria-describedby={joinDescribedBy(basicValueError && 'basic-value-error')}
                placeholder={searchByValue === 'identifier' ? t('search.basic.identifierPlaceholder') : t('search.basic.namePlaceholder')}
                {...basicForm.register('value', {
                  required: searchByValue === 'identifier'
                    ? t('search.errors.basicValueRequiredIdentifier')
                    : t('search.errors.basicValueRequiredName')
                })}
              />
              {basicValueError && (
                <p id="basic-value-error" role="alert" className="text-xs text-destructive">
                  {basicValueError}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isBusy} className="h-11 flex-1 gap-2 rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {tc('buttons.search')}
              </Button>
              {loading && (
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={cancelSearch} aria-label={t('search.cancelButton')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </TabsContent>

        {/* Tab 2: Date search */}
        <TabsContent value="date" className="mt-4">
          <form
            noValidate
            onSubmit={dateForm.handleSubmit(handleDateSubmit)}
            className="space-y-4 rounded-[22px] border border-border/70 bg-background/90 p-4 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="date-id">{t('search.date.identifierLabel')}</Label>
              <Input
                id="date-id"
                aria-invalid={Boolean(dateIdentifierError)}
                aria-describedby={joinDescribedBy(dateIdentifierError && 'date-id-error')}
                placeholder={t('search.date.identifierPlaceholder')}
                {...dateForm.register('identifier', { required: t('search.errors.dateIdentifierRequired') })}
              />
              {dateIdentifierError && (
                <p id="date-id-error" role="alert" className="text-xs text-destructive">
                  {dateIdentifierError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-date">{t('search.date.dateLabel')}</Label>
              <Input
                id="search-date"
                type="date"
                aria-invalid={Boolean(dateValueError)}
                aria-describedby={joinDescribedBy(dateValueError && 'search-date-error')}
                {...dateForm.register('date', { required: t('search.errors.dateRequired') })}
              />
              {dateValueError && (
                <p id="search-date-error" role="alert" className="text-xs text-destructive">
                  {dateValueError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isBusy} className="h-11 flex-1 gap-2 rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t('search.date.submitButton')}
              </Button>
              {loading && (
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={cancelSearch} aria-label={t('search.cancelButton')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </TabsContent>

        {/* Tab 3: Complex search */}
        <TabsContent value="complex" className="mt-4">
          <form
            noValidate
            onSubmit={complexForm.handleSubmit(handleComplexSubmit)}
            className="space-y-4 rounded-[22px] border border-border/70 bg-background/90 p-4 shadow-sm"
          >
            <div className="space-y-2">
              <Label htmlFor="complex-id">{t('search.complex.identifierLabel')}</Label>
              <Input
                id="complex-id"
                aria-invalid={Boolean(complexIdentifierError)}
                aria-describedby={joinDescribedBy(complexIdentifierError && 'complex-id-error')}
                placeholder={t('search.complex.identifierPlaceholder')}
                {...complexForm.register('identifier', { required: t('search.errors.complexIdentifierRequired') })}
              />
              {complexIdentifierError && (
                <p id="complex-id-error" role="alert" className="text-xs text-destructive">
                  {complexIdentifierError}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label id="complex-extra-label">{t('search.complex.extraLabel')}</Label>
              <Select
                value={complexBy}
                onValueChange={(v) => {
                  complexForm.setValue('complexBy', v as ComplexSearchFormValues['complexBy'])
                  onComplexByChange?.(v as 'organization' | 'author')
                }}
              >
                <SelectTrigger id="complex-extra" aria-labelledby="complex-extra-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">{t('search.complex.extraOptions.organization')}</SelectItem>
                  <SelectItem value="author">{t('search.complex.extraOptions.author')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {complexBy === 'organization' ? (
              <div className="space-y-2">
                <Label htmlFor="org-id-search">{t('search.complex.orgCodeLabel')}</Label>
                <Input
                  key="complex-org-id"
                  id="org-id-search"
                  placeholder={t('search.complex.orgCodePlaceholder')}
                  {...complexForm.register('orgId')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="author-name">{t('search.complex.authorNameLabel')}</Label>
                <Input
                  key="complex-author-name"
                  id="author-name"
                  placeholder={t('search.complex.authorNamePlaceholder')}
                  {...complexForm.register('authorName')}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isBusy} className="h-11 flex-1 gap-2 rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {complexBy === 'organization' ? t('search.complex.submitButtonOrg') : t('search.complex.submitButtonAuthor')}
              </Button>
              {loading && (
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={cancelSearch} aria-label={t('search.cancelButton')}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {idealUrl && (
        <div className="rounded-[20px] border border-border/70 bg-background/80 p-3 shadow-sm">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('search.idealQueryLabel')}
          </p>
          <ExternalUrlLink url={idealUrl} compact />
          <p className="mt-1.5 text-[10px] italic text-muted-foreground/70">
            {t('search.idealQueryNote')}
          </p>
        </div>
      )}

      {(lastUrl || localizedQuerySteps.length > 0) && (
        <div className="space-y-2 rounded-[20px] border border-border/70 bg-background/80 p-3 shadow-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('search.actualQueryLabel')}
          </p>
          {lastUrl && <ExternalUrlLink url={lastUrl} compact />}
          {localizedQuerySteps.length > 0 && (
            <div className="space-y-2">
              {localizedQuerySteps.map((s) => (
                <div key={s.step} className="space-y-1 rounded-2xl border border-border/60 bg-muted/[0.2] px-3 py-2">
                  <p className="text-[11px] font-medium text-foreground">{s.displayLabel}</p>
                  <ExternalUrlLink url={s.url} compact />
                  {s.displayNote && <p className="text-[10px] text-muted-foreground/70 italic">{s.displayNote}</p>}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] italic text-muted-foreground/70">
            {t('search.actualQueryNote')}
          </p>
        </div>
      )}

      <FhirErrorAlert error={error} />
    </div>
  )
})

export default SearchForm
