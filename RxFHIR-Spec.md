# RxFHIR — 產品規格書

> ℞ + FHIR = RxFHIR — 基於 TW Core 電子處方箋 Profile 的桌面應用程式

---

## 1. 專案總覽 (Project Overview)

### 1.1 App 標題與命名概念

- **App 名稱：** RxFHIR
- **GitHub Repository：** `rx-fhir`
- **Tagline：** ℞ + FHIR = RxFHIR — 基於 TW Core 電子處方箋 Profile 的桌面應用程式

#### 命名由來

- **℞ (Rx)** 是國際通用的處方箋符號，源自拉丁文 "recipe"（取之），在醫療領域代表「處方」的意涵。
- **FHIR** (Fast Healthcare Interoperability Resources) 是 HL7 國際醫療資訊交換標準。
- 將兩者結合為 **RxFHIR**，一個字即傳達「FHIR 處方箋」的核心概念，同時也隱含 Express（快速）的讀音，象徵便捷的電子處方箋管理體驗。

### 1.2 專案目標

依據衛福部「電子病歷交換單張實作指引（EMR-IG）」中「2.5 電子處方箋」的 Profile 規範，開發一個桌面應用程式，實現：

1. **Creator（建立者）：** 透過 UI 介面建立符合 TW Core Profile 的電子處方箋 FHIR Resources，並打包為 Document Bundle。
2. **Consumer（查詢者）：** 透過 UI 介面以多種條件查詢 FHIR Server 上的電子處方箋資料，並展示查詢結果。

### 1.3 目標 FHIR Server

- HAPI FHIR Server：<https://hapi.fhir.org/> 或 <https://hapi.fhir.tw/>
- TW Core EMR-IG Profile 參考：<https://twcore.mohw.gov.tw/ig/emr/profiles.html>
- Demo 參考專案：<https://github.com/FirelyTeam/fhirstarters>

---

## 2. 技術架構 (Tech Stack)

| 層級 | 技術 | 說明 |
|------|------|------|
| Framework | Electron | 跨平台桌面應用程式框架 |
| Frontend | React 19 + TypeScript | UI 開發，強型別確保資料安全 |
| UI Library | Tailwind CSS + shadcn/ui | 現代化元件庫，美觀且可定制 |
| FHIR Client | fhir.js 或 fetch API | 直接調用 HAPI FHIR REST API |
| Build Tool | Vite + electron-builder | 快速開發與打包 |
| Language | TypeScript | 全專案統一使用 TypeScript |

---

## 3. FHIR Resources 規格

依據 EMR-IG 電子處方箋 (EP) Profile，本專案需建立以下 Resource：

| Resource | EMR-IG Profile | 用途 | 必填欄位重點 |
|----------|----------------|------|-------------|
| Composition | Composition-EP | 處方箋報告文件主體 | type, subject, author, date, section[] |
| Patient | Patient-EP | 病人基本資料 | identifier(學號), name, gender, birthDate |
| Organization | Organization-EP | 醫事機構基本資料 | identifier, name, type |
| Practitioner | Practitioner-EP | 醫師資料 | identifier, name, qualification |
| Encounter | Encounter-EP | 門診基本資料 | status, class, subject, period |
| Condition | Condition-EP | 診斷 | code(ICD-10), subject, encounter |
| Observation | Observation-EP | 檢驗檢查結果 | code, value, subject, status |
| Coverage | Coverage-EP | 保險資訊 | status, beneficiary, payor |
| Medication | Medication-EP | 藥品資訊 | code(ATC/NHI code), form |
| MedicationRequest | MedicationRequest-EP | 處方籤 | medication, subject, requester, dosageInstruction |

> **★ 特別注意：** Patient.identifier 請使用自己的學號作為識別碼。各 Resource 至少需建立一筆資料。

---

## 4. 功能規格 (Feature Specification)

### 4.1 Creator 模組（建立處方箋）

配分：作業占比 25%～50%

#### 4.1.1 Resource 建立表單（15%）

