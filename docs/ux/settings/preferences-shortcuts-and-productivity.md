# Preferences, Shortcuts, and Productivity

## 範圍說明

本文件涵蓋 Settings 頁的資訊架構、使用者偏好、快捷鍵管理，以及提升桌面效率的生產力功能。

## 已實作項目

- Settings 已拆為多個明確分頁：
  - Server
  - Accessibility
  - Shortcuts
- Server 設定已具備：
  - preset server
  - URL 編輯
  - live health check
  - save feedback
- Accessibility 偏好已具備：
  - motion preference
  - text scale
  - full-app zoom
  - focus style
- Keyboard shortcut system 已完成骨幹：
  - shortcut help dialog
  - customizable bindings
  - conflict detection
  - restore defaults
  - category grouping
- Shortcut settings 目前也已有摘要區，能看到目前分類數量、自訂數量與預設數量。
- Theme 與 locale 目前已在 App Shell 提供快速切換入口。

## 待實作項目

- `P0` settings dirty marker：
  - 目前已能儲存設定，但尚未一致標示哪些設定已改動、哪些尚未套用或尚未儲存。
- `P0` per-section reset：
  - 快捷鍵已有 reset，但 Server / Accessibility 尚未形成一致的單區塊 reset 規則。
- `P1` settings search：
  - 設定增加後，使用者仍需手動找分頁與區塊。
- `P1` command palette：
  - 目前有快捷鍵系統，但還沒有可搜尋 action、route、設定入口的命令面板。
- `P1` shortcut contextual availability：
  - 目前已依分類顯示快捷鍵，但尚未清楚指出「這個頁面此刻可用哪些動作」。
- `P2` preference import / export：
  - 換機器或重裝時，使用者仍需手動重設。
- `P2` 進階 productivity shortcut flows：
  - 尚未提供像是 recent commands、quick action search、saved action sets 等桌面工具體驗。

## 建議優先級

- `P0`
  - settings dirty marker
  - per-section reset
- `P1`
  - settings search
  - command palette
  - contextual shortcut availability
- `P2`
  - preference import / export
  - advanced productivity tools

## 後續實作任務拆分

1. 建立 Settings default diff 機制：
   - current value
   - saved value
   - default value
2. 為每個 Settings 區塊補：
   - changed badge
   - reset action
   - save status feedback
3. 建立 settings search index，讓設定名稱、描述、別名都可搜尋。
4. 定義 command palette 的 action registry：
   - route actions
   - search actions
   - settings actions
   - Creator utility actions
5. 在 shortcut help / settings 中補「目前頁面可用」與「全域可用」兩種視圖。
6. 最後再補 preference import / export 的 schema 與版本相容策略。
