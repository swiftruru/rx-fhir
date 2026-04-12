function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
const FHIR_DATE_TIME_PATTERN = /^\d{4}(?:-\d{2}(?:-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2}))?)?)?$/

function formatTimezoneOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  return `${sign}${pad2(hours)}:${pad2(minutes)}`
}

export function toDateTimeLocalValue(value?: string): string {
  if (!value) return ''

  const normalized = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)?.[1]
  if (normalized) return normalized

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
}

export function isValidFhirDateTime(value?: string): boolean {
  return Boolean(value && FHIR_DATE_TIME_PATTERN.test(value))
}

export function toFhirDateTime(value?: string): string {
  if (!value) return ''
  if (isValidFhirDateTime(value)) return value

  const localMatch = value.match(LOCAL_DATE_TIME_PATTERN)
  if (!localMatch) return value

  const [, year, month, day, hours, minutes, seconds = '00'] = localMatch
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  )

  if (Number.isNaN(localDate.getTime())) return value

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatTimezoneOffset(localDate)}`
}
