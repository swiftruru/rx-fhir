# Desktop Native Behaviors

## 範圍說明

本文件聚焦 Electron App 特有的桌面體驗，包括視窗行為、檔案匯入匯出、OS 整合、menu / About、最近檔案與桌面效率功能。

## 已實作項目

- 已透過 Electron main / preload bridge 提供 Bundle JSON 匯出與匯入。
- 外部 URL 已統一交由系統瀏覽器開啟。
- app-level zoom 已透過 Electron bridge 接到實際視窗縮放。
- macOS 已有自訂 app name、dock icon、About 視窗與 menu label。
- App 已使用自訂 titlebar / drag region 與 no-drag controls，讓桌面視窗操作較穩定。

## 待實作項目

- `P1` window state persistence：
  - 目前未記住視窗大小、位置與上次工作狀態。
- `P1` page-level / app-level drag-and-drop：
  - 目前本機 JSON 匯入仍需透過檔案選擇器。
- `P2` Open Recent / recent files：
  - 目前尚未把最近開啟的本機 Bundle 變成桌面捷徑。
- `P2` native close / quit guard：
  - Creator 雖已有局部 reset confirm，但尚未在原生關閉視窗 / 離開 app 時提供一致保護。
- `P2` OS-level progress / notification integration：
  - 尚未把長操作狀態與通知延伸到原生層。

## 建議優先級

- `P0`
  - 無新增 P0。桌面骨幹足以支撐目前功能。
- `P1`
  - window state persistence
  - drag-and-drop import
- `P2`
  - Open Recent
  - native close guard
  - OS notification / progress integration

## 後續實作任務拆分

1. 建立 BrowserWindow state persistence：
   - size
   - position
   - maximized state
2. 設計 app-level drag-and-drop 匯入流程：
   - drop validation
   - visual affordance
   - error recovery
3. 建立 recent files store，並決定是否整合到：
   - app menu
   - Consumer helper panel
4. 在 main process 層補 quit / close guard，並與 Creator dirty state 對接。
5. 規劃是否需要原生通知與工作進度指示，再決定是否整合 Electron `Notification` 或其他 OS API。
