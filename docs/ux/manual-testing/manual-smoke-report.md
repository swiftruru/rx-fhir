# RxFHIR Manual Smoke Report

## 測試日期

- 2026-04-10

## 測試目的

- 驗證本輪架構重構後，主流程沒有出現明顯回歸
- 補齊自動化尚未完整覆蓋的跨邊界互動：
  - route / app shell
  - settings persisted state
  - command palette / shortcut help / quick start
  - creator draft hydration
  - consumer search / detail / diff / export menu
  - history / saved search actions
  - about update / external link bridge

## 測試環境

- 專案路徑：`/Users/ruru/Documents/RuData/Devs/ElectronDev/rx-fhir_Dev/rx-fhir`
- Electron 測試實例：
  - `--remote-debugging-port=9233`
  - `--user-data-dir=/tmp/rxfhir-manual-smoke-userdata`
- renderer 驗證方式：
  - Electron DevTools Protocol (`cdp:eval`)
  - 真實 Electron 視窗互動，不是靜態 renderer snapshot
- 本輪先跑的自動化基線：
  - `npm run build`
  - `npm run ux:electron:smoke`
- 本輪未重跑：
  - `npm run typecheck`
  - `npm test`
  - `npm run ux:electron:verify`

## 本次測試結論

- `PASS`：在本輪可驗證範圍內，沒有發現重構造成的明顯功能回歸
- `BLOCKED`：
  - Preferences 匯出 / 匯入 round trip：這輪未自動化原生檔案對話框
  - Creator submit / request inspector：缺少可安全寫入的 FHIR 測試伺服器
  - Creator → Consumer handoff：依賴成功 submit，因此一起 blocked

## Checklist 結果

### 1. App Shell 與路由切換

- `PASS`
- 已驗證：
  - `Creator`
  - `Consumer`
  - `Settings`
  - `About`
- 每一頁都正常渲染，沒有白屏或殘留 dialog overlay
- Status Bar 會跟著切換：
  - `Creator 模式`
  - `Consumer 模式`
  - `Settings`
  - `關於`

補充：

- 目前 build 沒有 standalone `/history` route
- [AppRoutes.tsx](/Users/ruru/Documents/RuData/Devs/ElectronDev/rx-fhir_Dev/rx-fhir/src/renderer/app/AppRoutes.tsx) 只掛了 `Creator / Consumer / Settings / About`
- History 能力目前存在於 Consumer 的 `History` tab，而不是獨立頁

### 2. Settings 偏好持久化

- `PASS`
- 本輪實際修改：
  - `theme`: `light -> dark`
  - `locale`: `zh-TW -> en`
  - `textScale`: `scale100 -> scale112`
  - `uiZoom`: `zoom100 -> zoom110`
- 完整重啟後仍正確保留：
  - `rootDark = true`
  - `textScale = scale112`
  - `fontScale = 1.125`
  - `devicePixelRatio = 2.2`
- `localStorage` 與 persisted store 內容一致：
  - `rxfhir-app-store`
  - `rxfhir-locale`

### 3. Preferences 匯出 / 匯入 round trip

- `BLOCKED`
- 本輪沒有把原生 open/save dialog 自動化接回來
- 因此沒有驗到：
  - 實際匯出檔案
  - 再匯入後恢復設定
  - shortcut override round trip

### 4. Command Palette / Shortcut Help / Quick Start

- `PASS`
- Command Palette：
  - `⌘K` 可正常打開
  - 從 palette 點 `About` 會成功切到 `#/about`
- Shortcut Help：
  - `⌘/` 可正常打開
  - `Esc` 可正常關閉
- Quick Start：
  - 可從 Command Palette 開啟 `Quick Start Tasks`
  - `Load Example Query` 會切到 `#/consumer`
  - 會帶入 example identifier：`142216009`
  - 畫面會顯示 example loaded 提示

### 5. Creator draft 自動儲存與還原

- `PASS`
- 在 Creator `Organization` step 執行 `Fill Mock`
- 產生資料後切到 `Patient`，再切回 `Organization`
- 表單值仍正確保留：
  - `National Taiwan University Hospital`
  - `NTUH001`
