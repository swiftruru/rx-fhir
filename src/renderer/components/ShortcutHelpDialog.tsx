import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from './ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog'
import { formatBinding, isMacPlatform } from '../shortcuts/normalize'
import { getShortcutsByCategory } from '../shortcuts/resolver'
import { useShortcutStore } from '../store/shortcutStore'

const SHORTCUT_COLUMN_GROUPS = [
  ['global', 'consumer'],
  ['creator', 'settings']
] as const

export default function ShortcutHelpDialog(): React.JSX.Element {
  const { t } = useTranslation('shortcuts')
  const open = useShortcutStore((state) => state.helpOpen)
  const overrides = useShortcutStore((state) => state.overrides)
  const closeHelp = useShortcutStore((state) => state.closeHelp)
  const grouped = useMemo(() => getShortcutsByCategory(overrides), [overrides])
  const mac = isMacPlatform()

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeHelp()}>
      <DialogContent className="max-w-5xl overflow-hidden p-0 sm:max-h-[calc(100vh-2rem)]">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6 pr-14">
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-6 py-4">
            <p className="mb-4 text-xs text-muted-foreground">{t('platformHint')}</p>

            <div className="grid gap-4 xl:grid-cols-2">
              {SHORTCUT_COLUMN_GROUPS.map((column, index) => (
                <div key={index} className="space-y-4">
                  {column.map((category) => {
                    const shortcuts = grouped[category]
                    return (
                      <section key={category} className="rounded-lg border bg-card">
                        <div className="border-b px-4 py-3">
                          <h3 className="font-medium">{t(`categories.${category}`)}</h3>
                        </div>
                        <div className="space-y-3 p-4">
                          {shortcuts.map((shortcut) => (
                            <div key={shortcut.id} className="rounded-md border border-border/70 bg-background/60 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium">{t(shortcut.labelKey)}</div>
                                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                    {t(shortcut.descriptionKey)}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <code className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium">
                                    {formatBinding(shortcut.binding)}
                                  </code>
                                  <Badge variant={overrides[shortcut.id] ? 'default' : 'secondary'}>
                                    {overrides[shortcut.id] ? t('settings.customized') : t('settings.default')}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              ))}
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              {mac ? 'macOS' : 'Windows / Linux'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
