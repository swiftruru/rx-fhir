# RxFHIR 全自動 UI 測試教師展示稿

這份文件是給 **老師 / 評審 / 專題展示現場** 使用的詳細口頭展示稿。  
定位不是技術規格書，而是你在 demo 時可以直接照著講、照著操作、照著回答問題的版本。

如果你要現場展示，建議先準備好：

```bash
npm run test:ui:headed
```

展示完自動操作後，再視情況補充：

```bash
npm run test:ui:report
```

建議展示前先保留一次最新綠燈結果：

```bash
npm run typecheck
npm test
npm run test:ui
npm run ux:electron:verify
```

---

## 一句話版本

RxFHIR 現在已經有一套 **全自動 UI 測試**，可以自動啟動真實的 Electron App、像使用者一樣操作畫面、驗證結果是否正確，並且能在本機與 GitHub Actions 上重複執行。

目前這一版已經是 **適合學生專題展示的交付版本**，重點是穩定、可展示、可重複，不是持續擴充更多低價值案例。

---

## 先講給老師聽的開場版本

### 你可以這樣講

各位老師好，這次我想展示的是我在 RxFHIR 這個 Electron 桌面應用程式裡，導入的「全自動 UI 測試」。

這裡的 UI 測試不是在測單一函式，也不是只測 API 有沒有回傳資料，而是直接啟動真實的桌面 App，從使用者看到的畫面開始，自動點擊按鈕、自動切換頁面、自動填表單、自動驗證畫面狀態。

所以它驗證的是「使用者流程」本身，而不只是某個函式的輸入輸出。

### 螢幕上會看到什麼

- 你的終端機準備好 `npm run test:ui:headed`
- 之後會跳出真實的 RxFHIR Electron 視窗

### 這一步要傳達的重點

- 這不是單元測試
- 這不是假畫面截圖比對
- 這是 **真實 Electron App 被自動操作**

---

## 什麼是全自動 UI 測試

### 你可以這樣講

如果用一句最簡單的話來說，全自動 UI 測試就是：

「讓程式自己像使用者一樣操作畫面，並確認畫面結果正不正確。」

以 RxFHIR 來說，它會自動：

- 啟動 Electron App
- 切換到不同頁面
- 在 Creator 或 Consumer 裡輸入資料
- 觸發搜尋或匯入流程
- 驗證結果有沒有出現
- 驗證錯誤或空資料時，畫面是否有正確提示
- 驗證重開 App 之後，設定或草稿是否仍然存在

### 這一步要傳達的重點

- UI 測試關心的是「使用者會不會成功完成流程」
- 它比 unit test 更接近真實使用情境
- 對桌面 app 展示特別有說服力

---

## 這和單元測試有什麼不同

### 你可以這樣講

我目前專案裡其實同時有三層驗證：

1. `Vitest` 的 unit test，主要測純邏輯
2. Electron smoke / verify，主要測基本啟動與快速回歸
3. Playwright 的 UI 自動測試，主要測使用者畫面流程

所以這次展示的重點不是取代單元測試，而是補上「畫面真的能不能被正常使用」這一層。

舉例來說，某個搜尋函式 unit test 可能是綠的，但使用者在畫面上按搜尋時，還是可能因為 route、狀態管理、selector、dialog 或持久化流程出錯而失敗。  
UI 測試就是用來抓這種「函式沒壞，但產品流程壞了」的問題。

### 這一步要傳達的重點

- unit test 測的是邏輯單元
- UI test 測的是真實操作流程
- 兩者不是互斥，而是互補

---

## 為什麼 RxFHIR 適合做這件事

### 你可以這樣講

RxFHIR 是 Electron App，不是純靜態網站。  
它有幾個很適合做 UI 自動化的特性：

- 有明確的 Creator、Consumer、Settings、About 頁面
- 有使用者會直接感受到的流程，例如搜尋、匯入、草稿還原、設定持久化
- 有一些跨畫面與跨重啟的狀態，例如歷史紀錄、saved searches、draft、preferences
- 有桌面 bridge 行為，例如 update 檢查與 external link

這些都很適合用 UI 自動化來驗證，因為如果只看 unit test，很難完整證明這些流程在真實畫面裡能正常運作。

### 這一步要傳達的重點

- RxFHIR 不是只有資料處理，也有很多可視化互動流程
- UI 自動測試可以補上使用者體驗層的證明

---

## 我最後採用的方案

