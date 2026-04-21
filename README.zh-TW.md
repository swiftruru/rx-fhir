# RxFHIR

<p align="center">
  <strong>🌐 Language / 語言：</strong>
  <a href="./README.md"><img src="https://img.shields.io/badge/English-8e8e93?style=flat-square" alt="English" /></a>
  <img src="https://img.shields.io/badge/繁體中文-d4779a?style=flat-square" alt="繁體中文（目前）" />
</p>

> ℞ + FHIR = RxFHIR — 一款符合臺灣 Core 電子處方箋 Profile 的桌面應用程式

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.41-d4779a?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/github/license/swiftruru/rx-fhir?style=flat-square&color=d4779a" alt="License" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-8e8e93?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/github/last-commit/swiftruru/rx-fhir?style=flat-square&color=b5838d" alt="Last Commit" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FHIR-R4-E33022?style=flat-square" alt="FHIR R4" />
  <img src="https://img.shields.io/badge/TW_Core_EMR--IG-2.5-2E7D32?style=flat-square" alt="TW Core EMR-IG 2.5" />
  <img src="https://img.shields.io/badge/HAPI_FHIR-supported-FF8C42?style=flat-square" alt="HAPI FHIR" />
  <img src="https://img.shields.io/badge/i18n-zh--TW%20%7C%20en-8b5cf6?style=flat-square" alt="i18n" />
</p>

---

## 📦 下載安裝檔

<p align="center">
  <strong>預先編譯好的桌面應用程式，無需下載原始碼或安裝建置工具。</strong><br />
  <sub>點擊下方對應平台即可前往最新版本下載頁。</sub>
</p>

<p align="center">
  <a href="https://github.com/swiftruru/rx-fhir/releases/latest">
    <img src="https://img.shields.io/badge/Download-macOS%20.dmg-000000?style=for-the-badge&logo=apple&logoColor=white&labelColor=4a4a4a" alt="Download for macOS" />
  </a>
  &nbsp;
  <a href="https://github.com/swiftruru/rx-fhir/releases/latest">
    <img src="https://img.shields.io/badge/Download-Windows%20Setup%20%7C%20Portable-0078D4?style=for-the-badge&logo=windows11&logoColor=white&labelColor=4a4a4a" alt="Download for Windows" />
  </a>
  &nbsp;
  <a href="https://github.com/swiftruru/rx-fhir/releases/latest">
    <img src="https://img.shields.io/badge/Download-Linux%20AppImage%20%7C%20.deb-FCC624?style=for-the-badge&logo=linux&logoColor=black&labelColor=4a4a4a" alt="Download for Linux" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/swiftruru/rx-fhir/releases/latest">📥 查看 GitHub Releases 上所有可下載版本 →</a>
</p>

---

本應用程式是一款以 Electron + React 打造的跨平台桌面程式，依據臺灣衛福部 EMR-IG 2.5 規範，建立與查詢 FHIR R4 電子處方箋。

本 README 反映的是 repository 中的**當前實作狀態**。若文件描述與實際行為有落差，請以原始碼為準。

---

## 架構

目前 Renderer 分為四個明確的層級：

- `src/renderer/app`：App Shell、路由、對話框、全域協調邏輯，以及 App 層 stores
- `src/renderer/features`：Creator、Consumer、History、Settings、About 等 feature 各自擁有的 UI、hooks、libs 與 stores
- `src/renderer/domain`：可重用的 FHIR 商業邏輯與 request 規則
- `src/renderer/shared`：共用 UI primitives、共用 hooks、共用 stores，以及跨 feature 的 utilities

Electron 原生相關的邏輯維持在 `src/main`；跨 process 穩定契約放在 `src/shared/contracts`。完整結構與邊界規則請參考 [docs/architecture.md](docs/architecture.md)。

---

## 課程背景

本專案為修讀 **醫療資訊系統基礎** 課程之成果作品。

| 欄位 | 內容 |
| --- | --- |
| 作者 | 潘昱如 |
| 學校 | 國立臺北護理健康大學 |
| 系所 | 資訊管理系所 |
| 課程 | 醫療資訊系統基礎 |

### 指導老師

以下依英文姓名字母排序，排名不分先後。

- Chen-Tsung Kuo（郭振宗老師）
- Chen-Yueh Lien（連中岳老師）
- Siang-Hao Lee（李祥豪老師）

---

## 功能特色

### Creator 模組

以 Step-by-step wizard 建立並提交 FHIR Document Bundle：

<p align="center">
  <img src="docs/screenshots/creator-stepper-overview.png" alt="Creator 步驟式流程" width="100%" />
  <br />
  <em>Creator 工作區與步驟式處方建立流程。</em>
</p>

