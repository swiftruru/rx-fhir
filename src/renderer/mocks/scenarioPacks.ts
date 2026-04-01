import type { MockScenarioPack } from './types'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toDateTimeLocalString(date: Date): string {
  return `${toDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function relativeDate(daysAgo: number, hour: number, minute: number): string {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return toDateTimeLocalString(date)
}

function relativeDatePlusMinutes(source: string, minutes: number): string {
  const date = new Date(source)
  date.setMinutes(date.getMinutes() + minutes)
  return toDateTimeLocalString(date)
}

function dateOnly(value: string): string {
  return value.slice(0, 10)
}

const foundationUriStart = relativeDate(14, 9, 10)
const foundationGerdStart = relativeDate(23, 10, 20)
const chronicHtnStart = relativeDate(37, 8, 40)
const chronicDmStart = relativeDate(45, 14, 20)
const pediatricFeverStart = relativeDate(10, 19, 5)
const emergencyAllergyStart = relativeDate(5, 22, 15)
const acuteMskStart = relativeDate(12, 13, 30)
const optionalMinimalStart = relativeDate(18, 11, 5)
const searchDemoA1Start = relativeDate(29, 9, 25)
const searchDemoA2Start = relativeDate(4, 16, 10)

export const mockScenarioPacks: MockScenarioPack[] = [
  {
    id: 'foundation-uri-01',
    category: 'foundation',
    label: '一般門診上呼吸道感染',
    description: '最基礎的門診示範情境，適合第一次展示 Creator 與 Consumer。',
    tags: ['outpatient', 'foundation', 'uri'],
    creator: {
      organization: { name: '臺大醫院', identifier: 'NTUH001', type: 'hospital' },
      patient: { familyName: '王', givenName: '小明', studentId: 'S1101001', gender: 'male', birthDate: '2000-03-15' },
      practitioner: { familyName: '李', givenName: '大仁', licenseNumber: 'MED20001', qualification: '一般科' },
      encounter: { class: 'AMB', periodStart: foundationUriStart, periodEnd: relativeDatePlusMinutes(foundationUriStart, 25) },
      condition: { icdCode: 'J06.9', icdDisplay: '急性上呼吸道感染', clinicalStatus: 'active' },
      observation: { loincCode: '8310-5', display: '體溫', value: 38.2, unit: 'Cel', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234567', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'N02BE01', display: '乙醯胺酚 Acetaminophen', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 500, doseUnit: 'mg', frequency: 'QID', route: '26643006', durationDays: 5, note: '發燒或喉嚨痛時服用。' },
      composition: { title: '電子處方箋', date: relativeDatePlusMinutes(foundationUriStart, 30) },
      extension: {
        codeCode: 'special-instruction',
        codeDisplay: '特殊給藥指示',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext1Value: '飯後 30 分鐘服用，若症狀改善可停止。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
        ext2Value: '若持續高燒超過 3 天請回診。'
      }
    }
  },
  {
    id: 'foundation-gerd-01',
    category: 'foundation',
    label: '預設示範病人：潘小如',
    description: '預設示範病人情境，用於 Creator 的第一筆病人 Fill Mock，並保留常見腸胃不適門診脈絡。',
    tags: ['outpatient', 'foundation', 'gerd', 'primary-demo', 'pan-xiaoru'],
    isPrimaryDemo: true,
    creator: {
      organization: { name: '馬偕醫院', identifier: 'MMHF001', type: 'hospital' },
      patient: { familyName: '潘', givenName: '小如', studentId: '142216009', gender: 'female', birthDate: '2000-06-09' },
      practitioner: { familyName: '張', givenName: '美玲', licenseNumber: 'MED20002', qualification: '內科' },
      encounter: { class: 'AMB', periodStart: foundationGerdStart, periodEnd: relativeDatePlusMinutes(foundationGerdStart, 30) },
      condition: { icdCode: 'K21.9', icdDisplay: '胃食道逆流疾病', clinicalStatus: 'active' },
      observation: { loincCode: '29463-7', display: '體重', value: 54, unit: 'kg', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234568', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'A02BC01', display: '奧美拉唑 Omeprazole', codeSystem: 'atc', form: 'CAP' },
      medicationRequest: { doseValue: 20, doseUnit: 'mg', frequency: 'QD', route: '26643006', durationDays: 14, note: '早餐前 30 分鐘服用。' },
      composition: { title: '門診處方箋', date: relativeDatePlusMinutes(foundationGerdStart, 35) },
      extension: {
        codeCode: 'care-note',
        codeDisplay: '慢性病管理備註',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext1Value: '避免宵夜與咖啡因攝取。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        ext2Value: '兩週後回診追蹤症狀。'
      }
    }
  },
  {
    id: 'chronic-htn-01',
    category: 'chronic',
    label: '高血壓追蹤',
    description: '展示慢性病追蹤情境，含血壓觀察值與長天數處方。',
    tags: ['chronic', 'hypertension', 'follow-up'],
    creator: {
      organization: { name: '和盛診所', identifier: 'CLIN100', type: 'clinic' },
      patient: { familyName: '陳', givenName: '志豪', studentId: 'S1101003', gender: 'male', birthDate: '2001-11-05' },
      practitioner: { familyName: '陳', givenName: '建宏', licenseNumber: 'MED20003', qualification: '家醫科' },
      encounter: { class: 'AMB', periodStart: chronicHtnStart, periodEnd: relativeDatePlusMinutes(chronicHtnStart, 20) },
      condition: { icdCode: 'I10', icdDisplay: '原發性高血壓', clinicalStatus: 'active' },
      observation: { loincCode: '8480-6', display: '收縮壓', value: 148, unit: 'mmHg', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234569', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'C09AA05', display: '依那普利 Enalapril', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 10, doseUnit: 'mg', frequency: 'BID', route: '26643006', durationDays: 28, note: '每日固定量測血壓並記錄。' },
      composition: { title: '慢性病追蹤處方箋', date: relativeDatePlusMinutes(chronicHtnStart, 25) },
      extension: {
        codeCode: 'care-note',
        codeDisplay: '慢性病管理備註',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext1Value: '血壓控制目標低於 130/80 mmHg。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        ext2Value: '四週後攜帶血壓紀錄回診。'
      }
    }
  },
  {
    id: 'chronic-dm-01',
    category: 'chronic',
    label: '糖尿病慢箋',
    description: '展示代謝疾病與餐後用藥說明。',
    tags: ['chronic', 'diabetes', 'metabolic'],
    creator: {
      organization: { name: '仁愛家醫診所', identifier: 'CLIN101', type: 'clinic' },
      patient: { familyName: '黃', givenName: '雅婷', studentId: 'S1101004', gender: 'female', birthDate: '1999-01-12' },
      practitioner: { familyName: '周', givenName: '怡君', licenseNumber: 'MED20004', qualification: '新陳代謝科' },
      encounter: { class: 'AMB', periodStart: chronicDmStart, periodEnd: relativeDatePlusMinutes(chronicDmStart, 35) },
      condition: { icdCode: 'E11.9', icdDisplay: '第2型糖尿病，無併發症', clinicalStatus: 'active' },
      observation: { loincCode: '2345-7', display: '葡萄糖', value: 168, unit: 'mg/dL', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234570', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'A10BA02', display: '二甲雙胍 Metformin', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 500, doseUnit: 'mg', frequency: 'BID', route: '26643006', durationDays: 30, note: '飯後服用，避免空腹。' },
      composition: { title: '慢性病連續處方箋', date: relativeDatePlusMinutes(chronicDmStart, 40) },
      extension: {
        codeCode: 'care-note',
        codeDisplay: '慢性病管理備註',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext1Value: '請持續監測空腹血糖與餐後兩小時血糖。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        ext2Value: '一個月後追蹤 HbA1c。'
      }
    }
  },
  {
    id: 'pediatric-fever-01',
    category: 'pediatric',
    label: '小兒發燒門診',
    description: '小兒情境，適合展示年齡與體重差異。',
    tags: ['pediatric', 'fever', 'weight-based'],
    creator: {
      organization: { name: '中國附醫', identifier: 'CMUH001', type: 'hospital' },
      patient: { familyName: '吳', givenName: '小恩', studentId: 'S1101005', gender: 'male', birthDate: '2018-09-18' },
      practitioner: { familyName: '許', givenName: '婉如', licenseNumber: 'MED20005', qualification: '小兒科' },
      encounter: { class: 'AMB', periodStart: pediatricFeverStart, periodEnd: relativeDatePlusMinutes(pediatricFeverStart, 20) },
      condition: { icdCode: 'R50.9', icdDisplay: '發燒，未明示', clinicalStatus: 'active' },
      observation: { loincCode: '8310-5', display: '體溫', value: 39.1, unit: 'Cel', status: 'final' },
      coverage: { type: 'PUBLICPOL', subscriberId: 'HC001234571', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'N02BE01', display: '乙醯胺酚 Acetaminophen', codeSystem: 'atc', form: 'SOL' },
      medicationRequest: { doseValue: 240, doseUnit: 'mg', frequency: 'QID', route: '26643006', durationDays: 3, note: '依體重計算劑量，退燒後可停藥。' },
      composition: { title: '小兒門診處方箋', date: relativeDatePlusMinutes(pediatricFeverStart, 25) },
      extension: {
        codeCode: 'care-note',
        codeDisplay: '慢性病管理備註',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext1Value: '若精神差、持續高燒或抽搐請立即回急診。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
        ext2Value: '請使用量杯或量匙，不建議估量。'
      }
    }
  },
  {
    id: 'emergency-allergy-01',
    category: 'emergency',
    label: '急診過敏反應',
    description: '展示急診 Encounter 與未填結束時間的案例。',
    tags: ['emergency', 'allergy', 'optional-end-time'],
    creator: {
      organization: { name: '臺北榮總', identifier: 'VGH001', type: 'hospital' },
      patient: { familyName: '郭', givenName: '柏翰', studentId: 'S1101006', gender: 'male', birthDate: '1997-12-03' },
      practitioner: { familyName: '林', givenName: '冠宇', licenseNumber: 'MED20006', qualification: '急診醫學科' },
      encounter: { class: 'EMER', periodStart: emergencyAllergyStart, periodEnd: '' },
      condition: { icdCode: 'T78.4', icdDisplay: '過敏反應，未明示', clinicalStatus: 'active' },
      observation: { loincCode: '8867-4', display: '心率', value: 112, unit: 'beats/min', status: 'preliminary' },
      coverage: { type: 'PAY', subscriberId: 'HC001234572', periodStart: '2026-03-01', periodEnd: '' },
      medication: { code: 'R06AE07', display: '西替利嗪 Cetirizine', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 10, doseUnit: 'mg', frequency: 'QD', route: '26643006', durationDays: 5, note: '若出現嗜睡請避免開車。' },
      composition: { title: '急診處方箋', date: relativeDatePlusMinutes(emergencyAllergyStart, 15) },
      extension: {
        codeCode: 'allergy-info',
        codeDisplay: '過敏資訊補充',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-supplement',
        ext1Value: '疑似蝦蟹類食物引發蕁麻疹與呼吸不適。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-severity',
        ext2Value: '中度'
      }
    }
  },
  {
    id: 'acute-msk-01',
    category: 'acute',
    label: '肌肉骨骼疼痛門診',
    description: '短期疼痛控制與飯後服藥提示。',
    tags: ['acute', 'pain', 'musculoskeletal'],
    creator: {
      organization: { name: '和新復健診所', identifier: 'CLIN102', type: 'clinic' },
      patient: { familyName: '曾', givenName: '佩雯', studentId: 'S1101007', gender: 'female', birthDate: '1995-04-27' },
      practitioner: { familyName: '劉', givenName: '品妤', licenseNumber: 'MED20007', qualification: '骨科' },
      encounter: { class: 'AMB', periodStart: acuteMskStart, periodEnd: relativeDatePlusMinutes(acuteMskStart, 20) },
      condition: { icdCode: 'M79.1', icdDisplay: '肌痛', clinicalStatus: 'active' },
      observation: { loincCode: '29463-7', display: '體重', value: 61, unit: 'kg', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234573', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'M01AE01', display: '布洛芬 Ibuprofen', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 400, doseUnit: 'mg', frequency: 'TID', route: '26643006', durationDays: 5, note: '飯後服用，避免空腹。' },
      composition: { title: '復健門診處方箋', date: relativeDatePlusMinutes(acuteMskStart, 25) },
      extension: {
        codeCode: 'special-instruction',
        codeDisplay: '特殊給藥指示',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext1Value: '急性疼痛期請避免劇烈運動與負重。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
        ext2Value: '若胃痛或黑便請立即停藥並回診。'
      }
    }
  },
  {
    id: 'optional-minimal-01',
    category: 'optional-empty',
    label: '最小必要欄位案例',
    description: '用於測試 optional 欄位留空與 UI 顯示。',
    tags: ['minimal', 'optional', 'empty-fields'],
    creator: {
      organization: { name: '安康診所', identifier: 'CLIN103', type: 'clinic' },
      patient: { familyName: '謝', givenName: '承恩', studentId: 'S1101008', gender: 'male', birthDate: '2002-06-11' },
      practitioner: { familyName: '楊', givenName: '子涵', licenseNumber: 'MED20008', qualification: '家醫科' },
      encounter: { class: 'AMB', periodStart: optionalMinimalStart, periodEnd: '' },
      condition: { icdCode: 'K30', icdDisplay: '功能性消化不良', clinicalStatus: 'active' },
      observation: { loincCode: '29463-7', display: '體重', value: 68, unit: 'kg', status: 'final' },
      coverage: { type: 'PAY', subscriberId: 'HC001234574', periodStart: '2026-02-01', periodEnd: '' },
      medication: { code: 'A02BC01', display: '奧美拉唑 Omeprazole', codeSystem: 'atc', form: 'CAP' },
      medicationRequest: { doseValue: 20, doseUnit: 'mg', frequency: 'QD', route: '26643006', note: '' },
      composition: { title: '門診處方箋', date: relativeDatePlusMinutes(optionalMinimalStart, 20) },
      extension: {
        codeCode: 'special-instruction',
        codeDisplay: '特殊給藥指示',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext1Value: '若胃脹氣或症狀未改善，請提前回診。',
        ext2Url: '',
        ext2Value: ''
      }
    }
  },
  {
    id: 'search-demo-patient-a-01',
    category: 'search-demo',
    label: '同病人多筆處方示範 A',
    description: '用於 Consumer 搜尋展示，同病人不同日期與診斷。',
    tags: ['search-demo', 'same-patient', 'hypertension'],
    creator: {
      organization: { name: '臺大醫院', identifier: 'NTUH001', type: 'hospital' },
      patient: { familyName: '王', givenName: '小明', studentId: 'S1101001', gender: 'male', birthDate: '2000-03-15' },
      practitioner: { familyName: '李', givenName: '大仁', licenseNumber: 'MED20001', qualification: '一般科' },
      encounter: { class: 'AMB', periodStart: searchDemoA1Start, periodEnd: relativeDatePlusMinutes(searchDemoA1Start, 20) },
      condition: { icdCode: 'I10', icdDisplay: '原發性高血壓', clinicalStatus: 'active' },
      observation: { loincCode: '8480-6', display: '收縮壓', value: 142, unit: 'mmHg', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234567', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'C09AA05', display: '依那普利 Enalapril', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 10, doseUnit: 'mg', frequency: 'QD', route: '26643006', durationDays: 30, note: '每日早晨固定服用。' },
      composition: { title: '高血壓追蹤處方箋', date: relativeDatePlusMinutes(searchDemoA1Start, 25) },
      extension: {
        codeCode: 'care-note',
        codeDisplay: '慢性病管理備註',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext1Value: '請攜帶血壓紀錄本回診。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        ext2Value: '四週後回診。'
      }
    }
  },
  {
    id: 'search-demo-patient-a-02',
    category: 'search-demo',
    label: '同病人多筆處方示範 B',
    description: '同病人切換不同醫師與機構，方便展示複合查詢。',
    tags: ['search-demo', 'same-patient', 'allergy'],
    creator: {
      organization: { name: '馬偕醫院', identifier: 'MMHF001', type: 'hospital' },
      patient: { familyName: '王', givenName: '小明', studentId: 'S1101001', gender: 'male', birthDate: '2000-03-15' },
      practitioner: { familyName: '張', givenName: '美玲', licenseNumber: 'MED20002', qualification: '內科' },
      encounter: { class: 'AMB', periodStart: searchDemoA2Start, periodEnd: relativeDatePlusMinutes(searchDemoA2Start, 20) },
      condition: { icdCode: 'J30.9', icdDisplay: '過敏性鼻炎，未明示', clinicalStatus: 'active' },
      observation: { loincCode: '8867-4', display: '心率', value: 78, unit: 'beats/min', status: 'final' },
      coverage: { type: 'EHCPOL', subscriberId: 'HC001234567', periodStart: '2026-01-01', periodEnd: '2026-12-31' },
      medication: { code: 'R06AE07', display: '西替利嗪 Cetirizine', codeSystem: 'atc', form: 'TAB' },
      medicationRequest: { doseValue: 10, doseUnit: 'mg', frequency: 'QD', route: '26643006', durationDays: 7, note: '睡前服用，避免白天嗜睡。' },
      composition: { title: '過敏門診處方箋', date: relativeDatePlusMinutes(searchDemoA2Start, 25) },
      extension: {
        codeCode: 'allergy-info',
        codeDisplay: '過敏資訊補充',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-supplement',
        ext1Value: '近期接觸粉塵後鼻塞與眼睛發癢明顯。',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-severity',
        ext2Value: '輕度'
      }
    }
  }
]

export function getScenarioEncounterDate(scenario: MockScenarioPack): string {
  return dateOnly(scenario.creator.encounter.periodStart)
}
