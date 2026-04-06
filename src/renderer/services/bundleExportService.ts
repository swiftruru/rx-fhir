// Pure data-transformation helpers — no I/O, no React imports.

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
  baseUrl: string
): Promise<{ method: 'PUT' | 'POST'; serverId?: string }> {
  const base = baseUrl.replace(/\/+$/, '')
  const type = resource.resourceType

  try {
    const resp = await fetch(`${base}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
      body: JSON.stringify(resource)
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
  onProgress?: (checked: number, total: number) => void
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
    const result = await resolveHttpMethod(resource, baseUrl)
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

function buildJsonDetail(resourceType: string, resource: object): string {
  const plain = JSON.stringify(resource, null, 2)
  const tree = buildJsonTree(resource, 0)
  return `<details class="json-detail">
    <summary>JSON <span class="resource-type">${escHtml(resourceType)}</span></summary>
    <div class="json-block" data-plain="${escHtml(plain)}">
      <div class="jb-toolbar">
        <button class="expand-btn"></button>
        <button class="collapse-btn"></button>
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

  const heroHtml = `<div class="hero" id="sec-top">
    <div class="hero-name">${escHtml(patientName || '—')}</div>
    ${heroPatientMeta ? `<div class="hero-meta">${escHtml(heroPatientMeta)}</div>` : ''}
    <div class="hero-pills">
      ${heroPills.map((p) => `<span class="hero-pill">${escHtml(p)}</span>`).join('')}
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

  // Observations — multi-row table
  const observationSection = (() => {
    if (observations.length === 0) return ''
    // Table layout when multiple rows
    const thead = `<tr><th>${escHtml(L.observationItem)}</th><th>${escHtml(L.value)}</th><th>${escHtml(L.unit)}</th><th>${escHtml(L.observationStatus)}</th></tr>`
    const trows = observations.map((o) => {
      const val = o.valueQuantity?.value != null ? String(o.valueQuantity.value) : (o.valueString ?? '')
      const unit = o.valueQuantity?.unit ?? ''
      return `<tr>
        <td>${escHtml(o.code?.text ?? o.code?.coding?.[0]?.display ?? '')}</td>
        <td>${escHtml(val)}</td>
        <td>${escHtml(unit)}</td>
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

  // Medications — multi card-in-card
  const medicationSection = (() => {
    if (medicationRequests.length === 0 && medications.length === 0) return ''
    const cards = medicationRequests.map((mr, i) => {
      const med = medications[i] ?? medications[0]
      const medName = med?.code?.text ?? ''
      const medCode = med?.code?.coding?.[0]?.code ?? ''
      const medForm = med?.form?.text ?? ''
      const doseText = mr.dosageInstruction?.[0]?.text ?? ''
      const routeText = mr.dosageInstruction?.[0]?.route?.coding?.[0]?.display ?? ''
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
    return section(L.medicationAndRequest, cards, '💊')
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

  /* Hero summary card */
  .hero {
    background: var(--hero-bg);
    color: white;
    border-radius: var(--radius);
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.25rem;
  }
  .hero-name { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.3rem; }
  .hero-meta { font-size: 0.82rem; opacity: 0.85; margin-bottom: 0.85rem; letter-spacing: 0.01em; }
  .hero-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .hero-pill {
    background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px; padding: 0.2rem 0.7rem;
    font-size: 0.78rem; white-space: nowrap;
  }

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

  @media print {
    .sticky-header { display: none; }
    body { padding: 0; background: white; color: black; }
    .hero { background: #c9727a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    section { break-inside: avoid; }
    .json-detail { display: none; }
    .bundle-json-section { display: none; }
  }
</style>
</head>
<body>
<div class="sticky-header">
  <span class="app-name">℞ RxFHIR</span>
  ${patientName ? `<span class="patient-chip">${escHtml(patientName)}</span>` : ''}
  ${prescriptionDate ? `<span class="date-chip">${escHtml(prescriptionDate)}</span>` : ''}
  ${navHtml}
  <button id="theme-btn" onclick="toggleTheme()">🌙 ${escHtml(darkToggleLabel)}</button>
  <button class="print-btn" onclick="window.print()">🖨 ${escHtml(printLabel)}</button>
</div>
<div class="container">
  <header>
    <h1>${escHtml(L.title)}</h1>
    <p class="meta">${escHtml(L.generatedAt)}: ${generatedAt}</p>
  </header>
  ${heroHtml}
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

  // Expand / collapse all <details> within the same .json-block
  var isZhPage = document.documentElement.lang.startsWith('zh')
  var EXPAND_LABEL = isZhPage ? '全展開' : 'Expand all'
  var COLLAPSE_LABEL = isZhPage ? '全折疊' : 'Collapse all'
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
</script>
</body>
</html>`
}
