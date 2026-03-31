import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Search, Loader2, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import FhirErrorAlert from '../../components/FhirErrorAlert'
import { searchBundles, buildSearchUrl, type QueryStep } from '../../services/fhirClient'
import { extractSearchResults } from '../../services/searchService'
import type { BundleSummary, SearchParams } from '../../types/fhir.d'
import type { ConsumerSearchExecution, SearchPrefill, SearchTab } from './searchState'
import { consumerBasicMocks, consumerDateMocks, consumerComplexMocks } from '../../mocks/mockPools'

interface Props {
  activeTab: SearchTab
  onTabChange: (tab: SearchTab) => void
  onResults: (results: BundleSummary[], total: number, execution: ConsumerSearchExecution) => void
  prefill?: SearchPrefill | null
  onPrefillConsumed?: () => void
  autoSearch?: SearchParams | null
  onAutoSearchConsumed?: () => void
}

export default function SearchForm({
  activeTab,
  onTabChange,
  onResults,
  prefill,
  onPrefillConsumed,
  autoSearch,
  onAutoSearchConsumed
}: Props): React.JSX.Element {
  const { t } = useTranslation('consumer')
  const { t: tc } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [lastUrl, setLastUrl] = useState<string>()
  const [querySteps, setQuerySteps] = useState<QueryStep[]>([])
  const [error, setError] = useState<string>()

  const basicForm = useForm({ defaultValues: { searchBy: 'identifier', value: '' } })
  const dateForm = useForm({ defaultValues: { identifier: '', date: '' } })
  const complexForm = useForm({ defaultValues: { identifier: '', complexBy: 'organization', orgId: '', authorName: '' } })

  const basicMockRef   = useRef(0)
  const dateMockRef    = useRef(0)
  const complexMockRef = useRef(0)
  const consumedAutoSearchKeyRef = useRef<string>()

  function fillMock(): void {
    if (activeTab === 'basic') {
      const d = consumerBasicMocks[basicMockRef.current % consumerBasicMocks.length]
      basicMockRef.current += 1
      basicForm.setValue('searchBy', d.searchBy)
      basicForm.setValue('value', d.value)
    } else if (activeTab === 'date') {
      const d = consumerDateMocks[dateMockRef.current % consumerDateMocks.length]
      dateMockRef.current += 1
      dateForm.setValue('identifier', d.identifier)
      dateForm.setValue('date', d.date)
    } else {
      const d = consumerComplexMocks[complexMockRef.current % consumerComplexMocks.length]
      complexMockRef.current += 1
      complexForm.setValue('identifier', d.identifier)
      complexForm.setValue('complexBy', d.complexBy)
      complexForm.setValue('orgId', d.orgId)
      complexForm.setValue('authorName', d.authorName)
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

    onTabChange(prefill.tab)
    onPrefillConsumed?.()
  }, [basicForm, complexForm, dateForm, onPrefillConsumed, onTabChange, prefill])

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

  async function doSearch(params: SearchParams): Promise<void> {
    setLoading(true)
    setError(undefined)
    setQuerySteps([])
    const isClientFilteredComplex =
      params.mode === 'complex' &&
      (
        (params.complexSearchBy === 'organization' && Boolean(params.organizationId)) ||
        (params.complexSearchBy === 'author' && Boolean(params.authorName))
      )
    if (!isClientFilteredComplex) {
      setLastUrl(buildSearchUrl(params))
    } else {
      setLastUrl(undefined)
    }
    const steps: QueryStep[] = []
    const buildExecution = (overrides?: Partial<ConsumerSearchExecution>): ConsumerSearchExecution => ({
      params,
      lastUrl: isClientFilteredComplex ? undefined : buildSearchUrl(params),
      querySteps: [...steps],
      error: undefined,
      ...overrides
    })

    try {
      const bundle = await searchBundles(params, (step) => {
        steps.push(step)
        setQuerySteps([...steps])
      })
      const results = extractSearchResults(bundle)
      const total = bundle.total ?? results.length
      onResults(results, total, buildExecution())
    } catch (e) {
      const message = e instanceof Error ? e.message : t('search.error')
      setError(message)
      onResults([], 0, buildExecution({ error: message }))
    } finally {
      setLoading(false)
    }
  }

  async function handleBasicSubmit(data: { searchBy: string; value: string }): Promise<void> {
    await doSearch({
      mode: 'basic',
      identifier: data.searchBy === 'identifier' ? data.value : undefined,
      name: data.searchBy === 'name' ? data.value : undefined
    })
  }

  async function handleDateSubmit(data: { identifier: string; date: string }): Promise<void> {
    await doSearch({ mode: 'date', identifier: data.identifier, date: data.date })
  }

  async function handleComplexSubmit(data: {
    identifier: string
    complexBy: string
    orgId: string
    authorName: string
  }): Promise<void> {
    await doSearch({
      mode: 'complex',
      identifier: data.identifier,
      complexSearchBy: data.complexBy as 'organization' | 'author',
      organizationId: data.orgId,
      authorName: data.authorName
    })
  }

  const searchByValue = basicForm.watch('searchBy')
  const complexBy = complexForm.watch('complexBy')

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={fillMock} className="h-7 px-2 text-xs text-muted-foreground">
          <Wand2 className="h-3 w-3 mr-1" />{tc('buttons.fillMock')}
        </Button>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="basic" className="flex-1">{t('search.tabs.basic')}</TabsTrigger>
          <TabsTrigger value="date" className="flex-1">{t('search.tabs.date')}</TabsTrigger>
          <TabsTrigger value="complex" className="flex-1">{t('search.tabs.complex')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic search */}
        <TabsContent value="basic">
          <form onSubmit={basicForm.handleSubmit(handleBasicSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label>{t('search.basic.searchByLabel')}</Label>
              <Select
                value={searchByValue}
                onValueChange={(v) => basicForm.setValue('searchBy', v)}
              >
                <SelectTrigger>
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
                placeholder={searchByValue === 'identifier' ? t('search.basic.identifierPlaceholder') : t('search.basic.namePlaceholder')}
                {...basicForm.register('value', { required: true })}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {tc('buttons.search')}
            </Button>
          </form>
        </TabsContent>

        {/* Tab 2: Date search */}
        <TabsContent value="date">
          <form onSubmit={dateForm.handleSubmit(handleDateSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="date-id">{t('search.date.identifierLabel')}</Label>
              <Input
                id="date-id"
                placeholder={t('search.date.identifierPlaceholder')}
                {...dateForm.register('identifier', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-date">{t('search.date.dateLabel')}</Label>
              <Input
                id="search-date"
                type="date"
                {...dateForm.register('date', { required: true })}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t('search.date.submitButton')}
            </Button>
          </form>
        </TabsContent>

        {/* Tab 3: Complex search */}
        <TabsContent value="complex">
          <form onSubmit={complexForm.handleSubmit(handleComplexSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="complex-id">{t('search.complex.identifierLabel')}</Label>
              <Input
                id="complex-id"
                placeholder={t('search.complex.identifierPlaceholder')}
                {...complexForm.register('identifier', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('search.complex.extraLabel')}</Label>
              <Select
                value={complexBy}
                onValueChange={(v) => complexForm.setValue('complexBy', v)}
              >
                <SelectTrigger>
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
                  id="org-id-search"
                  placeholder={t('search.complex.orgCodePlaceholder')}
                  {...complexForm.register('orgId')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="author-name">{t('search.complex.authorNameLabel')}</Label>
                <Input
                  id="author-name"
                  placeholder={t('search.complex.authorNamePlaceholder')}
                  {...complexForm.register('authorName')}
                />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {complexBy === 'organization' ? t('search.complex.submitButtonOrg') : t('search.complex.submitButtonAuthor')}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {lastUrl && (
        <div className="p-2 rounded bg-muted">
          <p className="text-[10px] text-muted-foreground mb-1">{t('search.queryUrlLabel')}</p>
          <code className="text-xs break-all">{lastUrl}</code>
        </div>
      )}

      {querySteps.length > 0 && (
        <div className="p-2 rounded bg-muted space-y-2">
          <p className="text-[10px] text-muted-foreground">{t('search.queryStepsLabel')}</p>
          {querySteps.map((s) => (
            <div key={s.step} className="space-y-0.5">
              <p className="text-[10px] font-medium text-foreground">{s.label}</p>
              <code className="text-[10px] break-all text-muted-foreground">{s.url}</code>
              {s.note && <p className="text-[10px] text-muted-foreground/70 italic">{s.note}</p>}
            </div>
          ))}
        </div>
      )}

      <FhirErrorAlert error={error} />
    </div>
  )
}