提供表單介面，讓使用者逐一建立上述各類 FHIR Resource：

- **Organization：** 選擇或輸入醫事機構名稱、代碼
- **Patient：** 輸入病人姓名、學號（identifier）、性別、生日
- **Practitioner：** 輸入醫師姓名、證號
- **Encounter：** 選擇門診類型、設定就診日期
- **Condition：** 選擇或輸入 ICD-10 診斷碼
- **Observation：** 輸入檢驗檢查項目與數值
- **Coverage：** 選擇保險類型（如全民健保）
- **Medication：** 輸入藥品名稱與代碼
- **MedicationRequest：** 選擇藥品、設定劑量指示

> 每個表單送出後，透過 FHIR REST API（POST）將 Resource 建立至 HAPI FHIR Server。

#### 4.1.2 Document Bundle 打包（10%）

當所有必要 Resource 建立完成後，組裝為一個 `type = "document"` 的 Bundle：

- `Bundle.type = "document"`
- 第一個 entry 必須是 **Composition** Resource
- Composition 的 section 分別 reference 到各個 Resource
- 其餘 entry 包含 Patient、Organization、Practitioner 等所有相關 Resource

> 透過 `POST /Bundle` 或 `$document` 操作將 Document Bundle 存入 FHIR Server。

#### 4.1.3 建立介面 UI（25%）

提供友善的使用者介面，包含：

- **步驟式引導（Stepper/Wizard）：** 依序引導使用者建立各 Resource
- **表單驗證：** 必填欄位檢查、格式驗證（如日期格式、identifier 格式）
- **JSON 預覽：** 即時顯示當前組裝的 FHIR JSON
- **狀態回饋：** 提交成功/失敗的明確提示
- **Resource 進度追蹤：** 顯示哪些 Resource 已建立、哪些待建立

### 4.2 Consumer 模組（查詢處方箋）

配分：作業占比 25%～50%

#### 4.2.1 基本查詢（5%）

使用 FHIR Search API 以下列條件查詢，回傳正確筆數並展示內容：

- `Bundle.composition.patient.identifier`（病人識別碼）
- 或 `Bundle.composition.patient.name`（病人姓名）

```
GET /Bundle?composition.patient.identifier={value}
GET /Bundle?composition.patient.name={value}
```

#### 4.2.2 日期條件查詢（10%）

同時使用以下兩個條件查詢：

- `Bundle.composition.patient.identifier` **AND**
- `Bundle.composition.date`（處方箋日期）

```
GET /Bundle?composition.patient.identifier={id}&composition.date={date}
```

#### 4.2.3 複合條件查詢（10%）

同時使用以下條件查詢：

- `Bundle.composition.patient.identifier` **AND**
- `Bundle.composition.patient.organization.identifier` 或(OR) `Bundle.composition.author.name`

```
GET /Bundle?composition.patient.identifier={id}&composition.patient.organization.identifier={org}
GET /Bundle?composition.patient.identifier={id}&composition.author.name={author}
```

#### 4.2.4 查詢結果 UI（25%）

展示查詢結果的介面：

- **查詢表單：** 提供 identifier / name / date / organization / author 等輸入欄位
- **結果列表：** 以卡片或表格顯示查詢到的處方箋摘要
- **詳情頁面：** 點擊後展開完整的 Document Bundle 內容
- **JSON 檢視：** 可查看原始 FHIR JSON 回應（Syntax Highlighting + 可折疊/展開）
- **筆數顯示：** 明確顯示查詢到的資料筆數

---

## 5. UI/UX 設計規劃

### 5.1 應用程式主體架構

採用側邊欄導覽 (Sidebar Navigation) + 主內容區域的配置：

| 區域 | 內容 |
|------|------|
| 側邊欄 (Sidebar) | Logo + App 名稱、導覽選單（Creator / Consumer / Settings）、FHIR Server URL 設定 |
| 主內容區 | 根據當前選擇的功能顯示相應的表單或查詢結果 |
| 狀態列 (Status Bar) | FHIR Server 連線狀態、當前作業模式 (Creator/Consumer) |