| 步驟 | Resource | 說明 |
|------|----------|------|
| 1 | Organization | 醫療機構 |
| 2 | Patient | 病患基本資料 |
| 3 | Practitioner | 醫師資訊 |
| 4 | Encounter | 就診 context |
| 5 | Condition | 診斷（ICD-10） |
| 6 | Observation | 檢驗／檢查結果 |
| 7 | Coverage | 保險 |
| 8 | Medication | 藥品（ATC／健保代碼） |
| 9 | MedicationRequest | 處方醫囑 |
| 10 | Extension（`Basic`） | 補充延伸資料 |
| 11 | Composition | 文件組裝與 Bundle 提交 |

目前 Creator 能力：

- 步驟式工作流程，含各步驟進度、側邊完成摘要與當前步驟標頭摘要
- 透過 `react-hook-form` + `zod` 做表單驗證
- 情境式 Mock Data 系統，供 demo 與測試使用，提供跨多個 resource 互相一致的 mock 情境包，取代過去各表單各自孤立的樣本
- Creator 各步驟共用 `Fill Mock` 流程，讓病患、機構、醫師、就診、診斷、藥品、Composition 在同一情境下保持內部一致
- Patient 步驟首次填入固定使用主要 demo 病患，後續填入會輪換其他情境
- Mock 填入現在會依語系調整內容，`zh-TW` 填入中文 demo、`en` 填入相同情境的英文版本
- Prescription Templates 可從精簡的工具列按鈕將常見門診情境一次預載到 Creator 所有草稿步驟中，而不佔用工作區
- 回到已完成的步驟時，目前 resource 值會自動回填到表單
- Creator 未完成草稿會在本機自動保存，下次啟動自動還原
- 重新提交已完成步驟會更新既有 FHIR resource，而非重複建立
- Coverage 與 Medication 會在可能的情況下透過 identifier 或 code 重用 server 端既有 resource，減少公開 HAPI server 上的重複 `POST` 失敗
- Encounter、Condition、Observation、MedicationRequest、Extension 在公開 HAPI server 上也會以穩定 identifier 重用既有 resource
- 重用既有 server 端 resource 時，UI 會明確顯示「重用」訊息而非只是籠統的成功狀態
- 步驟成功／重用的提示訊息在離開完成步驟再回來時仍會保留
- 優先顯示人性化的 FHIR `OperationOutcome` 訊息，並可展開原始錯誤細節方便除錯
- 大多數 Creator 表單現已包含一致的 inline 說明卡，含 identifier、就診時間、ICD-10、LOINC、保險、藥品編碼、用藥途徑、補充延伸資料的欄位層級範例與提示
- 鍵盤可及性獲得強化：包含步驟器快捷鍵、更清楚的 focus-visible 狀態、整個 App 共用的快捷鍵系統、說明對話框，以及 Settings 中可自訂的按鍵綁定
- Live Demo 模式提供引導式、步驟化的教學流程，以手動為主的節奏、可選自動播放、類人類打字的 mock 輸入、以及畫面內捲動，使欄位與提交動作都能在畫面上演示，而不會在畫面外更新
- Feature Showcase 模式提供 spotlight 風格的產品導覽，含相鄰的教學面板、突出目標、較深的背景遮罩與精緻的產品式轉場；導覽目前涵蓋 17 個步驟，包含專屬的匯出步驟（第 12 步）與並排顯示的 Bundle Diff 步驟（第 13 步，教學面板開啟時可實時比對）；Showcase 執行過程不會將 mock 紀錄寫入使用者的提交歷史；停止 Showcase 會立即還原使用者真正的工作區，避免後續切換語系時重新套用 demo 資料；任何進行中的 Live Demo 會在 Showcase 開始前先停止，以避免 mock FHIR 提交在導覽中變成錯誤提示
- 即時顯示已建立 resource 的 JSON 預覽
- JSON 預覽現在會跟隨目前的亮／暗主題，而非固定在僅深色樣式
- JSON 預覽現在包含精簡工具列，可切換字體大小、摺疊，以及切換顯示全部／最新 resource，方便 demo
- Creator 資訊面板可在 resource JSON 與 Postman 風格的 FHIR Request Inspector 之間切換，後者顯示 request flow、method、URL、headers、body、response 詳情
- Creator 資訊面板支援桌面式分割視圖的調整大小：寬版版面為水平拖曳，窄版視窗面板移到表單下方時為垂直拖曳
- FHIR Request Inspector 新增可點擊 URL、request flow 註解、method 說明，以及空狀態時的 `GET / POST / PUT` 精簡快速指南
- FHIR request／response body 預設顯示 `Raw`，Live Demo 可在每次 server 提交後暫時摺疊教學卡，將焦點集中在 request flow
- **FHIR Request Inspector Postman 匯出**：當 request history 有紀錄時，一鍵匯出按鈕會從已擷取的 request 歷程（POST/PUT resource 建立、GET 檢查與 search）產出 Postman Collection v2.1，使用 `{{fhirBaseUrl}}` 變數置換並解碼 query 參數，無需對 server 做額外探測
- 最終提交前會加上結構化處方摘要 review 卡
- Composition 先行、接著 Document Bundle 提交；Composition 現在只透過 Document Bundle 的 POST 建立，避免 HAPI-2840 重複 resource 錯誤；所有 Bundle entry resource 使用 Bundle-scoped UUID 而非 server 指派的 ID，使各 Prescription Template 重複提交更安全
- Creator 最終步驟可將組裝好的 FHIR Bundle 匯出成本機 JSON
- Creator 最終步驟也可直接在 Consumer 以明確標示的本機預覽開啟已組裝 Bundle，即使不允許寫入 server 時也能展示 export、diff 與稽核流程；預覽模式也顯眼地顯示「返回 Creator」按鈕；預覽 session 視為暫時性，離開 Consumer 或從側邊欄再次點擊 Consumer 會重新開啟正常查詢工作區，不保留預覽稽核狀態；為符合 TW EMR 文件範圍，組裝的 document bundle 會排除獨立的 `Basic` 補充延伸紀錄，不加入 Bundle entry
- Bundle 提交成功後，Creator 可直接跳到 Consumer、自動執行查詢並聚焦到新建立的 Bundle
- 最近提交歷程會在本機保存，供日後查詢預填使用

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/creator-request-inspector.png" alt="Creator JSON 預覽與 FHIR Request Inspector" width="100%" />
      <br />
      <em>JSON 預覽與 Postman 風格 FHIR Request Inspector。</em>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/creator-document-bundle.png" alt="Creator document bundle 組裝與提交" width="100%" />
      <br />
      <em>Composition 檢視與最終 Document Bundle 組裝。</em>
    </td>
  </tr>