### 你可以這樣講

我最後選擇的是：

- **Playwright + Electron**

這個組合的好處是，它可以直接啟動我的 Electron App，抓到真正的 renderer 畫面，然後像使用者一樣操作它。

同時我保留了原本的：

- `npm test` 對應的 `Vitest`
- `npm run ux:electron:verify` 對應的 smoke 驗證

也就是說，我不是把舊測試全部推翻，而是多補上一層更接近使用者視角的 UI 驗證。

### 我會補充的技術重點

- UI 自動測試指令：
  - `npm run test:ui`
  - `npm run test:ui:headed`
  - `npm run test:ui:report`
- GitHub Actions 也有獨立 workflow：
  - `.github/workflows/ui-automation.yml`

### 這一步要傳達的重點

- 採用的是現代、可維護的 Electron UI 測試方案
- 不是過時的 Spectron
- 也不是只靠臨時腳本硬寫

---

## 為什麼這套測試是穩定的

### 你可以這樣講

如果直接拿真實外部 FHIR API 來跑 UI 測試，測試很容易因為網路、伺服器狀態、資料變動而不穩定。  
所以我刻意把 UI 測試設計成「穩定可展示」的版本。

我做了幾個關鍵設計：

1. 使用真實 Electron 視窗
2. 使用隔離的 `userData`，避免污染真實使用資料
3. 用 mocked FHIR response 取代不穩定的外部 API
4. About / update / external-link 用 preload E2E bridge stub 驗證呼叫，不真的開瀏覽器或打外網

這樣做的目的不是逃避真實情境，而是把問題切清楚：

- UI 測試負責驗證「畫面流程」
- 外部 API 或原生桌面能力的不穩定，不應該被誤判成 UI 壞掉

### 這一步要傳達的重點

- 這套測試是有工程判斷的，不是把所有東西硬塞進去
- mock 不是偷懶，而是讓 UI 測試更準確、更穩定

---

## 建議的現場展示流程

## Step 1. 先說明你要展示的是什麼

### 你可以這樣講

接下來我會直接執行 RxFHIR 的 UI 自動測試。  
它會自己打開桌面 App、自己操作畫面、自己驗證結果。

### 指令

```bash
npm run test:ui:headed
```

### 老師會看到什麼

- 終端機開始跑測試
- Electron 視窗被自動打開
- App 開始自己切頁、填資料、按按鈕

### 這一步要傳達的重點

- 這不是單張截圖
- 是真實流程被自動操作

---

## Step 2. 指出它不是在測假頁面

### 你可以這樣講

這裡可以特別注意，現在被操作的是我真正的 Electron App，不是另外做一個展示網站，也不是把 component 單獨掛出來測。

它走的就是正式產品的 UI、正式產品的 route、正式產品的 renderer 邏輯。

### 老師會看到什麼

- Creator / Consumer / Settings / About 真實頁面切換
- 真實卡片、按鈕、detail pane、dialog

### 這一步要傳達的重點

- 這是產品層級驗證，不是 isolated component demo

---

## Step 3. 逐項說明目前測了哪些案例

以下這一段可以邊看畫面邊講，也可以在測試跑完後配合 report 解說。

---

## 案例 1：About update / external-link bridge

### 你可以這樣講

第一個案例是 About 頁面的桌面 bridge 行為。

這裡測的不是純畫面而已，而是：

- 點「檢查更新」後，UI 會不會顯示正確狀態
- 如果主程序推送 update available，About 頁面能不能正確反應
- 點 GitHub、首頁、Open Releases 時，有沒有正確走到桌面 bridge
- 點 Skip Version 時，有沒有正確記錄行為

### 為什麼重要

因為這些是 Electron App 才有的桌面能力，不是一般網頁表單測試。  
我希望證明的不只是畫面能 render，而是桌面整合行為也能被自動驗證。

### 老師看到這一步應理解什麼

- RxFHIR 的 UI 自動測試不只測頁面切換
- 連 Electron bridge 互動都有測到

---

## 案例 2：App shell navigation

### 你可以這樣講

第二個案例是最基本的桌面 app 可用性，測 App 啟動後能否正常切換主要頁面。

它會驗證：

- App 成功啟動
- Creator、Consumer、Settings、About 可以正常切換
- 不會白屏、不會卡住

### 為什麼重要

如果連最基本的 route 或頁面切換都會壞，那後面所有功能都不成立。  
這個案例是整套 UI 測試的最基本保護網。

