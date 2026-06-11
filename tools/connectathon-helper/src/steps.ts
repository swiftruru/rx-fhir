/**
 * 聯測流程的靜態步驟登錄表（Step 10–300，共 4 階段）。
 * R = 必要、O = 選填。報告與狀態追蹤都以此為骨架。
 */
export type Phase = 'A' | 'B' | 'C' | 'D'

export interface StepDef {
  id: number
  phase: Phase
  required: boolean
  title: string
  description: string
}

export const PHASE_TITLES: Record<Phase, string> = {
  A: '階段 A — 前置設定（Step 10–35）',
  B: '階段 B — 第一輪自測 1xx（Step 100–170）',
  C: '階段 C — 第二輪抽驗 2xx（Step 200–280）',
  D: '階段 D — 督察員複測（Step 300）'
}

export const STEPS: StepDef[] = [
  // 階段 A
  { id: 10, phase: 'A', required: true, title: '取得 X-Participant-Token', description: '由 TWCAT Proxy 取得，組成後續所有交易的 HTTP Header。' },
  { id: 15, phase: 'A', required: true, title: '取得 OAuth Token', description: '用大會核發 UserID 向 Keycloak 取得 access_token（自動 refresh）。' },
  { id: 20, phase: 'A', required: true, title: '設定 meta.profile', description: '上傳前檢查並注入 Resource 的 meta.profile（多個用逗號區隔），缺少時報錯。' },
  { id: 30, phase: 'A', required: true, title: '產品 UI 截圖', description: '對自家產品 UI 截圖，須含完整欄位資訊。' },
  { id: 35, phase: 'A', required: false, title: '上傳產品規格（conformance statement）', description: '記錄檔案路徑，納入報告。' },
  // 階段 B（1xx）
  { id: 100, phase: 'B', required: true, title: '指定測試案例', description: '記錄測試案例編號與連結。' },
  { id: 110, phase: 'B', required: false, title: '來源資料前處理', description: '加註「來源資料已經過前處理」。' },
  { id: 120, phase: 'B', required: true, title: '上傳 Bundle（MITW-99 POST）', description: '以 Bundle.type=collection POST 到大會 FHIR 主機，帶 Step 10/15 Header，保存回應。' },
  { id: 130, phase: 'B', required: true, title: 'FHIRfox 驗證', description: '純紀錄：收錄驗證通過連結與截圖。' },
  { id: 140, phase: 'B', required: true, title: '確認 Resource 數量與種類', description: '依案例摘要統計 Bundle 內各 Resource 數量與型別。' },
  { id: 150, phase: 'B', required: true, title: '院內碼轉換確認', description: '檢查指定欄位院內碼是否正確轉成國際代碼，列出對照表。' },
  { id: 160, phase: 'B', required: true, title: '確認情境內容 → To be verify', description: '彙整檢查結果；狀態轉換以提醒為主。' },
  { id: 170, phase: 'B', required: true, title: '前測督察員確認 1xx → Partially verify', description: '督察員確認後狀態轉為 Partially verify（提醒+紀錄）。' },
  // 階段 C（2xx）
  { id: 200, phase: 'C', required: true, title: '申請抽驗（需告知 Test Instance ID）', description: '確認狀態為 Partially verify 後申請抽驗。' },
  { id: 210, phase: 'C', required: true, title: '指定測試案例', description: '記錄測試案例編號與連結。' },
  { id: 220, phase: 'C', required: false, title: '來源資料前處理', description: '加註「來源資料已經過前處理」。' },
  { id: 230, phase: 'C', required: true, title: '上傳 Bundle（+ Proxy 連結）', description: '同 Step 120，並額外取得並保存 Proxy 連結。' },
  { id: 240, phase: 'C', required: true, title: 'FHIRfox 驗證（Proxy 連結）', description: '純紀錄：收錄 Proxy 驗證連結與截圖。' },
  { id: 250, phase: 'C', required: true, title: '確認 Resource 數量與種類', description: '依案例摘要統計各 Resource 數量與型別。' },
  { id: 260, phase: 'C', required: true, title: '院內碼轉換確認', description: '檢查院內碼→國際碼對照。' },
  { id: 270, phase: 'C', required: true, title: '確認情境內容 → To be verify', description: '彙整檢查結果（提醒+紀錄）。' },
  { id: 280, phase: 'C', required: true, title: '前測督察員確認 2xx → Paused', description: '督察員確認後狀態轉為 Paused（提醒+紀錄）。' },
  // 階段 D
  { id: 300, phase: 'D', required: true, title: '督察員複測', description: '依指示隨機改值上傳一站式 validator，記錄通過/正確顯示錯誤兩種結果並截圖。' }
]

export function getStep(id: number): StepDef | undefined {
  return STEPS.find((s) => s.id === id)
}
