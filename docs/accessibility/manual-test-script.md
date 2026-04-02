# RxFHIR Accessibility Manual Test Script

## 文件目的

本文件定義 RxFHIR 的手動無障礙測試流程，供開發者、reviewer 與 release 前驗收使用。

## 測試環境

至少涵蓋：

- macOS + VoiceOver + Chrome / Electron App
- Windows + NVDA + Electron App
- Light theme / Dark theme
- 100% 與 200% 縮放

## 測試前準備

1. 啟動應用程式。
2. 確認目前可進入：
   - Creator
   - Consumer
   - Settings
3. 若有預設 demo data，可先保留以便快速驗證。

## 腳本 A：純鍵盤主流程

### A1 App Shell

1. 啟動 App 後，不用滑鼠。
2. 使用 `Tab` 檢查是否可進入主要內容。
3. 驗證是否能辨識目前位於哪一頁。
4. 使用導覽或快捷鍵切到 Creator / Consumer / Settings。

預期結果：

- 焦點始終可見
- 路由切換後焦點不消失
- 可辨識目前頁面

### A2 Creator

1. 進入 Creator。
2. 使用鍵盤在 Stepper 移動步驟。
3. 進入第一個表單，檢查欄位順序與 label。
4. 嘗試送出空表單，驗證錯誤提示。
5. 填入資料後送出。
6. 重複至少走到 Composition / Bundle 提交區。

預期結果：

- 可得知目前步驟與完成狀態
- 錯誤會在合理位置顯示
- 成功 / 失敗 / loading 都有清楚提示

### A3 Consumer

1. 進入 Consumer。
2. 使用鍵盤切換 Basic / Date / Complex tabs。
3. 聚焦搜尋欄位並送出一次查詢。
4. 用鍵盤選到某一筆結果並開啟詳情。
5. 關閉詳情，確認焦點回到合理位置。

預期結果：

- 結果數量可見且可理解
- 列表可選取
- 詳情關閉後不會失去焦點

### A4 Settings

1. 進入 Settings。
2. 用鍵盤切換 tabs。
3. 測試 Server URL 欄位與測試按鈕。
4. 進入快捷鍵設定頁，確認可聚焦與操作。

預期結果：

- 所有控制元件可用鍵盤完成
- 動作結果有清楚提示

## 腳本 B：VoiceOver / NVDA

### B1 頁面理解

檢查項目：

- App 啟動後是否能朗讀目前頁面標題
- 導覽是否被辨識為 navigation
- main 區是否可快速跳轉

### B2 Creator 表單

檢查項目：

- 欄位 label 是否正確朗讀
- 必填欄位是否可辨識
- 錯誤是否可朗讀
- 成功提示是否被公告

### B3 Consumer 查詢

檢查項目：

- 切換 tab 時是否可理解目前 tab
- 搜尋開始 / 結束是否有公告
- 結果項目是否有可理解名稱
- 詳情中的區段標題是否清楚

### B4 Dialog / Help / Shortcuts

檢查項目：

- 開啟快捷鍵說明時焦點是否進入對話框
- 關閉後焦點是否回原觸發點
- 對話框標題與說明是否會被朗讀

## 腳本 C：低視力與縮放

1. 將 App 放大到 200%。
2. 檢查 Creator、Consumer、Settings。
3. 逐頁確認：
   - 沒有文字裁切
   - 沒有重疊
   - 沒有必須水平捲動才可完成操作
   - 焦點樣式仍可見

## 腳本 D：動態狀態

檢查以下狀態是否同時具備可見與可朗讀提示：

- 查詢中
- 查詢成功
- 查詢失敗
- Resource 建立成功
- Resource 重用 / 更新
- Bundle 提交成功
- Bundle 提交失敗
- 匯入 / 匯出檔案成功與失敗
- Server health online / offline / checking

## 缺陷記錄格式

每一個無障礙缺陷至少記錄：

- 頁面 / 元件
- 重現步驟
- 實際結果
- 預期結果
- 影響使用者類型
- 優先級：P0 / P1 / P2

## Release Gate

發版前至少要完成：

- 腳本 A 全部通過
- 腳本 B 至少在一個平台完整執行
- 腳本 C 完成 200% 檢查
- 腳本 D 驗證所有主要動態訊息