---

## 案例 3：Creator draft restore

### 你可以這樣講

第三個案例是 Creator 的草稿保存與重啟還原。

它驗證的是：

- 使用者填到一半的資料會被保存
- 關掉 App 再重開之後，草稿會回來
- 對應的 restored 狀態也會正確呈現

### 為什麼重要

這是桌面 app 很重要的體驗。  
如果使用者每次重開都得從頭填，會非常不實用。  
所以這個案例證明的不只是畫面，而是狀態持久化真的有打通。

---

## 案例 4：Consumer 匯入本機 Bundle

### 你可以這樣講

第四個案例是 Consumer 的本機 Bundle drag-and-drop 匯入。

它會自動把 fixture JSON 拖進畫面，然後驗證：

- 匯入流程有沒有成功
- 結果列表有沒有出現
- detail pane 有沒有正常打開

### 為什麼重要

這個流程完全不依賴外部網路，非常適合現場 demo。  
它可以直接證明我的 App 不是只有查 API，也能處理本機資料匯入流程。

---

## 案例 5：Consumer 搜尋成功流程

### 你可以這樣講

這是比較接近產品核心價值的一個案例。

它會 mock 一筆成功的 FHIR 搜尋結果，然後自動驗證：

- 搜尋表單輸入
- 搜尋成功後的結果列表
- 點選結果後的 detail pane
- Structured / JSON 切換
- Diff dialog
- Export dropdown

### 為什麼重要

這能證明 RxFHIR 的主功能不是只能手動演示，而是真的可以被系統性驗證。

### 老師看到這一步應理解什麼

- 這不是只測「有沒有按到搜尋按鈕」
- 而是連搜尋後整條畫面流程都有檢查

---

## 案例 6：Consumer 空結果與錯誤狀態

### 你可以這樣講

除了成功流程，我也刻意測了失敗情境。

包括：

- 搜尋沒有資料時，畫面要顯示 empty state
- 搜尋出錯時，畫面要顯示 error state

### 為什麼重要

因為真正成熟的產品，不是只有成功時好看。  
失敗時如果畫面是空白、沒有提示，使用者根本不知道發生什麼事。

這個案例就是在證明：

RxFHIR 在異常情境下，也有設計過可理解的 UI 回饋。

---

## 案例 7：Consumer search history / saved searches

### 你可以這樣講

這個案例測的是跨畫面狀態與使用紀錄。

它會先做一次搜尋，再驗證：

- 搜尋紀錄有沒有進入 history
- 能不能 pin 起來
- 能不能 rerun
- pinned search 有沒有同步反映到 saved searches

### 為什麼重要

這類流程很容易在重構後壞掉，因為它牽涉到：

- store 狀態
- 畫面切換
- 歷史資料同步
- 重新帶回搜尋條件

這個案例代表我不只是測單頁畫面，而是有測跨區塊、跨狀態的使用流程。

---

## 案例 8：Consumer submission history

### 你可以這樣講

這個案例驗證的是 submission history 的回用能力。

它會用 seeded persisted history 重現真實桌面 app 的歷史紀錄情境，然後測：

- history 裡的 submission record 能否顯示
- 點 `fill search` 後，搜尋表單是否被正確預填
- 點 `view detail` 後，右側 detail pane 是否能打開

### 為什麼重要

這個案例代表 RxFHIR 的歷史資料不是只是存著而已，而是真的能再被使用。  
這對醫療資料相關工具來說很重要，因為重用既有紀錄可以提升效率與一致性。

---

## 案例 9：Settings persistence

### 你可以這樣講

最後一個重要案例是設定持久化。

它會驗證：

- accessibility 相關設定改掉後
- 關閉再重開 App
- 設定仍然保留

### 為什麼重要

因為這能證明 RxFHIR 是一個完整的桌面 app，而不是每次重開都重置成初始狀態的展示原型。

---

## 結果總結可以怎麼講

### 你可以這樣講

目前 RxFHIR 的 UI 自動化已經做到：

- 使用 **Playwright + Electron**
- 執行 **9 個 spec files、11 個 UI 測試案例**
- 可用 `npm run test:ui:headed` 在本機直接展示
- 可用 `npm run test:ui:report` 查看測試報告
- 已接進 GitHub Actions，讓 UI 自動化也能進入持續驗證流程

所以它不是只有「可以 demo 一次」，而是可以被持續、重複、系統化驗證。

