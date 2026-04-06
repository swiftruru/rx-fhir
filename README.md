# RxFHIR

> ℞ + FHIR = RxFHIR — A desktop application for Taiwan Core electronic prescription profiles

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.17-d4779a?style=flat-square" alt="Version" />
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

<p align="center">
  <strong>Download the latest app builds:</strong><br />
  <a href="https://github.com/swiftruru/rx-fhir/releases">https://github.com/swiftruru/rx-fhir/releases</a>
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

<p align="center">
  <img src="docs/screenshots/creator-stepper-overview.png" alt="Creator step-by-step workflow" width="100%" />
  <br />
  <em>Creator workspace with the step-by-step prescription workflow.</em>
</p>

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

- Stepper-based workflow with per-step progress, sidebar completion summaries, and current-step header summaries
- Form validation via `react-hook-form` + `zod`
- Scenario-based Mock Data System for demos and testing, with coherent multi-resource mock packs instead of isolated per-form samples
- Shared `Fill Mock` flow across Creator steps, so patient, institution, physician, encounter, diagnosis, medication, and composition stay internally consistent within the same scenario
- The Patient step now starts from a designated primary demo patient on first fill, then rotates through additional scenarios on later fills
- Mock filling is now locale-aware, so `zh-TW` fills Chinese demo content and `en` fills the corresponding English version of the same scenario
- Prescription Templates can preload common outpatient scenarios into all Creator draft steps from a compact toolbar action without taking over the workspace
- Revisiting completed steps restores current resource values back into the form
- Unfinished Creator drafts are auto-saved locally and restored on next launch
- Re-submitting completed steps updates existing FHIR resources instead of duplicating them
- Coverage and Medication reuse existing server-side resources by identifier or code when possible, reducing duplicate `POST` failures on public HAPI servers
- Encounter, Condition, Observation, MedicationRequest, and Extension now also reuse existing server-side resources through stable identifiers on public HAPI servers
- When an existing server-side resource is reused, the UI now shows an explicit reuse message instead of only a generic success state
- Step success / reuse alerts now remain visible when you leave a completed step and come back later
- Human-friendly FHIR `OperationOutcome` messages are shown first, with expandable raw error details for troubleshooting
- Most Creator forms now include consistent inline guide cards with examples and field-level hints for identifiers, encounter timing, ICD-10, LOINC, insurance, medication coding, medication route, and supplemental extensions
- Keyboard accessibility is improved with stepper shortcuts, clearer focus-visible states, and an app-wide shortcut system with a help dialog plus customizable bindings in Settings
- Live Demo mode provides a guided, step-by-step teaching flow with manual-first pacing, optional autoplay, human-like typed mock input, and in-view scrolling so fields and submit actions are demonstrated on screen instead of updating off-screen
- Feature Showcase mode provides a spotlight-style product tour with adjacent coaching panels, highlighted targets, darker background dimming, and polished product-style transitions
- Live JSON preview of created resources
- JSON preview now follows the active light / dark theme instead of staying fixed in a dark-only style
- JSON preview now includes a compact toolbar with font-size switching, collapse, and all/latest-resource toggles for demos
- The Creator info panel can switch between resource JSON and a Postman-style FHIR request inspector showing request flow, method, URL, headers, body, and response details
- The Creator info panel is now resizable like a desktop split view, with horizontal resizing on wide layouts and vertical resizing when the panel moves below the form on narrower windows
- The FHIR request inspector now includes clickable URLs, request-flow notes, method explanations, and a compact `GET / POST / PUT` quick guide in the empty state
- FHIR request and response bodies now default to `Raw`, and Live Demo can temporarily collapse the coaching card to spotlight the request flow after each server submission
- Final submission now includes a structured prescription summary review card before bundle assembly
- Composition-first, then document bundle submission
- The final Creator step can export the assembled FHIR Bundle as local JSON
- After a successful bundle submission, Creator can jump directly into Consumer, auto-run the query, and focus the newly created bundle
- Recent submission history stored locally for later query prefill

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/creator-request-inspector.png" alt="Creator JSON preview and FHIR request inspector" width="100%" />
      <br />
      <em>JSON preview and Postman-style FHIR request inspector.</em>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/creator-document-bundle.png" alt="Creator document bundle assembly and submission" width="100%" />
      <br />
      <em>Composition review and final Document Bundle assembly.</em>
    </td>
  </tr>
