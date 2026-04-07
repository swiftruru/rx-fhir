// Pure data-transformation helpers — no I/O, no React imports.
import QRCode from 'qrcode'

// ─── Postman Collection v2.1 ────────────────────────────────────────────────

interface PostmanVariable {
  key: string
  value: string
  type?: string
}

interface PostmanHeader {
  key: string
  value: string
}

interface PostmanRequest {
  method: string
  header: PostmanHeader[]
  body?: {
    mode: string
    raw: string
    options: { raw: { language: string } }
  }
  url: {
    raw: string
    host: string[]
    path: string[]
    query?: Array<{ key: string; value: string }>
  }
}

interface PostmanEvent {
  listen: 'test' | 'prerequest'
  script: { type: 'text/javascript'; exec: string[] }
}

interface PostmanItem {
  name: string
  event?: PostmanEvent[]
  request?: PostmanRequest
  item?: PostmanItem[]
}

interface PostmanCollection {
  info: {
    name: string
    schema: string
  }
  item: PostmanItem[]
  variable: PostmanVariable[]
}

function getResource<T extends fhir4.Resource>(bundle: fhir4.Bundle, type: string): T | undefined {
  return (bundle.entry ?? []).find((e) => e.resource?.resourceType === type)?.resource as T | undefined
}

function resourceLabel(resource: fhir4.Resource): string {
  const type = resource.resourceType
  const id = (resource as { id?: string }).id

  switch (type) {
    case 'Patient': {
      const p = resource as fhir4.Patient
      return `Patient — ${p.name?.[0]?.text ?? id ?? 'unknown'}`
    }
    case 'Practitioner': {
      const p = resource as fhir4.Practitioner
      return `Practitioner — ${p.name?.[0]?.text ?? id ?? 'unknown'}`
    }
    case 'Organization': {
      const o = resource as fhir4.Organization
      return `Organization — ${o.name ?? id ?? 'unknown'}`
    }
    case 'Encounter': {
      const e = resource as fhir4.Encounter
      const label = e.class?.display ?? e.type?.[0]?.coding?.[0]?.display ?? e.type?.[0]?.text ?? e.status
      return `Encounter — ${label ?? id ?? 'unknown'}`
    }
    case 'Condition': {
      const c = resource as fhir4.Condition
      const coding = c.code?.coding?.[0]
      const label = c.code?.text ?? (coding ? `${coding.code ?? ''} ${coding.display ?? ''}`.trim() : undefined)
      return `Condition — ${label ?? id ?? 'unknown'}`
    }
    case 'Observation': {
      const o = resource as fhir4.Observation
      const label = o.code?.text ?? o.code?.coding?.[0]?.display
      return `Observation — ${label ?? id ?? 'unknown'}`
    }
    case 'Coverage': {
      const c = resource as fhir4.Coverage
      const label = c.type?.text ?? c.type?.coding?.[0]?.display ?? c.subscriberId
      return `Coverage — ${label ?? id ?? 'unknown'}`
    }
    case 'Medication': {
      const m = resource as fhir4.Medication
      return `Medication — ${m.code?.text ?? m.code?.coding?.[0]?.display ?? id ?? 'unknown'}`
    }
    case 'MedicationRequest': {
      const m = resource as fhir4.MedicationRequest
      const med = (m.medicationCodeableConcept as fhir4.CodeableConcept | undefined)?.text
        ?? (m.medicationCodeableConcept as fhir4.CodeableConcept | undefined)?.coding?.[0]?.display
        ?? (m.medicationReference as fhir4.Reference | undefined)?.display
        ?? m.dosageInstruction?.[0]?.text
      return `MedicationRequest — ${med ?? id ?? 'unknown'}`
    }
    case 'Basic': {
      const b = resource as fhir4.Basic
      const label = b.code?.text ?? b.code?.coding?.[0]?.display
      return `Basic — ${label ?? id ?? 'unknown'}`
    }
    default:
      return `${type} — ${id ?? 'unknown'}`
  }
}

/**
 * Searches the FHIR server for a resource by its business identifier (or Medication.code).
 * Used as a fallback when a probe POST returns 201 instead of HAPI-2840, which happens for
 * resources like Patient/Organization/Practitioner that HAPI doesn't track via meta.source.
 */
async function searchByIdentifier(
  resource: fhir4.Resource,
  baseUrl: string
): Promise<string | undefined> {
  const type = resource.resourceType
  let url: string | undefined

  if (['Patient', 'Organization', 'Practitioner', 'Coverage', 'MedicationRequest'].includes(type)) {
    const withId = resource as { identifier?: Array<{ system?: string; value?: string }> }
    const id = withId.identifier?.[0]
    if (id?.value) {
      const q = id.system
        ? `${encodeURIComponent(id.system)}|${encodeURIComponent(id.value)}`
        : encodeURIComponent(id.value)
      url = `${baseUrl}/${type}?identifier=${q}&_count=1`
    }
  } else if (type === 'Medication') {
    const med = resource as fhir4.Medication
    const coding = med.code?.coding?.[0]
    if (coding?.code) {
      const q = coding.system
        ? `${encodeURIComponent(coding.system)}|${encodeURIComponent(coding.code)}`
        : encodeURIComponent(coding.code)
      url = `${baseUrl}/Medication?code=${q}&_count=1`
    }
  }

  if (!url) return undefined

  try {
    const resp = await fetch(url, { headers: { Accept: 'application/fhir+json' } })
    if (!resp.ok) return undefined
    const result = await resp.json() as { entry?: Array<{ resource?: { id?: string } }> }
    return result.entry?.[0]?.resource?.id
  } catch {
    return undefined
  }
}

/**
 * Searches Coverage or MedicationRequest resources by their patient reference.
 * Used as a second-pass fallback when identifier search is not applicable.
 */
async function searchByPatient(
  resource: fhir4.Resource,
  patientServerId: string,
  baseUrl: string
): Promise<string | undefined> {
  const type = resource.resourceType
  if (!['Coverage', 'MedicationRequest'].includes(type)) return undefined

  try {
    const url = `${baseUrl}/${type}?patient=Patient/${patientServerId}&_count=1`
    const resp = await fetch(url, { headers: { Accept: 'application/fhir+json' } })
    if (!resp.ok) return undefined
    const result = await resp.json() as { entry?: Array<{ resource?: { id?: string } }> }
    return result.entry?.[0]?.resource?.id
  } catch {
    return undefined
  }
}

/**
 * Probes the FHIR server to determine the correct HTTP method for a resource.
 *
 * Algorithm:
 *   POST /ResourceType with the resource body →
 *     412 HAPI-2840 → resource already exists (HAPI tracks via meta.source); extract server id → PUT
 *     201 Created   → HAPI did not detect as duplicate (no meta.source match);
 *                     clean up probe then do identifier search to confirm existence → PUT or POST
 *     other error   → unknown; fall back to POST (best effort)
 *
 * Note: HAPI-2840 only fires for resources that carry urn:uuid references (clinical resources like
 * Encounter/Condition/Observation). Demographic resources (Patient/Organization/Practitioner) and
 * pharmacy resources (Medication) do not have urn:uuid outgoing refs, so HAPI returns 201 for
 * probe POSTs — we then fall back to identifier/code search to find the existing server id.
 */
