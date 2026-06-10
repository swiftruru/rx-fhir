import { useRef } from 'react'
import { cn } from '../lib/utils'

/**
 * Lightweight editable JSON field with syntax highlighting — no external editor
 * dependency. A transparent <textarea> sits on top of a color-highlighted <pre>
 * overlay; the two share identical text metrics and scroll in sync, so the user
 * edits plain text while seeing tokens coloured.
 */

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// key (string before a colon) | string | keyword | number | punctuation
const TOKEN_RE = /(?<key>"(?:\\.|[^"\\])*")(?=\s*:)|(?<str>"(?:\\.|[^"\\])*")|(?<kw>\btrue\b|\bfalse\b|\bnull\b)|(?<num>-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(?<punct>[{}[\],:])/g

function highlightJson(src: string): string {
  let out = ''
  let last = 0
  for (const match of src.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0
    out += escapeHtml(src.slice(last, index))
    const groups = match.groups ?? {}
    const token = escapeHtml(match[0])
    if (groups.key) out += `<span class="text-rose-700 dark:text-rose-300">${token}</span>`
    else if (groups.str) out += `<span class="text-emerald-700 dark:text-emerald-300">${token}</span>`
    else if (groups.kw) out += `<span class="text-fuchsia-700 dark:text-fuchsia-300">${token}</span>`
    else if (groups.num) out += `<span class="text-amber-700 dark:text-amber-300">${token}</span>`
    else if (groups.punct) out += `<span class="text-muted-foreground">${token}</span>`
    else out += token
    last = index + match[0].length
  }
  out += escapeHtml(src.slice(last))
  return out
}

interface JsonCodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  'data-testid'?: string
}

// Identical text metrics on both layers keeps the caret aligned with the tokens.
const SHARED_TEXT = 'm-0 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]'

export default function JsonCodeEditor({
  value,
  onChange,
  placeholder,
  className,
  'data-testid': testId
}: JsonCodeEditorProps): React.JSX.Element {
  const preRef = useRef<HTMLPreElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function syncScroll(): void {
    if (!preRef.current || !textareaRef.current) return
    preRef.current.scrollTop = textareaRef.current.scrollTop
    preRef.current.scrollLeft = textareaRef.current.scrollLeft
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-background/70', className)}>
      <pre
        ref={preRef}
        aria-hidden="true"
        className={cn(SHARED_TEXT, 'pointer-events-none absolute inset-0 overflow-auto text-foreground')}
      >
        <code dangerouslySetInnerHTML={{ __html: `${highlightJson(value)}\n` }} />
      </pre>
      <textarea
        ref={textareaRef}
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          SHARED_TEXT,
          'relative h-full w-full resize-none bg-transparent text-transparent caret-foreground outline-none placeholder:text-muted-foreground'
        )}
      />
    </div>
  )
}