</table>

### Consumer 模組

查詢並檢視所設定 server 上的 FHIR Bundle：

<p align="center">
  <img src="docs/screenshots/consumer-query-workspace.png" alt="Consumer 查詢工作區與結果" width="100%" />
  <br />
  <em>Consumer 工作區：查詢、快捷鍵、結果與處方檢視。</em>
</p>

- **基本查詢**：病患 identifier 或姓名
- **日期查詢**：病患 identifier + Bundle 日期
- **複合查詢**：病患 identifier + 作者或機構
- 左側面板現在只聚焦於搜尋輸入，即使視窗較窄，查詢表單仍保持可見
- 中間面板現含 `Results`、`Shortcuts`、`History` 三個分頁，最近提交、已儲存查詢、完整查詢歷程在搜尋後仍一鍵可達
- **History 分頁**並列顯示所有過去 Document Bundle 提交與儲存的查詢；點擊提交紀錄會從 server 取回原始 Bundle 並在右側詳情面板開啟，不需要重跑搜尋
- 若提交的 Bundle 已不在 server 上（例如公開 HAPI 會定期重置資料），Consumer 會顯示 context 化的「依 Identifier 搜尋」toast 行動，自動填入並執行基本搜尋作為 fallback
- History 提交列表只顯示完成的 Document Bundle 提交；中間過程的 resource 建立紀錄會被隱藏，使列表聚焦於完整處方
- History 分頁中的已儲存搜尋可直接重跑、釘選、取消釘選與刪除，無需離開 Consumer
- Consumer 可匯入本機 FHIR Bundle JSON 檔，方便離線或臨時稽核，無需查詢 server
- 查詢範例與本機 Bundle 匯入現在整合在 `Shortcuts` 下，讓主搜尋表單聚焦於實際搜尋任務
- 最近紀錄放大鏡會預填目前搜尋分頁，不再強制切回基本搜尋
- 複合搜尋會從本機提交歷程預填病患 identifier 以及可用的作者／機構資訊，需要時可重新讀取已存 Bundle 以補齊缺失欄位
- 搜尋條件會在本機存為最近查詢，任何搜尋皆可釘為最愛，方便快速重跑
- Shortcuts 分頁中的提交統計列可摺疊成單行，一眼顯示總數、Bundle 數、病患數、機構數
- 最近提交與已儲存搜尋以獨立的輔助區塊呈現，階層更清楚
- 顯示查詢 URL 與相容性 workaround 的多步追蹤，連結可點擊後在系統瀏覽器開啟
- 查詢步驟標籤與 workaround 註記現在會跟隨目前 UI 語系，不再於切換語系後仍固定中文
- 每次搜尋後，UI 同時顯示**理想的 FHIR R4 標準查詢**（例如 `composition.subject:Patient.identifier`）與**實際使用的 workaround 查詢**，並以白話註記說明為何公開 HAPI server 無法使用標準形式
- 三種模式（basic / date / complex）第一個查詢範例都會以主要 demo 病患（`isPrimaryDemo`）開頭，確保 demo 流程一致
- 結果列表包含病患、機構、診斷、藥品摘要
- 空結果狀態會依實際搜尋模式說明可能原因與建議的下一步
- 處方詳情採固定寬度的 detail pane，標頭中有更清楚的 `Structured / JSON` 切換
- Structured 詳情檢視與原始 JSON viewer；JSON 面板會在 detail pane 寬度內捲動；切換不同結果時會自動展開
- Bundle 詳情對 server 結果、匯入檔案、Creator 預覽皆預設顯示本機優先的 FHIR 稽核卡，若當前 server 支援 `$validate` 則升級為 hybrid server 反饋；更清楚區分 validator 環境限制、最佳實務建議與真正結構錯誤；常見 server 訊息會提供在地化白話摘要同時保留原始文字；卡片也會明確說明剩餘 server 結果是否主要反映 validator 環境限制而非 Bundle 結構問題，包含 TW EMR slicing 因目前 validator 無法解析所引用 profile 而失敗的情況
- Bundle 詳情提供**匯出下拉選單**，支援三種格式：FHIR JSON、Postman Collection v2.1、HTML 報告
- **Postman Collection 匯出**會先探測 FHIR server 以判定每個 resource 該用 PUT 或 POST（透過 HAPI-2840 重複偵測與 identifier 查詢），然後產生可直接執行的 collection，包含涵蓋 basic、date、complex 三種模式的四個查詢 request，每個都附帶與 App 內 workaround 邏輯一致的 client-side filter test script；server 探測期間會出現取消按鈕，讓長時間匯出可中止而不產生錯誤
- **HTML 報告匯出**會產生 self-contained、可列印的處方摘要，內嵌 CSS，包含：依時序呈現關鍵臨床事件的臨床時間軸；詳細卡片前的藥品摘要表；依 reference range 推導的 Observation 檢驗值標籤（Normal / High / Low）；Composition 狀態橫幅以顏色區分 final / draft / amended / entered-in-error；全文搜尋列含 ↑↓ 導覽與匹配數；A4 邊界與固定頁首頁尾的列印版面
- **日期查詢**現在正確以 `Composition.date`（處方日期）而非 `Bundle.timestamp`（提交時間）過濾，使用與機構、作者複合搜尋相同的 fetch-then-filter workaround
- 日期查詢範例會以最近提交的 Bundle 中實際 `Composition.date` 預填，若無則回退到最近使用的日期搜尋，確保範例永遠對應到 server 上實際存在的紀錄
- **Composition chain 搜尋**：姓名與 identifier 搜尋最後都會執行一個額外步驟，找出關聯到匹配病患的 `Composition`，再以 `Bundle?composition=` 取回對應父 Bundle，使從任何 FHIR client（Postman、其他 App）提交的處方皆可被搜尋到，而非僅限 RxFHIR 自己的 identifier 慣例
- **取消搜尋**：查詢進行中提交按鈕旁會出現 `×` 圖示按鈕，點擊即透過 `AbortController` 立即取消所有進行中的 HTTP request，並在結果面板顯示明確的已取消狀態
- **結果排序與過濾**：結果載入後，結果標頭會出現排序下拉（Newest First / Oldest First / Name A→Z / Name Z→A）與關鍵字過濾輸入；過濾同時比對病患姓名、identifier、機構；每次新搜尋會重設過濾，但排序偏好會跨查詢保留；當過濾後無結果時，會顯示「no match」空狀態
- **搜尋 UX 改進**：每次新查詢開始時會清空結果，避免舊資料誤導；結果面板會立刻顯示含動畫 skeleton card 的 spinner；查詢進行中，所有搜尋模式 tab 與中間 Results / Shortcuts 分頁皆會停用，避免誤點切換
- **導航守衛**：搜尋進行中嘗試切換頁面時，會出現含選擇性「Leave Anyway」行動的 toast，而不是靜默中止搜尋
- **Consumer 搜尋隔離**：Consumer 查詢不再出現在 Creator 的 FHIR Request Inspector 面板中；每個模組會以來源路由標記自己的 HTTP request，Creator Inspector 只過濾自己的紀錄
- **結果 CSV 匯出**：結果工具列提供一鍵 CSV 匯出，產出符合 RFC 4180 且含 UTF-8 BOM 以便 Excel 與 Numbers 正確開啟；僅匯出目前過濾與排序後的結果，檔名包含匯出日期
- **並排 Bundle Diff**：選取處方後，其他結果卡片會顯示標示為「Compare」的按鈕（含 icon 與文字、outline 風格以提升辨識度）；點擊會以全螢幕 diff 對話框並排顯示所有結構化欄位——病患、醫師、機構、就診、診斷、檢驗、保險、藥品；差異欄位以琥珀色強調、相同為中性；含差異總數 badge；Swap A/B 按鈕可翻轉比對方向而不必重開對話框
- Consumer 工作區會在重啟之間保存最新的搜尋分頁、查詢輸入、自動搜尋目標、選取的 server bundle、最近匯入檔案；當所設定的 server 變更時，自動清除不相容的狀態
- Feature Showcase 開始時會清空 Activity Center 通知歷程，離開時還原，讓 Showcase 執行畫面保持乾淨；Showcase 執行不會將 mock 紀錄寫入使用者的提交歷程 store
- **FHIR 410 Gone 復原**：當 HAPI 搜尋索引指向已被軟刪除的 resource，且後續 `fetchResourceById` 收到 410 時，client 會自動對同一 ID 發出 `PUT` 恢復該 resource，解決過去在公開 HAPI server 上 Creator Extension 等步驟出現的「Resource was deleted」錯誤
- 支援 Creator 到 Consumer 的交接，自動預填查詢、自動搜尋，並聚焦到新建立的 Bundle

