export {
  DEFAULT_SERVER_URL,
  getFhirBaseUrl,
  setFhirBaseUrl,
  trimTrailingSlash
} from '../domain/fhir/baseUrl'

export {
  FHIR_HEADERS,
  performLoggedRequest,
  resetLoggedRequests
} from '../domain/fhir/requestLogger'

export {
  checkResourceExists,
  fetchBundleById,
  findOrCreate,
  findOrCreateDetailed,
  postResource,
  putResource,
  type FindOrCreateResult
} from '../domain/fhir/resourceApi'

export {
  buildSearchUrl,
  searchBundles,
  searchBundlesNextPage,
  type QueryStep,
  type SearchBundlesOptions
} from '../domain/fhir/searchApi'

export { checkServerHealth } from '../domain/fhir/serverHealthApi'
