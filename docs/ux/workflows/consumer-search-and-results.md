# Consumer Search and Results

## 範圍說明

本文件涵蓋 Consumer 模組的查詢工作流、搜尋條件輸入、結果列表、Query Helpers、詳情檢視，以及與本機歷史資料相關的捷徑。

## 已實作項目

- Consumer 已具備三種主要查詢模式：
  - Basic search
  - Date search
  - Complex search
- 左側工作區已調整為以搜尋表單為主，避免在窄視窗下被結果區壓縮。
- 中間區域已拆分為 `Results` 與 `Query Helpers`，讓結果與輔助工具不互相搶空間。
- Query Helpers 已整合：
  - query examples
  - local bundle import
  - recent submissions
  - saved searches
- recent submissions 與 saved searches 已分開呈現，層次更清楚。
- recent-record prefill、complex search backfill、pin favorite 等流程已完成。
- 搜尋結果列表已提供病人、機構、診斷、藥物等摘要資訊。
- 結果列表已支援鍵盤選取與明確 selected 狀態。
- 查詢流程已有 URL 與 workaround trace，可幫助理解 server 相容性處理。
- 空結果目前已有依查詢模式產生的原因說明與下一步建議。
- 詳情區已有：
  - `Structured / JSON` 切換
  - detail export
  - Creator handoff focus

## 待實作項目

- `P1` drag-and-drop 匯入：
  - 目前匯入仍需透過按鈕與檔案選擇器。
- `P1` 結果後續操作列：
  - 目前缺少更直接的 `匯出 / 複製 ID / 複製查詢條件 / 重新搜尋相似條件`。
- `P1` workspace state persistence：
  - 目前未明確記住上次使用的 search tab、results tab、detail view mode。
- `P1` 查詢 loading stage 細化：
  - 查詢、client-side filter、bundle 讀取、detail 準備等階段尚未形成一致的 loading 文案模型。
- `P2` 多筆結果批次操作：
  - 尚未支援批次匯出、批次比較或批次收藏。
- `P2` 更進一步的結果比較模式：
  - 尚未提供兩筆 Bundle 的並排比較或欄位差異摘要。

## 建議優先級

- `P0`
  - 無新增 P0。主要查詢工作流已可使用。
- `P1`
  - drag-and-drop import
  - result action row
  - workspace state persistence
  - staged loading copy
- `P2`
  - batch actions
  - compare mode

## 後續實作任務拆分

1. 建立 Consumer import drop target：
   - page-level drop zone
   - query-helper scoped drop zone
2. 定義 result action row：
   - copy bundle id
   - export JSON
   - rerun similar search
   - copy search URL
3. 建立 Consumer workspace preference store：
   - active tab
   - detail mode
   - helper tab
4. 為 search workflow 定義更細的 async states：
   - querying
   - filtering
   - importing
   - preparing detail
5. 規劃 compare mode 與 batch operation 的資料模型，作為後續 P2 擴充基礎。