### Settings 與 App Shell

- FHIR Server URL 設定，附預設 server
- 透過 `/metadata` 進行即時 server 健康檢查
- 測試目前使用中的 server 會立即同步 Settings 中與狀態列顯示的全域連線狀態
- Settings 會將 `/metadata` 解析為輕量 demo-readiness 視圖，包含目前 server 是否似乎有宣告 `Bundle $validate`
- 提供專屬的「鍵盤快捷鍵」設定分頁，讓使用者檢視啟用中的綁定、自訂部分快捷鍵、偵測衝突並還原預設
- Accessibility 偏好包含動態效果、文字大小、整個 App 縮放與強化鍵盤 focus 可見度
- Settings 支援偏好設定匯入／匯出，包含 App 偏好與快捷鍵覆寫
- Settings 支援搜尋、dirty markers，與各區段的 reset 動作，便於維護
- Command Palette 提供可搜尋的動作層，涵蓋導覽、設定動作、Quick Start 進入點與最近本機 Bundle 檔案
- Activity Center 現在會在本機保留通知歷程，含未讀狀態與過濾分頁，不再僅依賴短暫 toast
- 首次啟動 onboarding 與任務型 Quick Start 情境提供 Creator、Consumer、Accessibility 設定的引導入口；全新 Creator 起點不再意外自動載入範例資料
- macOS 標題列的工具控制項使用更一致的間距模型，含 Activity Center 未讀 badge 的更乾淨呈現
- Electron 視窗大小與位置會在啟動之間持續保存
- 從 OS、App 啟動參數、macOS 最近文件開啟本機 Bundle JSON 檔會直接路由到 Consumer，並沿用與 App 內匯入流程相同的最近檔案追蹤
- App Shell accessibility 包含 skip link、路由感知的 focus 管理、螢幕閱讀器通知與更清楚的狀態語意
- 共用 UI 元件支援 high-contrast、forced-colors、更強的 disabled 狀態，與更清楚的 selected 狀態指示
- Light / Dark / System 主題切換
- `zh-TW` / `en` 語系切換
- 內嵌 `Noto Sans TC` UI 字型，使離線字型更一致，特別是在 Windows
- 自訂 macOS App 命名、icon 與 About 視窗
- 側邊欄 logo 與頂部工具列現在會依平台調整：28 px macOS traffic-light 拖曳區僅在 macOS 上繪製，讓 `℞` logo 與工具控制項在 Windows 與 Linux 上不會被不必要的 spacer 切到或偏移
- About 頁重新設計，分為 Hero 區塊（App icon、動態版本號、slogan）、獨立學術背景卡（作者、機構、指導老師）與技術資訊卡（含 GitHub repo 與個人首頁連結）；macOS 原生 About 視窗版本會動態從 App 讀取，不再寫死
- About 頁含**App 更新**區塊，會查詢 GitHub Releases 以比對更新版本；手動「Check for Updates」按鈕顯示三種狀態之一（已是最新、有更新、查詢失敗）；有新版時會顯示 Releases 頁連結；App 啟動後 5 秒會執行背景檢查，若有更新會在版本號旁加上圓點提示——所有平台皆採用同一套輕量策略（GitHub public API + semver 比對，無需 code signing 或自動安裝）；偵測到新版時會提供三項動作：**View on GitHub Releases**（開啟 Release 頁）、**Remind Me Later**（關閉提示但不記錄，下次啟動仍會再提示）、**Skip This Version**（將該版本記錄到本機檔案，之後不再提示該版本，但更新版本仍會通知）

