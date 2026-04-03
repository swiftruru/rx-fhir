import type { SupportedLocale } from '../i18n'
import type { LiveDemoNarrative, LiveDemoStepDefinition, LiveDemoStepId } from './types'

export const LIVE_DEMO_STEPS: LiveDemoStepDefinition[] = [
  { id: 'organization', mode: 'fill-submit', controllerKey: 'organization', creatorStepIndex: 0, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'patient', mode: 'fill-submit', controllerKey: 'patient', creatorStepIndex: 1, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'practitioner', mode: 'fill-submit', controllerKey: 'practitioner', creatorStepIndex: 2, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'encounter', mode: 'fill-submit', controllerKey: 'encounter', creatorStepIndex: 3, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'condition', mode: 'fill-submit', controllerKey: 'condition', creatorStepIndex: 4, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'observation', mode: 'fill-submit', controllerKey: 'observation', creatorStepIndex: 5, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'coverage', mode: 'fill-submit', controllerKey: 'coverage', creatorStepIndex: 6, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'medication', mode: 'fill-submit', controllerKey: 'medication', creatorStepIndex: 7, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'medicationRequest', mode: 'fill-submit', controllerKey: 'medicationRequest', creatorStepIndex: 8, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'extension', mode: 'fill-submit', controllerKey: 'extension', creatorStepIndex: 9, introDelayMs: 1000, settleDelayMs: 1100 },
  { id: 'compositionPreview', mode: 'fill-only', controllerKey: 'composition', creatorStepIndex: 10, introDelayMs: 1100, settleDelayMs: 1400 },
  { id: 'bundleSubmit', mode: 'submit-only', controllerKey: 'composition', creatorStepIndex: 10, introDelayMs: 900, settleDelayMs: 1600 },
  { id: 'consumerSearch', mode: 'consumer-search', introDelayMs: 1000, settleDelayMs: 1600 }
]

