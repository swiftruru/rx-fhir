/**
 * Step 150 / 260：院內碼 → 國際碼對照表。
 * 重用 RxFHIR 的共用邏輯（App Converter 與本工具共用同一份）。
 */
export {
  buildCodeMappingTable,
  type CodeMapRow
} from '../../../../src/renderer/domain/fhir/twcore/codeMapping.js'