### UX 亮點

- Creator 現在顯示草稿保存狀態更明確；草稿自動保存確保離開導航時不會遺失進度，因此不再以確認對話框阻擋導航
- Creator 也保留提交後 diff 摘要，讓使用者可快速看到自上次成功 Bundle 提交後的改動
- Creator 版面在較窄的桌面視窗上更具響應式表現，同時在桌面分割版面上仍保留 stepper 與資訊面板
- Consumer 在實際 Electron 視窗中同時支援原生檔案匯入與拖放 Bundle 檢視
- Consumer quick-start、最近檔案、最近提交與已儲存搜尋整合為更完整的桌面查詢工作區
- Toast 反饋由本機 Activity Center 承接，不再消失無紀錄
- Command Palette、onboarding 與 Quick Start 情境為初次與進階使用者提供更清晰路徑

### Accessibility 亮點

- 跨 Creator、Consumer、Settings、對話框、快捷鍵說明的鍵盤優先導覽
- 路由感知的 focus 還原、可見 focus 指示，以及可選的強化 focus 模式
- 對頁面切換、非同步狀態更新、表單錯誤、搜尋結果、步驟進度與快捷鍵編輯回饋提供螢幕閱讀器支援
- 支援 reduced-motion，仍保留 Live Demo 打字節奏，使用者可在 Settings 控制
- 文字縮放與 Electron 層級的 UI 縮放偏好會在本機保存
- JSON Viewer 與 FHIR Request Inspector 除了 raw JSON，也支援可讀摘要模式
- Accessibility roadmap、checklist、元件規範與手動測試文件收錄於 `docs/accessibility/`
- UX 規劃、手動測試與 Electron debug 工具文件收錄於 `docs/ux/`

