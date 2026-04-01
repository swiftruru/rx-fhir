import type { MockResourcePresetSourceMap } from './types'

export const mockResourcePresetSources: MockResourcePresetSourceMap = {
  patient: [
    {
      studentId: 'S1101011',
      gender: 'female',
      birthDate: '1988-12-05',
      text: {
        'zh-TW': { familyName: '呂', givenName: '采潔' },
        en: { familyName: 'Lu', givenName: 'Cai-Jie' }
      }
    },
    {
      studentId: 'S1101012',
      gender: 'other',
      birthDate: '2003-08-29',
      text: {
        'zh-TW': { familyName: '蘇', givenName: '宇晨' },
        en: { familyName: 'Su', givenName: 'Yu-Chen' }
      }
    }
  ],
  organization: [
    {
      identifier: 'PHARM001',
      type: 'pharmacy',
      text: {
        'zh-TW': { name: '安心社區藥局' },
        en: { name: 'Anxin Community Pharmacy' }
      }
    },
    {
      identifier: 'CLIN104',
      type: 'clinic',
      text: {
        'zh-TW': { name: '晴安兒科診所' },
        en: { name: 'Qing-An Pediatrics Clinic' }
      }
    }
  ],
  practitioner: [
    {
      licenseNumber: 'MED20009',
      text: {
        'zh-TW': { familyName: '沈', givenName: '怡安', qualification: '藥師諮詢門診' },
        en: { familyName: 'Shen', givenName: 'Yi-An', qualification: 'Pharmacist Consultation Clinic' }
      }
    },
    {
      licenseNumber: 'MED20010',
      text: {
        'zh-TW': { familyName: '何', givenName: '博元', qualification: '神經內科' },
        en: { familyName: 'Ho', givenName: 'Po-Yuan', qualification: 'Neurology' }
      }
    }
  ],
  encounter: [
    { class: 'IMP', periodStart: '2026-03-12T08:30', periodEnd: '2026-03-14T09:00' },
    { class: 'AMB', periodStart: '2026-03-22T17:10', periodEnd: '' }
  ],
  condition: [
    {
      icdCode: 'J45.909',
      clinicalStatus: 'active',
      text: {
        'zh-TW': { icdDisplay: '氣喘，未明示，未合併急性惡化' },
        en: { icdDisplay: 'Asthma, unspecified, uncomplicated' }
      }
    },
    {
      icdCode: 'G43.909',
      clinicalStatus: 'active',
      text: {
        'zh-TW': { icdDisplay: '偏頭痛，未明示，未合併偏頭痛持續狀態' },
        en: { icdDisplay: 'Migraine, unspecified, not intractable, without status migrainosus' }
      }
    },
    {
      icdCode: 'E78.5',
      clinicalStatus: 'active',
      text: {
        'zh-TW': { icdDisplay: '高脂血症，未明示' },
        en: { icdDisplay: 'Hyperlipidemia, unspecified' }
      }
    },
    {
      icdCode: 'J30.9',
      clinicalStatus: 'active',
      text: {
        'zh-TW': { icdDisplay: '過敏性鼻炎，未明示' },
        en: { icdDisplay: 'Allergic rhinitis, unspecified' }
      }
    }
  ],
  observation: [
    {
      loincCode: '8462-4',
      value: 92,
      unit: 'mmHg',
      status: 'final',
      text: {
        'zh-TW': { display: '舒張壓' },
        en: { display: 'Diastolic blood pressure' }
      }
    },
    {
      loincCode: '4548-4',
      value: 7.2,
      unit: '%',
      status: 'final',
      text: {
        'zh-TW': { display: '血紅素 A1c' },
        en: { display: 'Hemoglobin A1c' }
      }
    },
    {
      loincCode: '2093-3',
      value: 212,
      unit: 'mg/dL',
      status: 'final',
      text: {
        'zh-TW': { display: '總膽固醇' },
        en: { display: 'Total cholesterol' }
      }
    },
    {
      loincCode: '2708-6',
      value: 97,
      unit: '%',
      status: 'preliminary',
      text: {
        'zh-TW': { display: '血氧飽和度' },
        en: { display: 'Oxygen saturation' }
      }
    }
  ],
  coverage: [
    { type: 'PAY', subscriberId: 'HC009900111', periodStart: '2026-03-01', periodEnd: '' },
    { type: 'PUBLICPOL', subscriberId: 'HC009900222', periodStart: '2026-01-15', periodEnd: '2026-12-31' }
  ],
  medication: [
    {
      code: 'A10BA02',
      codeSystem: 'atc',
      form: 'TAB',
      text: {
        'zh-TW': { display: '二甲雙胍 Metformin' },
        en: { display: 'Metformin' }
      }
    },
    {
      code: 'R06AE07',
      codeSystem: 'atc',
      form: 'TAB',
      text: {
        'zh-TW': { display: '西替利嗪 Cetirizine' },
        en: { display: 'Cetirizine' }
      }
    },
    {
      code: 'M01AE01',
      codeSystem: 'atc',
      form: 'TAB',
      text: {
        'zh-TW': { display: '布洛芬 Ibuprofen' },
        en: { display: 'Ibuprofen' }
      }
    },
    {
      code: 'R03AC02',
      codeSystem: 'atc',
      form: 'SOL',
      text: {
        'zh-TW': { display: '沙丁胺醇 Salbutamol' },
        en: { display: 'Salbutamol' }
      }
    }
  ],
  medicationRequest: [
    {
      doseValue: 2,
      doseUnit: 'puff',
      frequency: 'PRN',
      route: '46713006',
      durationDays: 14,
      text: {
        'zh-TW': { note: '喘時使用。' },
        en: { note: 'Use as needed for wheezing.' }
      }
    },
    {
      doseValue: 1,
      doseUnit: 'layer',
      frequency: 'BID',
      route: '6064005',
      durationDays: 7,
      text: {
        'zh-TW': { note: '薄擦患部。' },
        en: { note: 'Apply a thin layer to the affected area.' }
      }
    },
    {
      doseValue: 5,
      doseUnit: 'mL',
      frequency: 'TID',
      route: '26643006',
      durationDays: 5,
      text: {
        'zh-TW': { note: '兒童專用劑量。' },
        en: { note: 'Pediatric dose only.' }
      }
    },
    {
      doseValue: 1,
      doseUnit: 'amp',
      frequency: 'QD',
      route: '47625008',
      durationDays: 3,
      text: {
        'zh-TW': { note: '需由醫護人員施打。' },
        en: { note: 'Must be administered by healthcare staff.' }
      }
    }
  ],
  composition: [],
  extension: [
    {
      codeCode: 'pharmacist-note',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
      ext2Url: '',
      text: {
        'zh-TW': {
          codeDisplay: '藥師提醒',
          ext1Value: '請避免與酒精同時使用。',
          ext2Value: ''
        },
        en: {
          codeDisplay: 'Pharmacist note',
          ext1Value: 'Avoid alcohol while using this medication.',
          ext2Value: ''
        }
      }
    },
    {
      codeCode: 'activity-restriction',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/activity-restriction',
      ext2Url: '',
      text: {
        'zh-TW': {
          codeDisplay: '活動限制',
          ext1Value: '兩天內避免激烈運動。',
          ext2Value: ''
        },
        en: {
          codeDisplay: 'Activity restriction',
          ext1Value: 'Avoid strenuous exercise for two days.',
          ext2Value: ''
        }
      }
    },
    {
      codeCode: 'pediatric-counseling',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pediatric-counseling',
      ext2Url: '',
      text: {
        'zh-TW': {
          codeDisplay: '兒科衛教',
          ext1Value: '鼓勵補充水分並觀察尿量。',
          ext2Value: ''
        },
        en: {
          codeDisplay: 'Pediatric counseling',
          ext1Value: 'Encourage hydration and monitor urine output.',
          ext2Value: ''
        }
      }
    },
    {
      codeCode: 'follow-up-note',
      ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
      ext2Url: '',
      text: {
        'zh-TW': {
          codeDisplay: '追蹤提醒',
          ext1Value: '七天內若未改善請回診。',
          ext2Value: ''
        },
        en: {
          codeDisplay: 'Follow-up reminder',
          ext1Value: 'Return within seven days if symptoms do not improve.',
          ext2Value: ''
        }
      }
    }
  ]
}