- persisted draft 已寫入 `rxfhir-creator-draft`
- 完整重啟後：
  - Creator 仍在 step 1
  - draft 值仍存在
  - `Draft auto-saved` 與 `Last saved` 狀態正確顯示

### 6. Creator request inspector 與提交流程

- `BLOCKED`
- 本輪沒有可安全寫入的 FHIR submit 環境
- 因此沒有驗：
  - request inspector 新增 request / response
  - submit success / error feedback
  - final bundle submit

### 7. Creator → Consumer handoff

- `BLOCKED`
- 依賴第 `6` 項 submit 成功
- 本輪因此沒有驗：
  - success handoff 的 route state
  - auto-prefill / auto-select bundle
  - submit 後的 consumer targeting

### 8. Consumer 搜尋 / 詳情 / Diff / Export

- `PASS`
- 使用 `Apply Query Example` 帶入 identifier `142216009`
- 對 public HAPI FHIR 搜尋後回 `6` 筆結果
- detail pane 可正常打開
- `Structured / JSON` 可正常切換
- Compare 可正常打開 `Bundle Diff`
  - 本輪看到 `18 difference(s)`
  - `Swap A / B` 按鈕存在
- Export dropdown 可正常展開，看到：
  - `Export FHIR JSON`
  - `Export Postman Collection`
  - `Export HTML Report`

### 9. History 與 Saved Searches

- `PASS`
- 搜尋完成後，Consumer `History` tab 可看到 search record
- 本輪驗證：
  - `pin` 後，`rxfhir-search-history` record 變成 `pinned: true`
  - `rerun` 後會回到 results，並再次跑出 `6` 筆結果
  - search input 仍為 `142216009`
- `Submissions` 仍為空，這是預期結果，因為本輪沒有 Creator submit

### 10. About / Update / External Link

- `PASS`
- `Check for Updates` 執行後顯示：
  - `You're up to date`
- 點 `GitHub` 後，畫面沒有卡住或導頁錯亂
- 透過 macOS frontmost app 檢查，前景 app 從 `Electron` 變成 `Google Chrome`
- 代表 `openExternalUrl` 有正常交給系統瀏覽器

## 觀察與注意事項

### 1. History route 與 checklist 假設不一致

- 本輪原始 checklist 把 History 當成獨立頁面
- 但目前產品實作是 Consumer 內的 `History` tab
- 後續手動測試清單應改成：
  - 驗 `Consumer > History tab`
  - 不要再要求 `#/history`

### 2. Creator draft restored banner：已修復

- 原始 smoke 當下曾觀察到：
  - draft 值有正確恢復
  - `Draft auto-saved` 狀態存在
  - 但 `已恢復上次草稿 / Previous draft restored` banner 沒有顯示
- 後續已修正 [creatorStore.ts](/Users/ruru/Documents/RuData/Devs/ElectronDev/rx-fhir_Dev/rx-fhir/src/renderer/features/creator/store/creatorStore.ts) 的 hydration 狀態推導方式，避免自動 hydration 時 `draftRestored` 旗標漏設
- 修正後已重新驗證：
  - reload 後 draft 值會恢復
  - `草稿已自動儲存`
  - `已恢復上次草稿`
  - 三者會同時正確出現
- 這條 observation 現在應視為 `resolved`，不是目前 build 的已知問題

### 3. Native dialog coverage 仍缺

- 這輪沒做原生檔案對話框 round trip
- 因此還沒重新確認：
  - Preferences 匯出 / 匯入
  - Export dropdown 實際存檔成功

## 建議後續補測

1. 補一個可安全寫入的 FHIR 測試伺服器，完成 Creator submit / request inspector / handoff smoke。
2. 把 native open/save dialog 的自動化接回來，補齊 Preferences round trip 與 Consumer export 成功路徑。
3. 更新手動 smoke checklist，把 History 描述改成 Consumer 內建 tab，而不是獨立 route。