---

## 搜尋行為

目前搜尋實作為公開 HAPI FHIR server 相容性最佳化。UI 會在每次搜尋後並列顯示**理想 FHIR R4 標準查詢**與**實際 workaround 查詢**，使 spec 與實作之間的落差隨時可見。

### 理想 FHIR R4 標準查詢

| 模式 | UI 輸入 | FHIR R4 標準查詢 |
|------|----------|------------------------|
| Basic | identifier | `GET /Bundle?composition.subject:Patient.identifier={value}` |
| Basic | name | `GET /Bundle?composition.subject:Patient.name={value}` |
| Date | identifier + date | `GET /Bundle?composition.subject:Patient.identifier={id}&composition.date={date}` |
| Complex | identifier + author | `GET /Bundle?composition.subject:Patient.identifier={id}&composition.author:Practitioner.name={name}` |
| Complex | identifier + organization | `GET /Bundle?composition.subject:Patient.identifier={id}&composition.custodian:Organization.identifier={orgId}` |

### 實際實作（HAPI workaround）

公開 HAPI FHIR server 不完整支援 `Bundle` 的 chained search。App 會退回到等價的查詢：

| 模式 | UI 輸入 | 實際查詢 |
|------|----------|-------------------|
| Basic | identifier | `GET /Bundle?identifier={value}`（病患 identifier 對應到 `Bundle.identifier`） |
| Basic | name | 步驟 A：`GET /Patient?name={value}` → 對每個匹配病患 `GET /Bundle?identifier={id}`；步驟 B fallback：`GET /Bundle?_count=N` → client-side 名字過濾；步驟 C：Composition chain（見下） |
| Date | identifier + date | 以 identifier 取回 bundle → client-side 以 `Composition.date` prefix 過濾（`Bundle.timestamp` ≠ `Composition.date`） |
| Complex | identifier + author | 以 identifier 取回 bundle → client-side 以 `Composition.author` / `Practitioner.name` 過濾 |
| Complex | identifier + organization | 以 identifier 解析 organization → 以 identifier 取回 bundle → client-side 以 `Composition.custodian` 過濾 |

#### Composition Chain（跨 App Bundle 探索）

對 name 與 identifier 搜尋，在 identifier 步驟之後會執行最後的 **Composition chain** 步驟：

1. `GET /Composition?subject=Patient/{id}` — 找出關聯到匹配病患的所有 Composition
2. `GET /Bundle?composition=Composition/{id}` — 取回每個 Composition 的父文件 Bundle

這能探索從**任何 FHIR client**（Postman、其他 App 等）提交的處方，不限於符合 RxFHIR `Bundle.identifier` 慣例者。所有步驟結果以 Bundle ID 合併去重，本機提交優先排序。

---

## Mock Data 系統

目前 repository 採用 typed、情境驅動的 mock data 設計，取代過去單一 flat demo pool。

- Mock data 組織為跨 Creator 全流程（從 `Organization` 到 `Composition`）的一致情境包
- 首次 `Patient` mock 填入使用主要 demo 病患，後續填入可輪換其他情境
- Mock data 具語系感知：同一情境可解析為 `zh-TW` 或 `en` 文字內容，而不變動 identifier、code、日期或其他共用欄位
- 情境包涵蓋常見門診、慢性病、急性就診、急診、兒科、search-demo 與選填欄位等情境
- Prescription Templates 由相同情境來源生成，使常見門診 preset 重用與 Creator `Fill Mock` 完全相同的 typed data 結構
- Consumer basic / date / complex 查詢範例亦由相同情境來源導出，降低 Creator demo 與 Consumer 搜尋輔助之間的漂移
- 提供 validation helpers，確保情境 ID 唯一且每個完整情境結構完整

