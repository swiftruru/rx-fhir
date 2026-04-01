import type { MockResourcePresetMap } from './types'

export const mockResourcePresets: MockResourcePresetMap = {
  patient: [
    { familyName: '呂', givenName: '采潔', studentId: 'S1101011', gender: 'female', birthDate: '1988-12-05' },
    { familyName: '蘇', givenName: '宇晨', studentId: 'S1101012', gender: 'other', birthDate: '2003-08-29' }
  ],
  organization: [
    { name: '安心社區藥局', identifier: 'PHARM001', type: 'pharmacy' },
    { name: '晴安兒科診所', identifier: 'CLIN104', type: 'clinic' }
  ],
  practitioner: [
    { familyName: '沈', givenName: '怡安', licenseNumber: 'MED20009', qualification: '藥師諮詢門診' },
    { familyName: '何', givenName: '博元', licenseNumber: 'MED20010', qualification: '神經內科' }
  ],
  encounter: [
    { class: 'IMP', periodStart: '2026-03-12T08:30', periodEnd: '2026-03-14T09:00' },
    { class: 'AMB', periodStart: '2026-03-22T17:10', periodEnd: '' }
  ],
  condition: [
    { icdCode: 'J45.909', icdDisplay: '氣喘，未明示，未合併急性惡化', clinicalStatus: 'active' },
    { icdCode: 'G43.909', icdDisplay: '偏頭痛，未明示，未合併偏頭痛持續狀態', clinicalStatus: 'active' },
    { icdCode: 'E78.5', icdDisplay: '高脂血症，未明示', clinicalStatus: 'active' },
    { icdCode: 'J30.9', icdDisplay: '過敏性鼻炎，未明示', clinicalStatus: 'active' }
  ],
  observation: [
    { loincCode: '8462-4', display: '舒張壓', value: 92, unit: 'mmHg', status: 'final' },
    { loincCode: '4548-4', display: '血紅素 A1c', value: 7.2, unit: '%', status: 'final' },
    { loincCode: '2093-3', display: '總膽固醇', value: 212, unit: 'mg/dL', status: 'final' },
    { loincCode: '2708-6', display: '血氧飽和度', value: 97, unit: '%', status: 'preliminary' }
  ],
  coverage: [
    { type: 'PAY', subscriberId: 'HC009900111', periodStart: '2026-03-01', periodEnd: '' },
    { type: 'PUBLICPOL', subscriberId: 'HC009900222', periodStart: '2026-01-15', periodEnd: '2026-12-31' }
  ],
  medication: [
    { code: 'A10BA02', display: '二甲雙胍 Metformin', codeSystem: 'atc', form: 'TAB' },
    { code: 'R06AE07', display: '西替利嗪 Cetirizine', codeSystem: 'atc', form: 'TAB' },
    { code: 'M01AE01', display: '布洛芬 Ibuprofen', codeSystem: 'atc', form: 'TAB' },
    { code: 'R03AC02', display: '沙丁胺醇 Salbutamol', codeSystem: 'atc', form: 'SOL' }
  ],
  medicationRequest: [
    { doseValue: 2, doseUnit: 'puff', frequency: 'PRN', route: '46713006', durationDays: 14, note: '喘時使用。' },
    { doseValue: 1, doseUnit: 'layer', frequency: 'BID', route: '6064005', durationDays: 7, note: '薄擦患部。' },
    { doseValue: 5, doseUnit: 'mL', frequency: 'TID', route: '26643006', durationDays: 5, note: '兒童專用劑量。' },
    { doseValue: 1, doseUnit: 'amp', frequency: 'QD', route: '47625008', durationDays: 3, note: '需由醫護人員施打。' }
  ],
  composition: [],
  extension: [
    {
      codeCode: 'pharmacist-note',
      codeDisplay: '藥師提醒',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
      ext1Value: '請避免與酒精同時使用。',
      ext2Url: '',
      ext2Value: ''
    },
    {
      codeCode: 'activity-restriction',
      codeDisplay: '活動限制',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/activity-restriction',
      ext1Value: '兩天內避免激烈運動。',
      ext2Url: '',
      ext2Value: ''
    },
    {
      codeCode: 'pediatric-counseling',
      codeDisplay: '兒科衛教',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pediatric-counseling',
      ext1Value: '鼓勵補充水分並觀察尿量。',
      ext2Url: '',
      ext2Value: ''
    },
    {
      codeCode: 'follow-up-note',
      codeDisplay: '追蹤提醒',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
      ext1Value: '七天內若未改善請回診。',
      ext2Url: '',
      ext2Value: ''
    }
  ]
}
