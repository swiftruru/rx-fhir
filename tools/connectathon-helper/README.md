# TWCAT 聯測松輔助工具

FHIR 聯測松（TWCAT / Gazelle）的輔助工具：自動取憑證、上傳 Bundle、做檢查、把每一步彙整成 Markdown / PDF 報告，減少手動操作。

> 角色：`CONTENT_CREATOR_NTUNHS_FhirWork (TWCORE_CREATOR)`
> 設計原則：能自動化的 HTTP 與檢查自動化；Gazelle / FHIRfox 網頁步驟採「純紀錄」（不自動登入導航）。

## 安裝

```bash
cd tools/connectathon-helper
npm install
cp .env.example .env   # 然後填入你的實際值
```

`.env` 含 token / 密碼等機敏資訊，已被 `.gitignore` 排除，**請勿進版控**。

## 設定（.env 重點）

| 變數 | 對應 | 說明 |
|------|------|------|
| `TWCAT_PARTICIPANT_TOKEN` | Step 10 | 從 TWCAT Proxy 取得後貼入 |
| `KEYCLOAK_GRANT_TYPE` | Step 15 | `client_credentials`（已驗證）或 `password` |
| `KEYCLOAK_CLIENT_ID` / `_SECRET` | Step 15 | client_credentials 用 |
| `KEYCLOAK_USERNAME` / `_PASSWORD` | Step 15 | password grant 用 |
| `FHIR_BASE_URL` | Step 120/230 | 大會 FHIR 主機 |
| `META_PROFILE_URLS` | Step 20 | 多個用逗號區隔 |
| `PRODUCT_UI_URL` | Step 30 | 自家產品 UI 截圖目標 |

## 指令

| 指令 | Step | 說明 |
|------|------|------|
| `npm run twcat -- token` | 10/15 | 取 X-Participant-Token 與 access_token，印遮罩值並寫入 `output/run.json` |
| `npm run twcat -- convert <題目.json> [-e "Patient:1,..."] [-o out.json]` | 20/140 | 題目→bundle，顯示數量與合規檢查（meta.profile / collection / 數量）|
| `npm run twcat -- upload <題目或bundle.json> [-s 120\|230] [--proxy <url>] [--force]` | 120/230 | 合規檢查後 POST collection 到 FHIR 主機，存回應 |
| `npm run twcat -- codemap <題目.json> [-s 150\|260]` | 150/260 | 院內碼 → 國際碼對照表 |
| `npm run twcat -- screenshot [url] -s <step>` | 30/300 | Playwright 截指定 URL（預設 `PRODUCT_UI_URL`）|
| `npm run twcat -- record -s <step> --status <s> [--link <url>] [--shot <path>] [--note ...] [--case <id>] [--instance <id>]` | 多步 | 手動步驟收錄連結/截圖/備註/狀態 |
| `npm run twcat -- report [--pdf]` | 全程 | 依 Step 10–300 輸出 `output/reports/` 的 .md（與 .pdf）|
| `npm run twcat -- status` | — | 列出各步驟狀態 |

### 截圖 / PDF 需要瀏覽器（一次性）

`screenshot` 與 `report --pdf` 用 Playwright Chromium。首次使用前在 **repo 根目錄**執行：

```bash
npx playwright install chromium
```

### 典型流程

```bash
npm run twcat -- token                                   # 取憑證
npm run twcat -- convert 題目.json -e "Patient:1, Encounter:8"   # 送前確認
npm run twcat -- upload 題目.json -s 120                  # 上傳
npm run twcat -- codemap 題目.json                        # 院內碼對照
# 去 FHIRfox 取得驗證連結與截圖後：
npm run twcat -- record -s 130 --status done --link <Gazelle連結> --shot <截圖.png>
npm run twcat -- report --pdf                             # 出報告
```

## 與 RxFHIR 的關係

本工具重用 RxFHIR 的純領域邏輯（`conformanceCheck`、`competitionConverter` 的院內碼對照表），但自有一層 Node HTTP/Auth（RxFHIR 的 auth/送出綁瀏覽器，無法在 Node 直接用）。輸入可以是題目來源 JSON（重用轉換器），或 RxFHIR Converter「下載 Bundle JSON」匯出的 bundle。
