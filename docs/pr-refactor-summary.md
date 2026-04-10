# PR Summary: Renderer Architecture Stabilization and Progressive Refactor

## Suggested Title

Refactor Electron renderer into app / features / domain / shared layers

## Summary

This PR stabilizes the RxFHIR desktop architecture without changing the product surface area.

The main goal is to replace the old top-level renderer ownership model with explicit boundaries:

- `app` for shell and orchestration
- `features` for feature-owned UI, hooks, libs, and stores
- `domain` for FHIR business logic
- `shared` for truly cross-feature UI and utilities

The refactor also splits oversized Electron and FHIR integration entry points, adds test/documentation guardrails, and removes the legacy top-level renderer folders that previously blurred ownership.

## Why

Before this refactor:

- renderer ownership was spread across top-level `components`, `hooks`, `lib`, and `store`
- `src/main/index.ts` and `fhirClient.ts` carried too many responsibilities
- page files were doing too much orchestration directly
- shared contracts and feature boundaries were not explicit

After this refactor:

- ownership is visible from the file path
- feature state and feature helpers live with the owning feature
- app-level orchestration is isolated under `app`
- FHIR-specific business logic is isolated under `domain/fhir`
- legacy renderer wrapper layers are gone

## Main Changes

### 1. Main / Preload / Contract Split

- extracted main-process responsibilities into focused modules under `src/main/ipc`, `src/main/services`, and `src/main/updater`
- kept preload narrow and typed around `window.rxfhir`
- introduced stable cross-process contracts under `src/shared/contracts`

Examples:

- `src/main/ipc/registerDesktopIpc.ts`
- `src/main/services/mainWindowService.ts`
- `src/main/services/recentBundleFileService.ts`
- `src/shared/contracts/electron.ts`
- `src/shared/contracts/fhir.ts`

### 2. Renderer Layering

- introduced `src/renderer/app`, `src/renderer/features`, `src/renderer/domain`, and `src/renderer/shared`
- removed legacy top-level renderer ownership folders:
  - `src/renderer/components`
  - `src/renderer/hooks`
  - `src/renderer/lib`
  - `src/renderer/store`

Current renderer root shape:

- `src/renderer/app`
- `src/renderer/domain`
- `src/renderer/features`
- `src/renderer/shared`

### 3. App Shell and App-Level State

- `App.tsx` is now a thin entry
- app shell concerns live under `src/renderer/app`
- app-level dialogs, live demo, showcase runners, onboarding, command palette, and related stores are colocated

Examples:

- `src/renderer/app/AppShell.tsx`
- `src/renderer/app/components/*`
- `src/renderer/app/stores/*`

### 4. Feature Colocation

- Creator, Consumer, and History now own their local hooks, libs, and stores
- feature-specific components were moved out of the old global folders

Examples:

- `src/renderer/features/creator/hooks/*`
- `src/renderer/features/creator/lib/*`
- `src/renderer/features/creator/store/*`
- `src/renderer/features/consumer/lib/bundleDiff.ts`
- `src/renderer/features/consumer/store/consumerSearchStore.ts`
- `src/renderer/features/history/store/*`

### 5. Shared UI / Hook / Store Consolidation

- shared UI primitives now live under `src/renderer/shared/components/ui`
- shared cross-feature components, hooks, libs, and stores are colocated in `shared`

Examples:

- `src/renderer/shared/components/*`
- `src/renderer/shared/hooks/*`
- `src/renderer/shared/lib/*`
- `src/renderer/shared/stores/*`

### 6. FHIR Domain Extraction

- split FHIR logic into `src/renderer/domain/fhir`
- retained renderer-facing service façades where needed to keep feature behavior stable during migration

Examples:

- `src/renderer/domain/fhir/baseUrl.ts`
- `src/renderer/domain/fhir/resourceApi.ts`
- `src/renderer/domain/fhir/searchApi.ts`
- `src/renderer/domain/fhir/requestLogger.ts`
- `src/renderer/domain/fhir/bundleBuilder.ts`
- `src/renderer/domain/fhir/searchResults.ts`

### 7. Documentation and Safety Nets

- added architecture documentation and a post-refactor follow-up document
- introduced unit test support and preserved Electron UX verification as regression guardrails
- updated scripts/docs to point at the new structure

Examples:

- `docs/architecture.md`
- `docs/refactor-followups.md`
- `docs/accessibility/roadmap-v1.md`
- `scripts/a11y-smoke-check.mjs`
- `vitest.config.ts`

## Compatibility Notes

- persisted keys were kept intact where state moved, so storage compatibility is preserved
- Electron bridge behavior was kept functionally equivalent
- large deletion counts in the diff are mostly ownership moves and wrapper removal, not feature removal

## Validation

The refactor was verified with:

- `npm run typecheck`
- `npm test`
- `npm run ux:electron:verify`

Current test status:

- `vitest`: 4 test files, 9 tests passed
- Electron UX verify: 3 checks passed

## Reviewer Notes

Best review strategy:

1. review architecture landing zones first:
   - `src/main/*`
   - `src/shared/contracts/*`
   - `src/renderer/app/*`
   - `src/renderer/domain/fhir/*`
   - `src/renderer/shared/*`
2. then spot-check feature migration:
   - Creator
   - Consumer
   - History
3. treat large legacy deletions as moved ownership, not independent feature removals

## Follow-ups After Merge

This PR intentionally stops short of further structural churn.

Recommended next steps are documented in:

- `docs/refactor-followups.md`

Highest-value follow-ups:

- gradually remove transitional renderer service façades if direct domain imports become practical
- only revisit `mocks` / `demo` / `showcase` if product scope expands enough to justify another boundary split
- keep future work aligned to `app / features / domain / shared` instead of reintroducing top-level catch-all folders
