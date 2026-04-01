import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface Props {
  url: string
  className?: string
  compact?: boolean
}

function isOpenableUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function openExternalUrl(url: string): Promise<void> {
  if (!isOpenableUrl(url)) return

  if (window.rxfhir?.openExternalUrl) {
    await window.rxfhir.openExternalUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function ExternalUrlLink({ url, className, compact = false }: Props): React.JSX.Element {
  if (!isOpenableUrl(url)) {
    return (
      <code className={cn(
        'block break-all font-mono',
        compact ? 'text-[10px] text-muted-foreground' : 'text-xs text-foreground',
        className
      )}>
        {url}
      </code>
    )
  }

  return (
    <Button
      type="button"
      variant="link"
      className={cn(
        'h-auto w-full max-w-full justify-start px-0 py-0 font-mono whitespace-normal',
        compact
          ? 'text-[10px] leading-4 text-muted-foreground'
          : 'text-xs leading-5 text-foreground',
        className
      )}
      onClick={() => { void openExternalUrl(url) }}
      title={url}
    >
      <span className="block w-full break-all whitespace-normal text-left">{url}</span>
    </Button>
  )
}
