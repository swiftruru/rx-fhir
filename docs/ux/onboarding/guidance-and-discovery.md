# Guidance and Discovery

## 範圍說明

本文件涵蓋新手引導、教學展示、功能發現、快速開始入口，以及使用者完成某個操作後如何知道下一步。

## 已實作項目

- Live Demo 已能提供逐步教學，並支援 manual-first 與 optional autoplay。
- Feature Showcase 已能提供 spotlight-style 產品導覽。
- Creator 的 scenario-based mock 與 Prescription Templates，已具備很好的學習入口價值。
- Consumer 的 Query Helpers 已整合查詢範例與本機 Bundle 匯入，可作為探索入口。
- reduced motion 已可套用到導覽與示範流程，同時保留逐字節奏感。

## 待實作項目

- `P0` first-run onboarding：
  - 目前尚未在第一次開啟 app 時，清楚解釋 Creator / Consumer / Settings 的差異與主流程。
- `P0` next-step suggestions：
  - 成功提交、查詢失敗、匯入成功後，尚未一致提供下一步建議。
- `P1` task-based onboarding：
  - 目前導覽偏展示型，尚未轉為「完成第一張處方」「完成第一次查詢」這種任務導向引導。
- `P1` quick-start scenarios：
  - 尚未提供獨立的情境啟動入口，例如門診、慢箋、示範 Bundle。
- `P2` replayable guide center：
  - 導覽與教學分散在多個入口，尚未形成可重播、可搜尋的學習中心。

## 建議優先級

- `P0`
  - first-run onboarding
  - next-step suggestions
- `P1`
  - task-based onboarding
  - quick-start scenario landing
- `P2`
  - replayable guide center

## 後續實作任務拆分

1. 定義 first-run onboarding 的最短流程：
   - 產品定位
   - Creator 是做什麼
   - Consumer 是做什麼
   - 去哪裡調整 server / 快捷鍵 / accessibility
2. 設計統一的 next-step recommendation pattern：
   - submit success
   - empty search result
   - local import success
   - settings save success
3. 把 Live Demo / Feature Showcase 延伸為任務型腳本，而不只是展示型腳本。
4. 建立 quick-start scenario cards，串接到：
   - mock scenario
   - template
   - query helper
5. 若前述流程穩定，再整理成 guide center，集中放置所有教學入口與完成紀錄。