---

## 技術堆疊

| 層級 | 技術 |
|-------|-----------|
| Framework | Electron 33 |
| Frontend | React 18 + TypeScript |
| Build | electron-vite + Vite 5 |
| UI | Tailwind CSS + shadcn/ui（Radix UI） |
| 字型 | 內嵌 Noto Sans TC |
| State | Zustand |
| Forms | react-hook-form + zod |
| i18n | i18next + react-i18next |
| FHIR Types | `@types/fhir`（R4） |
| Routing | React Router v6（`HashRouter`） |
| Packaging | electron-builder |

---

## FHIR Profiles

依據 [TW Core EMR-IG Electronic Prescription 2.5](https://twcore.mohw.gov.tw/ig/emr/profiles.html)：

- `Bundle-EP`
- `Composition-EP`
- `Patient-EP`
- `Organization-EP`
- `Practitioner-EP`
- `Encounter-EP`
- `Condition-EP`
- `Observation-EP-BodyWeight`
- `Coverage-EMR`
- `Medication-EP`
- `MedicationRequest-EP`

目前 UI 另含以 `Basic` resource 實作的額外 `Extension` 步驟，用於補充資料擷取。

---

## 開始使用

若您只想使用 RxFHIR，不需要自行從原始碼建置。請從 GitHub Releases 下載最新桌面 App：

### 下載版本

- 最新版本：<https://github.com/swiftruru/rx-fhir/releases/latest>
- Windows：`RxFHIR-Windows-Setup-...exe` 或 `RxFHIR-Windows-Portable-...exe`
- macOS：`RxFHIR-macOS-...dmg`
- Linux：`RxFHIR-Linux-...AppImage` 或 `RxFHIR-Linux-...deb`
- 若您要可執行的桌面 App，請避免下載 `Source code (zip)` 或 `Source code (tar.gz)`

若您想在本機開發 RxFHIR，請繼續以下設定步驟。

### 環境需求

- Node.js 20+
- 本機開發建議 macOS

### 安裝與執行

```bash
npm install
npm run dev
```

### 型別檢查

```bash
npm run typecheck
```

### 單元測試

```bash
npm test
```

### Accessibility Smoke Check

```bash
npm run a11y:check
```

### Electron UX Smoke Check

需有執行中的 Electron debug instance：

```bash
npm run ux:electron:smoke
```

### Electron UX Verify

執行 `build`、啟動乾淨的 Electron 測試 instance、跑過 repo 的 Electron UX smoke 檢查後關閉：

```bash
npm run ux:electron:verify -- --skip-build
```

### Electron UI Automation

以 mock 過的 FHIR 回應與隔離的 App 狀態，執行 Playwright-based Electron UI 測試集：

```bash
npm run test:ui
```

若要在本機可見地執行自動化：

```bash
npm run test:ui:headed
```

`test:ui:headed` 會開啟真實 Electron 視窗，但仍是正常快速自動化測試集；適合本機觀察與課堂上證明自動化是真的，而非做為專屬的慢速導覽模式。若要人類節奏的產品 demo，請使用 App 內的 **Live Demo** 或 **Feature Showcase** 流程。

執行後檢視 HTML 報告：

```bash
npm run test:ui:report
```

更多細節：

- [docs/testing/ui-automation.md](docs/testing/ui-automation.md)
- [docs/testing/ui-automation-demo-script.md](docs/testing/ui-automation-demo-script.md)
- [`.github/workflows/ui-automation.yml`](.github/workflows/ui-automation.yml)

目前 UI 自動化覆蓋範圍包含：

- About 更新狀態分支與外部連結橋接流程
- App Shell 路由導覽與啟動時檔案開啟交接
- Creator 草稿還原、提交交接、本機 Consumer 預覽交接、預覽重設流程，以及符合 TW EMR 的預覽 Bundle 組裝
- Consumer 本機 Bundle 匯入、最近紀錄維護與工作區持久化流程
- Consumer basic、date、complex 搜尋模式
- Consumer mock 過的 empty / error / cancelled 狀態、詳情稽核顯示與 load-more 分頁
- Consumer history、submission-history 與已儲存搜尋流程
- Settings accessibility 持久化與 FHIR server capability 診斷流程

目前 UI 自動化範圍刻意視為 v1 穩定交付邊界，供 demo／課堂使用。詳見 [`docs/testing/ui-automation.md`](docs/testing/ui-automation.md) 了解目前範圍與刻意排除的項目。

### Electron CDP Eval

在運行中的 Electron renderer 內部快速評估表達式：

```bash
npm run cdp:eval -- "location.hash"
```

### Build

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

產物命名依明確的平台標籤：

- Windows installer：`RxFHIR-Windows-Setup-<version>.exe`
- Windows portable executable：`RxFHIR-Windows-Portable-<version>.exe`
- macOS disk image：`RxFHIR-macOS-<version>.dmg`
- Linux AppImage：`RxFHIR-Linux-<version>.AppImage`
- Linux deb package：`RxFHIR-Linux-<version>.deb`

---

## 專案結構

```text
src/
├── main/
│   ├── index.ts
│   ├── preload.ts
│   ├── ipc/           # Typed Electron IPC 註冊
│   ├── services/      # 視窗生命週期、選單、檔案與桌面服務
│   └── updater/       # 更新檢查 IPC helpers
├── renderer/
│   ├── App.tsx
│   ├── app/           # App Shell、路由、對話框、App 層 stores
│   ├── domain/        # FHIR 領域邏輯與純商業規則
│   ├── features/      # Creator / Consumer / History / Settings / About
│   ├── shared/        # 共用 UI、hooks、stores、utilities
│   ├── demo/          # Live Demo 定義
│   ├── i18n/
│   ├── mocks/         # Typed 情境式 mock data + 查詢範例
│   ├── services/      # Renderer 面向的服務 facade
│   ├── showcase/      # Feature Showcase 腳本與 snapshot 建構器
│   ├── styles/
│   └── types/
└── shared/
    └── contracts/     # 穩定的跨 process 與共用領域契約
docs/
├── architecture.md    # 目前架構與所有權規則
├── accessibility/      # A11y roadmap、checklist、手動測試
├── refactor-followups.md
├── screenshots/        # 文件中使用的產品截圖
└── ux/                 # UX 規劃、手動測試、Electron debug 筆記
scripts/
├── a11y-smoke-check.mjs
├── electron-cdp-eval.mjs
├── electron-ux-smoke.mjs
├── electron-ux-verify.mjs
└── run-electron-vite.mjs
```

---

## 品質狀態

目前 repository 品質訊號：

- TypeScript typecheck 可用並通過
- Vitest 單元測試可用並通過
- Accessibility smoke check 可用並通過
- Electron UX smoke 與 end-to-end verify 腳本在本機可用並通過
- Playwright Electron UI 自動化可用，目前本機 31 個測試皆通過
- GitHub Actions 有專屬 `UI Automation` workflow 執行 Electron UI 測試集
- Production build 在本機可用並通過
- 手動 smoke checklist 與報告收錄於 `docs/ux/manual-testing/`

---

## 發布流程

本 repository 採用版本範圍的發布流程：

1. 將準備發布的變更合併到 `main`
2. 執行 `npm run release -- patch` 或 `npm run release -- 1.2.0`
3. 發布腳本會：
   - 建立或更新 `changelog/vX.Y.Z.md`
   - 若需新建 changelog，以 `$EDITOR` 開啟
   - 更新 `package.json`、`package-lock.json` 與 README 版本 badge
   - 執行 `npm run a11y:check`
   - 執行 `npm run typecheck`
   - commit `Release vX.Y.Z`
   - 建立對應 annotated Git tag
   - 推送 branch 與 tag 到 GitHub
4. GitHub Actions 會自動建置：
   - `RxFHIR-macOS-<version>.dmg`
   - `RxFHIR-macOS-<version>.zip`
   - `RxFHIR-Windows-Setup-<version>.exe`
   - `RxFHIR-Windows-Portable-<version>.exe`
   - `RxFHIR-Linux-<version>.AppImage`
   - `RxFHIR-Linux-<version>.deb`
5. GitHub Release 說明會先附上平台下載指南，然後加上該版本 tag commit 中的 changelog 檔

若您已有 release notes 在其他檔案，請使用 `npm run release -- patch --notes-file ./path/to/notes.md`。

推送 release tag 前，建議也執行 Electron 特定迴歸覆蓋：

```bash
npm run ux:electron:verify -- --skip-build
```

---

## 主題系統

RxFHIR 內建雙主題系統，以 **Blush Pink × Warm Neutral** 色盤為設計核心：

| 模式 | 代號 | 風格 |
|------|----------|-----------|
| Light | Sakura Mist | 明亮、柔和、女性專業感 |
| Dark | Twilight Mauve | 沉穩、霧粉色、值得信賴 |

切換控制項位於標題列。語系切換也在該處。

---

## 目標 FHIR Server

| Server | URL |
|--------|-----|
| HAPI FHIR International | `https://hapi.fhir.org/baseR4` |
| HAPI FHIR TW | `https://hapi.fhir.tw/fhir` |

---

## 授權

MIT

---

<sub>📝 當 [README.md](./README.md) 更新時，也請同步更新本檔案以保持雙語內容一致。 / When README.md is updated, please keep this file in sync.</sub>
