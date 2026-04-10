# RxFHIR Refactor Follow-ups

## Current State

Renderer ownership is now explicit:

- `src/renderer/app`: app shell, orchestration, app-level stores, dialogs, live demo, showcase runners
- `src/renderer/features`: feature-owned UI, hooks, libs, and stores
- `src/renderer/domain`: FHIR-specific business logic and request rules
- `src/renderer/shared`: shared UI primitives, shared hooks, shared stores, and shared utilities

Legacy top-level renderer folders such as `components`, `hooks`, `lib`, and `store` have been removed. The current root shape is stable enough to stop structural refactoring unless a product change forces a new boundary.

## Good Stopping Point

The current structure is already good enough for normal feature work.

Reasons to stop here:

- ownership is now visible from the path alone
- feature state lives with the owning feature
- app orchestration lives under `app`
- shared code has a single home under `shared`
- FHIR request and bundle logic already sits under `domain/fhir`
- Electron bridge and main-process boundaries are typed and split

Further moves should happen only when they reduce concrete maintenance cost, not just because a file could theoretically live somewhere else.

## Remaining Candidates

### 1. Service Layer Cleanup

Current `src/renderer/services` falls into two groups:

- compatibility facades:
  - `fhirClient.ts`
  - `bundleService.ts`
  - `searchService.ts`
- renderer-to-desktop orchestration:
  - `bundleFileService.ts`
  - `preferencesService.ts`
- export helpers:
  - `bundleExportService.ts`

Suggested next step:

- keep `bundleFileService.ts` and `preferencesService.ts` as renderer service adapters
- keep `fhirClient.ts`, `bundleService.ts`, and `searchService.ts` only as transitional façades unless new feature code still needs them
- if imports stabilize, replace façade imports gradually with direct `domain/fhir/*` imports and delete the façade files later
- evaluate whether `bundleExportService.ts` should move into `domain/fhir` if it remains pure and FHIR-specific

### 2. Demo / Mock Boundaries

Current top-level support folders:

- `src/renderer/mocks`
- `src/renderer/demo`
- `src/renderer/showcase`

These are still acceptable because they cut across:

- Creator mock filling
- Consumer example search flows
- app-level live demo / showcase orchestration

Suggested next step:

- do not move them again unless there is a real product split
- if they grow substantially, consider a single top-level support area such as `src/renderer/sandbox` or `src/renderer/demo-support`
- otherwise leave them where they are

### 3. Test Placement

Current tests already cover pure logic and store persistence, but placement can be tightened later.

Suggested next step:

- keep tests beside the owning module when practical
- prefer `features/*/__tests__` or `features/*/store/__tests__` for feature-owned state
- prefer `domain/fhir/__tests__` for FHIR parsing/building rules

### 4. Import Hygiene

The codebase now relies on explicit relative ownership rather than legacy wrapper paths.

Suggested next step:

- avoid reintroducing top-level catch-all folders
- avoid adding new cross-feature helpers to `app`
- only promote code into `shared` after at least two real boundaries need it
- if relative paths become noisy, add narrowly scoped path aliases only after usage patterns settle

## Technical Debt Worth Tracking

- `fhirClient.ts` still acts as a compatibility surface; this is intentional but temporary.
- `bundleFileService.ts` combines desktop bridge access with export/import orchestration; that is acceptable today, but worth revisiting if file workflows grow further.
- `showcaseSnapshot.ts` still depends on multiple cross-cutting areas and should be treated as demo infrastructure rather than a model example for product code.
- `preferencesService.ts` owns validation and bridge I/O for settings import/export; if preferences versioning grows, it may deserve its own `shared/contracts/preferences` or dedicated serializer module.

## Recommended Rule Set

- New Creator-only logic belongs under `features/creator`.
- New Consumer-only logic belongs under `features/consumer`.
- New app-global behavior belongs under `app`.
- New reusable UI or hooks belong under `shared` only if at least two boundaries depend on them.
- New FHIR business rules belong under `domain/fhir`.
- New desktop bridge or file-system orchestration belongs under `services` only when it is truly renderer-facing adapter code.

## Definition of Done for This Refactor

This refactor can be considered complete when:

- no legacy top-level renderer ownership folders are reintroduced
- new work follows `app / features / domain / shared`
- façade services are either kept intentionally or removed gradually without wrapper churn
- future refactors are driven by product needs, not by path aesthetics alone
