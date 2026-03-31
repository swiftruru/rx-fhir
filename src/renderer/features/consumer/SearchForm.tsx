import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { searchBundles, buildSearchUrl } from '../../services/fhirClient'
import { extractSearchResults } from '../../services/searchService'
import type { BundleSummary, SearchParams } from '../../types/fhir.d'

interface Props {
  onResults: (results: BundleSummary[], total: number) => void
}

export default function SearchForm({ onResults }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState('basic')
  const [loading, setLoading] = useState(false)
  const [lastUrl, setLastUrl] = useState<string>()
  const [error, setError] = useState<string>()

  // Basic search form
  const basicForm = useForm({ defaultValues: { searchBy: 'identifier', value: '' } })
  // Date search form
  const dateForm = useForm({ defaultValues: { identifier: '', date: '' } })
  // Complex search form
  const complexForm = useForm({ defaultValues: { identifier: '', complexBy: 'organization', orgId: '', authorName: '' } })

  async function doSearch(params: SearchParams): Promise<void> {
    setLoading(true)
    setError(undefined)
    const url = buildSearchUrl(params)
    setLastUrl(url)
    try {
      const bundle = await searchBundles(params)
      const results = extractSearchResults(bundle)
      const total = bundle.total ?? results.length
      onResults(results, total)
    } catch (e) {
      setError(e instanceof Error ? e.message : '查詢失敗')
      onResults([], 0)
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

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="basic" className="flex-1">基本查詢</TabsTrigger>
          <TabsTrigger value="date" className="flex-1">日期查詢</TabsTrigger>
          <TabsTrigger value="complex" className="flex-1">複合查詢</TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic search */}
        <TabsContent value="basic">
          <form onSubmit={basicForm.handleSubmit(handleBasicSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label>查詢方式</Label>
              <Select
                value={basicForm.watch('searchBy')}
                onValueChange={(v) => basicForm.setValue('searchBy', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identifier">病人識別碼 (identifier)</SelectItem>
                  <SelectItem value="name">病人姓名 (name)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="basic-value">
                {basicForm.watch('searchBy') === 'identifier' ? '識別碼（學號）' : '病人姓名'}
              </Label>
              <Input
                id="basic-value"
                placeholder={basicForm.watch('searchBy') === 'identifier' ? '例：B12345678' : '例：王小明'}
                {...basicForm.register('value', { required: true })}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              查詢
            </Button>
          </form>
        </TabsContent>

        {/* Tab 2: Date search */}
        <TabsContent value="date">
          <form onSubmit={dateForm.handleSubmit(handleDateSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="date-id">病人識別碼（學號）</Label>
              <Input
                id="date-id"
                placeholder="例：B12345678"
                {...dateForm.register('identifier', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="search-date">處方日期</Label>
              <Input
                id="search-date"
                type="date"
                {...dateForm.register('date', { required: true })}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              查詢（identifier AND date）
            </Button>
          </form>
        </TabsContent>

        {/* Tab 3: Complex search */}
        <TabsContent value="complex">
          <form onSubmit={complexForm.handleSubmit(handleComplexSubmit)} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="complex-id">病人識別碼（學號）</Label>
              <Input
                id="complex-id"
                placeholder="例：B12345678"
                {...complexForm.register('identifier', { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>附加條件</Label>
              <Select
                value={complexForm.watch('complexBy')}
                onValueChange={(v) => complexForm.setValue('complexBy', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">機構代碼 (organization.identifier)</SelectItem>
                  <SelectItem value="author">醫師姓名 (author.name)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {complexForm.watch('complexBy') === 'organization' ? (
              <div className="space-y-2">
                <Label htmlFor="org-id-search">機構代碼</Label>
                <Input
                  id="org-id-search"
                  placeholder="例：0101020011"
                  {...complexForm.register('orgId')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="author-name">醫師姓名</Label>
                <Input
                  id="author-name"
                  placeholder="例：李大華"
                  {...complexForm.register('authorName')}
                />
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              查詢（identifier AND {complexForm.watch('complexBy')}）
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Query URL display */}
      {lastUrl && (
        <div className="p-2 rounded bg-muted">
          <p className="text-[10px] text-muted-foreground mb-1">查詢 URL</p>
          <code className="text-xs break-all">{lastUrl}</code>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
