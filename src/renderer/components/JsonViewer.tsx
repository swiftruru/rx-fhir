import { useEffect, useMemo, useState } from 'react'
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite'
import 'react-json-view-lite/dist/index.css'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface JsonViewerProps {
  data: unknown
  title?: string
  defaultCollapsed?: boolean
  className?: string
}

export default function JsonViewer({
  data,
  title,
  defaultCollapsed = false,
  className
}: JsonViewerProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  )

  useEffect(() => {
    const root = document.documentElement
    const updateTheme = (): void => setIsDark(root.classList.contains('dark'))

    updateTheme()
    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  const jsonTheme = useMemo(() => ({
    ...defaultStyles,
    container: cn(
      'font-mono text-[11px] leading-6',
      isDark ? 'text-slate-100' : 'text-slate-700'
    ),
    basicChildStyle: 'ml-4',
    label: isDark ? 'text-rose-300 mr-1' : 'text-rose-700 mr-1',
    nullValue: 'text-muted-foreground',
    undefinedValue: 'text-muted-foreground',
    numberValue: isDark ? 'text-amber-300' : 'text-amber-700',
    stringValue: isDark ? 'text-emerald-300' : 'text-emerald-700',
    booleanValue: isDark ? 'text-fuchsia-300' : 'text-fuchsia-700',
    otherValue: isDark ? 'text-slate-200' : 'text-slate-700',
    punctuation: 'text-muted-foreground',
    expandIcon: 'text-muted-foreground cursor-pointer',
    collapseIcon: 'text-muted-foreground cursor-pointer',
    noQuotesForStringValues: false
  }), [isDark])

  const headerClasses = isDark
    ? 'bg-card border-border'
    : 'bg-secondary/70 border-border'

  const contentClasses = isDark
    ? 'bg-background/95'
    : 'bg-white/90'

  function handleCopy(): void {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {/* Header bar */}
      <div className={cn('flex items-center justify-between px-3 py-2 border-b transition-colors', headerClasses)}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
            {title && <span className="font-mono font-medium">{title}</span>}
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-background/70"
          onClick={handleCopy}
          title="複製 JSON"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* JSON content */}
      {!collapsed && (
        <div className={cn('p-3 overflow-auto max-h-[500px] text-xs transition-colors', contentClasses)}>
          <JsonView
            data={data as object}
            shouldExpandNode={allExpanded}
            style={jsonTheme}
          />
        </div>
      )}
    </div>
  )
}