### 5.2 頁面規劃

#### Creator 模組頁面

| 頁面 | 說明 |
|------|------|
| Resource 建立頁 | Stepper 引導使用者逐步建立各 Resource，左側顯示進度、右側顯示表單 |
| Bundle 預覽頁 | 顯示當前已建立的所有 Resource 摘要，及即時 JSON 預覽 |
| Bundle 提交頁 | 確認並提交 Document Bundle 至 FHIR Server，顯示成功/失敗狀態 |

#### Consumer 模組頁面

| 頁面 | 說明 |
|------|------|
| 查詢頁 | 查詢表單（identifier, name, date, organization, author）+ 查詢結果列表 |
| 處方箋詳情頁 | 展開單筆處方箋的完整內容，含病人、醫師、診斷、藥品等區塊 |
| JSON 檢視器 | 以 Syntax Highlighting 顯示原始 FHIR JSON，可折疊/展開 |

---

## 6. 作業評分對照表

對應老師的評分標準，確保每個得分點都被覆蓋：

| 占比 | 得分點 | RxFHIR 實作對應 | 模組 |
|------|--------|----------------|------|
| 15% | 建立各別 Resources | Creator 表單建立 10+ 種 Resource 並 POST 至 FHIR Server | Creator - 4.1.1 |
| 10% | Document Bundle | 組裝所有 Resource 為 type="document" Bundle | Creator - 4.1.2 |
| 25% | Creator UI | Stepper 引導 + 表單驗證 + JSON 預覽 + 狀態回饋 | Creator - 4.1.3 |
| 5% | 基本 Search | 依 identifier 或 name 查詢並顯示結果 | Consumer - 4.2.1 |
| 10% | identifier + date | 複合條件查詢（AND） | Consumer - 4.2.2 |
| 10% | identifier + org/author | 複合條件查詢（AND + OR） | Consumer - 4.2.3 |
| 25% | Consumer UI | 查詢表單 + 結果列表 + 詳情頁 + JSON 檢視 | Consumer - 4.2.4 |

---

## 7. Repository 架構規劃

### 7.1 GitHub Repository

- **Repository：** `rx-fhir`
- **License：** MIT
- **README Tagline：** ℞ + FHIR = RxFHIR — 基於 TW Core 電子處方箋 Profile 的桌面應用程式

### 7.2 專案目錄結構

```
rx-fhir/
├── src/
│   ├── main/                       # Electron 主運行程序 (Main Process)
│   │   ├── index.ts                # 應用程式入口
│   │   └── preload.ts              # Preload 腳本
│   ├── renderer/                   # React UI (Renderer Process)
│   │   ├── App.tsx                 # 主元件
│   │   ├── components/             # 共用元件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── JsonViewer.tsx
│   │   ├── features/               # 功能模組
│   │   │   ├── creator/            # Creator 模組
│   │   │   │   ├── CreatorPage.tsx
│   │   │   │   ├── ResourceStepper.tsx
│   │   │   │   ├── BundlePreview.tsx
│   │   │   │   └── forms/          # 各 Resource 表單
│   │   │   │       ├── PatientForm.tsx
│   │   │   │       ├── OrganizationForm.tsx
│   │   │   │       ├── PractitionerForm.tsx
│   │   │   │       ├── EncounterForm.tsx
│   │   │   │       ├── ConditionForm.tsx
│   │   │   │       ├── ObservationForm.tsx
│   │   │   │       ├── CoverageForm.tsx
│   │   │   │       ├── MedicationForm.tsx
│   │   │   │       └── MedicationRequestForm.tsx
│   │   │   └── consumer/           # Consumer 模組
│   │   │       ├── ConsumerPage.tsx
│   │   │       ├── SearchForm.tsx
│   │   │       ├── ResultList.tsx
│   │   │       └── PrescriptionDetail.tsx
│   │   ├── services/               # FHIR API 服務層
│   │   │   ├── fhirClient.ts       # FHIR REST API 封裝
│   │   │   ├── bundleService.ts    # Bundle 組裝邏輯
│   │   │   └── searchService.ts    # 查詢邏輯
│   │   ├── types/                  # TypeScript 型別定義
│   │   │   └── fhir.d.ts           # FHIR Resource 型別
│   │   └── styles/                 # 全域樣式
├── electron-builder.yml            # 打包配置
├── vite.config.ts                  # Vite 配置
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.ts              # Tailwind 配置
├── package.json
└── README.md
```

