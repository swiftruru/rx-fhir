/**
 * Step 20 / 140 / 250：重用 RxFHIR 的 conformanceCheck（meta.profile / collection / 數量）。
 */
export {
  checkBundleConformance,
  parseExpectedCounts,
  type ConformanceResult,
  type CountDiffRow
} from '../../../../src/renderer/domain/fhir/twcore/conformanceCheck.js'
