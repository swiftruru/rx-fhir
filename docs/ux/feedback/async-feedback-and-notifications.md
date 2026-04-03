# Async Feedback and Notifications

## 範圍說明

本文件聚焦系統在操作中的即時回饋，包括 loading、success、error、warning、danger confirm、通知樣式，以及短暫訊息是否可追溯。

## 已實作項目

- Creator 已有步驟級成功 / reuse / 錯誤回饋。
- Creator 的 FHIR 錯誤已先顯示較易理解的訊息，再提供 raw detail 展開。
- Creator 完成 Bundle 後已有成功 banner 與前往 Consumer 的 CTA。
- Consumer 在空結果時，已提供依查詢模式產生的原因與建議。
- Settings 的 server 測試、儲存與 accessibility preference 變更已有即時回饋。
- 查詢 trace、request inspector、JSON summary 等已讓「系統到底做了什麼」比一般黑盒流程更透明。
- App 目前已有 screen-reader announcement 基礎設施，可作為動態訊息回饋骨幹。
- 一部分危險操作已有局部確認：
  - Creator reset confirm
  - template switch warning

## 待實作項目

- `P0` 統一 toast system：
  - 目前回饋散落在 banner、inline alert、局部文字與不同區塊內，缺少一致的 toast pattern。
- `P0` action-oriented success feedback：
  - 成功後尚未普遍提供可直接操作的下一步，例如 `前往 Consumer`、`匯出 JSON`、`複製 Bundle ID`。
- `P0` 一致的 danger confirm pattern：
  - 目前 reset / overwrite / potential data loss 還沒有共用設計語言與文案規則。
- `P1` staged loading copy：
  - 目前 loading 多半只停留在「正在處理」，尚未全面拆成更易理解的階段文案。
- `P1` 可取消的長操作：
  - 查詢、匯入、長時間提交與導覽流程尚未普遍提供 cancel / stop。
- `P2` notification / activity center：
  - 短暫訊息消失後，使用者無法回頭查看剛剛發生了什麼。

## 建議優先級

- `P0`
  - toast system
  - action toast / success CTA
  - danger confirm pattern
- `P1`
  - staged loading state model
  - cancellable async flows
- `P2`
  - activity center
  - notification history retention

## 後續實作任務拆分

1. 建立全域 toast provider，定義：
   - success
   - warning
   - error
   - info
   - action
2. 把現有分散的成功 / 錯誤訊息逐步導入 toast 或統一 alert pattern。
3. 建立 danger confirm 規格：
   - destructive button hierarchy
   - title / description 規則
   - reversible vs irreversible 差異
4. 為主要 async flows 建立 state machine：
   - Creator submit
   - Consumer search
   - local import
   - server health check
5. 在長操作流程中補 stop / cancel 機制。
6. 若 P0 / P1 穩定後，再建立 activity center，保留最近操作紀錄與狀態。
