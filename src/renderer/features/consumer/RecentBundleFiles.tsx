import { Clock3, FileJson, FolderOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../shared/components/ui/button'
import { Badge } from '../../shared/components/ui/badge'
import type { RecentBundleFileEntry } from '../../types/electron'

interface Props {
  files: RecentBundleFileEntry[]
  onOpen: (filePath: string) => void
}

export default function RecentBundleFiles({ files, onOpen }: Props): React.JSX.Element | null {
  const { t } = useTranslation('consumer')

  if (files.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="border-b px-4 py-4">
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
          <FileJson className="h-3 w-3" />
          {t('recentFiles.sourceLabel')}
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">{t('recentFiles.title')}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('recentFiles.description')}</p>
        <div className="mt-3">
          <Badge variant="outline" className="h-5 gap-1 rounded-full px-2 font-normal">
            <Clock3 className="h-3 w-3" />
            {t('recentFiles.count', { count: files.length })}
          </Badge>
        </div>
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto px-4 py-4">
        {files.map((file) => (
          <div key={file.filePath} className="rounded-lg border border-border/70 bg-background/70 px-3 py-3">
            <div className="min-w-0 space-y-1">
              <div className="truncate text-xs font-medium text-foreground">{file.fileName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{file.filePath}</div>
              <div className="text-[10px] text-muted-foreground">
                {t('recentFiles.lastOpened', { time: new Date(file.lastOpenedAt).toLocaleString() })}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full justify-start"
              onClick={() => onOpen(file.filePath)}
            >
              <FolderOpen className="h-4 w-4" />
              {t('recentFiles.open')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