</table>

### Consumer Module

Search and inspect FHIR Bundles on the configured server:

<p align="center">
  <img src="docs/screenshots/consumer-query-workspace.png" alt="Consumer query workspace and results" width="100%" />
  <br />
  <em>Consumer workspace for query, shortcuts, results, and prescription review.</em>
</p>

- **Basic search**: patient identifier or patient name
- **Date search**: patient identifier + bundle date
- **Complex search**: patient identifier + author or organization
- The left panel now focuses on search input only, so the query form remains visible even on narrower windows
- The middle panel now includes `Results` and `Query Helpers` tabs, so recent submissions and saved searches stay available after a query has already been run
- Consumer can import local FHIR Bundle JSON files for offline or ad hoc inspection without querying the server
- Query examples and local Bundle import are now grouped under `Query Helpers`, keeping the main search form focused on real search tasks
- Recent-record magnifier prefills the active search tab instead of forcing a return to basic search
- Complex search prefills patient identifier and available author / organization context from local submission history, and can backfill missing context by re-reading a stored bundle when needed
- Search conditions are now stored locally as recent searches, and any search can be pinned into favorites for quick reruns
- Recent submissions now focus on completed bundle submissions instead of mixing in partial resource history
- Recent submissions and saved searches are shown as separate helper sections with clearer visual hierarchy
- Query URL display and multi-step trace for compatibility workarounds, with clickable links that open in the system browser
- Query-step labels and workaround notes now follow the current UI language instead of staying fixed in Chinese after a locale switch
- After each search, the UI shows both the **ideal FHIR R4 standard query** (e.g. `composition.subject:Patient.identifier`) and the **actual workaround query** used, with plain-language notes explaining why the standard form is not used on public HAPI servers
- First query example in all three modes (basic / date / complex) always starts with the primary demo patient (`isPrimaryDemo`) for consistent demo flow
- Result list with patient, organization, diagnosis, and medication summary
- Empty-result states now explain likely causes and suggest next actions based on the actual search mode
- Prescription detail view now uses a fixed-width detail pane with a clearer `Structured / JSON` toggle in the header
- Structured detail view and raw JSON viewer — the JSON panel stays within the detail pane width and scrolls internally; switching results auto-expands the viewer
- Bundle detail now includes an **Export dropdown** with three formats: FHIR JSON, Postman Collection v2.1, and HTML report
- **Postman Collection export** probes the FHIR server for each resource to determine whether PUT or POST is correct (using HAPI-2840 duplicate detection and identifier-based search), then generates a ready-to-run collection with four query requests covering basic, date, and complex search modes, each with a client-side filter test script that mirrors the app's own workaround logic
- **HTML report export** generates a self-contained, printable prescription summary with embedded CSS
- **Date search** now correctly filters by `Composition.date` (prescription date) instead of `Bundle.timestamp` (submission time), using the same fetch-then-filter workaround as organization and author complex searches
- Date query example now pre-fills with the actual `Composition.date` from the most recently submitted bundle, falling back to the most recently used date search, so the example always matches a real record on the server
- Feature Showcase now clears Activity Center notification history on start and restores it on exit, keeping showcase runs visually clean
- Supports Creator-to-Consumer handoff with automatic query prefill, auto-search, and newly created bundle focus

### Settings and App Shell

- FHIR Server URL configuration with preset servers
- Live server health check via `/metadata`
- Testing the currently active server now immediately syncs the global connection status shown in Settings and the status bar
- A dedicated Keyboard Shortcuts settings tab lets users inspect active bindings, customize selected shortcuts, detect conflicts, and restore defaults
- Accessibility preferences now include motion behavior, text scale, full-app zoom, and enhanced keyboard focus visibility
- Preference import / export is now available from Settings, including app preferences and shortcut overrides
- Settings now include search, dirty markers, and per-section reset actions for faster maintenance
- Command Palette provides a searchable action layer for navigation, settings actions, quick-start entry points, and recent local bundle files
- Activity Center now keeps a local notification history with unread state and filter tabs instead of relying on transient toasts only
- First-run onboarding and task-based Quick Start scenarios now provide guided entry points into Creator, Consumer, and Accessibility settings, with a blank Creator starting point that no longer auto-loads sample data unexpectedly
- The macOS title-bar utility controls now use a more consistent spacing model, including a cleaner unread badge for Activity Center
- Electron window size and position are now persisted locally between launches
- App shell accessibility now includes a skip link, route-aware focus management, screen-reader announcements, and clearer status semantics
- High-contrast, forced-colors, stronger disabled states, and clearer selected-state indicators are now supported across shared UI components
- Light / Dark / System theme toggle
- `zh-TW` / `en` language toggle
- Embedded `Noto Sans TC` UI font for more consistent offline typography, especially on Windows
- Custom macOS app naming, icon, and About window