### 這一步要傳達的重點

- 有本機展示能力
- 有持續驗證能力
- 有工程上的可維護性

---

## 限制與誠實說明

這一段建議你主動講，會顯得你對測試邊界有清楚判斷。

### 你可以這樣講

這套 UI 自動化目前刻意沒有把所有東西都硬塞進去，主要是為了讓它穩定、可展示、可維護。

目前的邊界是：

- 沒有把真實 public HAPI 當主測試來源
- 原生 save/open dialog 沒有納入第一波穩定 suite
- external browser 與 updater 是用 stub 驗證 bridge 行為，不是真的去開瀏覽器或打外網

這樣做的原因是，我希望 UI 測試反映的是「畫面流程是否正確」，而不是被外部網路或 OS 原生行為的不穩定影響。

### 這一步要傳達的重點

- 這不是做不到，而是刻意取捨
- 目標是讓專題展示時穩定、可信、可重複

---

## 如果老師問：這和單元測試差在哪裡？

### 建議回答

單元測試主要驗證某個函式或模組本身是否正確，範圍比較小。  
UI 自動測試驗證的是整個使用流程，包含畫面、狀態、互動、切頁與結果回饋。

所以單元測試可以告訴我「函式沒壞」，但 UI 自動測試可以告訴我「使用者真的能完成這個功能」。

---

## 如果老師問：為什麼要 mock？

### 建議回答

因為 UI 測試的目標是驗證 UI 與流程，不是驗證外部伺服器今天穩不穩。  
如果直接打真實 API，測試結果可能會受到網路、伺服器狀態、資料變動影響，反而很難判斷問題到底出在 UI 還是外部環境。

所以我把外部依賴 mock 掉，讓 UI 測試更穩定，也更能準確反映畫面流程本身有沒有壞。

---

## 如果老師問：為什麼不用真實 API？

### 建議回答

真實 API 不是不能測，而是不適合當核心 UI 自動化的主要依賴。  
我目前的策略是：

- 核心 UI 測試用 mock，確保穩定
- 真實 API 行為可以另外用手動測試、integration 測試或特定 smoke 驗證補強

這樣可以把責任分層，不會把不同類型的問題混在一起。

---

## 如果老師問：為什麼選 Playwright，不選 Spectron？

### 建議回答

因為 Spectron 已經過時，不是現在推薦的 Electron 測試方案。  
Playwright 比較現代，selector、assertion、report、trace、維護性都比較好，也比較適合現在的 Electron 專案。

對學生專題來說，它同時兼顧：

- 能展示
- 能維護
- 能本機穩定執行

---

## 如果老師問：這套測試之後怎麼擴充？

### 建議回答

之後可以再往幾個方向擴充：

- 補更多 Consumer 與 Creator 的完整情境
- 補更多 settings / accessibility 互動
- 增加更多 bridge 行為驗證
- 視需求再把某些原本用 stub 的桌面行為分階段納入

但我目前刻意先把最有展示價值、最穩定、最接近使用者的核心流程做好。

---

## 建議的收尾講法

### 你可以這樣講

總結來說，這次我不是只把 RxFHIR 做成一個能操作的 Electron App，  
而是進一步讓它具備一套可以自動驗證、可重複執行、可實際展示給老師看的 UI 測試能力。

這代表我不只是在完成功能，也有把「怎麼證明功能真的可用」這件事一起做進去。

如果老師問我現在還要不要再繼續加測試，我的回答會是：

目前這套已經足夠支撐專題展示與交付，接下來更重要的是穩定展示，而不是為了看起來更完整而過度工程化。

---

## 現場備用命令

```bash
npm run test:ui
npm run test:ui:headed
npm run test:ui:report
npm test
npm run typecheck
npm run ux:electron:verify
```

---

## 你自己展示前的最後提醒

- 先關掉不必要視窗，讓 Electron 自動操作更清楚
- 終端機字體稍微放大，老師比較看得清楚
- 先講「這不是 unit test」，再開始跑，效果最好
- 如果時間不夠，優先展示 `test:ui:headed`，結束後再補充 report 與 GitHub Actions
- 如果老師偏技術細節，就切回 [ui-automation.md](./ui-automation.md) 補充架構設計
- 不要主動承諾目前沒有做的範圍，例如真實 public HAPI end-to-end、原生 dialog 自動化、跨平台 UI matrix、視覺回歸系統
