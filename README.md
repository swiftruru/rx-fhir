# RxFHIR

> ℞ + FHIR = RxFHIR — A desktop application for Taiwan Core electronic prescription profiles

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.3-d4779a?style=flat-square" alt="Version" />
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

A cross-platform desktop application built with Electron + React for creating and querying FHIR R4 electronic prescriptions, based on the Taiwan Ministry of Health and Welfare EMR-IG 2.5 context.

This README reflects the **current implementation** in the repository. When documentation and behavior differ, the source code is the source of truth.

---

## Academic Context / 課程背景

本專案為修讀 **醫療資訊系統基礎**（Introduction to Healthcare Information Systems）課程之成果作品。  
This application was developed as a course project for **Introduction to Healthcare Information Systems**.

| Field / 欄位 | 中文 | English |
| --- | --- | --- |
| Author / 作者 | 潘昱如 | Yu-Ru Pan |
| Affiliation / 學校 | 國立臺北護理健康大學 | National Taipei University of Nursing and Health Sciences |
| Department / 系所 | 資訊管理系所 | Department of Information Management |
| Course / 課程 | 醫療資訊系統基礎 | Introduction to Healthcare Information Systems |

### Advisors / 指導老師

以下依英文姓名字母排序，排名不分先後。  
Listed in alphabetical order by English name; no ranking implied.

- Chen-Tsung Kuo（郭振宗老師）
- Chen-Yueh Lien（連中岳老師）
- Siang-Hao Lee（李祥豪老師）

---

## Features

### Creator Module

Step-by-step wizard to build and submit a FHIR Document Bundle:

| Step | Resource | Description |
|------|----------|-------------|
| 1 | Organization | Medical institution |
| 2 | Patient | Patient demographics |
| 3 | Practitioner | Physician info |
| 4 | Encounter | Visit context |
| 5 | Condition | Diagnosis (ICD-10) |
| 6 | Observation | Lab / exam results |
| 7 | Coverage | Insurance |
| 8 | Medication | Drug (ATC / NHI code) |
| 9 | MedicationRequest | Prescription order |
| 10 | Extension (`Basic`) | Supplemental extension payload |
| 11 | Composition | Document assembly + bundle submission |

Current Creator capabilities:

- Stepper-based workflow with per-step progress
- Form validation via `react-hook-form` + `zod`
- Mock data fill for quick demos
- Revisiting completed steps restores current resource values back into the form
- Re-submitting completed steps updates existing FHIR resources instead of duplicating them
- Coverage and Medication reuse existing server-side resources by identifier or code when possible, reducing duplicate `POST` failures on public HAPI servers
- Live JSON preview of created resources
- Composition-first, then document bundle submission
- Recent submission history stored locally for later query prefill

### Consumer Module

Search and inspect FHIR Bundles on the configured server:

- **Basic search**: patient identifier or patient name
- **Date search**: patient identifier + bundle date
- **Complex search**: patient identifier + author or organization
- Recent-record magnifier prefills the active search tab instead of forcing a return to basic search
- Complex search prefills patient identifier and available author / organization context from local submission history
- Query URL display and multi-step trace for compatibility workarounds
- Result list with patient, organization, diagnosis, and medication summary
- Structured detail view and raw JSON viewer

### Settings and App Shell

- FHIR Server URL configuration with preset servers
- Live server health check via `/metadata`
- Light / Dark / System theme toggle
- `zh-TW` / `en` language toggle
- Embedded `Noto Sans TC` UI font for more consistent offline typography, especially on Windows
- Custom macOS app naming, icon, and About window

---

## Search Behavior

The current search implementation is optimized for public HAPI FHIR server compatibility.

| Mode | UI Input | Implemented Query |
|------|----------|-------------------|
| Basic | identifier | `GET /Bundle?identifier={value}` |
| Basic | name | `GET /Bundle?composition.subject.name={value}` |
| Date | identifier + date | `GET /Bundle?identifier={id}&timestamp={date}` |
| Complex | identifier + author | fetch bundles by identifier, then filter `Composition.author` / `Practitioner` on the client |
| Complex | identifier + organization | resolve organization first, then fetch bundles by identifier, then filter `Composition.custodian` on the client |

Note: this is not a strict 1:1 copy of the original assignment query examples. The implementation intentionally uses HAPI-compatible parameters and client-side workarounds for organization and author filtering to improve operability on public demo servers.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 33 |
| Frontend | React 18 + TypeScript |
| Build | electron-vite + Vite 5 |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| Typography | Embedded Noto Sans TC |
| State | Zustand |
| Forms | react-hook-form + zod |
| i18n | i18next + react-i18next |
| FHIR Types | `@types/fhir` (R4) |
| Routing | React Router v6 (`HashRouter`) |
| Packaging | electron-builder |

---

## FHIR Profiles

Based on [TW Core EMR-IG Electronic Prescription 2.5](https://twcore.mohw.gov.tw/ig/emr/profiles.html):

- `Composition-EP`
- `Patient-EP`
- `Organization-EP`
- `Practitioner-EP`
- `Encounter-EP`
- `Condition-EP`
- `Observation-EP`
- `Coverage-EP`
- `Medication-EP`
- `MedicationRequest-EP`

The current UI also includes an extra `Extension` step implemented with a `Basic` resource for supplemental data capture.

---

## Getting Started

### Prerequisites

- Node.js 20+
- macOS recommended for local development

### Install and Run

```bash
npm install
npm run dev
```

### Type Check

```bash
npm run typecheck
```

### Build

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

`npm run build:win` now produces both:

- Windows installer (`Setup`)
- Windows portable executable (`Portable`)

---

## Project Structure

```text
src/
├── main/
│   ├── index.ts        # Electron main process
│   └── preload.ts      # Preload bridge
└── renderer/
    ├── App.tsx
    ├── components/     # Shared UI components
    ├── features/
    │   ├── about/
    │   ├── consumer/
    │   ├── creator/
    │   │   └── forms/
    │   └── settings/
    ├── i18n/           # zh-TW / en locales
    ├── lib/
    ├── mocks/          # Quick-fill demo data
    ├── services/       # FHIR client + bundle/search logic
    ├── store/          # Zustand stores
    ├── styles/
    └── types/
```

---

## Quality Status

Current repository quality signals:

- TypeScript typecheck is available and passes
- No automated test suite is currently included

---

## Release Workflow

This repository now follows a version-scoped release process:

1. Create a changelog file in [`changelog/`](./changelog) named after the release tag, for example `v1.2.0.md`.
2. Write only the changes introduced in that version.
3. Push the matching Git tag, for example `v1.2.0`.
4. GitHub Actions will automatically build:
   - macOS app artifacts
   - Windows installer
   - Windows portable executable
5. GitHub Release notes will use only that version's changelog file, so release descriptions stay focused and do not accumulate old history.

---

## Theme System

RxFHIR ships with a dual theme system designed around a **Blush Pink × Warm Neutral** palette:

| Mode | Codename | Character |
|------|----------|-----------|
| Light | Sakura Mist | Bright, soft, feminine-professional |
| Dark | Twilight Mauve | Mature, misty rose, trustworthy |

Toggle controls are available in the title bar. Language switching is also available there.

---

## Target FHIR Servers

| Server | URL |
|--------|-----|
| HAPI FHIR International | `https://hapi.fhir.org/baseR4` |
| HAPI FHIR TW | `https://hapi.fhir.tw/fhir` |

---

## License

MIT
