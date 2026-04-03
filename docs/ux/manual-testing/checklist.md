# RxFHIR UX Manual Testing Checklist

## 範圍說明

本文件定義 RxFHIR 的 UX 手動驗證清單，聚焦於主流程、回饋一致性、桌面工作流與新手引導體驗。

適用於：

- 版本發佈前驗收
- 大量 UX 調整後回歸測試
- 導覽、表單、活動中心、命令面板與 onboarding 相關功能驗證

## 驗證前準備

1. 確認應用程式可正常啟動。
2. 確認可進入：
   - Creator
   - Consumer
   - Settings
   - About
3. 若要驗 first-run onboarding，請使用乾淨 profile 或清除相關本機 state。
4. 若要驗 Electron 專屬能力，需使用真正的 Electron 視窗，不可只用 renderer 靜態頁面。
5. 若要先跑最小自動化基線，可參考 [electron-debug-tools.md](/Users/ruru/Documents/RuData/Devs/ElectronDev/rx-fhir_Dev/rx-fhir/docs/ux/manual-testing/electron-debug-tools.md)。

## A. App Shell 與導航

### A1 基本載入

1. 啟動 app。
2. 確認預設頁面與視窗標題。
3. 確認側邊欄顯示 Creator / Consumer / Settings / About。

預期結果：

- 預設會進入主流程頁面
- 視窗標題會跟隨路由切換
- 側邊欄高亮當前頁面

### A2 頁面切換

1. 用側邊欄切換到 Consumer。
2. 再切換到 Settings。
3. 確認頁面標題與主要內容都跟著切換。

預期結果：

- 切換後不殘留上一頁主要內容
- 使用者可明確辨識目前所在頁面

## B. Onboarding 與 Quick Start

### B1 First-run Onboarding

1. 使用乾淨 profile 啟動 app。
2. 確認 first-run onboarding 自動出現。
3. 檢查 welcome 文案是否正確說明 Creator / Consumer / Settings。

預期結果：

- 首次啟動會自動看到 onboarding
- 文案能清楚說明主要工作流

### B2 Quick Start 任務

1. 從 onboarding 或其他入口打開 quick start。
2. 驗證至少三個任務入口：
   - Creator demo template
   - Consumer example query
   - Settings accessibility
3. 執行其中至少一個任務並確認會導向對應頁面。

預期結果：

- quick start 不只是展示，而是能真的帶使用者進入任務
- 任務完成後畫面會停在合理的起始狀態

## C. Creator 工作流

### C1 草稿狀態

1. 進入 Creator。
2. 編輯至少一個欄位。
3. 觀察草稿狀態提示。

預期結果：

- 使用者可辨識草稿是否已自動儲存
- 不需要猜測目前資料是否仍只在本機

### C2 Leave Guard

1. 在 Creator 產生草稿變更。
2. 嘗試切換到 Consumer 或 Settings。
3. 驗證 leave guard 是否出現。
4. 分別測試：
   - 留在 Creator
   - 仍然離開

預期結果：

- 未完成流程時離開會被攔截
- 取消後仍留在 Creator
- 確認後才真的跳頁

### C3 Resubmit Diff

1. 成功提交一次後，再修改幾個欄位。
2. 回到 Creator 頁首的 compare 區。
3. 確認可看到變更摘要並跳到對應步驟。

預期結果：

- 使用者能知道自上次提交後有哪些步驟被修改

## D. Consumer 工作流

### D1 Quick Start 查詢

1. 啟動 Consumer example query quick start。
2. 驗證是否切到 Consumer。
3. 確認查詢條件已帶入，且有明確提示。

預期結果：

- 使用者不需手動輸入就能理解查詢流程入口

### D2 活動中心回饋

1. 執行會產生 toast 的操作。
2. 打開活動中心。
3. 檢查通知歷史是否保留。
4. 測試：
   - 全部
   - 未讀
   - variant 篩選
   - 標記已讀

預期結果：

- toast 會進活動中心
- 未讀 / 已讀狀態正確更新
- 篩選與清除動作可用

### D3 匯入流程

1. 測試本機 Bundle 匯入。
2. 若在 Electron 環境，測試 drag-and-drop。

預期結果：

- 成功 / 失敗有清楚提示
- 匯入後可直接進入 Consumer 結果流程

## E. Settings 與 Productivity

### E1 Settings Search

1. 進入 Settings。
2. 在搜尋欄輸入一組可命中的關鍵字。
3. 再輸入一組不命中的關鍵字。

預期結果：

- 可命中時只留下相關設定區塊
- 不命中時顯示明確 empty state

### E2 Dirty Marker 與 Reset

1. 修改一組設定。
2. 確認 tab 或區塊出現變更標記。
3. 使用單區塊 reset 還原。

預期結果：

- 使用者可知道哪些設定被改過
- reset 後狀態能回到預設

### E3 Command Palette

1. 用快捷鍵打開 command palette。
2. 驗證導覽、全域動作、當前頁面動作。
3. 在 Settings 頁面確認至少有：
   - test connection
   - save settings
   - open shortcut settings
   - open accessibility settings

預期結果：

- palette 會依目前頁面顯示 contextual actions
- 執行後會導向正確結果

## F. Electron 專屬行為

### F1 視窗與檔案

1. 關閉 app 再重開，確認視窗大小 / 位置還原。
2. 測試 recent file / recent bundle。
3. 測試偏好設定匯入 / 匯出。

預期結果：

- 桌面狀態可持續
- 本機檔案流程可正常使用

### F2 原生橋接

1. 測試 Bundle JSON 匯入 / 匯出。
2. 測試 app-level zoom 是否套用。
3. 測試外部連結是否正確交給系統瀏覽器。

預期結果：

- Electron bridge 正常工作
- 原生功能與 renderer 整合穩定
