import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Keyboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { bindingFromEvent, formatBinding } from '../../shortcuts/normalize'
import { findShortcutConflict } from '../../shortcuts/conflicts'
import { getResolvedShortcutMap, getShortcutsByCategory } from '../../shortcuts/resolver'
import { useShortcutStore } from '../../store/shortcutStore'
import type { ShortcutActionId, ShortcutCategory } from '../../shortcuts/types'

const CATEGORY_ORDER: ShortcutCategory[] = ['global', 'creator', 'consumer', 'settings']

export default function ShortcutSettingsPanel(): React.JSX.Element {
  const { t } = useTranslation('shortcuts')
  const overrides = useShortcutStore((state) => state.overrides)
  const setOverride = useShortcutStore((state) => state.setOverride)
  const clearOverride = useShortcutStore((state) => state.clearOverride)
  const resetAll = useShortcutStore((state) => state.resetAll)
  const grouped = useMemo(() => getShortcutsByCategory(overrides), [overrides])
  const resolvedMap = useMemo(() => getResolvedShortcutMap(overrides), [overrides])
  const [category, setCategory] = useState<ShortcutCategory>('global')
  const [editingId, setEditingId] = useState<ShortcutActionId | null>(null)
  const [conflictMessage, setConflictMessage] = useState<string>()

  useEffect(() => {
    if (!editingId) return
    const currentEditingId = editingId

    function handleCapture(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setEditingId(null)
        setConflictMessage(undefined)
        return
      }

      const binding = bindingFromEvent(event)
      if (!binding) {
        setConflictMessage(t('settings.conflicts.invalid'))
        return
      }

      const conflict = findShortcutConflict(currentEditingId, binding, Object.values(resolvedMap))
      if (!conflict) {
        setOverride(currentEditingId, binding)
        setEditingId(null)
        setConflictMessage(undefined)
        return
      }

      if (conflict.type === 'reserved') {
        setConflictMessage(t('settings.conflicts.reserved'))
        return
      }

      if (conflict.type === 'duplicate' && conflict.conflictsWith?.length) {
        const conflictTarget = resolvedMap[conflict.conflictsWith[0]]
        setConflictMessage(
          t('settings.conflicts.duplicate', {
            action: conflictTarget ? t(conflictTarget.labelKey) : conflict.conflictsWith[0]
          })
        )
        return
      }

      setConflictMessage(t('settings.conflicts.invalid'))
    }

    window.addEventListener('keydown', handleCapture, true)
    return () => window.removeEventListener('keydown', handleCapture, true)
  }, [editingId, resolvedMap, setOverride, t])

  const shortcuts = grouped[category]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{t('settings.title')}</CardTitle>
          <CardDescription>{t('settings.description')}</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => resetAll()}>
          <RotateCcw className="h-4 w-4" />
          {t('settings.resetAll')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{t('settings.categoryLabel')}</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((item) => (
              <Button
                key={item}
                type="button"
                variant={category === item ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(item)}
              >
                {t(`categories.${item}`)}
              </Button>
            ))}
          </div>
        </div>

        {editingId && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4" />
              {t('settings.editing')}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.recordingHint')}</p>
            {conflictMessage && <p className="mt-2 text-xs text-destructive">{conflictMessage}</p>}
          </div>
        )}

        <div className="space-y-3">
          {shortcuts.length === 0 && (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {t('settings.empty')}
            </div>
          )}

          {shortcuts.map((shortcut) => (
            <div key={shortcut.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t(shortcut.labelKey)}</p>
                    <Badge variant={overrides[shortcut.id] ? 'default' : 'secondary'}>
                      {overrides[shortcut.id] ? t('settings.customized') : t('settings.default')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{t(shortcut.descriptionKey)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <code className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                    {formatBinding(shortcut.binding)}
                  </code>
                  <div className="flex flex-wrap gap-2">
                    {shortcut.customizable ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant={editingId === shortcut.id ? 'secondary' : 'outline'}
                          onClick={() => {
                            setConflictMessage(undefined)
                            setEditingId((current) => (current === shortcut.id ? null : shortcut.id))
                          }}
                        >
                          {editingId === shortcut.id ? t('settings.cancelEditing') : t('settings.edit')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => clearOverride(shortcut.id)}
                          disabled={!overrides[shortcut.id]}
                        >
                          {t('settings.reset')}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t('settings.notCustomizable')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
