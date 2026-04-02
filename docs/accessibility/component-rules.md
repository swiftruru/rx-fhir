# RxFHIR Accessibility Component Rules

## 文件目的

本文件定義 RxFHIR 在元件層的無障礙實作規則，避免後續開發重複引入不可存取的 UI 模式。

## 通用規則

### 1. 原生元素優先

- 可用 `button` 就不要用 `div`
- 可用 `a` 就不要用 `button` 模擬連結
- 可用 `input/select/textarea` 就不要自造表單控制項

### 2. ARIA 不是補救所有問題的工具

- 先有正確語意，再補充 ARIA
- 不要把錯誤的 DOM 結構硬用 ARIA 修飾成看似正確

### 3. 任何互動都必須可用鍵盤完成

- `Tab` 可抵達
- `Enter/Space` 可觸發
- `Escape` 可關閉暫時性介面

### 4. Focus 一律可見

- 不移除瀏覽器預設 outline，除非有更清楚的替代樣式
- 焦點樣式不可只在 hover 狀態下出現

### 5. 狀態不只靠顏色

- success / warning / error / selected / disabled 必須有文字或圖示輔助

## 頁面層規則

### 路由頁面

- 每頁僅一個 `h1`
- 頁面主要內容包在 `main`
- 進入新頁面後，焦點應移到 `main` 或 `h1`
- 導覽列當前項目必須有 `aria-current="page"`

### 側邊欄與狀態列

- Sidebar 用 `nav`
- Status bar 若顯示動態狀態，需決定是否納入 live region
- 狀態資訊若重要，不可只存在於 icon 或顏色

## 表單元件規則

### Label 與說明

- 每個欄位都需要可見 label
- hint / helper text 用 `aria-describedby`
- placeholder 不可作為唯一提示

### 驗證

- 錯誤欄位設 `aria-invalid="true"`
- 錯誤文字需與欄位建立關聯
- 送出失敗時：
  - 聚焦第一個錯誤欄位，或
  - 提供錯誤摘要並可快速跳轉

### 必填與選填

- 必填必須以文字清楚表示
- 不只用星號或顏色

## Dialog / Popover / Tooltip 規則

### Dialog

- 開啟後自動聚焦第一個合理元素
- 關閉後焦點回原觸發點
- 必須有標題與描述
- focus trap 必須有效

### Popover

- 不用來承載阻斷主流程的重要內容
- 關閉時焦點恢復

### Tooltip

- Tooltip 只能補充說明，不能是唯一資訊來源
- icon-only button 必須自身有 `aria-label`

## Stepper / Tabs / List 類元件規則

### Stepper

- 目前步驟使用 `aria-current="step"`
- 顯示總步數與完成數
- 方向鍵移動需與視覺行為一致

### Tabs

- 使用標準 `tablist/tab/tabpanel` 模式
- 選取狀態與焦點狀態需可理解

### 結果列表

- 列表項目需有可理解名稱
- 若有選取態，必須有明確語意與視覺狀態
- 點擊整卡時，仍需保證鍵盤可操作

## 動態內容規則

### Live Regions

建議統一策略：

- `polite`：一般成功提示、結果數量、載入完成
- `assertive`：阻斷式錯誤或嚴重失敗

### 必須公告的事件

- 搜尋開始 / 完成 / 失敗
- Resource 建立 / 更新 / 重用
- Bundle 提交成功 / 失敗
- 匯入 / 匯出結果
- Server health 狀態變更

### 注意事項

- 不要重複公告相同內容
- 公告訊息要短，避免把整段 JSON 或錯誤 raw details 丟進 live region

## 技術檢視元件規則

### JSON Viewer

- 不能只有樹狀視圖
- 應提供摘要模式或可複製 plain text
- 摺疊狀態要可由鍵盤操作

### FHIR Request Inspector

- 每個 request step 都應有清楚標題
- method、status、url、reason 應可被視覺與 SR 理解
- 不可只用 icon 表示成功或失敗

## 視覺與樣式規則

### 對比

- 一般文字至少 4.5:1
- 大字與粗字至少 3:1
- focus indicator 至少 3:1

### 縮放與 reflow

- 在 200% 縮放下主要流程可完成
- 不因固定高度導致內容不可見
- 不因固定寬度導致欄位或按鈕被切掉

### Motion

- 遵循 `prefers-reduced-motion`
- Spotlight、coach、typed demo、transition 應可停用或減量

## 桌面應用程式額外規則

### 快捷鍵

- 快捷鍵只作為增強功能，不作為唯一入口
- 快捷鍵說明對話框是只讀參考，不應做成像設定頁
- 快捷鍵設定頁的操作與狀態要分清楚

### Electron

- `document.title` 與畫面標題同步
- 如有 zoom / text scale，需持久化並可重置
- 外部連結應清楚說明會開啟系統瀏覽器

## Code Review 檢查點

每次新增 UI 時 reviewer 至少確認：

- 是否有正確語意元素
- 是否可用鍵盤完成操作
- 是否有可見 focus
- 是否有必要的 label / description / error relation
- 是否引入只靠顏色的狀態
- 是否有動態內容卻沒有 live announcement
