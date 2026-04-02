import type { FieldValues, Path, FieldErrors } from 'react-hook-form'

export interface FormErrorSummaryDefinition<T extends FieldValues> {
  name: Path<T>
  fieldId: string
  label: string
}

export interface FormErrorSummaryItem {
  fieldId: string
  label: string
  message: string
}

export function buildFormErrorSummaryItems<T extends FieldValues>(
  errors: FieldErrors<T>,
  definitions: FormErrorSummaryDefinition<T>[]
): FormErrorSummaryItem[] {
  return definitions.flatMap((definition) => {
    const errorEntry = (errors as Record<string, { message?: unknown } | undefined>)[definition.name as string]
    const message = typeof errorEntry?.message === 'string' ? errorEntry.message : undefined

    if (!message) return []

    return [{
      fieldId: definition.fieldId,
      label: definition.label,
      message
    }]
  })
}
