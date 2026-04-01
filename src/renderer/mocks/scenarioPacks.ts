import type { MockScenarioPackSource } from './types'

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

export const mockScenarioPackSources: MockScenarioPackSource[] = [
  {
    id: 'foundation-uri-01',
    category: 'foundation',
    label: {
      'zh-TW': '一般門診上呼吸道感染',
      en: 'General Outpatient URI'
    },
    description: {
      'zh-TW': '最基礎的門診示範情境，適合第一次展示 Creator 與 Consumer。',
      en: 'A baseline outpatient scenario for the first Creator and Consumer demo.'
    },
    tags: ['outpatient', 'foundation', 'uri'],
    creator: {
      organization: {
        identifier: 'NTUH001',
        type: 'hospital',
        text: {
          'zh-TW': { name: '臺大醫院' },
          en: { name: 'National Taiwan University Hospital' }
        }
      },
      patient: {
        studentId: 'S1101001',
        gender: 'male',
        birthDate: '2000-03-15',
        text: {
          'zh-TW': { familyName: '王', givenName: '小明' },
          en: { familyName: 'Wang', givenName: 'Xiao-Ming' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20001',
        text: {
          'zh-TW': { familyName: '李', givenName: '大仁', qualification: '一般科' },
          en: { familyName: 'Li', givenName: 'Da-Ren', qualification: 'General Medicine' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: foundationUriStart,
        periodEnd: relativeDatePlusMinutes(foundationUriStart, 25)
      },
      condition: {
        icdCode: 'J06.9',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '急性上呼吸道感染' },
          en: { icdDisplay: 'Acute upper respiratory infection' }
        }
      },
      observation: {
        loincCode: '8310-5',
        value: 38.2,
        unit: 'Cel',
        status: 'final',
        text: {
          'zh-TW': { display: '體溫' },
          en: { display: 'Body temperature' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234567',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'N02BE01',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '乙醯胺酚 Acetaminophen' },
          en: { display: 'Acetaminophen' }
        }
      },
      medicationRequest: {
        doseValue: 500,
        doseUnit: 'mg',
        frequency: 'QID',
        route: '26643006',
        durationDays: 5,
        text: {
          'zh-TW': { note: '發燒或喉嚨痛時服用。' },
          en: { note: 'Take as needed for fever or sore throat.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(foundationUriStart, 30),
        text: {
          'zh-TW': { title: '電子處方箋' },
          en: { title: 'Electronic Prescription' }
        }
      },
      extension: {
        codeCode: 'special-instruction',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
        text: {
          'zh-TW': {
            codeDisplay: '特殊給藥指示',
            ext1Value: '飯後 30 分鐘服用，若症狀改善可停止。',
            ext2Value: '若持續高燒超過 3 天請回診。'
          },
          en: {
            codeDisplay: 'Special administration instruction',
            ext1Value: 'Take 30 minutes after meals and stop if symptoms improve.',
            ext2Value: 'Return for follow-up if the fever lasts more than 3 days.'
          }
        }
      }
    }
  },
  {
    id: 'foundation-gerd-01',
    category: 'foundation',
    label: {
      'zh-TW': '預設示範病人：潘小如',
      en: 'Primary Demo Patient: Pan Xiao-Ru'
    },
    description: {
      'zh-TW': '預設示範病人情境，用於 Creator 的第一筆病人 Fill Mock，並保留常見腸胃不適門診脈絡。',
      en: 'The primary demo patient scenario for the first Patient Fill Mock, based on a common GERD outpatient visit.'
    },
    tags: ['outpatient', 'foundation', 'gerd', 'primary-demo', 'pan-xiaoru'],
    isPrimaryDemo: true,
    creator: {
      organization: {
        identifier: 'MMHF001',
        type: 'hospital',
        text: {
          'zh-TW': { name: '馬偕醫院' },
          en: { name: 'Mackay Memorial Hospital' }
        }
      },
      patient: {
        studentId: '142216009',
        gender: 'female',
        birthDate: '2000-06-09',
        text: {
          'zh-TW': { familyName: '潘', givenName: '小如' },
          en: { familyName: 'Pan', givenName: 'Xiao-Ru' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20002',
        text: {
          'zh-TW': { familyName: '張', givenName: '美玲', qualification: '內科' },
          en: { familyName: 'Chang', givenName: 'Mei-Ling', qualification: 'Internal Medicine' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: foundationGerdStart,
        periodEnd: relativeDatePlusMinutes(foundationGerdStart, 30)
      },
      condition: {
        icdCode: 'K21.9',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '胃食道逆流疾病' },
          en: { icdDisplay: 'Gastroesophageal reflux disease' }
        }
      },
      observation: {
        loincCode: '29463-7',
        value: 54,
        unit: 'kg',
        status: 'final',
        text: {
          'zh-TW': { display: '體重' },
          en: { display: 'Body weight' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234568',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'A02BC01',
        codeSystem: 'atc',
        form: 'CAP',
        text: {
          'zh-TW': { display: '奧美拉唑 Omeprazole' },
          en: { display: 'Omeprazole' }
        }
      },
      medicationRequest: {
        doseValue: 20,
        doseUnit: 'mg',
        frequency: 'QD',
        route: '26643006',
        durationDays: 14,
        text: {
          'zh-TW': { note: '早餐前 30 分鐘服用。' },
          en: { note: 'Take 30 minutes before breakfast.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(foundationGerdStart, 35),
        text: {
          'zh-TW': { title: '門診處方箋' },
          en: { title: 'Outpatient Prescription' }
        }
      },
      extension: {
        codeCode: 'care-note',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        text: {
          'zh-TW': {
            codeDisplay: '慢性病管理備註',
            ext1Value: '避免宵夜與咖啡因攝取。',
            ext2Value: '兩週後回診追蹤症狀。'
          },
          en: {
            codeDisplay: 'Chronic care note',
            ext1Value: 'Avoid late-night meals and caffeine intake.',
            ext2Value: 'Return in two weeks for symptom follow-up.'
          }
        }
      }
    }
  },
  {
    id: 'chronic-htn-01',
    category: 'chronic',
    label: {
      'zh-TW': '高血壓追蹤',
      en: 'Hypertension Follow-up'
    },
    description: {
      'zh-TW': '展示慢性病追蹤情境，含血壓觀察值與長天數處方。',
      en: 'A chronic disease follow-up scenario with blood pressure observation and a longer prescription duration.'
    },
    tags: ['chronic', 'hypertension', 'follow-up'],
    creator: {
      organization: {
        identifier: 'CLIN100',
        type: 'clinic',
        text: {
          'zh-TW': { name: '和盛診所' },
          en: { name: 'Hesheng Clinic' }
        }
      },
      patient: {
        studentId: 'S1101003',
        gender: 'male',
        birthDate: '2001-11-05',
        text: {
          'zh-TW': { familyName: '陳', givenName: '志豪' },
          en: { familyName: 'Chen', givenName: 'Zhi-Hao' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20003',
        text: {
          'zh-TW': { familyName: '陳', givenName: '建宏', qualification: '家醫科' },
          en: { familyName: 'Chen', givenName: 'Jian-Hong', qualification: 'Family Medicine' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: chronicHtnStart,
        periodEnd: relativeDatePlusMinutes(chronicHtnStart, 20)
      },
      condition: {
        icdCode: 'I10',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '原發性高血壓' },
          en: { icdDisplay: 'Essential hypertension' }
        }
      },
      observation: {
        loincCode: '8480-6',
        value: 148,
        unit: 'mmHg',
        status: 'final',
        text: {
          'zh-TW': { display: '收縮壓' },
          en: { display: 'Systolic blood pressure' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234569',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'C09AA05',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '依那普利 Enalapril' },
          en: { display: 'Enalapril' }
        }
      },
      medicationRequest: {
        doseValue: 10,
        doseUnit: 'mg',
        frequency: 'BID',
        route: '26643006',
        durationDays: 28,
        text: {
          'zh-TW': { note: '每日固定量測血壓並記錄。' },
          en: { note: 'Measure and record blood pressure daily.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(chronicHtnStart, 25),
        text: {
          'zh-TW': { title: '慢性病追蹤處方箋' },
          en: { title: 'Chronic Disease Follow-up Prescription' }
        }
      },
      extension: {
        codeCode: 'care-note',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        text: {
          'zh-TW': {
            codeDisplay: '慢性病管理備註',
            ext1Value: '血壓控制目標低於 130/80 mmHg。',
            ext2Value: '四週後攜帶血壓紀錄回診。'
          },
          en: {
            codeDisplay: 'Chronic care note',
            ext1Value: 'Keep blood pressure below 130/80 mmHg.',
            ext2Value: 'Return in four weeks with your blood pressure log.'
          }
        }
      }
    }
  },
  {
    id: 'chronic-dm-01',
    category: 'chronic',
    label: {
      'zh-TW': '糖尿病慢箋',
      en: 'Diabetes Refill Prescription'
    },
    description: {
      'zh-TW': '展示代謝疾病與餐後用藥說明。',
      en: 'A metabolic disease scenario with post-meal medication guidance.'
    },
    tags: ['chronic', 'diabetes', 'metabolic'],
    creator: {
      organization: {
        identifier: 'CLIN101',
        type: 'clinic',
        text: {
          'zh-TW': { name: '仁愛家醫診所' },
          en: { name: 'Ren-Ai Family Medicine Clinic' }
        }
      },
      patient: {
        studentId: 'S1101004',
        gender: 'female',
        birthDate: '1999-01-12',
        text: {
          'zh-TW': { familyName: '黃', givenName: '雅婷' },
          en: { familyName: 'Huang', givenName: 'Ya-Ting' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20004',
        text: {
          'zh-TW': { familyName: '周', givenName: '怡君', qualification: '新陳代謝科' },
          en: { familyName: 'Chou', givenName: 'Yi-Chun', qualification: 'Endocrinology' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: chronicDmStart,
        periodEnd: relativeDatePlusMinutes(chronicDmStart, 35)
      },
      condition: {
        icdCode: 'E11.9',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '第2型糖尿病，無併發症' },
          en: { icdDisplay: 'Type 2 diabetes mellitus without complications' }
        }
      },
      observation: {
        loincCode: '2345-7',
        value: 168,
        unit: 'mg/dL',
        status: 'final',
        text: {
          'zh-TW': { display: '葡萄糖' },
          en: { display: 'Glucose' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234570',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'A10BA02',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '二甲雙胍 Metformin' },
          en: { display: 'Metformin' }
        }
      },
      medicationRequest: {
        doseValue: 500,
        doseUnit: 'mg',
        frequency: 'BID',
        route: '26643006',
        durationDays: 30,
        text: {
          'zh-TW': { note: '飯後服用，避免空腹。' },
          en: { note: 'Take after meals and avoid taking it on an empty stomach.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(chronicDmStart, 40),
        text: {
          'zh-TW': { title: '慢性病連續處方箋' },
          en: { title: 'Chronic Refill Prescription' }
        }
      },
      extension: {
        codeCode: 'care-note',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        text: {
          'zh-TW': {
            codeDisplay: '慢性病管理備註',
            ext1Value: '請持續監測空腹血糖與餐後兩小時血糖。',
            ext2Value: '一個月後追蹤 HbA1c。'
          },
          en: {
            codeDisplay: 'Chronic care note',
            ext1Value: 'Continue monitoring fasting and two-hour postprandial glucose levels.',
            ext2Value: 'Follow up HbA1c in one month.'
          }
        }
      }
    }
  },
  {
    id: 'pediatric-fever-01',
    category: 'pediatric',
    label: {
      'zh-TW': '小兒發燒門診',
      en: 'Pediatric Fever Visit'
    },
    description: {
      'zh-TW': '小兒情境，適合展示年齡與體重差異。',
      en: 'A pediatric scenario suited for age- and weight-based demonstration.'
    },
    tags: ['pediatric', 'fever', 'weight-based'],
    creator: {
      organization: {
        identifier: 'CMUH001',
        type: 'hospital',
        text: {
          'zh-TW': { name: '中國附醫' },
          en: { name: 'China Medical University Hospital' }
        }
      },
      patient: {
        studentId: 'S1101005',
        gender: 'male',
        birthDate: '2018-09-18',
        text: {
          'zh-TW': { familyName: '吳', givenName: '小恩' },
          en: { familyName: 'Wu', givenName: 'Xiao-En' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20005',
        text: {
          'zh-TW': { familyName: '許', givenName: '婉如', qualification: '小兒科' },
          en: { familyName: 'Hsu', givenName: 'Wan-Ru', qualification: 'Pediatrics' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: pediatricFeverStart,
        periodEnd: relativeDatePlusMinutes(pediatricFeverStart, 20)
      },
      condition: {
        icdCode: 'R50.9',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '發燒，未明示' },
          en: { icdDisplay: 'Fever, unspecified' }
        }
      },
      observation: {
        loincCode: '8310-5',
        value: 39.1,
        unit: 'Cel',
        status: 'final',
        text: {
          'zh-TW': { display: '體溫' },
          en: { display: 'Body temperature' }
        }
      },
      coverage: {
        type: 'PUBLICPOL',
        subscriberId: 'HC001234571',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'N02BE01',
        codeSystem: 'atc',
        form: 'SOL',
        text: {
          'zh-TW': { display: '乙醯胺酚 Acetaminophen' },
          en: { display: 'Acetaminophen' }
        }
      },
      medicationRequest: {
        doseValue: 240,
        doseUnit: 'mg',
        frequency: 'QID',
        route: '26643006',
        durationDays: 3,
        text: {
          'zh-TW': { note: '依體重計算劑量，退燒後可停藥。' },
          en: { note: 'Weight-based dosing. Stop when the fever resolves.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(pediatricFeverStart, 25),
        text: {
          'zh-TW': { title: '小兒門診處方箋' },
          en: { title: 'Pediatric Outpatient Prescription' }
        }
      },
      extension: {
        codeCode: 'care-note',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
        text: {
          'zh-TW': {
            codeDisplay: '慢性病管理備註',
            ext1Value: '若精神差、持續高燒或抽搐請立即回急診。',
            ext2Value: '請使用量杯或量匙，不建議估量。'
          },
          en: {
            codeDisplay: 'Pediatric counseling',
            ext1Value: 'Return to the emergency department immediately if lethargy, persistent fever, or seizures occur.',
            ext2Value: 'Use a measuring cup or spoon instead of estimating the dose.'
          }
        }
      }
    }
  },
  {
    id: 'emergency-allergy-01',
    category: 'emergency',
    label: {
      'zh-TW': '急診過敏反應',
      en: 'Emergency Allergy Reaction'
    },
    description: {
      'zh-TW': '展示急診 Encounter 與未填結束時間的案例。',
      en: 'An emergency scenario with an open encounter and no discharge time yet.'
    },
    tags: ['emergency', 'allergy', 'optional-end-time'],
    creator: {
      organization: {
        identifier: 'VGH001',
        type: 'hospital',
        text: {
          'zh-TW': { name: '臺北榮總' },
          en: { name: 'Taipei Veterans General Hospital' }
        }
      },
      patient: {
        studentId: 'S1101006',
        gender: 'male',
        birthDate: '1997-12-03',
        text: {
          'zh-TW': { familyName: '郭', givenName: '柏翰' },
          en: { familyName: 'Kuo', givenName: 'Po-Han' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20006',
        text: {
          'zh-TW': { familyName: '林', givenName: '冠宇', qualification: '急診醫學科' },
          en: { familyName: 'Lin', givenName: 'Guan-Yu', qualification: 'Emergency Medicine' }
        }
      },
      encounter: {
        class: 'EMER',
        periodStart: emergencyAllergyStart,
        periodEnd: ''
      },
      condition: {
        icdCode: 'T78.4',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '過敏反應，未明示' },
          en: { icdDisplay: 'Allergic reaction, unspecified' }
        }
      },
      observation: {
        loincCode: '8867-4',
        value: 112,
        unit: 'beats/min',
        status: 'preliminary',
        text: {
          'zh-TW': { display: '心率' },
          en: { display: 'Heart rate' }
        }
      },
      coverage: {
        type: 'PAY',
        subscriberId: 'HC001234572',
        periodStart: '2026-03-01',
        periodEnd: ''
      },
      medication: {
        code: 'R06AE07',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '西替利嗪 Cetirizine' },
          en: { display: 'Cetirizine' }
        }
      },
      medicationRequest: {
        doseValue: 10,
        doseUnit: 'mg',
        frequency: 'QD',
        route: '26643006',
        durationDays: 5,
        text: {
          'zh-TW': { note: '若出現嗜睡請避免開車。' },
          en: { note: 'Avoid driving if drowsiness occurs.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(emergencyAllergyStart, 15),
        text: {
          'zh-TW': { title: '急診處方箋' },
          en: { title: 'Emergency Prescription' }
        }
      },
      extension: {
        codeCode: 'allergy-info',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-supplement',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-severity',
        text: {
          'zh-TW': {
            codeDisplay: '過敏資訊補充',
            ext1Value: '疑似蝦蟹類食物引發蕁麻疹與呼吸不適。',
            ext2Value: '中度'
          },
          en: {
            codeDisplay: 'Allergy supplement',
            ext1Value: 'Likely triggered by shellfish, causing urticaria and mild breathing discomfort.',
            ext2Value: 'Moderate'
          }
        }
      }
    }
  },
  {
    id: 'acute-msk-01',
    category: 'acute',
    label: {
      'zh-TW': '肌肉骨骼疼痛門診',
      en: 'Musculoskeletal Pain Visit'
    },
    description: {
      'zh-TW': '短期疼痛控制與飯後服藥提示。',
      en: 'A short-term pain control scenario with post-meal medication instructions.'
    },
    tags: ['acute', 'pain', 'musculoskeletal'],
    creator: {
      organization: {
        identifier: 'CLIN102',
        type: 'clinic',
        text: {
          'zh-TW': { name: '和新復健診所' },
          en: { name: 'Hexin Rehabilitation Clinic' }
        }
      },
      patient: {
        studentId: 'S1101007',
        gender: 'female',
        birthDate: '1995-04-27',
        text: {
          'zh-TW': { familyName: '曾', givenName: '佩雯' },
          en: { familyName: 'Tseng', givenName: 'Pei-Wen' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20007',
        text: {
          'zh-TW': { familyName: '劉', givenName: '品妤', qualification: '骨科' },
          en: { familyName: 'Liu', givenName: 'Pin-Yu', qualification: 'Orthopedics' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: acuteMskStart,
        periodEnd: relativeDatePlusMinutes(acuteMskStart, 20)
      },
      condition: {
        icdCode: 'M79.1',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '肌痛' },
          en: { icdDisplay: 'Myalgia' }
        }
      },
      observation: {
        loincCode: '29463-7',
        value: 61,
        unit: 'kg',
        status: 'final',
        text: {
          'zh-TW': { display: '體重' },
          en: { display: 'Body weight' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234573',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'M01AE01',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '布洛芬 Ibuprofen' },
          en: { display: 'Ibuprofen' }
        }
      },
      medicationRequest: {
        doseValue: 400,
        doseUnit: 'mg',
        frequency: 'TID',
        route: '26643006',
        durationDays: 5,
        text: {
          'zh-TW': { note: '飯後服用，避免空腹。' },
          en: { note: 'Take after meals and avoid taking it on an empty stomach.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(acuteMskStart, 25),
        text: {
          'zh-TW': { title: '復健門診處方箋' },
          en: { title: 'Rehabilitation Outpatient Prescription' }
        }
      },
      extension: {
        codeCode: 'special-instruction',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/pharmacist-note',
        text: {
          'zh-TW': {
            codeDisplay: '特殊給藥指示',
            ext1Value: '急性疼痛期請避免劇烈運動與負重。',
            ext2Value: '若胃痛或黑便請立即停藥並回診。'
          },
          en: {
            codeDisplay: 'Special administration instruction',
            ext1Value: 'Avoid strenuous exercise and heavy lifting during the acute pain phase.',
            ext2Value: 'Stop the medication and return for follow-up if abdominal pain or black stool occurs.'
          }
        }
      }
    }
  },
  {
    id: 'optional-minimal-01',
    category: 'optional-empty',
    label: {
      'zh-TW': '最小必要欄位案例',
      en: 'Minimal Required Fields Scenario'
    },
    description: {
      'zh-TW': '用於測試 optional 欄位留空與 UI 顯示。',
      en: 'A minimal scenario for testing optional empty fields and related UI rendering.'
    },
    tags: ['minimal', 'optional', 'empty-fields'],
    creator: {
      organization: {
        identifier: 'CLIN103',
        type: 'clinic',
        text: {
          'zh-TW': { name: '安康診所' },
          en: { name: 'Ankang Clinic' }
        }
      },
      patient: {
        studentId: 'S1101008',
        gender: 'male',
        birthDate: '2002-06-11',
        text: {
          'zh-TW': { familyName: '謝', givenName: '承恩' },
          en: { familyName: 'Hsieh', givenName: 'Cheng-En' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20008',
        text: {
          'zh-TW': { familyName: '楊', givenName: '子涵', qualification: '家醫科' },
          en: { familyName: 'Yang', givenName: 'Tzu-Han', qualification: 'Family Medicine' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: optionalMinimalStart,
        periodEnd: ''
      },
      condition: {
        icdCode: 'K30',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '功能性消化不良' },
          en: { icdDisplay: 'Functional dyspepsia' }
        }
      },
      observation: {
        loincCode: '29463-7',
        value: 68,
        unit: 'kg',
        status: 'final',
        text: {
          'zh-TW': { display: '體重' },
          en: { display: 'Body weight' }
        }
      },
      coverage: {
        type: 'PAY',
        subscriberId: 'HC001234574',
        periodStart: '2026-02-01',
        periodEnd: ''
      },
      medication: {
        code: 'A02BC01',
        codeSystem: 'atc',
        form: 'CAP',
        text: {
          'zh-TW': { display: '奧美拉唑 Omeprazole' },
          en: { display: 'Omeprazole' }
        }
      },
      medicationRequest: {
        doseValue: 20,
        doseUnit: 'mg',
        frequency: 'QD',
        route: '26643006',
        text: {
          'zh-TW': { note: '' },
          en: { note: '' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(optionalMinimalStart, 20),
        text: {
          'zh-TW': { title: '門診處方箋' },
          en: { title: 'Outpatient Prescription' }
        }
      },
      extension: {
        codeCode: 'special-instruction',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/special-instruction',
        ext2Url: '',
        text: {
          'zh-TW': {
            codeDisplay: '特殊給藥指示',
            ext1Value: '若胃脹氣或症狀未改善，請提前回診。',
            ext2Value: ''
          },
          en: {
            codeDisplay: 'Special administration instruction',
            ext1Value: 'Return earlier if bloating persists or symptoms do not improve.',
            ext2Value: ''
          }
        }
      }
    }
  },
  {
    id: 'search-demo-patient-a-01',
    category: 'search-demo',
    label: {
      'zh-TW': '同病人多筆處方示範 A',
      en: 'Same-Patient Search Demo A'
    },
    description: {
      'zh-TW': '用於 Consumer 搜尋展示，同病人不同日期與診斷。',
      en: 'A Consumer search demo with the same patient across different dates and diagnoses.'
    },
    tags: ['search-demo', 'same-patient', 'hypertension'],
    creator: {
      organization: {
        identifier: 'NTUH001',
        type: 'hospital',
        text: {
          'zh-TW': { name: '臺大醫院' },
          en: { name: 'National Taiwan University Hospital' }
        }
      },
      patient: {
        studentId: 'S1101001',
        gender: 'male',
        birthDate: '2000-03-15',
        text: {
          'zh-TW': { familyName: '王', givenName: '小明' },
          en: { familyName: 'Wang', givenName: 'Xiao-Ming' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20001',
        text: {
          'zh-TW': { familyName: '李', givenName: '大仁', qualification: '一般科' },
          en: { familyName: 'Li', givenName: 'Da-Ren', qualification: 'General Medicine' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: searchDemoA1Start,
        periodEnd: relativeDatePlusMinutes(searchDemoA1Start, 20)
      },
      condition: {
        icdCode: 'I10',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '原發性高血壓' },
          en: { icdDisplay: 'Essential hypertension' }
        }
      },
      observation: {
        loincCode: '8480-6',
        value: 142,
        unit: 'mmHg',
        status: 'final',
        text: {
          'zh-TW': { display: '收縮壓' },
          en: { display: 'Systolic blood pressure' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234567',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'C09AA05',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '依那普利 Enalapril' },
          en: { display: 'Enalapril' }
        }
      },
      medicationRequest: {
        doseValue: 10,
        doseUnit: 'mg',
        frequency: 'QD',
        route: '26643006',
        durationDays: 30,
        text: {
          'zh-TW': { note: '每日早晨固定服用。' },
          en: { note: 'Take every morning at a fixed time.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(searchDemoA1Start, 25),
        text: {
          'zh-TW': { title: '高血壓追蹤處方箋' },
          en: { title: 'Hypertension Follow-up Prescription' }
        }
      },
      extension: {
        codeCode: 'care-note',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/chronic-care-note',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/follow-up-schedule',
        text: {
          'zh-TW': {
            codeDisplay: '慢性病管理備註',
            ext1Value: '請攜帶血壓紀錄本回診。',
            ext2Value: '四週後回診。'
          },
          en: {
            codeDisplay: 'Chronic care note',
            ext1Value: 'Bring your blood pressure log to the next visit.',
            ext2Value: 'Return in four weeks.'
          }
        }
      }
    }
  },
  {
    id: 'search-demo-patient-a-02',
    category: 'search-demo',
    label: {
      'zh-TW': '同病人多筆處方示範 B',
      en: 'Same-Patient Search Demo B'
    },
    description: {
      'zh-TW': '同病人切換不同醫師與機構，方便展示複合查詢。',
      en: 'The same patient with a different physician and institution for complex search demos.'
    },
    tags: ['search-demo', 'same-patient', 'allergy'],
    creator: {
      organization: {
        identifier: 'MMHF001',
        type: 'hospital',
        text: {
          'zh-TW': { name: '馬偕醫院' },
          en: { name: 'Mackay Memorial Hospital' }
        }
      },
      patient: {
        studentId: 'S1101001',
        gender: 'male',
        birthDate: '2000-03-15',
        text: {
          'zh-TW': { familyName: '王', givenName: '小明' },
          en: { familyName: 'Wang', givenName: 'Xiao-Ming' }
        }
      },
      practitioner: {
        licenseNumber: 'MED20002',
        text: {
          'zh-TW': { familyName: '張', givenName: '美玲', qualification: '內科' },
          en: { familyName: 'Chang', givenName: 'Mei-Ling', qualification: 'Internal Medicine' }
        }
      },
      encounter: {
        class: 'AMB',
        periodStart: searchDemoA2Start,
        periodEnd: relativeDatePlusMinutes(searchDemoA2Start, 20)
      },
      condition: {
        icdCode: 'J30.9',
        clinicalStatus: 'active',
        text: {
          'zh-TW': { icdDisplay: '過敏性鼻炎，未明示' },
          en: { icdDisplay: 'Allergic rhinitis, unspecified' }
        }
      },
      observation: {
        loincCode: '8867-4',
        value: 78,
        unit: 'beats/min',
        status: 'final',
        text: {
          'zh-TW': { display: '心率' },
          en: { display: 'Heart rate' }
        }
      },
      coverage: {
        type: 'EHCPOL',
        subscriberId: 'HC001234567',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31'
      },
      medication: {
        code: 'R06AE07',
        codeSystem: 'atc',
        form: 'TAB',
        text: {
          'zh-TW': { display: '西替利嗪 Cetirizine' },
          en: { display: 'Cetirizine' }
        }
      },
      medicationRequest: {
        doseValue: 10,
        doseUnit: 'mg',
        frequency: 'QD',
        route: '26643006',
        durationDays: 7,
        text: {
          'zh-TW': { note: '睡前服用，避免白天嗜睡。' },
          en: { note: 'Take at bedtime to reduce daytime drowsiness.' }
        }
      },
      composition: {
        date: relativeDatePlusMinutes(searchDemoA2Start, 25),
        text: {
          'zh-TW': { title: '過敏門診處方箋' },
          en: { title: 'Allergy Outpatient Prescription' }
        }
      },
      extension: {
        codeCode: 'allergy-info',
        ext1Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-supplement',
        ext2Url: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/allergy-severity',
        text: {
          'zh-TW': {
            codeDisplay: '過敏資訊補充',
            ext1Value: '近期接觸粉塵後鼻塞與眼睛發癢明顯。',
            ext2Value: '輕度'
          },
          en: {
            codeDisplay: 'Allergy supplement',
            ext1Value: 'Nasal congestion and itchy eyes worsened after recent dust exposure.',
            ext2Value: 'Mild'
          }
        }
      }
    }
  }
]

export function getScenarioEncounterDate(scenario: { creator: { encounter: { periodStart: string } } }): string {
  return dateOnly(scenario.creator.encounter.periodStart)
}
