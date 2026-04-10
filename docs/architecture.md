# RxFHIR Architecture

## Summary

RxFHIR is an Electron desktop application with a three-process boundary and a four-layer renderer structure:

- `src/main`: native desktop capabilities, window lifecycle, IPC registration, update flow.
- `src/main/preload.ts`: typed bridge from Electron to the renderer.
- `src/renderer/app`: app shell, routes, and global orchestration.
- `src/renderer/features`: feature UI and feature-level state for Creator, Consumer, Settings, About, and History.
- `src/renderer/domain`: reusable business logic for FHIR-specific flows.
- `src/renderer/shared`: shared components, hooks, stores, and utilities.
- `src/shared/contracts`: stable cross-process contracts shared by main and renderer.

## Current Folder Shape

```text
src/
  main/
    ipc/
    services/
  renderer/
    app/
      components/
      hooks/
      lib/
      stores/
    domain/
      fhir/
    features/
      about/
      consumer/
        components/
        hooks/
        lib/
        store/
      creator/
        components/
        forms/
        hooks/
        lib/
        store/
      history/
        store/
      settings/
    shared/
      components/
        ui/
      hooks/
      lib/
      stores/
  shared/
    contracts/
```

Legacy top-level renderer folders such as `src/renderer/components`, `src/renderer/hooks`, `src/renderer/lib`, and `src/renderer/store` have been removed so ownership now follows app, feature, or shared boundaries directly.

## Runtime Boundaries

### Main Process

- Owns BrowserWindow creation and persistence.
- Registers file, zoom, and external URL IPC handlers.
- Integrates update checks and macOS-specific menu/about window behavior.

### Preload Bridge

- Exposes `window.rxfhir` as the only renderer-to-main public API.
- Keeps the surface area narrow and typed.
- Does not expose raw Node APIs to the renderer.

### Renderer App Layer

- Owns routing, global dialogs, sidebar, status bar, command palette, onboarding, toasts, and route-level accessibility behavior.
- Coordinates global stores and global feature runners such as live demo and showcase.
- Holds app-wide preference and orchestration state under `src/renderer/app/stores`.

### Renderer Feature Layer

- `creator`: authoring workflow, draft state, resource submission flow, bundle assembly handoff.
- `consumer`: search execution, result inspection, import/export, compare/diff, history integration.
- `settings`: server preferences, shortcuts, accessibility, preferences import/export.
- `about`: release/update UI and project metadata.
- `history`: persisted submissions and saved searches display helpers.
- Feature-owned state lives beside the feature, for example `features/creator/store` and `features/history/store`.

### Renderer Domain Layer

- Encapsulates FHIR request rules, query construction, bundle assembly, parsing, and export-oriented business logic.
- Should remain framework-light so it can be tested with unit tests.

## Refactor Principles

- Keep persisted storage keys and payload shapes backward compatible unless a migration is added.
- Prefer thin compatibility wrappers when moving modules so feature behavior stays unchanged during refactor.
- Add unit tests for pure logic before large behavioral refactors.
- Keep Electron security boundaries narrow: IPC inputs/outputs typed, no raw Node leakage to renderer.
- Prefer colocating state, hooks, and helper logic with the feature or app shell that owns the behavior; shared code should exist only when at least two boundaries genuinely depend on it.

For post-refactor follow-up priorities and explicit stopping criteria, see [docs/refactor-followups.md](./refactor-followups.md).
