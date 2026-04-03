# RxFHIR UX Planning Index

## 範圍說明

本目錄整理目前 RxFHIR 專案中「已實作的 UX 功能」與「尚未完成的 UX 規劃」，並依性質拆分成多份文件，避免把導航、表單、回饋、設定、引導與桌面行為混在同一份規格中。

- 盤點依據：
  - `README.md`
  - `src/main/*`
  - `src/renderer/**/*`
  - `docs/accessibility/*`
- 文件定位：
  - `docs/accessibility/`：無障礙規格、驗收與測試
  - `docs/ux/`：一般使用者體驗、流程流暢度、資訊架構、桌面效率與產品引導

## 已實作項目

- App Shell 已具備穩定的主框架：
  - 固定側邊欄導航
  - 頁面標題與狀態列
  - 主題 / 語系切換
  - 高縮放下的基本 reflow
- Creator 已有完整的多步驟工作流：
  - Stepper
  - draft autosave 與 restore
  - mock fill / template
  - guide cards
  - final review
  - 成功後可直接跳 Consumer
- Consumer 已有可用的查詢工作台：
  - Basic / Date / Complex search
  - Results / Query Helpers 分區
  - recent submissions / saved searches
  - detail pane 與 JSON 檢視
- Settings 已有核心偏好設定：
  - server preset / health check
  - accessibility preferences
  - shortcut customization
- 新手導向能力已具基礎：
  - Live Demo
  - Feature Showcase
  - Query Helpers
- Electron 桌面骨幹已具備：
  - JSON 匯入匯出
  - 外部連結開啟
  - app-level zoom
  - macOS custom About/menu

## 待實作項目

- 導航仍缺少桌面效率強化：
  - 可收合 / 迷你化 sidebar
  - navigation badge
  - recent actions quick jump
- Creator 的草稿與送出狀態仍可更清楚：
  - 更一致的 autosave 狀態可視化
  - 全域 unsaved-change guard
  - resubmit diff / compare
- Consumer 仍缺少更桌面化的操作捷徑：
  - drag-and-drop 匯入
  - 更完整的結果後續操作列
  - workspace state persistence
- 全域回饋仍未統一：
  - toast system
  - activity center
  - staged loading copy
  - danger confirm pattern
- Settings / 生產力工具仍有缺口：
  - settings search
  - dirty marker / per-section reset
  - preference import / export
  - command palette
- 新手引導仍偏展示，任務導向不足：
  - first-run onboarding
  - task-based onboarding
  - success / failure 後的 next-step suggestion
- Electron 桌面原生體驗尚未補齊：
  - window state persistence
  - open recent
  - app-level drag-and-drop entry

## 建議優先級

- `P0`
  - 統一成功 / 失敗 / 載入 / 危險操作回饋
  - Creator 的 autosave 狀態與未儲存保護
  - first-run onboarding 與成功後 next-step 建議
  - Settings 的 dirty marker 與 reset 規則
- `P1`
  - collapsible sidebar
  - command palette
  - settings search
  - drag-and-drop import
  - staged loading states
- `P2`
  - activity center
  - open recent
  - preference import / export
  - resubmit diff / compare

## 後續實作任務拆分

1. 先完成 `feedback` 與 `forms` 的 P0 項目，因為這兩塊直接影響主流程完成率。
2. 接著完成 `onboarding` 的 first-run 與 task-based guide，降低首次使用門檻。
3. 再補 `settings` 與 `navigation` 的效率型能力，例如 search、command palette、sidebar compact mode。
4. 最後處理 `desktop` 類型的原生強化，例如 window persistence、Open Recent、drag-and-drop。

## 文件結構

| 文件 | 範圍 |
|---|---|
| [navigation/app-shell-and-navigation.md](./navigation/app-shell-and-navigation.md) | App Shell、sidebar、頁面切換、workspace 版面 |
| [workflows/creator-and-form-workflows.md](./workflows/creator-and-form-workflows.md) | Creator stepper、表單、draft、模板、送出流程 |
| [workflows/consumer-search-and-results.md](./workflows/consumer-search-and-results.md) | Consumer 查詢、結果、詳情、搜尋捷徑 |
| [feedback/async-feedback-and-notifications.md](./feedback/async-feedback-and-notifications.md) | loading、success/error、dialog、通知與 activity 模式 |
| [settings/preferences-shortcuts-and-productivity.md](./settings/preferences-shortcuts-and-productivity.md) | Settings、shortcuts、個人化偏好與效率工具 |
| [onboarding/guidance-and-discovery.md](./onboarding/guidance-and-discovery.md) | Live Demo、Feature Showcase、first-run、任務導向引導 |
| [desktop/desktop-native-behaviors.md](./desktop/desktop-native-behaviors.md) | Electron 原生行為、檔案、視窗、OS 整合 |
