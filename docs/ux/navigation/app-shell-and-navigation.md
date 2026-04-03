# App Shell and Navigation

## 範圍說明

本文件涵蓋 App Shell、側邊欄導航、頁面切換、頂部工具列、狀態列，以及高縮放或窄視窗下的工作區版面配置。

## 已實作項目

- 固定側邊欄導航已完成，支援 `Creator / Consumer / Settings / About` 四個主要頁面。
- 目前頁面會在側邊欄以 active state 呈現，避免使用者迷失所在位置。
- 導航已改為明確的 app 內 route 切換，不再依賴容易被 Electron frameless 狀態干擾的連結行為。
- App Shell 目前已有：
  - 頁面標題聚焦
  - skip link
  - route-aware focus
  - document title 同步
- 頂部工具列已提供主題切換、語系切換、Feature Showcase 入口。
- 底部狀態列已提供目前 FHIR server 連線狀態與模式資訊。
- Creator 與 Consumer 主版面在高縮放或較窄寬度下已開始支援由多欄轉為上下堆疊，降低內容擠壓。

## 待實作項目

- `P1` 側邊欄收合 / 迷你模式：
  - 目前 sidebar 固定寬度，窄視窗與高縮放下仍會壓縮內容區。
- `P1` 導航狀態徽章：
  - 尚未顯示未完成 draft、查詢結果數、未儲存設定等 badge。
- `P1` 近期操作捷徑：
  - 尚未在 App Shell 層提供最近查詢、最近 Bundle、最近步驟的快速跳轉。
- `P1` 非阻斷資訊面板模式：
  - 目前資訊型內容仍偏向 page / dialog 模式，尚未系統化為 side sheet。
- `P2` App Shell state persistence：
  - 尚未記住上次頁面、右側面板開關、workspace tab 選擇等 shell-level UI 狀態。

## 建議優先級

- `P0`
  - 無新增 P0。現有導航骨幹已足以支撐主要流程。
- `P1`
  - sidebar compact / collapse
  - navigation badge
  - recent action shortcuts
  - shell state persistence
- `P2`
  - side sheet pattern 統一化
  - 更進一步的 workspace personalization

## 後續實作任務拆分

1. 建立 sidebar 三態規格：
   - `expanded`
   - `compact`
   - `icons-only`
2. 為 navigation item 定義 badge schema：
   - Creator：未完成草稿或待提交步驟
   - Consumer：目前結果數或匯入狀態
   - Settings：未儲存變更
3. 建立 shell-level UI preference store：
   - sidebar mode
   - last route
   - panel visibility
4. 設計 recent actions 區塊：
   - 最近查詢
   - 最近提交 Bundle
   - 最近編輯步驟
5. 補 side sheet pattern，評估哪些資訊型 dialog 適合改成非阻斷面板。
