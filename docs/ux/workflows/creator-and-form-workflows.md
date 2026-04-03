# Creator and Form Workflows

## 範圍說明

本文件聚焦 Creator 端的多步驟建立流程、表單輸入、草稿儲存、範本套用、FHIR 提交回饋，以及與技術面板相關的資訊呈現。

## 已實作項目

- 11-step stepper 工作流已完成，使用者可依序建立處方相關資源並組成 Document Bundle。
- stepper 已提供：
  - 目前步驟
  - 完成數量
  - 各步驟摘要
  - 目前步驟 header summary
- 各步驟表單已使用 `react-hook-form` + `zod`，並有一致的驗證與錯誤摘要。
- Creator draft autosave 已完成：
  - 未完成內容會儲存到本機
  - 重新開啟 app 後可 restore
- Creator header 已有局部草稿回饋：
  - `draft saved`
  - `draft restored`
- mock fill 已完整整合到 Creator 工作流，並支援：
  - scenario-based mock
  - locale-aware mock
  - Live Demo typed fill
- Prescription Templates 已可快速套用常見門診處方情境。
- 已完成步驟重新開啟時，會回填目前資源值。
- 重送資源時會走 reuse / update，而非一律重複建立。
- 各表單已提供 guide cards、欄位提示與範例。
- FHIR 錯誤回饋已有兩層：
  - human-friendly 訊息
  - expandable raw details
- Composition / Bundle 最終步驟已提供 review card 與匯出 JSON。
- Bundle 建立成功後，已可直接跳到 Consumer 並自動聚焦新資料。
- 右側技術面板已提供：
  - JSON preview
  - FHIR request inspector
  - summary / raw 切換

## 待實作項目

- `P0` 更一致的 autosave 狀態可視化：
  - 目前只有 Creator page header 的 saved / restored 訊息，尚未形成全步驟一致的 `儲存中 / 已儲存 / 儲存失敗` 模式。
- `P0` 全域 unsaved-change guard：
  - 目前已有重設確認與模板切換確認，但尚未涵蓋切頁、關閉 app、離開 Creator 等更完整情境。
- `P1` reset / leave UX 一致化：
  - 尚未區分「只影響本機草稿」與「已送出 server 資源」的不同風險層級。
- `P1` resubmit diff / compare：
  - 使用者目前無法快速看出這次提交與前次提交有何差異。
- `P1` sticky workflow summary：
  - 長表單捲動後，缺少固定顯示的目前步驟、草稿狀態、最近提交狀態摘要。
- `P2` 批次清除 / 批次回復 / template apply preview：
  - 目前模板切換已有提醒，但尚未提供更完整的套用前比較與影響預覽。

## 建議優先級

- `P0`
  - autosave state model
  - unsaved-change guard
- `P1`
  - leave / reset risk messaging
  - resubmit diff
  - sticky workflow summary
- `P2`
  - advanced template impact preview
  - batch restore / clear utilities

## 後續實作任務拆分

1. 抽出 Creator draft status model：
   - `idle`
   - `saving`
   - `saved`
   - `failed`
2. 在 Creator header 與 stepper summary 接上同一套 draft status 顯示。
3. 建立全域 unsaved-change policy：
   - 切頁
   - reset
   - template switch
   - app close
4. 對已送出資源與本機草稿分開定義 warning copy。
5. 設計 resubmit diff panel：
   - 先做欄位級摘要
   - 後做完整資源比較
6. 新增 sticky workflow summary 區塊，固定顯示：
   - 目前步驟
   - 草稿狀態
   - 最近一次提交狀態
