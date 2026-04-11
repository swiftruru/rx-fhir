# RxFHIR UI Automation

## Purpose

This project now includes a Playwright-based Electron UI automation layer for
stable, local-first demo and regression coverage.

## Current Delivery Status

The current UI automation scope is considered **v1-complete for student-project
demo and classroom delivery**.

That means:

- the suite already proves RxFHIR has real end-to-end UI automation
- the current scope is intentionally stable rather than aggressively expanded
- additional coverage should only be added if product goals change, not just to
  make the test count larger

Teacher-facing presentation script:

- [ui-automation-demo-script.md](./ui-automation-demo-script.md)

It focuses on:

- real Electron window launch
- real renderer UI interaction
- mocked FHIR network responses for deterministic UI tests
- isolated user data for repeatable runs

It does **not** treat public HAPI availability or native OS dialogs as part of
the core UI suite.

## Commands

```bash
npm run test:ui
npm run test:ui:headed
npm run test:ui:report
```

Related existing checks:

```bash
npm test
npm run typecheck
npm run ux:electron:verify
```

## GitHub Workflow

UI automation is also wired into:

- `.github/workflows/ui-automation.yml`

Current workflow behavior:

- runs on `push` to `main`
- runs on `pull_request` targeting `main`
- can also be triggered manually with `workflow_dispatch`
- executes `typecheck`, `vitest`, and `test:ui`
- uploads Playwright artifacts on every run

## What The UI Suite Covers

- About page update check, update push, and external-link bridge actions
- app shell launch and primary route navigation
- Creator draft autosave and restore after relaunch
- Consumer drag-and-drop local Bundle import
- Consumer search history pin and rerun flow
- Consumer submission history prefill and bundle detail flow
- Consumer mocked FHIR search success flow
- Consumer mocked empty and error states
- Settings accessibility preference persistence after relaunch

## V1 Scope Boundaries

Intentionally in scope for the current delivery version:

- real Electron app launch and renderer interaction
- deterministic mocked FHIR flows for UI-state validation
- persisted draft, history, and settings behavior
- desktop-bridge verification where stubbed behavior is enough to prove wiring

Intentionally out of scope for the current delivery version:

- public HAPI as the primary UI test dependency
- native open/save dialog automation
- real browser opening or real release-API update checks
- cross-platform UI matrix testing
- visual regression or screenshot-baseline infrastructure
- further abstraction layers purely for testing architecture aesthetics

## Test Design Notes

- Electron is launched with isolated `RXFHIR_USER_DATA_DIR` per test run.
- `RXFHIR_E2E=1` disables startup update-check noise during UI tests.
- FHIR HTTP is mocked with Playwright route interception.
- About/update bridge behavior is stubbed through a preload-only E2E test hook, so
  the suite does not open a real browser or call a real release API.
- Native file-save dialogs and external browser opening are intentionally not
  part of the first-wave stable suite.

## Running For Demo

Use:

```bash
npm run test:ui:headed
```

Then use:

```bash
npm run test:ui:report
```

to open the HTML report after the run.

For a teacher/demo-friendly speaking script, see:

- [ui-automation-demo-script.md](./ui-automation-demo-script.md)

## Recommended Pre-Demo Verification

Before a live teacher demo, keep the validation pass minimal and repeatable:

```bash
npm run typecheck
npm test
npm run test:ui
npm run ux:electron:verify
```

Then use the live demo commands only:

```bash
npm run test:ui:headed
npm run test:ui:report
```

This is the recommended stopping point for the current project stage. Do not
expand the suite further unless you have a concrete new product or evaluation
need.

## Troubleshooting

- If `npm run test:ui` fails inside a restricted sandbox, rerun it in a normal
  local terminal session. The suite needs localhost CDP access to control the
  Electron app.
- If a UI assertion fails after a layout or copy update, check whether the test
  should use an existing semantic selector or whether a stable `data-testid`
  should be added.
- If a search-flow test becomes flaky, verify that the mocked route pattern
  still matches the current FHIR request URL shape.
