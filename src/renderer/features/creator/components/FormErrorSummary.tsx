import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../../shared/components/ui/alert'
import type { FormErrorSummaryItem } from '../lib/formErrorSummary'

interface FormErrorSummaryProps {
  title: string
  description?: string
  items: FormErrorSummaryItem[]
}

export default function FormErrorSummary({
  title,
  description,
  items
}: FormErrorSummaryProps): React.JSX.Element | null {
  if (items.length === 0) return null

  function focusField(fieldId: string): void {
    const element = document.getElementById(fieldId)
    if (!(element instanceof HTMLElement)) return

    element.focus()
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        {description && <p>{description}</p>}
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={`${item.fieldId}-${item.message}`}>
              <button
                type="button"
                onClick={() => focusField(item.fieldId)}
                className="text-left text-sm underline decoration-destructive/50 underline-offset-2 hover:decoration-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {item.label}: {item.message}
              </button>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
