import type { ReactNode } from 'react'
import { Lightbulb, ListChecks } from 'lucide-react'
import { cn } from '../lib/utils'

interface FormGuideCardProps {
  title: string
  description?: string
  children?: ReactNode
  variant?: 'guide' | 'examples'
}

export default function FormGuideCard({
  title,
  description,
  children,
  variant = 'guide'
}: FormGuideCardProps): React.JSX.Element {
  const Icon = variant === 'examples' ? ListChecks : Lightbulb

  return (
    <div className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm ring-1 ring-border/30">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 rounded-lg p-1.5',
            variant === 'examples'
              ? 'bg-primary/10 text-primary'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide">{title}</p>
          {description && (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
          )}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  )
}