### UX Highlights

- Creator now shows draft save state more explicitly and blocks accidental navigation away from unfinished work
- Creator also keeps a post-submission diff summary so users can quickly see what changed since the last successful bundle submission
- Creator layout is now more responsive on narrower desktop windows, while keeping the stepper and info panel visible in desktop-style split layouts
- Consumer now supports both native file import and drag-and-drop Bundle inspection in the real Electron window
- Consumer quick-start, recent files, recent submissions, and saved searches now work together as a more complete desktop query workspace
- Toast feedback is now backed by a local Activity Center instead of disappearing without history
- Command Palette, onboarding, and Quick Start scenarios provide a clearer path for both first-time users and power users

### Accessibility Highlights

- Keyboard-first navigation across Creator, Consumer, Settings, dialogs, and shortcut help
- Route-aware focus restoration, visible focus indicators, and an optional enhanced focus mode
- Screen-reader support for page changes, async status updates, form errors, search results, stepper progress, and shortcut editing feedback
- Reduced-motion support that still preserves the typed Live Demo rhythm, with user control through Settings
- Text scale and Electron-level UI zoom preferences stored locally
- JSON Viewer and FHIR Request Inspector now support readable summary mode in addition to raw JSON
- Accessibility roadmap, checklist, component rules, and manual test docs are included under `docs/accessibility/`
- UX planning, manual testing, and Electron debug tooling docs are included under `docs/ux/`

---

## Search Behavior

The current search implementation is optimized for public HAPI FHIR server compatibility. The UI displays both the **ideal FHIR R4 standard query** and the **actual workaround query** side by side after every search, so the gap between the spec and the implementation is always visible.

### Ideal FHIR R4 Standard Queries

| Mode | UI Input | FHIR R4 Standard Query |
|------|----------|------------------------|
| Basic | identifier | `GET /Bundle?composition.subject:Patient.identifier={value}` |
| Basic | name | `GET /Bundle?composition.subject:Patient.name={value}` |
| Date | identifier + date | `GET /Bundle?composition.subject:Patient.identifier={id}&composition.date={date}` |
| Complex | identifier + author | `GET /Bundle?composition.subject:Patient.identifier={id}&composition.author:Practitioner.name={name}` |
| Complex | identifier + organization | `GET /Bundle?composition.subject:Patient.identifier={id}&composition.custodian:Organization.identifier={orgId}` |

### Actual Implementation (HAPI Workaround)

Public HAPI FHIR servers do not fully support chained search on `Bundle`. The app falls back to equivalent queries:

| Mode | UI Input | Implemented Query |
|------|----------|-------------------|
| Basic | identifier | `GET /Bundle?identifier={value}` (patient identifier mapped to `Bundle.identifier`) |
| Basic | name | `GET /Bundle?composition.subject.name={value}` |
| Date | identifier + date | fetch bundles by identifier → client-side filter on `Composition.date` prefix (`Bundle.timestamp` ≠ `Composition.date`) |
| Complex | identifier + author | fetch bundles by identifier → client-side filter on `Composition.author` / `Practitioner.name` |
| Complex | identifier + organization | resolve organization by identifier → fetch bundles by identifier → client-side filter on `Composition.custodian` |

---

## Mock Data System

The current repository now uses a typed, scenario-driven mock data design instead of a single flat demo pool.

