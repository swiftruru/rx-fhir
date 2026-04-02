export interface JsonSummaryRow {
  label: string
  value: string
}

export interface JsonSummaryResult {
  overview: JsonSummaryRow[]
  fields: JsonSummaryRow[]
  preview?: string
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

function truncate(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function formatPrimitive(value: string | number | boolean): string {
  return String(value)
}

function summarizeArray(value: unknown[], t: TranslateFn): string {
  if (value.length === 0) return t('jsonViewer.emptyValue')

  const firstPreview = summarizeValue(value[0], t)
  return firstPreview
    ? t('jsonViewer.arrayWithPreview', { count: value.length, preview: firstPreview })
    : t('jsonViewer.arrayItems', { count: value.length })
}

function summarizeObject(value: Record<string, unknown>, t: TranslateFn): string {
  if (typeof value.text === 'string' && value.text.trim()) {
    return value.text
  }

  if (typeof value.display === 'string' && value.display.trim()) {
    return value.display
  }

  if (typeof value.reference === 'string' && value.reference.trim()) {
    return value.reference
  }

  if (typeof value.url === 'string' && value.url.trim()) {
    return value.url
  }

  if (typeof value.value === 'string' || typeof value.value === 'number' || typeof value.value === 'boolean') {
    return formatPrimitive(value.value)
  }

  if (typeof value.code === 'string' && value.code.trim()) {
    return value.code
  }

  if (typeof value.id === 'string' && value.id.trim()) {
    return value.id
  }

  if (typeof value.family === 'string' || Array.isArray(value.given)) {
    const family = typeof value.family === 'string' ? value.family : ''
    const given = Array.isArray(value.given)
      ? value.given.filter((item): item is string => typeof item === 'string').join(' ')
      : ''
    const display = `${family} ${given}`.trim()
    if (display) return display
  }

  if (typeof value.valueQuantity === 'object' && value.valueQuantity) {
    const quantity = value.valueQuantity as { value?: string | number; unit?: string }
    if (quantity.value !== undefined) {
      return `${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`
    }
  }

  if (Array.isArray(value.identifier)) {
    const identifierPreview = summarizeValue(value.identifier[0], t)
    if (identifierPreview) return identifierPreview
  }

  if (Array.isArray(value.name)) {
    const namePreview = summarizeValue(value.name[0], t)
    if (namePreview) return namePreview
  }

  if (Array.isArray(value.coding)) {
    const codingPreview = summarizeValue(value.coding[0], t)
    if (codingPreview) return codingPreview
  }

  const keys = Object.keys(value)
  return t('jsonViewer.objectKeys', { count: keys.length })
}

export function summarizeValue(value: unknown, t: TranslateFn): string {
  if (value === null || value === undefined || value === '') {
    return t('jsonViewer.emptyValue')
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return truncate(formatPrimitive(value))
  }

  if (Array.isArray(value)) {
    return summarizeArray(value, t)
  }

  if (typeof value === 'object') {
    return summarizeObject(value as Record<string, unknown>, t)
  }

  return truncate(String(value))
}

function pushOverviewRow(
  rows: JsonSummaryRow[],
  label: string,
  rawValue: unknown,
  t: TranslateFn
): void {
  if (rawValue === undefined || rawValue === null || rawValue === '') return
  rows.push({ label, value: summarizeValue(rawValue, t) })
}

export function buildJsonSummary(data: unknown, t: TranslateFn): JsonSummaryResult {
  if (typeof data === 'string') {
    const lines = data.split(/\r?\n/).length
    return {
      overview: [
        { label: t('jsonViewer.characters'), value: t('jsonViewer.charactersCount', { count: data.length }) },
        { label: t('jsonViewer.lines'), value: t('jsonViewer.linesCount', { count: lines }) }
      ],
      fields: [],
      preview: truncate(data, 320)
    }
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return {
      overview: [{ label: t('jsonViewer.value'), value: formatPrimitive(data) }],
      fields: []
    }
  }

  if (Array.isArray(data)) {
    const fields = data.slice(0, 6).map((item, index) => ({
      label: `${t('jsonViewer.itemLabel')} ${index + 1}`,
      value: summarizeValue(item, t)
    }))

    return {
      overview: [{ label: t('jsonViewer.items'), value: t('jsonViewer.arrayItems', { count: data.length }) }],
      fields
    }
  }

  if (!data || typeof data !== 'object') {
    return { overview: [], fields: [] }
  }

  const objectData = data as Record<string, unknown>
  const overview: JsonSummaryRow[] = []

  pushOverviewRow(overview, t('jsonViewer.resourceType'), objectData.resourceType, t)
  pushOverviewRow(overview, t('jsonViewer.resourceId'), objectData.id, t)
  pushOverviewRow(
    overview,
    t('jsonViewer.primaryText'),
    objectData.title ?? objectData.name ?? objectData.text ?? objectData.display,
    t
  )
  pushOverviewRow(overview, t('jsonViewer.status'), objectData.status, t)
  pushOverviewRow(overview, t('jsonViewer.type'), objectData.type, t)
  pushOverviewRow(overview, t('jsonViewer.date'), objectData.date ?? objectData.startedAt ?? objectData.finishedAt, t)
  pushOverviewRow(overview, t('jsonViewer.items'), objectData.total, t)
  overview.push({
    label: t('jsonViewer.topLevelKeys'),
    value: t('jsonViewer.objectKeys', { count: Object.keys(objectData).length })
  })

  const consumedKeys = new Set([
    'resourceType',
    'id',
    'title',
    'name',
    'text',
    'display',
    'status',
    'type',
    'date',
    'startedAt',
    'finishedAt',
    'total'
  ])

  const fields = Object.entries(objectData)
    .filter(([key]) => !consumedKeys.has(key))
    .map(([key, value]) => ({
      label: key,
      value: summarizeValue(value, t)
    }))
    .slice(0, 10)

  return { overview, fields }
}
