# RxFHIR Accessibility Roadmap v1

## 文件目的

本文件定義 RxFHIR 第一版無障礙實作路線圖，作為後續設計、開發、驗收與回歸測試的共同基準。

- 範圍：Electron Renderer UI 與其互動流程
- 優先順序：先確保核心流程可用，再補強複雜元件與個人化能力
- 目標標準：
  - 不使用滑鼠可完成主要功能
  - 螢幕閱讀器可理解主要頁面與狀態變化
  - 低視力使用者可在高縮放與高對比需求下完成主要功能

## 產品範圍

目前優先涵蓋下列模組與元件：

- App Shell
  - `src/renderer/app/AppShell.tsx`
  - `src/renderer/app/components/Sidebar.tsx`
  - `src/renderer/app/components/StatusBar.tsx`
- Creator
  - `src/renderer/features/creator/CreatorPage.tsx`
  - `src/renderer/features/creator/ResourceStepper.tsx`
  - `src/renderer/features/creator/forms/*.tsx`
- Consumer
  - `src/renderer/features/consumer/SearchForm.tsx`
  - `src/renderer/features/consumer/ResultList.tsx`
  - `src/renderer/features/consumer/PrescriptionDetail.tsx`
- Settings / Shared
  - `src/renderer/features/settings/SettingsPage.tsx`
  - `src/renderer/features/settings/ShortcutSettingsPanel.tsx`
  - `src/renderer/app/components/ShortcutHelpDialog.tsx`
  - `src/renderer/features/creator/components/FhirRequestInspector.tsx`
  - `src/renderer/shared/components/JsonViewer.tsx`
  - `src/renderer/shared/components/FhirErrorAlert.tsx`

## 核心原則

1. 優先使用原生語意 HTML，再補 ARIA。
2. 焦點移動必須可預期，不可消失、不可以陷入無法退出的區域。
3. 動態更新一定要同時有視覺提示與可朗讀提示。
4. 不以顏色作為唯一狀態訊號。
5. 快捷鍵是增強功能，不可成為唯一操作方式。

## 優先級定義

- `P0`：若未完成，會阻斷主要功能、鍵盤操作、螢幕閱讀器理解或低視力使用
- `P1`：不阻斷主要流程，但會造成操作負擔、理解障礙或不良體驗
- `P2`：個人化、進階整合與長期強化項目

## 里程碑

### M0 Baseline Audit

目的：建立現況盤點、驗收準則與風險列表。

交付：

- 頁面與互動元件清單
- P0 / P1 / P2 問題分類
- 手動測試清單
- 發版前無障礙驗收門檻

### M1 Core Access

目的：讓核心 Creator / Consumer / Settings 流程可用。

交付：

- App Shell landmarks、skip link、route focus
- 表單 label / hint / error / required 規範
- Stepper 與結果列表的鍵盤與焦點規則
- 全域 live region 策略
- 基本對比與 focus ring 修正

### M2 Complex UI

目的：補齊複雜元件與技術檢視區。

交付：

- Tabs / Dialog / Tooltip / Popover 檢查與修正
- JSON Viewer / Request Inspector 的替代閱讀方式
- 搜尋結果與詳情切換的語意化狀態
- Live Demo / Showcase 的 reduced motion 支援

### M3 Personalization

目的：提供使用者偏好與 OS 偏好整合。

交付：

- 字級縮放 / zoom
- 強化焦點樣式
- 動畫減量設定
- Accessibility settings 區塊

### M4 Regression Guard

目的：建立長期維護流程，避免版本回退。

交付：

- PR checklist
- 手動 SR 測試腳本
- 自動化掃描導入策略

## 實作項目總表

| 項目 | 說明 | 優先級 | 建議責任範圍 |
|---|---|---|---|
| App landmarks 與 route focus | 加入 `header/nav/main/footer`、skip link、切頁後焦點管理 | P0 | `App.tsx`, `Sidebar.tsx` |
| 焦點可視化 | 所有可聚焦元件提供清楚 focus ring | P0 | shared UI, `globals.css` |
| Dialog / Tabs 基礎可用 | 確認焦點 trap、ARIA label 與鍵盤規則 | P0 | shared UI, feature dialogs |
| 表單可讀性 | `label`、`aria-describedby`、`aria-invalid`、錯誤摘要 | P0 | Creator / Settings forms |
| 動態狀態公告 | 搜尋、提交、匯入匯出、Server health 全部有 live region | P0 | shared alerts, search / creator flows |
| Stepper 語意與狀態 | 目前步驟、完成狀態、步驟數朗讀 | P0 | `ResourceStepper.tsx` |
| Consumer 結果列表語意 | 選取狀態、結果數、目前焦點與詳情關係明確 | P0 | `ResultList.tsx`, `PrescriptionDetail.tsx` |
| 色彩對比修正 | Badge、Alert、StatusBar、禁用態與 focus ring 對比 | P0 | CSS tokens, shared components |
| 200% 縮放與 reflow | 保證主要流程不裁切、不重疊 | P0 | layout components |
| JSON / Request Inspector 摘要模式 | 為技術面板提供易讀摘要或 plain text 替代 | P1 | `JsonViewer.tsx`, `FhirRequestInspector.tsx` |
| Motion 減量 | 支援 `prefers-reduced-motion` 與停用 autoplay | P1 | showcase / live demo |
| 系統偏好整合 | 支援 `forced-colors`、`prefers-contrast`、Electron zoom | P1 | app shell, styles |
| Accessibility 設定頁 | 使用者可保存偏好 | P2 | Settings module |
| 自動化與回歸流程 | axe / checklist / manual SR test integration | P0 | docs + CI plan |

## 建議 Issue 拆分

1. `a11y: baseline audit and acceptance criteria`
2. `a11y: app shell landmarks, skip link, and route focus management`
3. `a11y: creator form labels, descriptions, and error semantics`
4. `a11y: creator stepper keyboard and current-step semantics`
5. `a11y: consumer search status announcements and result semantics`
6. `a11y: dialog, tabs, and focus restore audit`
7. `a11y: contrast and focus-indicator pass`
8. `a11y: reduced-motion support for live demo and feature showcase`
9. `a11y: accessible summary mode for JSON and request inspector`
10. `a11y: text scale, zoom, and accessibility preferences`
11. `a11y: regression checklist and manual screen-reader test flow`

## Definition of Done

以下條件全部滿足，才可視為第一階段完成：

- 不使用滑鼠可完成：
  - 建立處方流程
  - 提交 Bundle
  - 查詢 Bundle
  - 開啟並閱讀詳情
  - 修改 Settings
- VoiceOver / NVDA 可讀出：
  - 目前頁面標題
  - 目前步驟
  - 欄位名稱與錯誤
  - 搜尋結果數量
  - 成功 / 失敗 / 載入狀態
- 200% 縮放下主要頁面不裁切、不重疊、不需水平捲動才能完成操作
- 主要狀態不只靠顏色辨識
- reduced motion 啟用後，導覽動畫與教學流程不強制自動播放

## 與後續實作文件的關係

- `checklist-p0.md`：P0 驗收清單
- `manual-test-script.md`：手動測試腳本
- `component-rules.md`：開發實作規則與元件約束
