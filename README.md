# RxFHIR

> ℞ + FHIR = RxFHIR — A desktop application for Taiwan Core electronic prescription profiles

A cross-platform desktop application built with Electron + React for creating and querying FHIR R4 electronic prescriptions, based on the Taiwan Ministry of Health and Welfare EMR-IG 2.5 specification.

---

## Features

### Creator Module
Step-by-step wizard to build a complete FHIR Document Bundle:

| Step | Resource | Description |
|------|----------|-------------|
| 1 | Organization | Medical institution |
| 2 | Patient | Patient demographics |
| 3 | Practitioner | Physician info |
| 4 | Encounter | Outpatient visit |
| 5 | Condition | Diagnosis (ICD-10) |
| 6 | Observation | Lab / exam results |
| 7 | Coverage | Insurance (NHI) |
| 8 | Medication | Drug (ATC / NHI code) |
| 9 | MedicationRequest | Prescription |
| 10 | Composition | Document Bundle assembly |

### Consumer Module
Search and inspect FHIR Bundles on the configured server:
- **Basic search** — by patient ID or date
- **Date range search** — prescription period
- **Complex search** — combined criteria
- JSON viewer with syntax highlighting

### Settings
- FHIR Server URL configuration (with preset servers)
- Live server health check
- **Light / Dark / System theme toggle** (persistent)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 33 |
| Frontend | React 18 + TypeScript |
| Build | electron-vite + Vite 5 |
| UI | Tailwind CSS + shadcn/ui (Radix UI) |
| State | Zustand (with localStorage persist) |
| Forms | react-hook-form + zod |
| FHIR Types | @types/fhir (R4) |
| Routing | React Router v6 (HashRouter) |
| Packaging | electron-builder |

---

## FHIR Profiles

Based on [TW Core EMR-IG Electronic Prescription 2.5](https://twcore.mohw.gov.tw/ig/emr/profiles.html):

- `Composition-EP` · `Patient-EP` · `Organization-EP` · `Practitioner-EP`
- `Encounter-EP` · `Condition-EP` · `Observation-EP`
- `Coverage-EP` · `Medication-EP` · `MedicationRequest-EP`

---

## Getting Started

### Prerequisites
- Node.js 20+
- macOS (primary target; Windows/Linux supported by electron-builder)

### Install & Run

```bash
npm install      # also runs postinstall patch for dev-mode app name / icon
npm run dev      # start in development mode
```

### Build

```bash
npm run build:mac    # macOS .dmg
npm run build:win    # Windows .exe
npm run build:linux  # Linux AppImage
```

---

## Project Structure

```
src/
├── main/           # Electron main process (app name, menu, dock icon, about window)
├── preload/        # Preload script (contextIsolation)
└── renderer/       # React frontend
    ├── components/ # Shared UI components (shadcn/ui)
    ├── features/
    │   ├── creator/    # 10-step prescription wizard
    │   ├── consumer/   # FHIR Bundle search & viewer
    │   └── settings/   # Server config
    ├── services/       # FHIR REST client + Bundle assembler
    ├── store/          # Zustand stores (appStore, creatorStore)
    └── styles/         # Tailwind globals + dual theme tokens
```

---

## Theme System

RxFHIR ships with a dual theme system designed around a **Blush Pink × Warm Neutral** palette:

| Mode | Codename | Character |
|------|----------|-----------|
| Light | Sakura Mist | Bright, soft, feminine-professional |
| Dark | Twilight Mauve | Mature, misty rose, trustworthy |

Toggle: click the **☀ / ☾ / ⊙** button in the top-right corner of the title bar.

---

## Target FHIR Servers

| Server | URL |
|--------|-----|
| HAPI FHIR International | `https://hapi.fhir.org/baseR4` |
| HAPI FHIR TW | `https://hapi.fhir.tw/fhir` |

---

## License

MIT