- Mock data is organized into coherent scenario packs that span the full Creator flow, from `Organization` through `Composition`
- The first `Patient` mock fill uses a designated primary demo patient, while later fills can rotate through additional scenarios
- Mock data is now locale-aware: the same scenario can resolve to `zh-TW` or `en` text content without changing identifiers, codes, dates, or other shared fields
- Scenario packs cover common outpatient, chronic disease, acute visit, emergency, pediatric, search-demo, and optional-field situations
- Prescription Templates are generated from the same scenario source, so common outpatient presets reuse the exact same typed data structure as Creator `Fill Mock`
- Consumer basic/date/complex query examples are derived from the same scenario source, reducing drift between Creator demos and Consumer search helpers
- Validation helpers are included to keep scenario IDs unique and ensure each full scenario remains structurally complete

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

### Download Builds

- GitHub Releases: <https://github.com/swiftruru/rx-fhir/releases>
- Windows: `RxFHIR-Windows-Setup-...exe` or `RxFHIR-Windows-Portable-...exe`
- macOS: `RxFHIR-macOS-...dmg`
- Linux: `RxFHIR-Linux-...AppImage` or `RxFHIR-Linux-...deb`
- Avoid `Source code (zip)` and `Source code (tar.gz)` if you want the runnable desktop app

### Type Check

```bash
npm run typecheck
```

### Accessibility Smoke Check

```bash
npm run a11y:check
```

### Electron UX Smoke Check

Requires a running Electron debug instance:

```bash
npm run ux:electron:smoke
```

### Electron UX Verify

Runs `build`, launches a clean Electron test instance, performs the repo's Electron UX smoke checks, then closes it:

```bash
npm run ux:electron:verify -- --skip-build
```

### Electron CDP Eval

Evaluate a quick expression inside the live Electron renderer:

```bash
npm run cdp:eval -- "location.hash"
```

### Build

```bash
npm run build:mac
npm run build:win
npm run build:linux
```

Artifact naming now follows explicit platform labels:

- Windows installer: `RxFHIR-Windows-Setup-<version>.exe`
- Windows portable executable: `RxFHIR-Windows-Portable-<version>.exe`
- macOS disk image: `RxFHIR-macOS-<version>.dmg`
- Linux AppImage: `RxFHIR-Linux-<version>.AppImage`
- Linux deb package: `RxFHIR-Linux-<version>.deb`

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
    ├── mocks/          # Typed scenario-based mock data + query examples
    ├── services/       # FHIR client + bundle/search logic
    ├── store/          # Zustand stores
    ├── styles/
    └── types/
docs/
├── accessibility/      # A11y roadmap, checklist, manual testing
├── screenshots/        # Product screenshots used in docs
└── ux/                 # UX planning, manual testing, Electron debug notes
scripts/
├── a11y-smoke-check.mjs
├── electron-cdp-eval.mjs
├── electron-ux-smoke.mjs
├── electron-ux-verify.mjs
└── run-electron-vite.mjs
```

---

## Quality Status

Current repository quality signals:

- TypeScript typecheck is available and passes
- Accessibility smoke check is available and passes
- Electron UX smoke and end-to-end verify scripts are available and pass locally
- Production build is available and passes locally
- No automated test suite is currently included

---

## Release Workflow

This repository now follows a version-scoped release process:

1. Merge the release-ready changes onto `main`.
2. Run `npm run release -- patch` or `npm run release -- 1.2.0`.
3. The release script will:
   - create or update `changelog/vX.Y.Z.md`
   - open `$EDITOR` for the changelog if it needs to scaffold a new file
   - update `package.json`, `package-lock.json`, and the README version badge
   - run `npm run a11y:check`
   - run `npm run typecheck`
   - commit `Release vX.Y.Z`
   - create the matching annotated Git tag
   - push the branch and tag to GitHub
4. GitHub Actions will automatically build:
   - `RxFHIR-macOS-<version>.dmg`
   - `RxFHIR-macOS-<version>.zip`
   - `RxFHIR-Windows-Setup-<version>.exe`
   - `RxFHIR-Windows-Portable-<version>.exe`
   - `RxFHIR-Linux-<version>.AppImage`
   - `RxFHIR-Linux-<version>.deb`
5. GitHub Release notes will prepend a platform download guide, then include only that version's changelog file from the tagged commit.

If you already have release notes in another file, use `npm run release -- patch --notes-file ./path/to/notes.md`.

For Electron-specific regression coverage before pushing a release tag, it is also recommended to run:

```bash
npm run ux:electron:verify -- --skip-build
```

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
