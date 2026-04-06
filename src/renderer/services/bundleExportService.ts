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
function buildQueryItems(bundle: fhir4.Bundle, baseUrl: string, urlHost: string): PostmanItem[] {
  const patient = getResource<fhir4.Patient>(bundle, 'Patient')
  const composition = getResource<fhir4.Composition>(bundle, 'Composition')
  const organization = getResource<fhir4.Organization>(bundle, 'Organization')
  const practitioner = getResource<fhir4.Practitioner>(bundle, 'Practitioner')

  const identifier = patient?.identifier?.[0]?.value
  const name = patient?.name?.[0]?.text
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
  }
}

function getLabels(locale: string): Record<string, string> {
  if (locale.startsWith('zh')) return LABELS['zh-TW']
  return LABELS['en']
}

function field(label: string, value?: string | null): string {
  if (!value) return ''
  return `<div class="field"><span class="label">${label}</span><span class="value">${escHtml(value)}</span></div>`
}

function section(title: string, content: string): string {
  if (!content.trim()) return ''
  return `<section><h2>${escHtml(title)}</h2>${content}</section>`
}

function escHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPrescriptionHtml(bundle: fhir4.Bundle, locale: string): string {
  const L = getLabels(locale)
  const entries = bundle.entry ?? []
  const find = <T extends fhir4.Resource>(type: string): T | undefined =>
    entries.find((e) => e.resource?.resourceType === type)?.resource as T | undefined

  const composition = find<fhir4.Composition>('Composition')
  const patient = find<fhir4.Patient>('Patient')
  const practitioner = find<fhir4.Practitioner>('Practitioner')
  const organization = find<fhir4.Organization>('Organization')
  const encounter = find<fhir4.Encounter>('Encounter')
  const condition = find<fhir4.Condition>('Condition')
  const observation = find<fhir4.Observation>('Observation')
  const coverage = find<fhir4.Coverage>('Coverage')
  const medication = find<fhir4.Medication>('Medication')
  const medicationRequest = find<fhir4.MedicationRequest>('MedicationRequest')

  const conditionBadges = (condition?.code?.coding ?? [])
    .map((c) => `<span class="badge">${escHtml(`${c.code ?? ''} — ${c.display ?? ''}`)}</span>`)
    .join('')

  const observationValue = observation?.valueQuantity
    ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit ?? ''}`
    : undefined

  const sections = [
    section(L.prescription, [
      field(L.docTitle, composition?.title),
      field(L.date, composition?.date),
      field(L.status, composition?.status),
      field(L.bundleId, bundle.id),
    ].join('')),

    section(L.patient, [
      field(L.name, patient?.name?.[0]?.text),
      field(L.identifier, patient?.identifier?.[0]?.value),
      field(L.gender, patient?.gender),
      field(L.birthDate, patient?.birthDate),
    ].join('')),

    section(L.practitioner, [
      field(L.name, practitioner?.name?.[0]?.text),
      field(L.licenseNumber, practitioner?.identifier?.[0]?.value),
      field(L.qualification, practitioner?.qualification?.[0]?.code?.text),
    ].join('')),

    section(L.organization, [
      field(L.orgName, organization?.name),
      field(L.orgIdentifier, organization?.identifier?.[0]?.value),
      field(L.orgType, organization?.type?.[0]?.coding?.[0]?.display),
    ].join('')),

    section(L.encounter, [
      field(L.encounterType, encounter?.class?.display),
      field(L.encounterStart, encounter?.period?.start),
      field(L.encounterEnd, encounter?.period?.end),
      field(L.encounterStatus, encounter?.status),
    ].join('')),

    condition ? section(L.condition, [
      conditionBadges ? `<div class="badges">${conditionBadges}</div>` : '',
      field(L.clinicalStatus, condition?.clinicalStatus?.coding?.[0]?.code),
    ].join('')) : '',

    section(L.observation, [
      field(L.observationItem, observation?.code?.text),
      field(L.observationResult, observationValue),
      field(L.observationStatus, observation?.status),
    ].join('')),

    section(L.coverage, [
      field(L.coverageType, coverage?.type?.text),
      field(L.insuranceId, coverage?.subscriberId),
      field(L.effectiveDate, coverage?.period?.start),
    ].join('')),

    medication ? section(L.medicationAndRequest, [
      field(L.medicationName, medication?.code?.text),
      field(L.medicationCode, medication?.code?.coding?.[0]?.code),
      field(L.form, medication?.form?.text),
      field(L.dose, medicationRequest?.dosageInstruction?.[0]?.text),
      field(L.route, medicationRequest?.dosageInstruction?.[0]?.route?.coding?.[0]?.display),
    ].join('')) : '',
  ].join('\n')

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
    --radius: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); padding: 2rem 1rem; }
  .container { max-width: 760px; margin: 0 auto; }
  header { margin-bottom: 2rem; }
  header h1 { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
  header .meta { font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }
  section {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }
  h2 {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
    margin-bottom: 0.75rem;
  }
  .field {
    display: grid;
    grid-template-columns: 6rem 1fr;
    gap: 0.25rem 0.75rem;
    margin-bottom: 0.4rem;
    font-size: 0.875rem;
  }
  .label { color: var(--muted); }
  .value { font-weight: 500; word-break: break-word; }
  .badges { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
  .badge {
    background: var(--badge-bg);
    color: var(--badge-text);
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 500;
  }
  footer {
    margin-top: 2rem;
    font-size: 0.75rem;
    color: var(--muted);
    text-align: center;
  }
  @media print {
    body { padding: 0; background: white; }
    section { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>${escHtml(L.title)}</h1>
    <p class="meta">${escHtml(L.generatedAt)}: ${generatedAt}</p>
  </header>
  ${sections}
  <footer>${escHtml(L.footer)}</footer>
</div>
</body>
</html>`
}