---

## 8. FHIR API 介面規格

以下為本專案會使用到的 FHIR REST API 端點：

### 8.1 Creator 使用的 API

| Method | Endpoint | 用途 |
|--------|----------|------|
| POST | `/Patient` | 建立病人資料 |
| POST | `/Organization` | 建立醫事機構 |
| POST | `/Practitioner` | 建立醫師資料 |
| POST | `/Encounter` | 建立門診資料 |
| POST | `/Condition` | 建立診斷資料 |
| POST | `/Observation` | 建立檢驗檢查 |
| POST | `/Coverage` | 建立保險資料 |
| POST | `/Medication` | 建立藥品資料 |
| POST | `/MedicationRequest` | 建立處方籤 |
| POST | `/Bundle` | 提交 Document Bundle |

### 8.2 Consumer 使用的 API

| Method | Endpoint (Search Parameters) | 對應分數 |
|--------|------------------------------|----------|
| GET | `/Bundle?composition.patient.identifier={id}` | 5% |
| GET | `/Bundle?composition.patient.name={name}` | 5% |
| GET | `/Bundle?composition.patient.identifier={id}&composition.date={date}` | 10% |
| GET | `/Bundle?...&composition.patient.organization.identifier={org}` | 10% |
| GET | `/Bundle?...&composition.author.name={author}` | 10% |

---

## 9. 開發階段規劃

### Phase 1：專案初始化

- 建立 Electron + React + TypeScript + Vite 專案骨架
- 設定 Tailwind CSS + shadcn/ui
- 建立 FHIR Client 服務層（fhirClient.ts）
- 實作 Sidebar 導覽與基本路由

### Phase 2：Creator 模組

- 實作各 Resource 表單元件（PatientForm, OrganizationForm, ...）
- 實作 Stepper 引導流程
- 實作 Resource POST API 調用
- 實作 Bundle 組裝與提交
- 實作 JSON 預覽功能

### Phase 3：Consumer 模組

- 實作查詢表單（支援多種查詢條件組合）
- 實作 FHIR Search API 調用
- 實作查詢結果列表與詳情頁
- 實作 JSON 檢視器

### Phase 4：整合與測試

- 端對端流程測試（Creator 建立 → Consumer 查詢）
- UI/UX 優化與美化
- 錯誤處理與邊緣情況
- README 文件撰寫

---

## 10. 備註與參考資料

### 10.1 重要提醒

- **Patient.identifier** 必須使用自己的學號
- 各 Resource 至少需建立 **一筆** 資料
- FHIR Server 可使用公開的 HAPI FHIR Server，無需自架
- 可透過 Postman / Library / GUI 任一方式完成（本專案採用 GUI 方式）

### 10.2 參考連結

- EMR-IG 電子處方箋 Profile：<https://twcore.mohw.gov.tw/ig/emr/profiles.html>
- TW Core IG：<https://build.fhir.org/ig/cctwFHIRterm/MOHW_TWCoreIG_Build/>
- HAPI FHIR Server：<https://hapi.fhir.org/> / <https://hapi.fhir.tw/>
- FirelyTeam FHIR Starters：<https://github.com/FirelyTeam/fhirstarters>
- FHIR R4 Bundle 規範：<https://hl7.org/fhir/R4/bundle.html>
- FHIR R4 Composition 規範：<https://hl7.org/fhir/R4/composition.html>
