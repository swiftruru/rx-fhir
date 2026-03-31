import { useState } from 'react'
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

  function handleCopy(): void {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
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
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={handleCopy}
          title="複製 JSON"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* JSON content */}
      {!collapsed && (
        <div className="bg-slate-900 p-3 overflow-auto max-h-[500px] text-xs">
          <JsonView
            data={data as object}
            shouldExpandNode={allExpanded}
            style={{
              ...defaultStyles,
              container: 'font-mono text-xs',
              basicChildStyle: 'ml-4',
              label: 'text-blue-300 mr-1',
              nullValue: 'text-gray-400',
              undefinedValue: 'text-gray-400',
              numberValue: 'text-orange-300',
              stringValue: 'text-green-300',
              booleanValue: 'text-purple-300',
              otherValue: 'text-slate-200',
              punctuation: 'text-slate-400',
              expandIcon: 'text-slate-400 cursor-pointer',
              collapseIcon: 'text-slate-400 cursor-pointer',
              noQuotesForStringValues: false
            }}
          />
        </div>
      )}
    </div>
  )
}
