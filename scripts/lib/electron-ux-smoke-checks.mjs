import { evaluateExpression } from './cdp-client.mjs'

const REQUIRED_BRIDGE_METHODS = [
  'saveBundleJson',
  'openBundleJson',
  'openRecentBundleJson',
  'listRecentBundleJsonFiles',
  'rememberRecentBundleJson',
  'savePreferencesJson',
  'openPreferencesJson',
  'openExternalUrl',
  'setAppZoomFactor'
]

async function waitForShellState({ port, match, timeoutMs = 10000, intervalMs = 250 }) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const shellState = await evaluateExpression({
      port,
      match,
      expression: `({
        hash: location.hash,
        title: document.title,
        hasBridge: Boolean(window.rxfhir)
      })`
    })

    if (shellState?.hasBridge && shellState?.title && shellState?.hash) {
      return shellState
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return evaluateExpression({
    port,
    match,
    expression: `({
      hash: location.hash,
      title: document.title,
      hasBridge: Boolean(window.rxfhir)
    })`
  })
}

export async function runElectronUxSmoke({
  port = 9233,
  match = 'RxFHIR'
} = {}) {
  const checks = []

  const shellState = await waitForShellState({ port, match })

  checks.push({
    label: 'Renderer target is reachable and exposes the RxFHIR desktop bridge',
    pass: Boolean(shellState?.hasBridge && shellState?.title),
    details: shellState
  })

  const bridgeMethods = await evaluateExpression({
    port,
    match,
    expression: 'Object.keys(window.rxfhir ?? {}).sort()'
  })

  checks.push({
    label: 'Desktop bridge keeps the expected native methods',
    pass: REQUIRED_BRIDGE_METHODS.every((method) => bridgeMethods.includes(method)),
    details: bridgeMethods
  })

  const dragDropResult = await evaluateExpression({
    port,
    match,
    expression: `new Promise((resolve) => {
      const originalHash = location.hash

      function findDropTarget() {
        return Array.from(document.querySelectorAll('div')).find(
          (element) => element.className === 'relative flex h-full flex-col xl:flex-row'
        )
      }

      function text() {
        return document.body.innerText
      }

      location.hash = '#/consumer'

      setTimeout(() => {
        const target = findDropTarget()
        if (!target) {
          resolve({ targetFound: false })
          return
        }

        const payload = {
          resourceType: 'Bundle',
          id: 'electron-smoke-bundle',
          type: 'document',
          entry: [
            {
              resource: {
                resourceType: 'Patient',
                id: 'patient-1',
                identifier: [{ value: 'SMOKE-123' }],
                name: [{ text: 'Smoke Test Patient' }]
              }
            },
            {
              resource: {
                resourceType: 'Organization',
                id: 'organization-1',
                identifier: [{ value: 'SMOKE-ORG' }],
                name: 'Smoke Test Clinic'
              }
            },
            {
              resource: {
                resourceType: 'Composition',
                id: 'composition-1',
                date: '2026-04-03T00:00:00+08:00'
              }
            }
          ]
        }

        const file = new File([JSON.stringify(payload, null, 2)], 'electron-smoke-bundle.json', {
          type: 'application/json'
        })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)

        target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }))

        setTimeout(() => {
          const overlayVisible = /放開即可匯入 Bundle JSON|Drop to import Bundle JSON/.test(text())
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))

          setTimeout(() => {
            const bodyText = text()
            const imported = /已匯入本機 Bundle：electron-smoke-bundle\\.json|Imported local Bundle: electron-smoke-bundle\\.json/.test(bodyText)
            const resultCount = /共找到 1 筆|Found 1 result/.test(bodyText)
            const patientVisible = /Smoke Test Patient/.test(bodyText)
            location.hash = originalHash

            resolve({
              targetFound: true,
              overlayVisible,
              imported,
              resultCount,
              patientVisible
            })
          }, 700)
        }, 120)
      }, 350)
    })`
  })

  checks.push({
    label: 'Consumer drag-and-drop flow keeps overlay and import result behavior',
    pass: Boolean(
      dragDropResult?.targetFound &&
        dragDropResult?.overlayVisible &&
        dragDropResult?.imported &&
        dragDropResult?.resultCount &&
        dragDropResult?.patientVisible
    ),
    details: dragDropResult
  })

  return checks
}
