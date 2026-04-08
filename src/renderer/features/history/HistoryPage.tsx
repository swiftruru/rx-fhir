import { useTranslation } from 'react-i18next'
import { Clock, Download } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { useHistoryStore } from '../../store/historyStore'
import { useSearchHistoryStore } from '../../store/searchHistoryStore'
import { showToast } from '../../store/toastStore'
import SubmissionList from './SubmissionList'
import SearchList from './SearchList'

declare const __APP_VERSION__: string

export default function HistoryPage(): React.JSX.Element {
  const { t } = useTranslation('history')
  const submissions = useHistoryStore((s) => s.records)
  const searches    = useSearchHistoryStore((s) => s.records)

  async function exportSubmissions(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const defaultFileName = t('submissions.exportFileName', { date: today })

    const payload = {
      exportedAt: new Date().toISOString(),
      appVersion: __APP_VERSION__,
      submissions,
    }

    const result = await window.rxfhir?.saveFile?.({
      content: JSON.stringify(payload, null, 2),
      defaultFileName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (result && !result.canceled && result.fileName) {
      showToast({ variant: 'success', description: t('submissions.exportSuccess', { fileName: result.fileName }) })
    }
  }

  async function exportSearches(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10)
    const defaultFileName = t('searches.exportFileName', { date: today })

    const payload = {
      exportedAt: new Date().toISOString(),
      appVersion: __APP_VERSION__,
      savedSearches: searches.filter((r) => r.pinned),
      recentSearches: searches.filter((r) => !r.pinned),
    }

    const result = await window.rxfhir?.saveFile?.({
      content: JSON.stringify(payload, null, 2),
      defaultFileName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (result && !result.canceled && result.fileName) {
      showToast({ variant: 'success', description: t('searches.exportSuccess', { fileName: result.fileName }) })
    }
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

        {/* Page header */}
        <section className="rounded-[28px] border border-border/70 bg-card/70 p-5 shadow-sm ring-1 ring-border/40 backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1
                  data-page-heading="true"
                  tabIndex={-1}
                  className="text-2xl font-bold tracking-tight outline-none"
                >
                  {t('page.title')}
                </h1>
                <p className="text-sm text-muted-foreground">{t('page.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <Tabs defaultValue="submissions" className="flex flex-col gap-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="submissions" className="flex-1 sm:flex-initial">
              {t('page.tabs.submissions')}
              {submissions.length > 0 && (
                <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                  {submissions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="searches" className="flex-1 sm:flex-initial">
              {t('page.tabs.searches')}
              {searches.length > 0 && (
                <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
                  {searches.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Submissions tab */}
          <TabsContent value="submissions" className="mt-0">
            <div className="space-y-3">
              {submissions.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => void exportSubmissions()}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('submissions.exportButton')}
                  </Button>
                </div>
              )}
              <SubmissionList />
            </div>
          </TabsContent>

          {/* Searches tab */}
          <TabsContent value="searches" className="mt-0">
            <div className="space-y-3">
              {searches.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => void exportSearches()}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('searches.exportButton')}
                  </Button>
                </div>
              )}
              <SearchList />
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}