async function resolveHttpMethod(
  resource: fhir4.Resource,
  baseUrl: string,
  signal?: AbortSignal
): Promise<{ method: 'PUT' | 'POST'; serverId?: string }> {
  const base = baseUrl.replace(/\/+$/, '')
  const type = resource.resourceType

  try {
    const resp = await fetch(`${base}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
      body: JSON.stringify(resource),
      signal
    })

    console.log(`[RxFHIR Export] probe ${type}: HTTP ${resp.status}`)

    if (resp.status === 201) {
      // HAPI did not detect a duplicate — delete the probe resource, then fall back to search
      const created = await resp.json() as { id?: string }
      console.log(`[RxFHIR Export] probe ${type}: created probe ID=${created.id}, deleting...`)
      if (created.id) {
        await fetch(`${base}/${type}/${created.id}`, { method: 'DELETE' }).catch(() => {})
      }
      // fall through to identifier search below
    } else if (!resp.ok) {
      // Parse the HAPI-2840 response using the clean `diagnostics` field (no HTML) to avoid
      // greedy-regex issues with text.div HTML like </div> whose last "/" fools \S+\/.
      let serverId: string | undefined
      try {
        const outcome = await resp.json() as { issue?: Array<{ diagnostics?: string }> }
        const diag = outcome.issue?.[0]?.diagnostics ?? ''
        console.log(`[RxFHIR Export] probe ${type}: diagnostics="${diag}"`)
        // ResourceType is letters only; ID is alphanumeric+dash+dot
        const match = /duplicating existing resource:\s*[A-Za-z]+\/([A-Za-z0-9\-.]+)/.exec(diag)
        serverId = match?.[1]
      } catch {
        // Response was not JSON (unusual) — fall through to identifier search
      }
      console.log(`[RxFHIR Export] probe ${type}: extracted serverId=`, serverId)
      if (serverId) {
        return { method: 'PUT', serverId }
      }
      // Other errors (422 validation, 400, non-HAPI-2840 412) → fall through to identifier search
    }
    // Any other response (200 OK, or non-412 error) → fall through to identifier search
  } catch (err) {
    console.log(`[RxFHIR Export] probe ${type}: network error`, err)
    // network error — fall through to identifier search
  }

  // Universal fallback: search by business identifier / code.
  const existingId = await searchByIdentifier(resource, base)
  console.log(`[RxFHIR Export] identifier search ${type}: result=`, existingId)
  if (existingId) {
    return { method: 'PUT', serverId: existingId }
  }
  return { method: 'POST' }
}

/**
 * Builds Postman GET request items that mirror the Consumer page's three search modes
 * (Basic, Date, Complex), pre-filled with values extracted from the bundle.
 */
function buildQueryItems(bundle: fhir4.Bundle, _baseUrl: string, urlHost: string): PostmanItem[] {
  const patient = getResource<fhir4.Patient>(bundle, 'Patient')
  const composition = getResource<fhir4.Composition>(bundle, 'Composition')
  const organization = getResource<fhir4.Organization>(bundle, 'Organization')
  const practitioner = getResource<fhir4.Practitioner>(bundle, 'Practitioner')

  const identifier = patient?.identifier?.[0]?.value
  const date = composition?.date?.slice(0, 10)
  const orgId = organization?.identifier?.[0]?.value
  const authorName = practitioner?.name?.[0]?.text

  const items: PostmanItem[] = []

  function makeGetItem(
    label: string,
    params: Record<string, string>,
    testScript?: string[]
  ): PostmanItem {
    const qs = Object.entries(params)
    const rawUrl = `{{fhirBaseUrl}}/Bundle?${qs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
    const item: PostmanItem = {
      name: label,
      request: {
        method: 'GET',
        header: [{ key: 'Accept', value: 'application/fhir+json' }],
        url: {
          raw: rawUrl,
          host: [urlHost],
          path: ['Bundle'],
          query: qs.map(([key, value]) => ({ key, value }))
        }
      }
    }
    if (testScript && testScript.length > 0) {
      item.event = [{ listen: 'test', script: { type: 'text/javascript', exec: testScript } }]
    }
    return item
  }

  // Basic — by identifier
  if (identifier) {
    items.push(makeGetItem(
      `基本查詢 — 識別碼 (${identifier})`,
      { identifier },
      [
        `// Basic search by patient identifier`,
        `const body = pm.response.json();`,
        `const entries = (body.entry || []).map(e => e.resource).filter(Boolean);`,
        `pm.test('找到 ' + entries.length + ' 筆 Bundle（識別碼 ${identifier}）', () => {`,
        `    pm.expect(pm.response.code).to.equal(200);`,
        `});`,
        `console.log('Total bundles:', body.total);`
      ]
    ))
  }

  // Date search — fetch by identifier, filter client-side by Composition.date
  if (identifier && date) {
    items.push(makeGetItem(
      `日期查詢 — ${date}`,
      { identifier },
      [
        `// Date search: HAPI does not match Composition.date via ?timestamp=`,
        `// Fetch all bundles for patient, then filter by Composition.date prefix`,
        `const targetDate = '${date}';`,
        `const body = pm.response.json();`,
        `const matched = (body.entry || []).filter(e => {`,
        `    const comp = (e.resource?.entry || []).find(x => x.resource?.resourceType === 'Composition');`,
        `    return comp?.resource?.date?.startsWith(targetDate);`,
        `});`,
        `pm.test('日期查詢 ' + targetDate + '：找到 ' + matched.length + ' 筆', () => {`,
        `    pm.expect(pm.response.code).to.equal(200);`,
        `});`,
        `console.log('All bundles:', body.total, '| Matched date', targetDate + ':', matched.length);`,
        `matched.forEach((e, i) => console.log('  [' + i + ']', e.resource?.id, e.resource?.entry?.[0]?.resource?.date));`
      ]
    ))
  }

  // Complex — by organization identifier
  if (identifier && orgId) {
    items.push(makeGetItem(
      `複合查詢 — 機構 (${orgId})`,
      { identifier },
      [
        `// Complex org search: HAPI-1214 rejects composition.custodian:Organization.identifier chain`,
        `// Fetch all bundles for patient, then filter by Organization.identifier client-side`,
        `const targetOrg = '${orgId}';`,
        `const body = pm.response.json();`,
        `const matched = (body.entry || []).filter(e => {`,
        `    const entries = e.resource?.entry || [];`,
        `    return entries.some(x => {`,
        `        const r = x.resource;`,
        `        return r?.resourceType === 'Organization' &&`,
        `               (r.identifier || []).some(id => id.value === targetOrg);`,
        `    });`,
        `});`,
        `pm.test('複合查詢機構 ' + targetOrg + '：找到 ' + matched.length + ' 筆', () => {`,
        `    pm.expect(pm.response.code).to.equal(200);`,
        `});`,
        `console.log('All bundles:', body.total, '| Matched org', targetOrg + ':', matched.length);`
      ]
    ))
  }

  // Complex — by author (practitioner) name
  if (identifier && authorName) {
    items.push(makeGetItem(
      `複合查詢 — 醫師 (${authorName})`,
      { identifier },
      [
        `// Complex author search: HAPI ignores composition.author:Practitioner.name chain`,
        `// Fetch all bundles for patient, then filter by Practitioner name client-side`,
        `const targetName = '${authorName}';`,
        `const body = pm.response.json();`,
        `const matched = (body.entry || []).filter(e => {`,
        `    const entries = e.resource?.entry || [];`,
        `    return entries.some(x => {`,
        `        const r = x.resource;`,
        `        if (r?.resourceType !== 'Practitioner') return false;`,
        `        return (r.name || []).some(n =>`,
        `            (n.text || '').includes(targetName) ||`,
        `            ((n.family || '') + (n.given || []).join('')).includes(targetName)`,
        `        );`,
        `    });`,
        `});`,
        `pm.test('複合查詢醫師 ' + targetName + '：找到 ' + matched.length + ' 筆', () => {`,
        `    pm.expect(pm.response.code).to.equal(200);`,
        `});`,
        `console.log('All bundles:', body.total, '| Matched author', targetName + ':', matched.length);`
      ]
    ))
  }

  return items
}

/**
 * Builds a Postman Collection v2.1 from a FHIR Bundle.
 *
 * For each non-Composition resource, probes the FHIR server with a test POST to
 * determine whether the resource already exists (→ PUT) or is new (→ POST).
 * onProgress(checked, total) is called after each resource is resolved.
 */
export async function buildPostmanCollection(
  bundle: fhir4.Bundle,
  fhirBaseUrl: string,
  onProgress?: (checked: number, total: number) => void,
  signal?: AbortSignal
): Promise<PostmanCollection> {
  const allEntries = bundle.entry ?? []
  const patient = getResource<fhir4.Patient>(bundle, 'Patient')
  const composition = getResource<fhir4.Composition>(bundle, 'Composition')

  const patientName = patient?.name?.[0]?.text ?? 'Unknown'
  const date = composition?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  const collectionName = `RxFHIR — ${patientName} ${date}`

  const baseUrl = fhirBaseUrl.replace(/\/$/, '')
  const urlHost = baseUrl.replace(/^https?:\/\//, '')

  const targetEntries = allEntries.filter(
    (e) => e.resource && e.resource.resourceType !== 'Composition'
  )
  const resources = targetEntries.map((e) => e.resource as fhir4.Resource)

  const total = resources.length
  let checked = 0
  onProgress?.(0, total)

  const methodMap = new Map<fhir4.Resource, { method: 'PUT' | 'POST'; serverId?: string }>()

  // Step 0: Extract server IDs directly from bundle entry data (zero network calls).
  // HAPI may have set resource.id or updated entry.fullUrl from urn:uuid to server URLs
  // when processing the Document Bundle. Log findings so DevTools shows what HAPI provided.
  const needsResolution: fhir4.Resource[] = []
  for (let i = 0; i < targetEntries.length; i++) {
    const entry = targetEntries[i]
    const resource = resources[i]
    const type = resource.resourceType

    // Check resource.id (HAPI may have set it on stored bundle entries)
    const rid = resource.id
    if (rid && !rid.startsWith('urn:')) {
      console.log(`[RxFHIR Export] Step0 ${type}: resource.id=${rid} → PUT`)
      methodMap.set(resource, { method: 'PUT', serverId: rid })
      checked += 1
      onProgress?.(checked, total)
      continue
    }

    // Check entry.fullUrl (HAPI may have updated from urn:uuid to server URL)
    const fullUrl = entry.fullUrl ?? ''
    console.log(`[RxFHIR Export] Step0 ${type}: resource.id=${rid ?? 'none'}, fullUrl=${fullUrl}`)
    if (/^https?:\/\//.test(fullUrl)) {
      const parts = fullUrl.replace(/\/$/, '').split('/')
      const id = parts[parts.length - 1]
      if (id && /^[A-Za-z0-9\-.]+$/.test(id) && parts.length >= 2) {
        console.log(`[RxFHIR Export] Step0 ${type}: fullUrl id=${id} → PUT`)
        methodMap.set(resource, { method: 'PUT', serverId: id })
        checked += 1
        onProgress?.(checked, total)
        continue
      }
    }

    needsResolution.push(resource)
  }

  // Step 1: Probe resources sequentially to avoid HAPI 429 rate limiting.
  for (const resource of needsResolution) {
    signal?.throwIfAborted()
    const result = await resolveHttpMethod(resource, baseUrl, signal)
    methodMap.set(resource, result)
    checked += 1
    onProgress?.(checked, total)
  }

  // Step 2: Coverage / MedicationRequest that are still POST may lack identifiers.
  // If Patient was resolved to PUT, use its server id for a patient-scoped search.
  const patientResource = resources.find((r) => r.resourceType === 'Patient')
  const patientServerId = patientResource ? methodMap.get(patientResource)?.serverId : undefined
  if (patientServerId) {
    const unresolved = resources.filter(
      (r) =>
        ['Coverage', 'MedicationRequest'].includes(r.resourceType) &&
        methodMap.get(r)?.method === 'POST'
    )
    if (unresolved.length > 0) {
      await Promise.all(
        unresolved.map(async (resource) => {
          const existingId = await searchByPatient(resource, patientServerId, baseUrl)
          if (existingId) {
            methodMap.set(resource, { method: 'PUT', serverId: existingId })
          }
        })
      )
    }
  }

  const items: PostmanItem[] = []

  for (const resource of resources) {
    const label = resourceLabel(resource)
    const resourceType = resource.resourceType
    const { method, serverId } = methodMap.get(resource)!

    const rawUrl = serverId
      ? `{{fhirBaseUrl}}/${resourceType}/${serverId}`
      : `{{fhirBaseUrl}}/${resourceType}`
    const pathSegments = serverId ? [resourceType, serverId] : [resourceType]

    // PUT requires the body to contain an id field matching the URL
    const bodyResource = serverId ? { ...resource, id: serverId } : resource

    items.push({
      name: `${serverId ? '✏️' : '➕'} ${label}`,
      request: {
        method,
        header: [
          { key: 'Content-Type', value: 'application/fhir+json' },
          { key: 'Accept', value: 'application/fhir+json' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify(bodyResource, null, 2),
          options: { raw: { language: 'json' } }
        },
        url: {
          raw: rawUrl,
          host: [urlHost],
          path: pathSegments
        }
      }
    })
  }

  // Query folder: mirrors the Consumer page search modes
  const queryItems = buildQueryItems(bundle, baseUrl, urlHost)
  if (queryItems.length > 0) {
    items.push({ name: '🔍 Queries', item: queryItems })
  }

  // Final item: POST the entire Bundle document
  items.push({
    name: `Bundle — POST document (${bundle.id ?? 'full'})`,
    request: {
      method: 'POST',
      header: [
        { key: 'Content-Type', value: 'application/fhir+json' },
        { key: 'Accept', value: 'application/fhir+json' }
      ],
      body: {
        mode: 'raw',
        raw: JSON.stringify(bundle, null, 2),
        options: { raw: { language: 'json' } }
      },
      url: {
        raw: `{{fhirBaseUrl}}/Bundle`,
        host: [urlHost],
        path: ['Bundle']
      }
    }
  })

  return {
    info: {
      name: collectionName,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: items,
    variable: [
      { key: 'fhirBaseUrl', value: baseUrl, type: 'string' }
    ]
  }
}

// ─── HTML Report ─────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<string, string>> = {
  'zh-TW': {
    title: '電子處方箋報告',
    bundleId: 'Bundle ID',
    generatedAt: '產生時間',
    prescription: '處方箋資訊',
    docTitle: '標題',
    date: '日期',
    status: '狀態',
    patient: '病人資料',
    name: '姓名',
    identifier: '識別碼',
    gender: '性別',
    birthDate: '出生日期',
    practitioner: '醫師資料',
    licenseNumber: '證號',
    qualification: '專科',
    organization: '醫事機構',
    orgName: '名稱',
    orgIdentifier: '代碼',
    orgType: '類型',
    encounter: '就診資料',
    encounterType: '類型',
    encounterStart: '開始時間',
    encounterEnd: '結束時間',
    encounterStatus: '狀態',
    condition: '診斷',
    clinicalStatus: '臨床狀態',
    observation: '檢驗檢查',
    observationItem: '項目',
    observationResult: '結果',
    observationStatus: '狀態',
    coverage: '保險資訊',
    coverageType: '類型',
    insuranceId: '保險號',
    effectiveDate: '生效日',
    medicationAndRequest: '藥品與用藥',
    medicationName: '藥品名稱',
    medicationCode: '藥品代碼',
    form: '劑型',
    dose: '劑量說明',
    route: '給藥途徑',
    footer: '由 RxFHIR 產生',
    navLabel: '目錄',
    code: '代碼',
    unit: '單位',
    value: '數值',
  },
  'en': {
    title: 'Electronic Prescription Report',
    bundleId: 'Bundle ID',
    generatedAt: 'Generated At',
    prescription: 'Prescription Info',
    docTitle: 'Title',
    date: 'Date',
    status: 'Status',
    patient: 'Patient Info',
    name: 'Name',
    identifier: 'Identifier',
    gender: 'Gender',
    birthDate: 'Birth Date',
    practitioner: 'Practitioner',
    licenseNumber: 'License No.',
    qualification: 'Qualification',
    organization: 'Organization',
    orgName: 'Name',
    orgIdentifier: 'ID',
    orgType: 'Type',
    encounter: 'Encounter',
    encounterType: 'Type',
    encounterStart: 'Start',
    encounterEnd: 'End',
    encounterStatus: 'Status',
    condition: 'Condition',
    clinicalStatus: 'Clinical Status',
    observation: 'Observation',
    observationItem: 'Item',
    observationResult: 'Result',
    observationStatus: 'Status',
    coverage: 'Coverage',
    coverageType: 'Type',
    insuranceId: 'Subscriber ID',
    effectiveDate: 'Effective Date',
    medicationAndRequest: 'Medication & Request',
    medicationName: 'Medication',
    medicationCode: 'Code',
    form: 'Form',
    dose: 'Dosage',
    route: 'Route',
    footer: 'Generated by RxFHIR',
    navLabel: 'Contents',
    code: 'Code',
    unit: 'Unit',
    value: 'Value',
  }
}

function getLabels(locale: string): Record<string, string> {
  if (locale.startsWith('zh')) return LABELS['zh-TW']
  return LABELS['en']
}

function field(label: string, value?: string | null, copyable = false): string {
  if (!value) return ''
  const esc = escHtml(value)
  const inner = copyable
    ? `<span class="value copyable" data-copy="${esc}" title="點擊複製">${esc}<span class="copy-icon">⎘</span></span>`
    : `<span class="value">${esc}</span>`
  return `<div class="field"><span class="label">${label}</span>${inner}</div>`
}

/** Recursively render a JSON value as a collapsible HTML tree (zero JS — uses native <details>).
 *  depth controls how many levels are open by default (0 = first level open). */
function buildJsonTree(value: unknown, depth: number): string {
  if (value === null) return `<span class="jnl">null</span>`
  if (typeof value === 'boolean') return `<span class="jb">${escHtml(String(value))}</span>`
  if (typeof value === 'number') return `<span class="jn">${escHtml(String(value))}</span>`
  if (typeof value === 'string') return `<span class="js">&quot;${escHtml(value)}&quot;</span>`

  const openAttr = depth < 1 ? ' open' : ''

  if (Array.isArray(value)) {
    if (value.length === 0) return `<span class="jp">[ ]</span>`
    const rows = value.map((item, i) => {
      const idx = `<span class="ji">[${i}]</span>`
      if (item === null || typeof item !== 'object') {
        return `<div class="jt-row">${idx}: ${buildJsonTree(item, depth + 1)}</div>`
      }
      const hint = Array.isArray(item)
        ? `<span class="jt-hint">[ ${(item as unknown[]).length} ]</span>`
        : `<span class="jt-hint">{ ${Object.keys(item as object).length} }</span>`
      return `<div class="jt-row"><details${openAttr} class="jt-node"><summary>${idx} ${hint}</summary><div class="jt-ch">${buildJsonTree(item, depth + 1)}</div></details></div>`
    }).join('')
    return rows
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => {
      const key = `<span class="jk">&quot;${escHtml(k)}&quot;</span>`
      if (v === null || typeof v !== 'object') {
        return `<div class="jt-row">${key}: ${buildJsonTree(v, depth + 1)}</div>`
      }
      const hint = Array.isArray(v)
        ? `<span class="jt-hint">[ ${(v as unknown[]).length} ]</span>`
        : `<span class="jt-hint">{ ${Object.keys(v as object).length} }</span>`
      return `<div class="jt-row"><details${openAttr} class="jt-node"><summary>${key}: ${hint}</summary><div class="jt-ch">${buildJsonTree(v, depth + 1)}</div></details></div>`
    }).join('')
  }

  return escHtml(String(value))
}

interface TimelineEvent {
  isoDate: string
  displayDate: string
  icon: string
  label: string
  sub: string
  anchor: string
}

/** Build a clinical timeline from bundle resources, sorted by date. */
function buildTimeline(events: TimelineEvent[], isZh: boolean): string {
  if (events.length === 0) return ''
  const title = isZh ? '臨床時間軸' : 'Clinical Timeline'
  const rows = events.map((ev, i) => {
    const isLast = i === events.length - 1
    return `<div class="tl-row">
      <div class="tl-left">
        <div class="tl-date">${escHtml(ev.displayDate)}</div>
      </div>
      <div class="tl-mid">
        <div class="tl-dot">${ev.icon}</div>
        ${isLast ? '' : '<div class="tl-line"></div>'}
      </div>
      <div class="tl-right">
        <a class="tl-label" href="#${ev.anchor}">${escHtml(ev.label)}</a>
        ${ev.sub ? `<div class="tl-sub">${escHtml(ev.sub)}</div>` : ''}
      </div>
    </div>`
  }).join('')
  return `<div class="tl-card">
    <div class="tl-title">${escHtml(title)}</div>
    <div class="tl-body">${rows}</div>
  </div>`
}

/** Generate a QR code SVG string synchronously for embedding in HTML.
 *  Returns an empty string if the value is empty. */
function generateQrSvg(value: string): string {
  if (!value) return ''
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
    const size = qr.modules.size
    const data = qr.modules.data
    const cellSize = 6
    const margin = 16
    const dim = size * cellSize + margin * 2
    const rects: string[] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data[r * size + c]) {
          rects.push(`<rect x="${margin + c * cellSize}" y="${margin + r * cellSize}" width="${cellSize}" height="${cellSize}"/>`)
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" class="qr-svg">`
      + `<rect width="${dim}" height="${dim}" fill="white"/>`
      + `<g fill="black">${rects.join('')}</g>`
      + `</svg>`
  } catch {
    return ''
  }
}

function buildJsonDetail(resourceType: string, resource: object): string {
  const plain = JSON.stringify(resource, null, 2)
  const tree = buildJsonTree(resource, 0)
  return `<details class="json-detail">
    <summary>JSON <span class="resource-type">${escHtml(resourceType)}</span></summary>
    <div class="json-block" data-plain="${escHtml(plain)}">
      <div class="jb-toolbar">
        <button class="expand-btn"></button>
        <button class="collapse-btn"></button>
        <input class="jb-search" type="search" placeholder="" />
        <span class="jb-search-count"></span>
        <button class="copy-btn">複製</button>
      </div>
      <div class="jtree">${tree}</div>
    </div>
  </details>`
}

function section(title: string, content: string, icon?: string, rawResource?: fhir4.Resource): string {
  if (!content.trim()) return ''
  const iconHtml = icon ? `<span class="section-icon">${icon}</span>` : ''
  const jsonDetail = rawResource ? buildJsonDetail(rawResource.resourceType, rawResource) : ''
  return `<section><h2>${iconHtml}${escHtml(title)}</h2>${content}${jsonDetail}</section>`
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Format a FHIR date/dateTime string into a human-readable locale string.
 *  Handles both date-only (YYYY-MM-DD) and full ISO 8601 dateTime strings. */
function formatFhirDate(value: string | undefined | null, locale: string): string | undefined {
  if (!value) return undefined
  try {
    const isZh = locale.startsWith('zh')
    const localeTag = isZh ? 'zh-TW' : 'en-US'
    // Date-only: no time component
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number)
      const dt = new Date(y, m - 1, d)
      return dt.toLocaleDateString(localeTag, { year: 'numeric', month: 'long', day: 'numeric' })
    }
    // Full dateTime
    const dt = new Date(value)
    if (isNaN(dt.getTime())) return value
    return dt.toLocaleString(localeTag, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return value
  }
}


export function buildPrescriptionHtml(bundle: fhir4.Bundle, locale: string): string {
  const L = getLabels(locale)
  const entries = bundle.entry ?? []
  const isZh = locale.startsWith('zh')

  const find = <T extends fhir4.Resource>(type: string): T | undefined =>
    entries.find((e) => e.resource?.resourceType === type)?.resource as T | undefined
  const findAll = <T extends fhir4.Resource>(type: string): T[] =>
    entries.filter((e) => e.resource?.resourceType === type).map((e) => e.resource as T)

  const fdate = (v?: string | null) => formatFhirDate(v, locale) ?? v ?? undefined
  // Date-only variant for contexts where time detail is unnecessary (e.g. timeline)
  const fdateOnly = (v?: string | null): string | undefined => {
    if (!v) return undefined
    const datePart = v.split('T')[0]
    return formatFhirDate(datePart, locale) ?? datePart
  }

  const composition = find<fhir4.Composition>('Composition')
  const patient = find<fhir4.Patient>('Patient')
  const practitioner = find<fhir4.Practitioner>('Practitioner')
  const organization = find<fhir4.Organization>('Organization')
  const encounter = find<fhir4.Encounter>('Encounter')
  const coverage = find<fhir4.Coverage>('Coverage')
  const conditions = findAll<fhir4.Condition>('Condition')
  const observations = findAll<fhir4.Observation>('Observation')
  const medications = findAll<fhir4.Medication>('Medication')
  const medicationRequests = findAll<fhir4.MedicationRequest>('MedicationRequest')

  const patientName = patient?.name?.[0]?.text ?? ''
  const prescriptionDate = composition?.date?.slice(0, 10) ?? ''
  const printLabel = isZh ? '列印' : 'Print'
  const bundleJsonLabel = isZh ? '原始 FHIR Bundle JSON' : 'Raw FHIR Bundle JSON'
  const copyFullLabel = isZh ? '複製完整 JSON' : 'Copy Full JSON'
  const darkToggleLabel = isZh ? '深色' : 'Dark'
  const lightToggleLabel = isZh ? '淺色' : 'Light'
  const dosageLabel = isZh ? '用藥指示' : 'Dosage Instructions'

  // Hero summary card
  const medCount = medicationRequests.length
  const firstCondition = conditions[0]
  const conditionDisplay = firstCondition?.code?.coding?.[0]?.display ?? firstCondition?.code?.text ?? ''
  const conditionCode = firstCondition?.code?.coding?.[0]?.code ?? ''
  const heroPatientMeta = [
    patient?.identifier?.[0]?.value,
    isZh
      ? (patient?.gender === 'female' ? '女' : patient?.gender === 'male' ? '男' : patient?.gender)
      : patient?.gender,
    fdate(patient?.birthDate),
  ].filter(Boolean).join('  ·  ')
  const heroPills = [
    practitioner?.name?.[0]?.text ? `🩺 ${practitioner.name[0].text}` : '',
    organization?.name ? `🏥 ${organization.name}` : '',
    prescriptionDate ? `📅 ${prescriptionDate}` : '',
    conditionDisplay ? `🔍 ${conditionDisplay}${conditionCode ? ` (${conditionCode})` : ''}` : '',
    medCount > 0 ? `💊 ${medCount} ${isZh ? '種藥品' : 'medication(s)'}` : '',
  ].filter(Boolean)

  // Bundle metadata bar (between header and hero)
  const bundleVersion = bundle.meta?.versionId ?? ''
  const bundleLastUpdated = fdate(bundle.meta?.lastUpdated)
  const bundleProfile = (bundle.meta?.profile?.[0] ?? '').split('/').pop() ?? ''
  const bundleType = bundle.type ?? ''
  const metaItems = [
    bundle.id ? { label: isZh ? 'Bundle ID' : 'Bundle ID', value: bundle.id, copyable: true } : null,
    bundleVersion ? { label: isZh ? '版本' : 'Version', value: bundleVersion, copyable: false } : null,
    bundleLastUpdated ? { label: isZh ? '提交時間' : 'Submitted', value: bundleLastUpdated, copyable: false } : null,
    bundleProfile ? { label: isZh ? 'Profile' : 'Profile', value: bundleProfile, copyable: false } : null,
    bundleType ? { label: isZh ? '類型' : 'Type', value: bundleType, copyable: false } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null)

  const metaBarHtml = metaItems.length > 0 ? `<div class="meta-bar">
    ${metaItems.map((item) => {
      const esc = escHtml(item.value)
      const valHtml = item.copyable
        ? `<span class="value copyable" data-copy="${esc}" title="${isZh ? '點擊複製' : 'Click to copy'}">${esc}<span class="copy-icon">⎘</span></span>`
        : `<span class="meta-val">${esc}</span>`
      return `<span class="meta-item"><span class="meta-label">${escHtml(item.label)}</span>${valHtml}</span>`
    }).join('<span class="meta-sep">·</span>')}
  </div>` : ''

  // Document status banner + attestation
  const statusBannerHtml = (() => {
    const status = composition?.status
    if (!status) return ''
    type StatusKey = 'final' | 'draft' | 'amended' | 'entered-in-error' | 'preliminary'
    const statusMeta: Record<StatusKey, { cls: string; icon: string; zh: string; en: string }> = {
      'final':           { cls: 'status-final',   icon: '✓', zh: '正式文件',   en: 'Final' },
      'amended':         { cls: 'status-amended',  icon: '✎', zh: '已修訂',     en: 'Amended' },
      'draft':           { cls: 'status-draft',    icon: '⚠', zh: '草稿',       en: 'Draft' },
      'preliminary':     { cls: 'status-draft',    icon: '⚠', zh: '初稿',       en: 'Preliminary' },
      'entered-in-error':{ cls: 'status-error',    icon: '✕', zh: '已作廢',     en: 'Entered in Error' },
    }
    const meta = statusMeta[status as StatusKey] ?? { cls: 'status-draft', icon: '•', zh: status, en: status }
    const label = isZh ? meta.zh : meta.en
    // Attester info
    const attester = composition?.attester?.[0]
    const attesterName = (attester?.party as { display?: string } | undefined)?.display ?? ''
    const attesterTime = attester?.time ? fdate(attester.time) : ''
    const attesterHtml = attesterName
      ? `<span class="status-attester">${isZh ? '簽署人' : 'Signed by'}: ${escHtml(attesterName)}${attesterTime ? '&nbsp;·&nbsp;' + escHtml(attesterTime) : ''}</span>`
      : ''
    return `<div class="status-banner ${meta.cls}">
      <span class="status-icon">${meta.icon}</span>
      <span class="status-label">${escHtml(label)}</span>
      ${attesterHtml}
    </div>`
  })()

  // QR code — encodes patient identifier for mobile scanning
  const qrValue = patient?.identifier?.[0]?.value ?? ''
  const qrSvg = generateQrSvg(qrValue)
  const qrHtml = qrSvg
    ? `<div class="qr-wrap" title="${isZh ? '點擊放大' : 'Click to enlarge'}" onclick="document.getElementById('qr-modal').showModal()">
        ${qrSvg}
        <p class="qr-label">${escHtml(qrValue)}</p>
      </div>
      <dialog id="qr-modal" onclick="this.close()" style="border:none;background:transparent;padding:0">
        <div style="background:white;border-radius:16px;padding:1.5rem;text-align:center;cursor:pointer">
          ${generateQrSvg(qrValue).replace('class="qr-svg"', 'width="240" height="240"')}
          <p style="margin-top:0.75rem;font-size:0.9rem;font-family:monospace;color:#2d1a1f">${escHtml(qrValue)}</p>
        </div>
      </dialog>`
    : ''

  // Clinical timeline
  const tlEvents: TimelineEvent[] = []
  const addTlEvent = (isoDate: string | undefined | null, icon: string, label: string, sub: string, anchor: string) => {
    if (!isoDate) return
    tlEvents.push({ isoDate, displayDate: fdateOnly(isoDate) ?? isoDate, icon, label, sub, anchor })
  }
  addTlEvent(encounter?.period?.start, '📅', isZh ? '就診' : 'Encounter', encounter?.class?.display ?? '', 'sec-encounter')
  addTlEvent(composition?.date, '📋', isZh ? '處方箋開立' : 'Prescription', composition?.title ?? '', 'sec-prescription')
  conditions.forEach((c) => {
    const display = c.code?.coding?.[0]?.display ?? c.code?.text ?? ''
    const code = c.code?.coding?.[0]?.code ?? ''
    addTlEvent(
      c.recordedDate ?? encounter?.period?.start ?? composition?.date,
      '🔍', isZh ? '診斷' : 'Diagnosis',
      display + (code ? ` (${code})` : ''), 'sec-condition'
    )
  })
  observations.forEach((o) => {
    const item = o.code?.text ?? o.code?.coding?.[0]?.display ?? ''
    const val = o.valueQuantity != null ? `${o.valueQuantity.value} ${o.valueQuantity.unit ?? ''}` : (o.valueString ?? '')
    addTlEvent(o.effectiveDateTime ?? encounter?.period?.start ?? composition?.date, '🔬', isZh ? '檢驗' : 'Observation', `${item}${val ? '：' + val : ''}`, 'sec-observation')
  })
  if (medicationRequests.length > 0) {
    addTlEvent(
      medicationRequests[0].authoredOn ?? composition?.date,
      '💊', isZh ? `藥品 ×${medicationRequests.length}` : `Medication ×${medicationRequests.length}`,
      medications[0]?.code?.text ?? '', 'sec-medication'
    )
  }
  // Sort by ISO date, deduplicate consecutive same-anchor entries
  tlEvents.sort((a, b) => a.isoDate.localeCompare(b.isoDate))
  const seen = new Set<string>()
  const uniqueTlEvents = tlEvents.filter((e) => {
    const key = `${e.isoDate}-${e.anchor}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const timelineHtml = buildTimeline(uniqueTlEvents, isZh)

  const heroHtml = `<div class="hero" id="sec-top">
    <div class="hero-main">
      <div class="hero-text">
        <div class="hero-name">${escHtml(patientName || '—')}</div>
        ${heroPatientMeta ? `<div class="hero-meta">${escHtml(heroPatientMeta)}</div>` : ''}
        <div class="hero-pills">
          ${heroPills.map((p) => `<span class="hero-pill">${escHtml(p)}</span>`).join('')}
        </div>
      </div>
      ${qrHtml ? `<div class="hero-qr">${qrHtml}</div>` : ''}
    </div>
  </div>`

  // Conditions — multi-row badges table
  const conditionSection = (() => {
    if (conditions.length === 0) return ''
    const rows = conditions.map((c, i) => {
      const badges = (c.code?.coding ?? [])
        .map((cd) => `<span class="badge">${escHtml(`${cd.code ?? ''} — ${cd.display ?? ''}`)}</span>`)
        .join('')
      const status = c.clinicalStatus?.coding?.[0]?.code ?? ''
      return `<div class="multi-row">
        <div class="multi-idx">${i + 1}</div>
        <div class="multi-body">
          ${badges ? `<div class="badges">${badges}</div>` : ''}
          ${status ? `<div class="multi-status">${escHtml(status)}</div>` : ''}
          ${buildJsonDetail('Condition', c)}
        </div>
      </div>`
    }).join('')
    return section(L.condition, rows, '🔍')
  })()

  // Observations — multi-row table with lab value indicators
  const observationSection = (() => {
    if (observations.length === 0) return ''
    const refLabel   = isZh ? '參考範圍' : 'Ref range'
    const statusNormal = isZh ? '正常' : 'Normal'
    const statusHigh   = isZh ? '偏高' : 'High'
    const statusLow    = isZh ? '偏低' : 'Low'
    const thead = `<tr>
      <th>${escHtml(L.observationItem)}</th>
      <th>${escHtml(L.value)}</th>
      <th>${escHtml(L.unit)}</th>
      <th>${escHtml(refLabel)}</th>
      <th>${escHtml(L.observationStatus)}</th>
    </tr>`
    const trows = observations.map((o) => {
      const numVal = o.valueQuantity?.value
      const val  = numVal != null ? String(numVal) : (o.valueString ?? '')
      const unit = o.valueQuantity?.unit ?? ''
      const rr   = o.referenceRange?.[0]
      const rrLow  = rr?.low?.value
      const rrHigh = rr?.high?.value
      const rrText = rr?.text ?? (rrLow != null || rrHigh != null
        ? `${rrLow ?? ''}–${rrHigh ?? ''}`
        : '')
      let labBadge = ''
      if (numVal != null && (rrLow != null || rrHigh != null)) {
        if (rrHigh != null && numVal > rrHigh) {
          labBadge = `<span class="lab-badge lab-high">${escHtml(statusHigh)} ↑</span>`
        } else if (rrLow != null && numVal < rrLow) {
          labBadge = `<span class="lab-badge lab-low">${escHtml(statusLow)} ↓</span>`
        } else {
          labBadge = `<span class="lab-badge lab-normal">${escHtml(statusNormal)} ✓</span>`
        }
      }
      return `<tr>
        <td>${escHtml(o.code?.text ?? o.code?.coding?.[0]?.display ?? '')}</td>
        <td>${escHtml(val)}${labBadge ? ' ' + labBadge : ''}</td>
        <td>${escHtml(unit)}</td>
        <td>${escHtml(rrText)}</td>
        <td>${escHtml(o.status ?? '')}</td>
      </tr>`
    }).join('')
    const jsonDetails = observations.map((o, i) =>
      observations.length > 1
        ? buildJsonDetail(`Observation[${i}]`, o)
        : buildJsonDetail('Observation', o)
    ).join('')
    return section(L.observation, `<table class="data-table"><thead>${thead}</thead><tbody>${trows}</tbody></table>${jsonDetails}`, '🔬')
  })()

  // Medications — quick-reference summary table + detail cards
  const medicationSection = (() => {
    if (medicationRequests.length === 0 && medications.length === 0) return ''
    // Column headers
    const colNum    = '#'
    const colName   = isZh ? '藥品名稱' : 'Medication'
    const colDose   = isZh ? '劑量 / 用法' : 'Dose / Instructions'
    const colRoute  = isZh ? '途徑' : 'Route'
    const colSupply = isZh ? '數量' : 'Supply'
    const summaryRows = medicationRequests.map((mr, i) => {
      const med      = medications[i] ?? medications[0]
      const medName  = med?.code?.text ?? mr.medicationCodeableConcept?.text ?? ''
      const medCode  = med?.code?.coding?.[0]?.code ?? ''
      const doseText = mr.dosageInstruction?.[0]?.text ?? ''
      const route    = mr.dosageInstruction?.[0]?.route?.coding?.[0]?.display ?? mr.dosageInstruction?.[0]?.route?.text ?? ''
      const qty      = mr.dispenseRequest?.quantity
      const supply   = qty?.value != null ? `${qty.value}${qty.unit ? ' ' + qty.unit : ''}` : ''
      return `<tr>
        <td><span class="med-idx" style="display:inline-flex">${i + 1}</span></td>
        <td><strong>${escHtml(medName)}</strong>${medCode ? ` <span class="badge">${escHtml(medCode)}</span>` : ''}</td>
        <td>${escHtml(doseText || '—')}</td>
        <td>${escHtml(route || '—')}</td>
        <td>${escHtml(supply || '—')}</td>
      </tr>`
    }).join('')
    const summaryTable = medicationRequests.length > 0 ? `
      <table class="data-table med-summary-table">
        <thead><tr>
          <th>${escHtml(colNum)}</th>
          <th>${escHtml(colName)}</th>
          <th>${escHtml(colDose)}</th>
          <th>${escHtml(colRoute)}</th>
          <th>${escHtml(colSupply)}</th>
        </tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
      <hr class="med-divider" style="margin:0.75rem 0" />` : ''
    const cards = medicationRequests.map((mr, i) => {
      const med = medications[i] ?? medications[0]
      const medName = med?.code?.text ?? mr.medicationCodeableConcept?.text ?? ''
      const medCode = med?.code?.coding?.[0]?.code ?? ''
      const medForm = med?.form?.text ?? ''
      const doseText = mr.dosageInstruction?.[0]?.text ?? ''
      const routeText = mr.dosageInstruction?.[0]?.route?.coding?.[0]?.display ?? mr.dosageInstruction?.[0]?.route?.text ?? ''
      const cardJson = med ? buildJsonDetail(`Medication[${i}]`, med) + buildJsonDetail(`MedicationRequest[${i}]`, mr) : buildJsonDetail(`MedicationRequest[${i}]`, mr)
      return `<div class="med-card">
        <div class="med-header">
          <span class="med-idx">${i + 1}</span>
          <span class="med-name">${escHtml(medName)}</span>
          ${medCode ? `<span class="badge">${escHtml(medCode)}</span>` : ''}
        </div>
        ${medForm ? field(L.form, medForm) : ''}
        ${doseText || routeText ? `<hr class="med-divider" /><p class="dosage-label">${escHtml(dosageLabel)}</p>` : ''}
        ${doseText ? `<p class="dosage-text">${escHtml(doseText)}</p>` : ''}
        ${routeText ? field(L.route, routeText) : ''}
        ${cardJson}
      </div>`
    }).join('')
    return section(L.medicationAndRequest, summaryTable + cards, '💊')
  })()

  // Navigation items for anchor links
  interface NavItem { id: string; icon: string; label: string; count?: number }
  const navItems: NavItem[] = [
    { id: 'sec-prescription', icon: '📋', label: L.prescription },
    { id: 'sec-patient',      icon: '👤', label: L.patient },
    { id: 'sec-practitioner', icon: '🩺', label: L.practitioner },
    { id: 'sec-organization', icon: '🏥', label: L.organization },
    { id: 'sec-encounter',    icon: '📅', label: L.encounter },
    ...(conditions.length > 0    ? [{ id: 'sec-condition',   icon: '🔍', label: L.condition,           count: conditions.length }]    : []),
    ...(observations.length > 0  ? [{ id: 'sec-observation', icon: '🔬', label: L.observation,         count: observations.length }]  : []),
    ...(coverage                  ? [{ id: 'sec-coverage',    icon: '🏷️', label: L.coverage }]                                        : []),
    ...(medicationRequests.length > 0 ? [{ id: 'sec-medication', icon: '💊', label: L.medicationAndRequest, count: medicationRequests.length }] : []),
  ]
  const navHtml = `<details class="nav-details" id="nav-menu">
    <summary class="nav-btn">📋 ${escHtml(L.navLabel)}</summary>
    <div class="nav-dropdown">
      ${navItems.map((item) =>
        `<a class="nav-item" href="#${item.id}">${item.icon} ${escHtml(item.label)}${item.count && item.count > 1 ? ` <span class="nav-count">(${item.count})</span>` : ''}</a>`
      ).join('')}
    </div>
  </details>`

  // Helper to wrap section with id for anchor nav
  const sectionWithId = (id: string, title: string, content: string, icon?: string, raw?: fhir4.Resource) => {
    const inner = section(title, content, icon, raw)
    if (!inner) return ''
    return inner.replace('<section>', `<section id="${id}">`)
  }

  const sections = [
    sectionWithId('sec-prescription', L.prescription, [
      field(L.docTitle, composition?.title),
      field(L.date, fdate(composition?.date)),
      field(L.status, composition?.status),
      field(L.bundleId, bundle.id, true),
    ].join(''), '📋', composition),

    sectionWithId('sec-patient', L.patient, [
      field(L.name, patient?.name?.[0]?.text),
      field(L.identifier, patient?.identifier?.[0]?.value, true),
      field(L.gender, isZh
        ? (patient?.gender === 'female' ? '女' : patient?.gender === 'male' ? '男' : patient?.gender)
        : patient?.gender),
      field(L.birthDate, fdate(patient?.birthDate)),
    ].join(''), '👤', patient),

    sectionWithId('sec-practitioner', L.practitioner, [
      field(L.name, practitioner?.name?.[0]?.text),
      field(L.licenseNumber, practitioner?.identifier?.[0]?.value, true),
      field(L.qualification, practitioner?.qualification?.[0]?.code?.text),
    ].join(''), '🩺', practitioner),

    sectionWithId('sec-organization', L.organization, [
      field(L.orgName, organization?.name),
      field(L.orgIdentifier, organization?.identifier?.[0]?.value, true),
      field(L.orgType, organization?.type?.[0]?.coding?.[0]?.display),
    ].join(''), '🏥', organization),

    sectionWithId('sec-encounter', L.encounter, [
      field(L.encounterType, encounter?.class?.display),
      field(L.encounterStart, fdate(encounter?.period?.start)),
      field(L.encounterEnd, fdate(encounter?.period?.end)),
      field(L.encounterStatus, encounter?.status),
    ].join(''), '📅', encounter),

    conditionSection.replace('<section>', '<section id="sec-condition">'),

    observationSection.replace('<section>', '<section id="sec-observation">'),

    sectionWithId('sec-coverage', L.coverage, [
      field(L.coverageType, coverage?.type?.text),
      field(L.insuranceId, coverage?.subscriberId),
      field(L.effectiveDate, fdate(coverage?.period?.start)),
    ].join(''), '🏷️', coverage),

    medicationSection.replace('<section>', '<section id="sec-medication">'),
  ].join('\n')

  const bundlePlain = JSON.stringify(bundle, null, 2)
  const bundleTree = buildJsonTree(bundle, 0)
  const generatedAt = new Date().toLocaleString(locale.startsWith('zh') ? 'zh-TW' : 'en-US')

  return `<!DOCTYPE html>
<html lang="${escHtml(locale)}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(L.title)}</title>
<style>
  :root {
    --bg: #faf3f5;
    --card: #ffffff;
    --border: #e8d5da;
    --text: #2d1a1f;
    --muted: #8b6b72;
    --accent: #c9727a;
    --badge-bg: #f5e6e8;
    --badge-text: #7d3a42;
    --hero-bg: linear-gradient(135deg, #c9727a 0%, #a85060 100%);
    --radius: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  [data-theme="dark"] {
    --bg: #1a0e10;
    --card: #261418;
    --border: #3d2025;
    --text: #f0dde0;
    --muted: #a07880;
    --badge-bg: #3a1c20;
    --badge-text: #f0a0ac;
    --hero-bg: linear-gradient(135deg, #7d3a42 0%, #5a2530 100%);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); padding: 0 0 2rem; transition: background 0.2s, color 0.2s; }
  .container { max-width: 760px; margin: 0 auto; padding: 0 1rem; }

  /* Sticky header bar */
  .sticky-header {
    position: sticky; top: 0; z-index: 10;
    background: var(--accent); color: white;
    padding: 0.55rem 1.25rem;
    display: flex; align-items: center; gap: 0.75rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(201,114,122,0.3);
  }
  .sticky-header .app-name { font-weight: 700; font-size: 0.9rem; margin-right: auto; opacity: 0.95; }
  .sticky-header .patient-chip {
    font-size: 0.8rem; background: rgba(255,255,255,0.2);
    border-radius: 20px; padding: 0.15rem 0.65rem; white-space: nowrap;
  }
  .sticky-header .date-chip { font-size: 0.8rem; opacity: 0.85; white-space: nowrap; }
  .sticky-header button {
    background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35);
    color: white; padding: 0.25rem 0.7rem; border-radius: 8px;
    cursor: pointer; font-size: 0.78rem; white-space: nowrap;
  }
  .sticky-header button:hover { background: rgba(255,255,255,0.32); }

  /* Global search in sticky bar */
  .gs-wrap { display: flex; align-items: center; gap: 0.25rem; }
  .gs-input {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
    color: white; border-radius: 8px; padding: 0.22rem 0.6rem;
    font-size: 0.78rem; font-family: inherit; outline: none; width: 110px;
    transition: width 0.2s, border-color 0.15s;
  }
  .gs-input:focus { width: 150px; border-color: rgba(255,255,255,0.7); }
  .gs-input::placeholder { color: rgba(255,255,255,0.5); }
  .gs-count { font-size: 0.68rem; color: rgba(255,255,255,0.7); white-space: nowrap; min-width: 2.5rem; }
  .gs-nav {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    color: white; border-radius: 6px; padding: 0.18rem 0.45rem;
    cursor: pointer; font-size: 0.75rem; line-height: 1;
  }
  .gs-nav:hover { background: rgba(255,255,255,0.3); }
  .gs-nav:disabled { opacity: 0.3; cursor: default; }

  /* Bundle metadata bar */
  .meta-bar {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.6rem;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; padding: 0.55rem 1rem;
    margin-bottom: 1rem; font-size: 0.78rem;
  }
  .meta-item { display: inline-flex; align-items: center; gap: 0.3rem; }
  .meta-label { color: var(--muted); font-size: 0.7rem; }
  .meta-val { font-weight: 500; color: var(--text); }
  .meta-sep { color: var(--border); padding: 0 0.1rem; }

  /* Hero summary card */
  .hero {
    background: var(--hero-bg); color: white;
    border-radius: var(--radius); padding: 1.25rem 1.5rem; margin-bottom: 1.25rem;
  }
  .hero-main { display: flex; align-items: flex-start; gap: 1rem; }
  .hero-text { flex: 1; min-width: 0; }
  .hero-name { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
  .hero-meta { font-size: 0.82rem; opacity: 0.85; margin-bottom: 0.85rem; letter-spacing: 0.01em; }
  .hero-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .hero-pill {
    background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px; padding: 0.2rem 0.7rem; font-size: 0.78rem; white-space: nowrap;
  }
  /* QR code */
  .hero-qr { flex-shrink: 0; }
  .qr-wrap {
    cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
    background: rgba(255,255,255,0.12); border-radius: 10px; padding: 0.5rem;
    transition: background 0.15s;
  }
  .qr-wrap:hover { background: rgba(255,255,255,0.22); }
  .qr-svg { border-radius: 4px; display: block; }
  .qr-label { font-size: 0.65rem; opacity: 0.8; font-family: monospace; }
  dialog::backdrop { background: rgba(0,0,0,0.55); }

  header { padding-top: 1.25rem; margin-bottom: 1.5rem; }
  header h1 { font-size: 1.4rem; font-weight: 700; color: var(--accent); }
  header .meta { font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }

  section {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1rem;
    transition: background 0.2s, border-color 0.2s;
  }
  h2 {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.75rem;
    display: flex; align-items: center; gap: 0.35rem;
  }
  .section-icon { font-size: 0.95rem; line-height: 1; }
  .field {
    display: grid; grid-template-columns: 6rem 1fr;
    gap: 0.25rem 0.75rem; margin-bottom: 0.4rem; font-size: 0.875rem;
  }
  .label { color: var(--muted); }
  .value { font-weight: 500; word-break: break-word; }

  /* Copyable field values */
  .copyable {
    cursor: pointer; display: inline-flex; align-items: center;
    gap: 0.3rem; border-radius: 4px; padding: 0 0.2rem; transition: background 0.15s;
  }
  .copyable:hover { background: var(--badge-bg); color: var(--accent); }
  .copy-icon { opacity: 0; font-size: 0.78rem; transition: opacity 0.15s; }
  .copyable:hover .copy-icon { opacity: 0.7; }
  .copyable.copied { color: #4caf50; }
  .copyable.copied .copy-icon { opacity: 0; }
  .copyable.copied::after { content: ' ✓'; font-size: 0.78rem; }

  .badges { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
  .badge {
    background: var(--badge-bg); color: var(--badge-text);
    border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.75rem; font-weight: 500;
  }

  /* Medication card */
  .med-card {
    background: var(--badge-bg); border-radius: 10px;
    padding: 0.75rem 1rem; margin-bottom: 0.25rem;
  }
  .med-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
  .med-name { font-size: 1.05rem; font-weight: 700; color: var(--text); }
  .med-divider { border: none; border-top: 1px solid var(--border); margin: 0.6rem 0 0.5rem; }
  .dosage-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .dosage-text { font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; }

  /* JSON detail / collapse */
  .json-detail { margin-top: 0.85rem; border-top: 1px solid var(--border); padding-top: 0.6rem; }
  .json-detail summary {
    cursor: pointer; font-size: 0.73rem; color: var(--muted);
    user-select: none; display: inline-flex; align-items: center; gap: 0.35rem; list-style: none;
  }
  .json-detail summary::-webkit-details-marker { display: none; }
  .json-detail summary::before { content: '▶'; font-size: 0.6rem; transition: transform 0.15s; }
  .json-detail[open] summary::before { transform: rotate(90deg); }
  .json-detail[open] summary { color: var(--accent); }
  .resource-type {
    background: var(--badge-bg); color: var(--badge-text);
    border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.68rem; font-weight: 500;
  }
  .json-block {
    position: relative; margin-top: 0.5rem;
    background: #120a0c; border-radius: 8px; overflow: hidden;
  }
  /* JSON block toolbar */
  .jb-toolbar {
    display: flex; gap: 0.35rem; padding: 0.45rem 0.7rem;
    background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.08);
    justify-content: flex-end;
  }
  .jb-toolbar button {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
    color: #f5e0e3; padding: 0.2rem 0.55rem; border-radius: 5px;
    cursor: pointer; font-size: 0.68rem; font-family: inherit; transition: background 0.15s;
  }
  .jb-toolbar button:hover { background: rgba(255,255,255,0.22); }
  /* keep copy-btn name for JS selector; expand/collapse get accent tint on hover */
  .expand-btn:hover, .collapse-btn:hover { border-color: rgba(201,114,122,0.5) !important; }
  .jb-search {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    color: #f5e0e3; border-radius: 5px; padding: 0.18rem 0.5rem;
    font-size: 0.68rem; font-family: inherit; width: 120px; outline: none;
    transition: border-color 0.15s, width 0.2s;
  }
  .jb-search:focus { border-color: rgba(201,114,122,0.7); width: 160px; }
  .jb-search::placeholder { color: rgba(245,224,227,0.4); }
  .jb-search-count { font-size: 0.65rem; color: rgba(245,224,227,0.55); white-space: nowrap; min-width: 2rem; text-align: right; }
  /* Search highlight */
  .jb-search-count.has-results { color: #a5d6a7; }
  .jt-row.dim { opacity: 0.2; transition: opacity 0.1s; }
  mark.sh { background: #ffcc80; color: #1e1214; border-radius: 2px; padding: 0 1px; }

  /* JSON tree */
  .jtree {
    padding: 0.9rem 1rem 0.9rem 1.2rem;
    font-size: 0.72rem;
    font-family: 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
    color: #f5e0e3;
    line-height: 1.7;
    overflow-x: auto;
  }
  .jt-row { white-space: nowrap; }
  .jt-node { display: block; }
  .jt-node > summary {
    cursor: pointer; list-style: none; display: inline-flex; align-items: center;
    gap: 0.2rem; user-select: none; color: #f5e0e3;
  }
  .jt-node > summary::-webkit-details-marker { display: none; }
  .jt-node > summary::before { content: '▶'; font-size: 0.55rem; color: #a07880; transition: transform 0.12s; }
  .jt-node[open] > summary::before { transform: rotate(90deg); }
  .jt-ch { padding-left: 1.4rem; border-left: 1px solid #3d2025; margin-left: 0.2rem; }
  .jt-hint { color: #a07880; font-size: 0.68rem; }
  .ji { color: #a07880; }
  /* JSON syntax colors */
  .jk  { color: #79c0ff; }
  .js  { color: #a5d6a7; }
  .jn  { color: #ffcc80; }
  .jb  { color: #ce93d8; }
  .jnl { color: #f48fb1; }
  .jp  { color: #a07880; }

  /* Full bundle JSON section */
  .bundle-json-section {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1rem;
    transition: background 0.2s, border-color 0.2s;
  }
  .bundle-json-section > .json-detail { border-top: none; padding-top: 0; margin-top: 0; }
  .bundle-json-section > .json-detail > summary { font-size: 0.82rem; font-weight: 600; color: var(--text); }
  .bundle-json-section > .json-detail[open] > summary { color: var(--accent); }

  /* Multi-resource rows (conditions / observations) */
  .multi-row { display: flex; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  .multi-row:last-child { border-bottom: none; }
  .multi-idx {
    flex-shrink: 0; width: 1.4rem; height: 1.4rem;
    background: var(--accent); color: white; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.68rem; font-weight: 700; margin-top: 0.1rem;
  }
  .multi-body { flex: 1; min-width: 0; }
  .multi-status { font-size: 0.78rem; color: var(--muted); margin-top: 0.25rem; }

  /* Data table (observation multi-row) */
  .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 0.5rem; }
  .data-table th {
    text-align: left; font-size: 0.68rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--muted); padding: 0 0.5rem 0.4rem 0;
    border-bottom: 1px solid var(--border);
  }
  .data-table td { padding: 0.35rem 0.5rem 0.35rem 0; border-bottom: 1px solid var(--border); color: var(--text); }
  .data-table tr:last-child td { border-bottom: none; }

  /* Medication index badge */
  .med-idx {
    flex-shrink: 0; width: 1.4rem; height: 1.4rem;
    background: var(--accent); color: white; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.68rem; font-weight: 700;
  }

  /* Document status banner */
  .status-banner {
    display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
    border-radius: 8px; padding: 0.45rem 1rem; margin-bottom: 0.75rem;
    font-size: 0.82rem; font-weight: 500; border-width: 1px; border-style: solid;
  }
  .status-icon { font-size: 1rem; line-height: 1; }
  .status-label { font-weight: 700; }
  .status-attester { color: inherit; opacity: 0.8; font-weight: 400; margin-left: auto; font-size: 0.78rem; }
  .status-final   { background: #e8f5e9; border-color: #a5d6a7; color: #2e7d32; }
  .status-amended { background: #e3f2fd; border-color: #90caf9; color: #1565c0; }
  .status-draft   { background: #fff8e1; border-color: #ffe082; color: #f57f17; }
  .status-error   { background: #ffebee; border-color: #ef9a9a; color: #c62828; }
  [data-theme="dark"] .status-final   { background: #1b3a1f; border-color: #4caf50; color: #a5d6a7; }
  [data-theme="dark"] .status-amended { background: #0d2b4a; border-color: #42a5f5; color: #90caf9; }
  [data-theme="dark"] .status-draft   { background: #3a2e00; border-color: #ffd54f; color: #ffe082; }
  [data-theme="dark"] .status-error   { background: #3b0c0c; border-color: #ef5350; color: #ef9a9a; }

  /* Lab value indicators (observation table) */
  .lab-badge {
    display: inline-block; border-radius: 999px;
    padding: 0.05rem 0.45rem; font-size: 0.68rem; font-weight: 600;
    vertical-align: middle; white-space: nowrap;
  }
  .lab-normal { background: #e8f5e9; color: #2e7d32; }
  .lab-high   { background: #fff3e0; color: #e65100; }
  .lab-low    { background: #e3f2fd; color: #1565c0; }
  [data-theme="dark"] .lab-normal { background: #1b3a1f; color: #a5d6a7; }
  [data-theme="dark"] .lab-high   { background: #3a1a00; color: #ffcc80; }
  [data-theme="dark"] .lab-low    { background: #0d2b4a; color: #90caf9; }

  /* Medication quick-reference summary table */
  .med-summary-table { margin-bottom: 0; }
  .med-summary-table td:first-child { width: 2rem; text-align: center; }

  /* Clinical timeline */
  .tl-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1rem;
  }
  .tl-title {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--muted); margin-bottom: 0.85rem;
  }
  .tl-body { display: flex; flex-direction: column; }
  .tl-row { display: flex; align-items: flex-start; gap: 0; }
  .tl-left {
    width: 7rem; flex-shrink: 0; text-align: right;
    padding-right: 0.75rem; padding-top: 0.05rem;
  }
  .tl-date { font-size: 0.73rem; color: var(--muted); white-space: normal; word-break: keep-all; }
  .tl-mid {
    flex-shrink: 0; display: flex; flex-direction: column; align-items: center;
    width: 1.6rem;
  }
  .tl-dot {
    width: 1.6rem; height: 1.6rem; border-radius: 50%;
    background: var(--badge-bg); border: 2px solid var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; flex-shrink: 0; z-index: 1;
  }
  .tl-line { flex: 1; width: 2px; background: var(--border); min-height: 1rem; margin: 0.1rem 0; }
  .tl-right { flex: 1; padding-left: 0.75rem; padding-bottom: 1rem; min-width: 0; }
  .tl-label {
    display: block; font-size: 0.85rem; font-weight: 600;
    color: var(--accent); text-decoration: none; word-break: break-word;
  }
  .tl-label:hover { text-decoration: underline; }
  .tl-sub { font-size: 0.75rem; color: var(--muted); margin-top: 0.1rem; }

  /* Nav dropdown in sticky bar */
  .nav-details { position: relative; }
  .nav-details summary { list-style: none; }
  .nav-details summary::-webkit-details-marker { display: none; }
  .nav-btn {
    background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35);
    color: white; padding: 0.25rem 0.7rem; border-radius: 8px;
    cursor: pointer; font-size: 0.78rem; white-space: nowrap;
    display: inline-block;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.32); }
  .nav-dropdown {
    position: absolute; top: calc(100% + 0.4rem); left: 0; z-index: 100;
    background: #fff; border: 1px solid var(--border);
    border-radius: 10px; padding: 0.35rem 0;
    min-width: 200px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }
  [data-theme="dark"] .nav-dropdown { background: #261418; }
  .nav-item {
    display: block; padding: 0.42rem 1rem;
    font-size: 0.82rem; color: var(--text); text-decoration: none;
    white-space: nowrap;
  }
  .nav-item:hover { background: var(--badge-bg); color: var(--accent); }
  .nav-count { font-size: 0.72rem; color: var(--muted); }

  footer {
    margin-top: 1.5rem; font-size: 0.75rem;
    color: var(--muted); text-align: center; padding-bottom: 1rem;
  }

  /* Print header / footer (hidden on screen) */
  .print-hf { display: none; }

  @page {
    size: A4;
    margin: 18mm 14mm 20mm;
    @top-center { content: ''; }
    @bottom-center { content: counter(page) ' / ' counter(pages); font-size: 9pt; }
  }

  @media print {
    .sticky-header { display: none !important; }
    body { padding: 0; margin: 0; background: white; color: black; }
    .hero { background: #c9727a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hero-qr { display: none; }
    section { break-inside: avoid; }
    .tl-card { break-inside: avoid; }
    .json-detail { display: none; }
    .bundle-json-section { display: none; }
    .jb-search, .jb-search-count { display: none; }
    .gs-wrap { display: none !important; }
    mark.gsh { background: transparent; color: inherit; }

    /* Show print header and footer */
    .print-header {
      display: flex !important;
      position: fixed; top: 0; left: 0; right: 0;
      justify-content: space-between; align-items: center;
      font-size: 8.5pt; color: #555;
      border-bottom: 1px solid #ccc; padding: 0 0 4px;
    }
    .print-footer {
      display: flex !important;
      position: fixed; bottom: 0; left: 0; right: 0;
      justify-content: space-between; align-items: center;
      font-size: 8pt; color: #777;
      border-top: 1px solid #ddd; padding: 4px 0 0;
    }
    .container { margin-top: 0; }
  }
</style>
</head>
<body>
<div class="sticky-header">
  <span class="app-name">℞ RxFHIR</span>
  ${patientName ? `<span class="patient-chip">${escHtml(patientName)}</span>` : ''}
  ${prescriptionDate ? `<span class="date-chip">${escHtml(prescriptionDate)}</span>` : ''}
  ${navHtml}
  <div class="gs-wrap">
    <input id="gs-input" class="gs-input" type="search" />
    <span id="gs-count" class="gs-count"></span>
    <button id="gs-prev" class="gs-nav" title="Previous" disabled>↑</button>
    <button id="gs-next" class="gs-nav" title="Next" disabled>↓</button>
  </div>
  <button id="theme-btn" onclick="toggleTheme()">🌙 ${escHtml(darkToggleLabel)}</button>
  <button class="print-btn" onclick="window.print()">🖨 ${escHtml(printLabel)}</button>
</div>
<!-- print header / footer (hidden on screen, visible via print CSS) -->
<div id="print-header" class="print-hf print-header">
  <span>${escHtml(organization?.name ?? '')}</span>
  <span>${escHtml(L.title)}</span>
  <span>${escHtml(patientName)}${patient?.identifier?.[0]?.value ? '  ' + escHtml(patient.identifier[0].value) : ''}</span>
</div>
<div id="print-footer" class="print-hf print-footer">
  <span>${escHtml(L.footer)}</span>
  <span>${generatedAt}</span>
  <span id="print-page-num"></span>
</div>
<div class="container">
  <header>
    <h1>${escHtml(L.title)}</h1>
    <p class="meta">${escHtml(L.generatedAt)}: ${generatedAt}</p>
  </header>
  ${metaBarHtml}
  ${statusBannerHtml}
  ${heroHtml}
  ${timelineHtml}
  ${sections}
  <div class="bundle-json-section">
    <details class="json-detail">
      <summary>📦 ${escHtml(bundleJsonLabel)}</summary>
      <div class="json-block" data-plain="${escHtml(bundlePlain)}">
        <div class="jb-toolbar">
          <button class="expand-btn"></button>
          <button class="collapse-btn"></button>
          <button class="copy-btn">${escHtml(copyFullLabel)}</button>
        </div>
        <div class="jtree">${bundleTree}</div>
      </div>
    </details>
  </div>
  <footer>${escHtml(L.footer)}</footer>
</div>
<script>
  // Dark mode toggle — persisted via localStorage
  var DARK_LABEL = '☀\uFE0F ${escHtml(lightToggleLabel)}'
  var LIGHT_LABEL = '🌙 ${escHtml(darkToggleLabel)}'
  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
    var btn = document.getElementById('theme-btn')
    if (btn) btn.textContent = dark ? DARK_LABEL : LIGHT_LABEL
  }
  function toggleTheme() {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    localStorage.setItem('rxfhir-theme', isDark ? 'light' : 'dark')
    applyTheme(!isDark)
  }
  // Restore saved preference or use system preference
  var saved = localStorage.getItem('rxfhir-theme')
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(saved ? saved === 'dark' : prefersDark)

  var isZhPage = document.documentElement.lang.startsWith('zh')
  var EXPAND_LABEL = isZhPage ? '全展開' : 'Expand all'
  var COLLAPSE_LABEL = isZhPage ? '全折疊' : 'Collapse all'
  var SEARCH_PLACEHOLDER = isZhPage ? '搜尋 JSON…' : 'Search JSON…'
  var SEARCH_RESULTS = isZhPage ? '{n} 筆' : '{n} found'

  // Set search placeholder
  document.querySelectorAll('.jb-search').forEach(function (inp) {
    inp.setAttribute('placeholder', SEARCH_PLACEHOLDER)
  })

  // JSON search — highlight matching text nodes, dim non-matching rows, auto-expand parents
  function clearSearch(block) {
    block.querySelectorAll('mark.sh').forEach(function (m) {
      var parent = m.parentNode
      if (parent) { parent.replaceChild(document.createTextNode(m.textContent || ''), m) }
    })
    block.querySelectorAll('.jt-row').forEach(function (r) { r.classList.remove('dim') })
    block.querySelectorAll('details.jt-node').forEach(function (d) { d.open = false })
    // restore first-level open
    block.querySelectorAll(':scope > .jtree > details.jt-node').forEach(function (d) { d.open = true })
  }

  function searchBlock(block, query) {
    clearSearch(block)
    if (!query) { var cnt = block.querySelector('.jb-search-count'); if (cnt) { cnt.textContent = ''; cnt.className = 'jb-search-count'; } return }
    var re = new RegExp(query.replace(/[-.*+?^$|()[\]{}\\]/g, '\\$&'), 'gi')
    var matchCount = 0
    var matchedRows = new Set()
    // Walk text nodes inside .jtree
    var walker = document.createTreeWalker(block.querySelector('.jtree') || block, NodeFilter.SHOW_TEXT)
    var nodesToWrap = []
    var n
    while ((n = walker.nextNode())) {
      if (n.nodeValue && re.test(n.nodeValue)) { nodesToWrap.push(n); re.lastIndex = 0 }
    }
    nodesToWrap.forEach(function (textNode) {
      var frag = document.createDocumentFragment()
      var remaining = textNode.nodeValue || ''
      var m
      re.lastIndex = 0
      var last = 0
      while ((m = re.exec(remaining)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(remaining.slice(last, m.index)))
        var mark = document.createElement('mark')
        mark.className = 'sh'
        mark.textContent = m[0]
        frag.appendChild(mark)
        matchCount++
        last = m.index + m[0].length
      }
      if (last < remaining.length) frag.appendChild(document.createTextNode(remaining.slice(last)))
      var parent = textNode.parentNode
      if (parent) {
        parent.replaceChild(frag, textNode)
        // bubble up — mark ancestor .jt-row as matched
        var el = parent
        while (el && el !== block) {
          if (el.classList && el.classList.contains('jt-row')) { matchedRows.add(el); break }
          el = el.parentElement
        }
        // open all ancestor <details>
        el = parent
        while (el && el !== block) {
          if (el.tagName === 'DETAILS') el.open = true
          el = el.parentElement
        }
      }
    })
    // dim non-matched rows
    block.querySelectorAll('.jt-row').forEach(function (row) {
      if (!matchedRows.has(row)) row.classList.add('dim')
    })
    var cnt = block.querySelector('.jb-search-count')
    if (cnt) {
      cnt.textContent = SEARCH_RESULTS.replace('{n}', String(matchCount))
      cnt.className = 'jb-search-count' + (matchCount > 0 ? ' has-results' : '')
    }
  }

  document.querySelectorAll('.jb-search').forEach(function (inp) {
    var debounce
    inp.addEventListener('input', function () {
      clearTimeout(debounce)
      debounce = setTimeout(function () {
        var block = inp.closest('.json-block')
        if (block) searchBlock(block, inp.value.trim())
      }, 200)
    })
  })

  // Expand / collapse all <details> within the same .json-block
  document.querySelectorAll('.expand-btn').forEach(function (btn) {
    btn.textContent = EXPAND_LABEL
    btn.addEventListener('click', function () {
      var block = btn.closest('.json-block')
      if (block) block.querySelectorAll('details').forEach(function (d) { d.open = true })
    })
  })
  document.querySelectorAll('.collapse-btn').forEach(function (btn) {
    btn.textContent = COLLAPSE_LABEL
    btn.addEventListener('click', function () {
      var block = btn.closest('.json-block')
      if (block) block.querySelectorAll('details').forEach(function (d) { d.open = false })
    })
  })

  // Copy buttons — read data-plain to get unescaped JSON
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var block = btn.closest('.json-block')
      var text = (block && block.dataset.plain) ? block.dataset.plain : ''
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(function () {
          var orig = btn.textContent
          btn.textContent = '✓'
          setTimeout(function () { btn.textContent = orig }, 1500)
        })
      }
    })
  })
  // Copyable field values
  document.querySelectorAll('.copyable').forEach(function (el) {
    el.addEventListener('click', function () {
      var text = el.dataset.copy || ''
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(function () {
          el.classList.add('copied')
          setTimeout(function () { el.classList.remove('copied') }, 1500)
        })
      }
    })
  })

  // ── Global search (sticky bar) ───────────────────────────────────────────
  ;(function () {
    var gsInput = document.getElementById('gs-input')
    var gsCount = document.getElementById('gs-count')
    var gsPrev  = document.getElementById('gs-prev')
    var gsNext  = document.getElementById('gs-next')
    var GS_PLACEHOLDER = isZhPage ? '全頁搜尋…' : 'Search page…'
    var GS_RESULTS = isZhPage ? '{cur}/{tot}' : '{cur}/{tot}'
    if (gsInput) gsInput.setAttribute('placeholder', GS_PLACEHOLDER)

    var gsMatches = []   // Array of <mark class="gsh"> elements
    var gsCurrent = -1

    function clearGsMarks() {
      document.querySelectorAll('mark.gsh').forEach(function (m) {
        var p = m.parentNode
        if (p) { p.replaceChild(document.createTextNode(m.textContent || ''), m); p.normalize() }
      })
      gsMatches = []
      gsCurrent = -1
      if (gsCount) gsCount.textContent = ''
      updateNavButtons()
    }

    function updateNavButtons() {
      var has = gsMatches.length > 0
      if (gsPrev) gsPrev.disabled = !has
      if (gsNext) gsNext.disabled = !has
    }

    function scrollToMatch(idx) {
      if (idx < 0 || idx >= gsMatches.length) return
      var prev = gsMatches[gsCurrent]
      if (prev) prev.style.outline = ''
      gsCurrent = idx
      var cur = gsMatches[gsCurrent]
      cur.style.outline = '2px solid #f48fb1'
      cur.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (gsCount) gsCount.textContent = GS_RESULTS.replace('{cur}', String(gsCurrent + 1)).replace('{tot}', String(gsMatches.length))
    }

    function runGsSearch(query) {
      clearGsMarks()
      if (!query) return
      // Collect text nodes inside .container, skipping .json-block subtrees
      var container = document.querySelector('.container')
      if (!container) return
      var re = new RegExp(query.replace(/[-.*+?^$|()[\]{}\\]/g, '\\$&'), 'gi')
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          // Skip anything inside a .json-block
          var el = node.parentElement
          while (el && el !== container) {
            if (el.classList && el.classList.contains('json-block')) return NodeFilter.FILTER_REJECT
            el = el.parentElement
          }
          return (node.nodeValue && node.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        }
      })
      var nodes = []
      var n
      while ((n = walker.nextNode())) {
        if (re.test(n.nodeValue)) { nodes.push(n); re.lastIndex = 0 }
      }
      nodes.forEach(function (textNode) {
        var val = textNode.nodeValue || ''
        var frag = document.createDocumentFragment()
        var last = 0
        re.lastIndex = 0
        var m
        while ((m = re.exec(val)) !== null) {
          if (m.index > last) frag.appendChild(document.createTextNode(val.slice(last, m.index)))
          var mark = document.createElement('mark')
          mark.className = 'gsh'
          mark.textContent = m[0]
          frag.appendChild(mark)
          gsMatches.push(mark)
          last = m.index + m[0].length
        }
        if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)))
        if (textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode)
      })
      updateNavButtons()
      if (gsMatches.length > 0) {
        scrollToMatch(0)
      } else {
        if (gsCount) gsCount.textContent = isZhPage ? '無結果' : 'No results'
      }
    }

    if (gsInput) {
      var debounce
      gsInput.addEventListener('input', function () {
        clearTimeout(debounce)
        debounce = setTimeout(function () { runGsSearch(gsInput.value.trim()) }, 220)
      })
      gsInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { gsInput.value = ''; clearGsMarks() }
        if (e.key === 'Enter') {
          if (e.shiftKey) { scrollToMatch((gsCurrent - 1 + gsMatches.length) % gsMatches.length) }
          else { scrollToMatch((gsCurrent + 1) % gsMatches.length) }
        }
      })
    }
    if (gsPrev) gsPrev.addEventListener('click', function () {
      if (gsMatches.length) scrollToMatch((gsCurrent - 1 + gsMatches.length) % gsMatches.length)
    })
    if (gsNext) gsNext.addEventListener('click', function () {
      if (gsMatches.length) scrollToMatch((gsCurrent + 1) % gsMatches.length)
    })
    updateNavButtons()
  })()

  // Global search highlight style (injected dynamically to keep template clean)
  ;(function () {
    var s = document.createElement('style')
    s.textContent = 'mark.gsh { background: #ffe082; color: #1a1a1a; border-radius: 2px; padding: 0 1px; }'
    document.head.appendChild(s)
  })()
</script>
</body>
</html>`
}
