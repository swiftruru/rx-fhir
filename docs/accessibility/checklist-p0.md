# RxFHIR Accessibility P0 Checklist

## 使用方式

本清單用於：

- 開始實作前確認範圍
- 開發完成後做自測
- PR review 時作為最低門檻

每一項都應能回答 `是 / 否 / 不適用`。

## App Shell

- [ ] 每個頁面只有一個可辨識的 `h1`
- [ ] 頁面存在 `main` 區域，且可被快速聚焦
- [ ] 有 skip link 可直接跳到主要內容
- [ ] Sidebar 導覽的目前頁面有 `aria-current="page"`
- [ ] 路由切換後焦點會移到頁面標題或主要內容，而不是停在舊頁面元素
- [ ] `document.title` 會反映目前頁面

## 鍵盤操作

- [ ] 所有按鈕、連結、表單欄位都可透過 Tab 抵達
- [ ] Tab 順序符合畫面閱讀順序
- [ ] Enter / Space 可啟動主要互動元件
- [ ] Escape 可關閉 Dialog / Popover / Help 類型元件
- [ ] 沒有鍵盤陷阱
- [ ] 文字輸入期間不會被全域快捷鍵誤搶焦點

## 焦點管理

- [ ] 所有可聚焦元件都有清楚的 focus 樣式
- [ ] 開啟 Dialog 後焦點會進入 Dialog
- [ ] 關閉 Dialog 後焦點會回到原本觸發按鈕
- [ ] 切換 Tabs 後焦點與選取狀態一致
- [ ] 查詢結果更新後，焦點不會消失或落到 `body`

## 表單

- [ ] 每個欄位都有可見 label
- [ ] Placeholder 沒有被當作唯一標示
- [ ] 提示文字有透過 `aria-describedby` 關聯
- [ ] 錯誤欄位有 `aria-invalid`
- [ ] 錯誤訊息可被螢幕閱讀器讀到
- [ ] 必填欄位不只用顏色或星號表示

## Creator

- [ ] Stepper 的目前步驟有 `aria-current="step"`
- [ ] 使用者可得知目前第幾步、總共幾步
- [ ] 步驟切換後焦點會移到新步驟標題或第一個欄位
- [ ] 送出成功 / 重用 / 更新 / 失敗都有可見提示與可朗讀提示
- [ ] Bundle 提交過程有載入狀態與結果公告

## Consumer

- [ ] 搜尋中有可見 loading 與可朗讀 loading 狀態
- [ ] 搜尋完成後可得知結果總數
- [ ] 結果列表中的每筆項目都有可理解名稱
- [ ] 目前選取的結果具備明確狀態，不只靠顏色
- [ ] 開啟詳情後，關閉時焦點可回到原結果項目或合理位置

## 動態內容與狀態提示

- [ ] 搜尋成功 / 失敗有 live region 公告
- [ ] FHIR 提交成功 / 失敗有 live region 公告
- [ ] 匯入 / 匯出檔案成功 / 取消 / 失敗有 live region 公告
- [ ] Server health 狀態變更可被理解

## 視覺設計

- [ ] 文字與背景對比符合最低可讀要求
- [ ] focus ring 與背景有足夠對比
- [ ] Success / Warning / Error / Selected / Disabled 不只靠顏色區分
- [ ] Badge 與小字在 light / dark theme 下仍可讀
- [ ] 200% 縮放下主要流程可完成

## 動畫與偏好

- [ ] 啟用 `prefers-reduced-motion` 後，主要動畫會減量
- [ ] Live Demo 與 Feature Showcase 不會強制自動播放
- [ ] Tooltip 不是唯一資訊來源

## 發版前最小驗收

- [ ] 用鍵盤走完 Creator 主流程一次
- [ ] 用鍵盤走完 Consumer 查詢與詳情閱讀一次
- [ ] 用 VoiceOver 或 NVDA 測一次主流程
- [ ] 用 200% zoom 檢查 Creator / Consumer / Settings
