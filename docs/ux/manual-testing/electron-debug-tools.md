# Electron UX Debug Tools

## 範圍說明

這份文件整理 RxFHIR 目前可直接在 repo 內使用的 Electron UX 驗證工具，目標是減少每次手動拼 `CDP` 指令與重複調試的成本。

適用情境：

- 需要檢查真正的 Electron 視窗，而不是靜態 renderer
- 需要快速驗證 `window.rxfhir` bridge、路由、drag-and-drop 等 renderer 行為
- 需要在手動測試前先做一輪最小 smoke check

## 目前可用工具

### 1. `npm run cdp:eval`

用途：

- 對目前正在執行的 Electron renderer 直接執行任意 JavaScript expression
- 適合查目前路由、bridge 狀態、DOM 文字、store 狀態

範例：

```bash
npm run cdp:eval -- "location.hash"
npm run cdp:eval -- "Object.keys(window.rxfhir ?? {})"
npm run cdp:eval -- --port 9233 --match RxFHIR "document.title"
```

### 2. `npm run ux:electron:smoke`

用途：

- 對目前 running 的 Electron debug instance 做一輪最小 UX smoke check
- 目前包含：
  - renderer target 可連線
  - `window.rxfhir` bridge 方法完整
  - Consumer drag-and-drop overlay 與匯入流程

範例：

```bash
npm run ux:electron:smoke
npm run ux:electron:smoke -- --port 9233 --match RxFHIR
```

### 3. `npm run ux:electron:verify`

用途：

- 自動跑完整最小驗證鏈
- 目前會依序：
  - `build`
  - 啟動帶 remote debugging 的全新 Electron instance
  - 等待 renderer ready
  - 執行 Electron UX smoke check
  - 關閉測試用 Electron instance

範例：

```bash
npm run ux:electron:verify
npm run ux:electron:verify -- --skip-build
npm run ux:electron:verify -- --port 9234 --match RxFHIR
```

## 執行前提

`cdp:eval` 與 `ux:electron:smoke` 都需要一個已啟動、且開著 remote debugging 的 Electron instance。

`ux:electron:verify` 則會自己啟動一個乾淨的測試 instance。

目前建議啟動方式：

```bash
npm run build
env -u ELECTRON_RUN_AS_NODE ./node_modules/electron/dist/RxFHIR.app/Contents/MacOS/Electron . --remote-debugging-port=9233
```

說明：

- 這份 repo 所在環境可能帶有 `ELECTRON_RUN_AS_NODE=1`
- 若不清掉，Electron 主程序可能不會真的以桌面 app 方式啟動

## 建議使用順序

### 選項 A：一鍵驗證

```bash
npm run ux:electron:verify
```

### 選項 B：手動開 instance 再查

1. 啟動帶 `--remote-debugging-port=9233` 的 Electron instance
2. 先跑：

```bash
npm run ux:electron:smoke
```

3. 若 smoke check 通過，再用：

```bash
npm run cdp:eval -- "<expression>"
```

補做更細的互動驗證

## 限制與注意事項

- `ux:electron:smoke` 目前只覆蓋 renderer 與 drag-and-drop 類型的最小回歸，不會自動操作原生 open/save dialog
- `ux:electron:verify` 目前也是以 smoke check 為主，仍不會自動操作原生 open/save dialog
- 原生檔案面板、視窗管理、外部連結等仍建議搭配：
  - `System Events`
  - `screencapture`
  - 手動驗證清單
- 若同時開多個 RxFHIR / Electron 視窗，`CDP` 可能會連到錯的 target；此時請先關掉多餘 instance，再重跑 smoke
