import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Info, Keyboard, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '../../shared/components/ui/alert'
import { Badge } from '../../shared/components/ui/badge'
import { Button } from '../../shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/card'
import { cn } from '../../shared/lib/utils'
import { bindingFromEvent, formatBinding, isMacPlatform, normalizeBinding } from '../../shortcuts/normalize'
import { findShortcutConflict } from '../../shortcuts/conflicts'
import { getResolvedShortcutMap, getShortcutsByCategory } from '../../shortcuts/resolver'
import { useAccessibilityStore } from '../../shared/stores/accessibilityStore'
import { useShortcutStore } from '../../app/stores/shortcutStore'
import type { ShortcutActionId, ShortcutCategory } from '../../shortcuts/types'

const CATEGORY_ORDER: ShortcutCategory[] = ['global', 'creator', 'consumer', 'settings']
const FEEDBACK_TIMEOUT_MS = 4000

type ShortcutPanelFeedback = {
  variant: 'success' | 'info'
  message: string
}

export default function ShortcutSettingsPanel(): React.JSX.Element {
  const { t } = useTranslation('shortcuts')
  const overrides = useShortcutStore((state) => state.overrides)
  const setOverride = useShortcutStore((state) => state.setOverride)
  const clearOverride = useShortcutStore((state) => state.clearOverride)
  const resetAll = useShortcutStore((state) => state.resetAll)
  const grouped = useMemo(() => getShortcutsByCategory(overrides), [overrides])
  const resolvedMap = useMemo(() => getResolvedShortcutMap(overrides), [overrides])
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const announceAssertive = useAccessibilityStore((state) => state.announceAssertive)
  const [category, setCategory] = useState<ShortcutCategory>('global')
  const [editingId, setEditingId] = useState<ShortcutActionId | null>(null)
  const [conflictMessage, setConflictMessage] = useState<string>()
  const [feedback, setFeedback] = useState<ShortcutPanelFeedback | null>(null)

  const editingShortcut = editingId ? resolvedMap[editingId] : undefined
  const categoryShortcuts = grouped[category]
  const customizableShortcuts = useMemo(
    () => Object.values(resolvedMap).filter((shortcut) => shortcut.customizable),
    [resolvedMap]
  )
  const customizedShortcutCount = Object.keys(overrides).length
  const defaultShortcutCount = customizableShortcuts.length - customizedShortcutCount
  const categoryCustomizedCount = categoryShortcuts.filter((shortcut) => Boolean(overrides[shortcut.id])).length
  const platformName = isMacPlatform() ? t('settings.platforms.mac') : t('settings.platforms.other')

  function getActionLabel(id: ShortcutActionId): string {
    const shortcut = resolvedMap[id]
    return shortcut ? t(shortcut.labelKey) : id
  }

  function announceFeedback(variant: ShortcutPanelFeedback['variant'], message: string): void {
    setFeedback({ variant, message })
    announcePolite(message)
  }

  function handleResetAll(): void {
    const hasOverrides = Object.keys(overrides).length > 0
    resetAll()
    setEditingId(null)
    setConflictMessage(undefined)
    announceFeedback(
      hasOverrides ? 'success' : 'info',
      hasOverrides ? t('settings.resetAllDone') : t('settings.resetAllAlreadyDefault')
    )
  }

  function handleResetShortcut(actionId: ShortcutActionId): void {
    const shortcut = resolvedMap[actionId]
    if (!shortcut) return

    const defaultBinding = normalizeBinding(shortcut.defaultBinding) ?? shortcut.defaultBinding
    const formattedDefaultBinding = formatBinding(defaultBinding)

    setConflictMessage(undefined)
    if (editingId === actionId) {
      setEditingId(null)
    }

    if (!overrides[actionId]) {
      announceFeedback('info', t('settings.alreadyDefault', {
        action: t(shortcut.labelKey),
        binding: formattedDefaultBinding
      }))
      return
    }

    clearOverride(actionId)
    announceFeedback('success', t('settings.restored', {
      action: t(shortcut.labelKey),
      binding: formattedDefaultBinding
    }))
  }

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
        const message = t('settings.conflicts.invalid')
        setConflictMessage(message)
        announceAssertive(message)
        return
      }

      const conflict = findShortcutConflict(currentEditingId, binding, Object.values(resolvedMap))
      if (!conflict) {
        const shortcut = resolvedMap[currentEditingId]
        const defaultBinding = normalizeBinding(shortcut?.defaultBinding ?? '')
        const actionLabel = getActionLabel(currentEditingId)

        if (defaultBinding && binding === defaultBinding) {
          clearOverride(currentEditingId)
          announceFeedback('success', t('settings.restored', {
            action: actionLabel,
            binding: formatBinding(defaultBinding)
          }))
        } else {
          setOverride(currentEditingId, binding)
          announceFeedback('success', t('settings.updated', {
            action: actionLabel,
            binding: formatBinding(binding)
          }))
        }

        setEditingId(null)
        setConflictMessage(undefined)
        return
      }

      if (conflict.type === 'reserved') {
        const message = t('settings.conflicts.reserved')
        setConflictMessage(message)
        announceAssertive(message)
        return
      }

      if (conflict.type === 'duplicate' && conflict.conflictsWith?.length) {
        const conflictTarget = resolvedMap[conflict.conflictsWith[0]]
        const message = t('settings.conflicts.duplicate', {
          action: conflictTarget ? t(conflictTarget.labelKey) : conflict.conflictsWith[0]
        })
        setConflictMessage(message)
        announceAssertive(message)
        return
      }

      const message = t('settings.conflicts.invalid')
      setConflictMessage(message)
      announceAssertive(message)
    }

    window.addEventListener('keydown', handleCapture, true)
    return () => window.removeEventListener('keydown', handleCapture, true)
  }, [announceAssertive, clearOverride, editingId, resolvedMap, setOverride, t])

  useEffect(() => {
    if (!feedback) return

    const timer = window.setTimeout(() => {
      setFeedback(null)
    }, FEEDBACK_TIMEOUT_MS)

    return () => window.clearTimeout(timer)
  }, [feedback])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{t('settings.title')}</CardTitle>
          <CardDescription>{t('settings.description')}</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleResetAll}>
          <RotateCcw className="h-4 w-4" />
          {t('settings.resetAll')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('settings.summary.categoryShortcuts')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{categoryShortcuts.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.summary.categoryCustomized', { count: categoryCustomizedCount })}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('settings.summary.customized')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{customizedShortcutCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.summary.defaultCount', { count: defaultShortcutCount })}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('settings.summary.platform')}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{platformName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('platformHint')}</p>
          </div>
        </div>

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

        {feedback && (
          <Alert variant={feedback.variant}>
            {feedback.variant === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            <AlertDescription>{feedback.message}</AlertDescription>
          </Alert>
        )}

        {editingId && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4" />
              {t('settings.editing')}
            </div>
            {editingShortcut && (
              <>
                <p className="mt-1 text-xs font-medium text-foreground">
                  {t('settings.editingAction', { action: t(editingShortcut.labelKey) })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('settings.editingCurrent', { binding: formatBinding(editingShortcut.binding) })}
                </p>
              </>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.recordingHint')}</p>
            {conflictMessage && <p className="mt-2 text-xs text-destructive">{conflictMessage}</p>}
          </div>
        )}

        <div className="space-y-3">
          {categoryShortcuts.length === 0 && (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              {t('settings.empty')}
            </div>
          )}

          {categoryShortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className={cn(
                'rounded-lg border bg-card p-4 transition-colors',
                editingId === shortcut.id && 'border-primary/50 bg-primary/5 shadow-sm'
              )}
            >
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
                  <div className="space-y-1 text-left md:text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('settings.currentBinding')}
                    </p>
                    <code className="inline-flex rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                      {formatBinding(shortcut.binding)}
                    </code>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('settings.defaultBinding', { binding: formatBinding(shortcut.defaultBinding) })}
                  </p>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:text-right">
                      {t('settings.actions')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                    {shortcut.customizable ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant={editingId === shortcut.id ? 'secondary' : 'outline'}
                          onClick={() => {
                            setFeedback(null)
                            setConflictMessage(undefined)
                            setEditingId((current) => {
                              const next = current === shortcut.id ? null : shortcut.id

                              if (next) {
                                announcePolite(
                                  `${t('settings.editingAction', { action: t(shortcut.labelKey) })} ${t('settings.recordingHint')}`
                                )
                              }

                              return next
                            })
                          }}
                        >
                          {editingId === shortcut.id ? t('settings.cancelEditing') : t('settings.edit')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetShortcut(shortcut.id)}
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