const liveDemoNarratives: Record<SupportedLocale, Record<LiveDemoStepId, LiveDemoNarrative>> = {
  'zh-TW': {
    organization: {
      title: '建立醫療機構資料',
      action: '系統會先帶入並送出 Organization，說明這張處方是由哪一家醫療機構開立。',
      concept: 'Organization 是電子處方箋中的醫療機構主體，代表院所或診所本身。',
      practical: '實務上需要機構名稱與代碼，才能辨識資料來源、對應院所責任，並支援後續查詢。',
      relation: '這筆資料會被後續 Encounter、Composition 與 Bundle 參照，作為處方文件的來源背景。'
    },
    patient: {
      title: '建立病人資料',
      action: '接著建立 Patient，放入病人姓名、學號與基本人口資料。',
      concept: 'Patient 是整份電子處方箋的核心對象，其他多個 Resource 都會指向這位病人。',
      practical: '病人識別碼是查詢、比對與跨系統交換的重要依據，也是 Consumer 搜尋時最常用的條件。',
      relation: 'Composition.subject 與多筆臨床資料都會引用這位病人，Bundle 組裝時也會一起打包。'
    },
    practitioner: {
      title: '建立醫師資料',
      action: '這一步建立開立處方的 Practitioner，記錄醫師姓名、證號與專科資訊。',
      concept: 'Practitioner 用來表示實際開立處方的人員，是醫囑來源的重要角色。',
      practical: '實務上需要醫師身分與資格，才能追蹤醫囑來源並支援醫師姓名等複合查詢。',
      relation: '後續 MedicationRequest.requester 與 Composition.author 都會利用這筆醫師資料。'
    },
    encounter: {
      title: '建立就診資訊',
      action: '系統會建立 Encounter，記錄本次門診的類型、開始時間與結束時間。',
      concept: 'Encounter 用來描述病人這次實際發生的就醫情境，例如門診、急診或住院。',
      practical: '就診資訊能把診斷、檢查與處方關聯到同一次看診，讓資料脈絡更完整。',
      relation: 'Condition、Observation 與 MedicationRequest 之後都可參照同一筆 Encounter。'
    },
    condition: {
      title: '建立診斷資料',
      action: '這一步建立 Condition，放入本次處方對應的 ICD 診斷資訊。',
      concept: 'Condition 表示臨床診斷，是處方成立的醫療背景之一。',
      practical: '診斷資料能說明為什麼病人需要這張處方，也有助於教學時理解處方與病情的關係。',
      relation: '這筆診斷會在 Bundle 中與 Encounter、MedicationRequest 一起呈現完整臨床脈絡。'
    },
    observation: {
      title: '建立檢驗與觀察結果',
      action: '系統會建立 Observation，記錄這次量測或檢驗的結果。',
      concept: 'Observation 用來表示客觀量測值，例如體溫、血壓或其他檢驗結果。',
      practical: '這些數值能補充診斷背景，幫助學生理解處方不是孤立存在，而是來自臨床證據。',
      relation: 'Observation 會和 Encounter、Condition 一起放進 Document Bundle，形成完整資料內容。'
    },
    coverage: {
      title: '建立保險資訊',
      action: '接著建立 Coverage，記錄病人的保險身分與有效期間。',
      concept: 'Coverage 表示病人本次就醫對應的保險或付費身份。',
      practical: '在實務上，保險資訊會影響給付、申報與病人負擔，也是處方流程不可忽略的一環。',
      relation: '這筆保險資料會和病人及處方一起收錄，讓 Bundle 能描述更完整的就醫情境。'
    },
    medication: {
      title: '建立藥品主檔',
      action: '系統會建立 Medication，描述這次處方所使用的藥品。',
      concept: 'Medication 表示藥品本身，例如藥名、代碼與劑型。',
      practical: '先有藥品主檔，後面才能建立具體處方內容，說明病人要怎麼使用這個藥。',
      relation: 'MedicationRequest 會引用這筆 Medication，Composition 與 Bundle 也會一併收錄。'
    },
    medicationRequest: {
      title: '建立處方內容',
      action: '這一步建立 MedicationRequest，加入劑量、頻率、給藥途徑與天數。',
      concept: 'MedicationRequest 是真正代表醫師開立藥物醫囑的 Resource。',
      practical: '這是電子處方箋最核心的內容，直接影響病人拿到什麼藥、怎麼吃、吃多久。',
      relation: 'MedicationRequest 會參照病人、醫師、Encounter、Coverage 與 Medication，成為 Bundle 的核心臨床內容。'
    },
    extension: {
      title: '建立補充資料',
      action: '系統會建立 Basic / Extension 型態的補充資料，加入額外備註與用藥提醒。',
      concept: 'Extension 讓標準欄位之外的資訊仍能被結構化保存，滿足實務情境需要。',
      practical: '像特殊服藥提醒、回診建議或藥師備註，都常需要透過 extension 額外補充。',
      relation: '這些補充資訊最後也會一起組進 Bundle，讓文件不只包含核心 Resource，還有延伸說明。'
    },
    compositionPreview: {
      title: '建立文件描述',
      action: '這一步先帶入 Composition 欄位，讓學生看到文件標題與時間如何對應到文件本身。',
      concept: 'Composition 是整份臨床文件的骨架，負責描述主題、作者、病人與文件結構。',
      practical: '它讓電子處方箋不只是多筆零散 Resource，而是一份有主題、有上下文的文件。',
      relation: '稍後送出時，Composition 會成為 Document Bundle 的核心 entry，帶領其他資源組裝成完整文件。'
    },
    bundleSubmit: {
      title: '組裝並提交 Document Bundle',
      action: '系統會建立 Composition，接著組裝並提交整份 Document Bundle 到 FHIR Server。',
      concept: 'Document Bundle 是把多筆彼此相關的 Resource 用文件形式包裝起來的 FHIR 傳遞單位。',
      practical: '這讓處方可以作為單一文件保存、交換與查詢，而不是分散在多個獨立請求中。',
      relation: '送出成功後，Consumer 就能依病人識別碼與其他條件查詢這整份電子處方箋。'
    },
    consumerSearch: {
      title: '切換到 Consumer 查詢',
      action: '最後系統會自動跳到 Consumer，查詢剛剛提交的 Bundle，並展示處方結果與詳情。',
      concept: 'Consumer 模組代表文件被成功建立後的查詢與檢視流程，是電子處方箋生命週期的下一站。',
      practical: '學生可以直接看到從 Creator 建立資料，到 Consumer 查詢成果的完整教學閉環。',
      relation: '這一步會驗證前面組裝的 Composition 與 Document Bundle 是否真的能被查到並正確顯示。'
    }
  },
  en: {
    organization: {
      title: 'Create Organization',
      action: 'The app fills and submits an Organization to identify which healthcare institution issued this prescription.',
      concept: 'Organization represents the hospital or clinic that owns the prescription document.',
      practical: 'In practice, the organization name and code identify the source institution and support later search and traceability.',
      relation: 'This resource is later referenced by Encounter, Composition, and the final Bundle as part of the document context.'
    },
    patient: {
      title: 'Create Patient',
      action: 'Next, the app creates the Patient resource with the name, student ID, and demographics.',
      concept: 'Patient is the main subject of the prescription, and many other resources point back to this record.',
      practical: 'The patient identifier is essential for lookup, matching, and exchange across systems, and it is the primary Consumer search key.',
      relation: 'Composition.subject and several later resources reference this patient before everything is packaged into the Bundle.'
    },
    practitioner: {
      title: 'Create Practitioner',
      action: 'This step creates the prescribing Practitioner with name, license number, and specialty information.',
      concept: 'Practitioner represents the clinician who issued the prescription and serves as an important source-of-order record.',
      practical: 'Provider identity and qualification matter for accountability and also support author-based search flows.',
      relation: 'MedicationRequest.requester and Composition.author later reference this practitioner.'
    },
    encounter: {
      title: 'Create Encounter',
      action: 'The app creates an Encounter to capture the care setting, visit type, and visit timing.',
      concept: 'Encounter describes the real clinical event, such as an outpatient visit, emergency visit, or admission.',
      practical: 'It links diagnoses, observations, and prescriptions to the same visit so the clinical story remains coherent.',
      relation: 'Condition, Observation, and MedicationRequest can all reference the same Encounter in the final Bundle.'
    },
    condition: {
      title: 'Create Condition',
      action: 'This step creates the Condition resource with the diagnosis code and diagnosis display.',
      concept: 'Condition captures the clinical diagnosis that explains the medical context behind the prescription.',
      practical: 'Diagnosis data helps explain why the prescription exists and helps students connect treatment to the underlying problem.',
      relation: 'The diagnosis is bundled together with the Encounter and MedicationRequest to form a complete clinical narrative.'
    },
    observation: {
      title: 'Create Observation',
      action: 'The app creates an Observation to record a measurement or lab result for this visit.',
      concept: 'Observation stores objective measurements such as temperature, blood pressure, or other test results.',
      practical: 'These values add clinical evidence and show that a prescription is supported by structured findings.',
      relation: 'Observation is packaged into the Document Bundle together with the Encounter and Condition.'
    },
    coverage: {
      title: 'Create Coverage',
      action: 'Next, the app creates a Coverage resource to record the patient’s insurance identity and validity period.',
      concept: 'Coverage represents insurance or payment eligibility associated with this visit.',
      practical: 'Coverage matters for reimbursement, claims, and patient payment responsibility in real-world workflows.',
      relation: 'This insurance information is bundled with the patient and prescription content to describe the visit more completely.'
    },
    medication: {
      title: 'Create Medication',
      action: 'The app creates a Medication resource describing the drug used in this prescription.',
      concept: 'Medication represents the drug itself, including its code, display name, and form.',
      practical: 'The prescription details cannot exist cleanly without first identifying which medication is being ordered.',
      relation: 'MedicationRequest later references this Medication, and both are included in the final Bundle.'
    },
    medicationRequest: {
      title: 'Create MedicationRequest',
      action: 'This step creates the actual prescription order with dose, frequency, route, and duration.',
      concept: 'MedicationRequest is the core prescribing resource that captures what the clinician ordered.',
      practical: 'This is the most important prescription content because it controls which medicine the patient takes and how it is taken.',
      relation: 'It ties together the patient, practitioner, encounter, coverage, and medication before everything is assembled into the Bundle.'
    },
    extension: {
      title: 'Create Extension Data',
      action: 'The app creates extension-style supplemental data for extra notes and medication instructions.',
      concept: 'Extensions allow structured information that does not fit neatly into the standard core fields.',
      practical: 'Special administration notes, follow-up reminders, and pharmacist comments often need this extra layer of detail.',
      relation: 'The supplemental information is bundled with the core resources so the final document preserves more than just the minimum required fields.'
    },
    compositionPreview: {
      title: 'Prepare Composition',
      action: 'This step fills the Composition fields so students can see how the document title and timestamp belong to the document layer itself.',
      concept: 'Composition is the document backbone that defines the subject, author, context, and structure of a clinical document.',
      practical: 'It turns a set of separate resources into a coherent prescription document rather than a disconnected collection of records.',
      relation: 'In the next step, Composition becomes the anchor entry inside the Document Bundle.'
    },
    bundleSubmit: {
      title: 'Assemble and Submit the Document Bundle',
      action: 'The app creates the Composition and then assembles and submits the full Document Bundle to the FHIR Server.',
      concept: 'A Document Bundle packages multiple related resources into a single document-style FHIR payload.',
      practical: 'This allows the prescription to be saved, exchanged, and queried as one document instead of many isolated requests.',
      relation: 'Once submission succeeds, the Consumer module can query and display the completed electronic prescription.'
    },
    consumerSearch: {
      title: 'Open Consumer and Search',
      action: 'Finally, the app moves to Consumer, searches for the newly submitted Bundle, and displays the prescription result and details.',
      concept: 'Consumer represents the retrieval and viewing phase after the prescription document has been created.',
      practical: 'Students can observe the full teaching loop from resource creation in Creator to query and review in Consumer.',
      relation: 'This final step verifies that the Composition and Document Bundle can be discovered and rendered correctly.'
    }
  }
}

export function getLiveDemoNarrative(
  stepId: LiveDemoStepId,
  locale: SupportedLocale
): LiveDemoNarrative {
  return liveDemoNarratives[locale]?.[stepId] ?? liveDemoNarratives['zh-TW'][stepId]
}
