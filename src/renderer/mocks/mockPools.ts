// Mock data pools for quick-fill in creator forms and consumer search.
// Each pool has 3 entries; cycling is managed per-form via useRef.

export const patientMocks = [
  { familyName: '王', givenName: '小明', studentId: 'S1101001', gender: 'male' as const,   birthDate: '2000-03-15' },
  { familyName: '林', givenName: '美華', studentId: 'S1101002', gender: 'female' as const, birthDate: '1998-07-22' },
  { familyName: '陳', givenName: '志豪', studentId: 'S1101003', gender: 'male' as const,   birthDate: '2001-11-05' },
  { familyName: '潘', givenName: '如如', studentId: '142216009', gender: 'female' as const, birthDate: '2000-06-09' },
]

export const organizationMocks = [
  { name: '臺大醫院', identifier: 'NTUH001', type: 'hospital' as const },
  { name: '馬偕醫院', identifier: 'MMHF001', type: 'hospital' as const },
  { name: '良安診所', identifier: 'CLIN001', type: 'clinic'  as const },
]

export const practitionerMocks = [
  { familyName: '李', givenName: '大仁', licenseNumber: 'MED20001', qualification: '一般科' },
  { familyName: '張', givenName: '美玲', licenseNumber: 'MED20002', qualification: '內科'   },
  { familyName: '陳', givenName: '建宏', licenseNumber: 'MED20003', qualification: '家醫科' },
]

export const encounterMocks = [
  { class: 'AMB'  as const, periodStart: '2025-01-10T09:00', periodEnd: '2025-01-10T09:30' },
  { class: 'AMB'  as const, periodStart: '2025-02-15T14:00', periodEnd: '2025-02-15T14:45' },
  { class: 'EMER' as const, periodStart: '2025-03-05T20:00', periodEnd: '' },
]

export const conditionMocks = [
  { icdCode: 'J06.9', icdDisplay: '急性上呼吸道感染', clinicalStatus: 'active'   as const },
  { icdCode: 'I10',   icdDisplay: '原發性高血壓',       clinicalStatus: 'active'   as const },
  { icdCode: 'E11.9', icdDisplay: '第2型糖尿病，無併發症', clinicalStatus: 'active' as const },
]

export const observationMocks = [
  { loincCode: '8480-6',  display: '收縮壓',    value: 120, unit: 'mmHg',       status: 'final' as const },
  { loincCode: '8867-4',  display: '心率',      value: 72,  unit: 'beats/min',  status: 'final' as const },
  { loincCode: '29463-7', display: '體重',      value: 65,  unit: 'kg',         status: 'final' as const },
]

export const coverageMocks = [
  { type: 'EHCPOL'    as const, subscriberId: 'HC001234567', periodStart: '2025-01-01', periodEnd: '2025-12-31' },
  { type: 'PUBLICPOL' as const, subscriberId: 'HC987654321', periodStart: '2024-07-01', periodEnd: '2025-06-30' },
  { type: 'PAY'       as const, subscriberId: 'HC555000111', periodStart: '2025-03-01', periodEnd: '' },
]

export const medicationMocks = [
  { code: 'N02BE01', display: '乙醯胺酚 Acetaminophen', codeSystem: 'atc' as const, form: 'TAB' as const },
  { code: 'J01CA04', display: '安莫西林 Amoxicillin',   codeSystem: 'atc' as const, form: 'CAP' as const },
  { code: 'A02BC01', display: '奧美拉唑 Omeprazole',    codeSystem: 'atc' as const, form: 'CAP' as const },
]

export const medicationRequestMocks = [
  { doseValue: 500, doseUnit: 'mg', frequency: 'QID' as const, route: '26643006' as const, durationDays: 5,  note: '' },
  { doseValue: 250, doseUnit: 'mg', frequency: 'TID' as const, route: '26643006' as const, durationDays: 7,  note: '' },
  { doseValue: 20,  doseUnit: 'mg', frequency: 'QD'  as const, route: '26643006' as const, durationDays: 14, note: '' },
]

export const compositionMocks = [
  { title: '電子處方箋' },
  { title: '門診處方箋' },
  { title: '急診處方箋' },
]

export const extensionMocks = [
  {
    codeCode: 'special-instruction',
    codeDisplay: '特殊給藥指示',
    ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
    ext1Value: '飯後30分鐘服用，避免與制酸劑併服',
    ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
    ext2Value: '需監測腎功能'
  },
  {
    codeCode: 'allergy-info',
    codeDisplay: '過敏資訊補充',
    ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-supplement',
    ext1Value: '對磺胺類藥物過敏（皮疹）',
    ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-severity',
    ext2Value: '中度'
  },
  {
    codeCode: 'care-note',
    codeDisplay: '慢性病管理備註',
    ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
    ext1Value: '血壓控制目標：<130/80 mmHg',
    ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
    ext2Value: '3個月後回診'
  },
]

// Consumer search prefill pools — keyed by tab
export const consumerBasicMocks = [
  { searchBy: 'identifier' as const, value: 'S1101001' },
  { searchBy: 'identifier' as const, value: 'S1101002' },
  { searchBy: 'identifier' as const, value: 'S1101003' },
  { searchBy: 'identifier' as const, value: '142216009' },
]

export const consumerDateMocks = [
  { identifier: 'S1101001',  date: '2025-01-10' },
  { identifier: 'S1101002',  date: '2025-02-15' },
  { identifier: 'S1101003',  date: '2025-03-05' },
  { identifier: '142216009', date: '2025-06-09' },
]

export const consumerComplexMocks = [
  { identifier: 'S1101001',  complexBy: 'organization' as const, orgId: 'NTUH001', authorName: '' },
  { identifier: 'S1101002',  complexBy: 'organization' as const, orgId: 'MMHF001', authorName: '' },
  { identifier: 'S1101003',  complexBy: 'author'       as const, orgId: '',        authorName: '李大仁' },
  { identifier: '142216009', complexBy: 'organization' as const, orgId: 'CLIN001', authorName: '' },
]
