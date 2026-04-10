import i18n from '../../i18n'
import type { SearchParams } from '../../types/fhir'
import { getFhirBaseUrl } from './baseUrl'
import { FHIR_HEADERS, performLoggedRequest } from './requestLogger'

export interface QueryStep {
  step: number
  label: string
  labelKey?: string
  url: string
  note?: string
  noteKey?: string
  noteOptions?: Record<string, unknown>
  fetchedCount?: number
  matchedCount?: number
}

function tConsumer(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, { ns: 'consumer', ...options })
}

function formatQueryStepLabel(step: number, key: string): string {
  return `${step}. ${tConsumer(key)}`
}

function buildBundleSearchUrl(params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${getFhirBaseUrl()}/Bundle?${query}` : `${getFhirBaseUrl()}/Bundle`
}

function getDocumentComposition(bundle: fhir4.Bundle): fhir4.Composition | undefined {
  const composition = bundle.entry?.[0]?.resource
  return composition?.resourceType === 'Composition' ? composition as fhir4.Composition : undefined
}

function normalizeReference(reference?: string): string | undefined {
  if (!reference) return undefined

  const trimmed = reference.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('urn:uuid:')) return trimmed

  const withoutHistory = trimmed.split('/_history/')[0]
  const parts = withoutHistory.split('/').filter(Boolean)
  if (parts.length < 2) return withoutHistory

  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
}

function resolveBundleResource<T extends fhir4.Resource>(
  bundle: fhir4.Bundle,
  resourceType: T['resourceType'],
  reference?: string
): T | undefined {
  const normalizedReference = normalizeReference(reference)
  if (!normalizedReference) return undefined

  return bundle.entry?.find((entry) => {
    const resource = entry.resource
    if (!resource || resource.resourceType !== resourceType) return false
    const resourceRef = resource.id ? `${resourceType}/${resource.id}` : undefined
    const normalizedResourceRef = normalizeReference(resourceRef)
    const normalizedFullUrl = normalizeReference(entry.fullUrl)
    return normalizedReference === normalizedResourceRef || normalizedReference === normalizedFullUrl
  })?.resource as T | undefined
}

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, '').toLowerCase()
}

function getPractitionerSearchNames(practitioner: fhir4.Practitioner | undefined): string[] {
  if (!practitioner) return []

  return (practitioner.name ?? []).flatMap((name) => {
    const candidates = [name.text]
    const joined = `${name.family ?? ''}${name.given?.join('') ?? ''}`.trim()
    if (joined) candidates.push(joined)
    const spaced = [name.family, ...(name.given ?? [])].filter(Boolean).join(' ')
    if (spaced) candidates.push(spaced)
    return candidates.filter((candidate): candidate is string => Boolean(candidate))
  })
}

function getPatientSearchNames(patient: fhir4.Patient | undefined): string[] {
  if (!patient) return []
  return (patient.name ?? []).flatMap((name) => {
    const candidates: (string | undefined)[] = [name.text]
    const joined = `${name.family ?? ''}${(name.given ?? []).join('')}`.trim()
    if (joined) candidates.push(joined)
    const spaced = [name.family, ...(name.given ?? [])].filter(Boolean).join(' ')
    if (spaced) candidates.push(spaced)
    return candidates.filter((candidate): candidate is string => Boolean(candidate))
  })
}

function matchesPatientName(bundle: fhir4.Bundle, patientName: string): boolean {
  const target = normalizeSearchText(patientName)
  if (!target) return true
  const patients = (bundle.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is fhir4.Patient => resource?.resourceType === 'Patient')
  return patients.some((patient) =>
    getPatientSearchNames(patient).some((name) => {
      const normalized = normalizeSearchText(name)
      return normalized.includes(target) || target.includes(normalized)
    })
  )
}

function matchesAuthorName(bundle: fhir4.Bundle, authorName: string): boolean {
  const composition = getDocumentComposition(bundle)
  if (!composition?.author?.length) return false

  const target = normalizeSearchText(authorName)
  if (!target) return true

  return composition.author.some((author) => {
    const candidates = new Set<string>()
    if (author.display) candidates.add(author.display)

    const practitioner = resolveBundleResource<fhir4.Practitioner>(bundle, 'Practitioner', author.reference)
    getPractitionerSearchNames(practitioner).forEach((name) => candidates.add(name))

    if (!practitioner) {
      bundle.entry
        ?.filter((entry) => entry.resource?.resourceType === 'Practitioner')
        .forEach((entry) => {
          getPractitionerSearchNames(entry.resource as fhir4.Practitioner).forEach((name) => candidates.add(name))
        })
    }

    return [...candidates].some((candidate) => {
      const normalized = normalizeSearchText(candidate)
      return normalized.includes(target) || target.includes(normalized)
    })
  })
}

export interface SearchBundlesOptions {
  ownedIdentifiers?: string[]
  signal?: AbortSignal
}

export async function searchBundles(
  params: SearchParams,
  onStep?: (step: QueryStep) => void,
  options?: SearchBundlesOptions
): Promise<fhir4.Bundle> {
  const signal = options?.signal
  const loggedFetch = async (url: string, init: Parameters<typeof performLoggedRequest>[1]): Promise<Response> => {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers ?? { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
      signal,
      body: typeof init.body === 'string' || init.body === undefined
        ? init.body
        : JSON.stringify(init.body)
    })
    if (!response.ok) {
      const text = await response.clone().text()
      throw new Error(`${response.status} ${response.statusText} — ${text}`)
    }
    return response
  }

  if (params.mode === 'complex' && params.complexSearchBy === 'organization' && params.organizationId) {
    const orgUrl = `${getFhirBaseUrl()}/Organization?identifier=${encodeURIComponent(params.organizationId)}`
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.resolveOrganizationId'),
      labelKey: 'search.queryStepTexts.resolveOrganizationId',
      url: orgUrl
    })
    const orgRes = await loggedFetch(orgUrl, {
      method: 'GET',
      resourceType: 'Organization',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    const orgBundle = await orgRes.json() as fhir4.Bundle
    const orgId = orgBundle.entry?.[0]?.resource?.id
    if (!orgId) throw new Error(tConsumer('search.queryStepTexts.organizationNotFound'))

    const qs = new URLSearchParams()
    if (params.identifier) qs.set('identifier', params.identifier)
    const searchUrl = buildBundleSearchUrl(qs)
    onStep?.({
      step: 2,
      label: formatQueryStepLabel(2, 'search.queryStepTexts.searchBundle'),
      labelKey: 'search.queryStepTexts.searchBundle',
      url: searchUrl,
      note: tConsumer('search.queryStepTexts.custodianFallback'),
      noteKey: 'search.queryStepTexts.custodianFallback'
    })
    const response = await loggedFetch(searchUrl, {
      method: 'GET',
      resourceType: 'Bundle',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    const allBundles = await response.json() as fhir4.Bundle
    const orgRef = `Organization/${orgId}`
    const filtered = (allBundles.entry ?? []).filter((entry) => {
      const inner = entry.resource as fhir4.Bundle | undefined
      const composition = inner?.entry?.[0]?.resource as fhir4.Composition | undefined
      return composition?.custodian?.reference === orgRef
    })
    onStep?.({
      step: 3,
      label: formatQueryStepLabel(3, 'search.queryStepTexts.clientFilter'),
      labelKey: 'search.queryStepTexts.clientFilter',
      url: `Composition.custodian.reference = "${orgRef}"`,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      },
      fetchedCount: allBundles.entry?.length ?? 0,
      matchedCount: filtered.length
    })
    return { ...allBundles, entry: filtered, total: filtered.length }
  }

  if (params.mode === 'complex' && params.complexSearchBy === 'author' && params.authorName) {
    const qs = new URLSearchParams()
    if (params.identifier) qs.set('identifier', params.identifier)
    const searchUrl = buildBundleSearchUrl(qs)
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.searchBundle'),
      labelKey: 'search.queryStepTexts.searchBundle',
      url: searchUrl,
      note: tConsumer('search.queryStepTexts.authorFallback'),
      noteKey: 'search.queryStepTexts.authorFallback'
    })
    const response = await loggedFetch(searchUrl, {
      method: 'GET',
      resourceType: 'Bundle',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    const allBundles = await response.json() as fhir4.Bundle
    const filtered = (allBundles.entry ?? []).filter((entry) => {
      const inner = entry.resource as fhir4.Bundle | undefined
      return inner?.resourceType === 'Bundle' && matchesAuthorName(inner, params.authorName!)
    })
    onStep?.({
      step: 2,
      label: formatQueryStepLabel(2, 'search.queryStepTexts.clientFilter'),
      labelKey: 'search.queryStepTexts.clientFilter',
      url: `Practitioner.name ~= "${params.authorName}"`,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      },
      fetchedCount: allBundles.entry?.length ?? 0,
      matchedCount: filtered.length
    })
    return { ...allBundles, entry: filtered, total: filtered.length }
  }

  if (params.mode === 'basic' && params.name) {
    const uniqueOwnedIds = [...new Set((options?.ownedIdentifiers ?? []).filter(Boolean))].slice(0, 30)
    const ownedSearchUrl = uniqueOwnedIds.length > 0
      ? uniqueOwnedIds.map((id) => `${getFhirBaseUrl()}/Bundle?identifier=${encodeURIComponent(id)}`).join(' → ')
      : `${getFhirBaseUrl()}/Bundle?identifier=(no submissions found)`
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.searchOwnedBundles'),
      labelKey: 'search.queryStepTexts.searchOwnedBundles',
      url: ownedSearchUrl,
      note: tConsumer('search.queryStepTexts.ownedBundlesFallback'),
      noteKey: 'search.queryStepTexts.ownedBundlesFallback'
    })
    const ownedRawEntries: fhir4.BundleEntry[] = []
    for (const id of uniqueOwnedIds) {
      const qs = new URLSearchParams()
      qs.set('identifier', id)
      const res = await loggedFetch(buildBundleSearchUrl(qs), {
        method: 'GET', resourceType: 'Bundle', reasonCode: 'search', headers: FHIR_HEADERS
      })
      const bundle = await res.json() as fhir4.Bundle
      ownedRawEntries.push(...(bundle.entry ?? []))
    }
    const ownedMatched = ownedRawEntries.filter((entry) => {
      const inner = entry.resource as fhir4.Bundle | undefined
      return inner?.resourceType === 'Bundle' && matchesPatientName(inner, params.name!)
    })
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.searchOwnedBundles'),
      labelKey: 'search.queryStepTexts.searchOwnedBundles',
      url: ownedSearchUrl,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: ownedRawEntries.length,
        matched: ownedMatched.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: { fetched: ownedRawEntries.length, matched: ownedMatched.length },
      fetchedCount: ownedRawEntries.length,
      matchedCount: ownedMatched.length
    })

    const patientUrl = `${getFhirBaseUrl()}/Patient?name=${encodeURIComponent(params.name)}&_count=100`
    onStep?.({
      step: 2,
      label: formatQueryStepLabel(2, 'search.queryStepTexts.searchPatient'),
      labelKey: 'search.queryStepTexts.searchPatient',
      url: patientUrl,
      note: tConsumer('search.queryStepTexts.nameFallback'),
      noteKey: 'search.queryStepTexts.nameFallback'
    })
    const patientRes = await loggedFetch(patientUrl, {
      method: 'GET', resourceType: 'Patient', reasonCode: 'search', headers: FHIR_HEADERS
    })

    const serverRawEntries: fhir4.BundleEntry[] = []
    const patientBundle = await patientRes.json() as fhir4.Bundle
    const patients = (patientBundle.entry ?? [])
      .map((entry) => entry.resource)
      .filter((resource): resource is fhir4.Patient => resource?.resourceType === 'Patient')

    const serverIds = [...new Set(
      patients.flatMap((patient) =>
        (patient.identifier ?? []).map((identifier) => identifier.value).filter((value): value is string => Boolean(value))
      )
    )]

    if (serverIds.length > 0) {
      const serverBundleUrl = serverIds
        .map((id) => `${getFhirBaseUrl()}/Bundle?identifier=${encodeURIComponent(id)}`)
        .join(' → ')
      onStep?.({
        step: 3,
        label: formatQueryStepLabel(3, 'search.queryStepTexts.searchBundle'),
        labelKey: 'search.queryStepTexts.searchBundle',
        url: serverBundleUrl
      })
      for (const serverId of serverIds) {
        const qs = new URLSearchParams()
        qs.set('identifier', serverId)
        const res = await loggedFetch(buildBundleSearchUrl(qs), {
          method: 'GET', resourceType: 'Bundle', reasonCode: 'search', headers: FHIR_HEADERS
        })
        const bundle = await res.json() as fhir4.Bundle
        serverRawEntries.push(...(bundle.entry ?? []))
      }
    }

    const patientLogicalIds = [...new Set(
      patients.map((patient) => patient.id).filter((id): id is string => Boolean(id))
    )].slice(0, 20)

    if (patientLogicalIds.length > 0) {
      const compositionSearchUrl = `${getFhirBaseUrl()}/Composition?subject=Patient/{id}&_count=50`
      onStep?.({
        step: 4,
        label: formatQueryStepLabel(4, 'search.queryStepTexts.searchComposition'),
        labelKey: 'search.queryStepTexts.searchComposition',
        url: compositionSearchUrl,
        note: tConsumer('search.queryStepTexts.compositionFallback'),
        noteKey: 'search.queryStepTexts.compositionFallback'
      })

      let compositionCount = 0
      let compositionBundleCount = 0

      for (const patientId of patientLogicalIds) {
        const compRes = await loggedFetch(
          `${getFhirBaseUrl()}/Composition?subject=Patient/${encodeURIComponent(patientId)}&_count=50`,
          { method: 'GET', resourceType: 'Composition', reasonCode: 'search', headers: FHIR_HEADERS }
        )
        const compBundle = await compRes.json() as fhir4.Bundle
        const compositions = (compBundle.entry ?? [])
          .map((entry) => entry.resource)
          .filter((resource): resource is fhir4.Composition => resource?.resourceType === 'Composition')

        compositionCount += compositions.length

        for (const composition of compositions.slice(0, 10)) {
          if (!composition.id) continue
          const bundleRes = await loggedFetch(
            `${getFhirBaseUrl()}/Bundle?composition=Composition/${encodeURIComponent(composition.id)}&_count=10`,
            { method: 'GET', resourceType: 'Bundle', reasonCode: 'search', headers: FHIR_HEADERS }
          )
          const bundle = await bundleRes.json() as fhir4.Bundle
          const foundEntries = bundle.entry ?? []
          compositionBundleCount += foundEntries.length
          serverRawEntries.push(...foundEntries)
        }
      }

      onStep?.({
        step: 4,
        label: formatQueryStepLabel(4, 'search.queryStepTexts.searchComposition'),
        labelKey: 'search.queryStepTexts.searchComposition',
        url: compositionSearchUrl,
        note: tConsumer('search.queryStepTexts.compositionStats', {
          compositions: compositionCount,
          bundles: compositionBundleCount
        }),
        noteKey: 'search.queryStepTexts.compositionStats',
        noteOptions: { compositions: compositionCount, bundles: compositionBundleCount }
      })
    }

    const seenServerIds = new Set<string>()
    const deduplicatedServerEntries = serverRawEntries.filter((entry) => {
      const id = (entry.resource as fhir4.Bundle | undefined)?.id ?? ''
      if (!id || seenServerIds.has(id)) return false
      seenServerIds.add(id)
      return true
    })

    const serverMatched = deduplicatedServerEntries.filter((entry) => {
      const inner = entry.resource as fhir4.Bundle | undefined
      return inner?.resourceType === 'Bundle' && matchesPatientName(inner, params.name!)
    })

    const ownedBundleIds = new Set(
      ownedMatched.map((entry) => (entry.resource as fhir4.Bundle | undefined)?.id ?? '').filter(Boolean)
    )
    const serverOnly = serverMatched.filter((entry) => {
      const id = (entry.resource as fhir4.Bundle | undefined)?.id ?? ''
      return !id || !ownedBundleIds.has(id)
    })
    const merged = [...ownedMatched, ...serverOnly]

    onStep?.({
      step: 5,
      label: formatQueryStepLabel(5, 'search.queryStepTexts.clientFilter'),
      labelKey: 'search.queryStepTexts.clientFilter',
      url: `Patient.name ~= "${params.name}"`,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: deduplicatedServerEntries.length,
        matched: serverOnly.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: {
        fetched: deduplicatedServerEntries.length,
        matched: serverOnly.length
      },
      fetchedCount: deduplicatedServerEntries.length,
      matchedCount: serverOnly.length
    })
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: merged.length,
      entry: merged
    }
  }

  if (params.mode === 'date' && params.identifier && params.date) {
    const qs = new URLSearchParams()
    qs.set('identifier', params.identifier)
    const searchUrl = buildBundleSearchUrl(qs)
    onStep?.({
      step: 1,
      label: formatQueryStepLabel(1, 'search.queryStepTexts.searchBundle'),
      labelKey: 'search.queryStepTexts.searchBundle',
      url: searchUrl,
      note: tConsumer('search.queryStepTexts.dateFallback'),
      noteKey: 'search.queryStepTexts.dateFallback'
    })
    const response = await loggedFetch(searchUrl, {
      method: 'GET',
      resourceType: 'Bundle',
      reasonCode: 'search',
      headers: FHIR_HEADERS
    })
    const allBundles = await response.json() as fhir4.Bundle
    const datePrefix = params.date.slice(0, 10)
    const filtered = (allBundles.entry ?? []).filter((entry) => {
      const inner = entry.resource as fhir4.Bundle | undefined
      const composition = getDocumentComposition(inner ?? ({} as fhir4.Bundle))
      return composition?.date?.startsWith(datePrefix) === true
    })
    onStep?.({
      step: 2,
      label: formatQueryStepLabel(2, 'search.queryStepTexts.clientFilter'),
      labelKey: 'search.queryStepTexts.clientFilter',
      url: `Composition.date starts with "${datePrefix}"`,
      note: tConsumer('search.queryStepTexts.filteredCounts', {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      }),
      noteKey: 'search.queryStepTexts.filteredCounts',
      noteOptions: {
        fetched: allBundles.entry?.length ?? 0,
        matched: filtered.length
      },
      fetchedCount: allBundles.entry?.length ?? 0,
      matchedCount: filtered.length
    })
    return { ...allBundles, entry: filtered, total: filtered.length }
  }

  const searchUrl = buildSearchUrl(params)
  const response = await loggedFetch(searchUrl, {
    method: 'GET',
    resourceType: 'Bundle',
    reasonCode: 'search',
    headers: FHIR_HEADERS
  })
  return response.json() as Promise<fhir4.Bundle>
}

export function buildSearchUrl(params: SearchParams): string {
  const base = `${getFhirBaseUrl()}/Bundle`
  const qs = new URLSearchParams()

  switch (params.mode) {
    case 'basic':
      if (params.identifier) {
        qs.set('identifier', params.identifier)
      } else if (params.name) {
        qs.set('composition.subject:Patient.name', params.name)
      }
      break
    case 'date':
      if (params.identifier) qs.set('identifier', params.identifier)
      if (params.date) qs.set('timestamp', params.date)
      break
    case 'complex':
      if (params.identifier) qs.set('identifier', params.identifier)
      if (params.complexSearchBy === 'author' && params.authorName) {
        qs.set('composition.author:Practitioner.name', params.authorName)
      }
      break
  }

  return `${base}?${qs.toString()}`
}

export async function searchBundlesNextPage(
  nextUrl: string,
  nameFilter?: string
): Promise<fhir4.Bundle> {
  const response = await performLoggedRequest(nextUrl, {
    method: 'GET',
    resourceType: 'Bundle',
    reasonCode: 'search',
    headers: FHIR_HEADERS
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Search failed (${response.status}): ${errorText}`)
  }
  const raw = await response.json() as fhir4.Bundle

  const filtered = nameFilter
    ? (raw.entry ?? []).filter((entry) => {
        const inner = entry.resource as fhir4.Bundle | undefined
        return inner?.resourceType === 'Bundle' && matchesPatientName(inner, nameFilter)
      })
    : (raw.entry ?? [])

  const nextLink = raw.link?.find((link) => link.relation === 'next')
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: filtered.length,
    entry: filtered,
    link: nextLink ? [nextLink] : undefined
  }
}
