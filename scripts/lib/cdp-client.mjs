import http from 'node:http'

function requestJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
        let data = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(error)
          }
        })
      })
      .on('error', reject)
  })
}

export async function getPageTarget({ port = 9233, match = '' } = {}) {
  const targets = await requestJson(`http://127.0.0.1:${port}/json/list`)
  return (
    targets.find(
      (target) =>
        target.type === 'page' && (!match || target.url.includes(match) || target.title.includes(match))
    ) ?? targets.find((target) => target.type === 'page')
  )
}

export async function waitForPageTarget({
  port = 9233,
  match = '',
  timeoutMs = 15000,
  intervalMs = 250
} = {}) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const target = await getPageTarget({ port, match })
      if (target?.webSocketDebuggerUrl) {
        return target
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Renderer page target not found on port ${port} within ${timeoutMs}ms.`)
}

export async function evaluateExpression({
  port = 9233,
  match = '',
  expression,
  awaitPromise = true,
  returnByValue = true,
  userGesture = true
}) {
  if (!expression?.trim()) {
    throw new Error('Missing CDP expression.')
  }

  const page = await getPageTarget({ port, match })
  if (!page?.webSocketDebuggerUrl) {
    throw new Error(`Renderer page target not found on port ${port}.`)
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl)

  return await new Promise((resolve, reject) => {
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {
            expression,
            awaitPromise,
            returnByValue,
            userGesture
          }
        })
      )
    }

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      if (payload.id !== 1) return

      if (payload.result?.exceptionDetails) {
        reject(
          new Error(payload.result.exceptionDetails.text || 'Runtime.evaluate failed in target page.')
        )
        ws.close()
        return
      }

      resolve(payload.result?.result?.value ?? null)
      ws.close()
    }

    ws.onerror = reject
  })
}

export function parseCommonArgs(argv) {
  let port = 9233
  let match = 'RxFHIR'
  const rest = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--port') {
      port = Number.parseInt(argv[index + 1] ?? '', 10)
      index += 1
      continue
    }

    if (arg === '--match') {
      match = argv[index + 1] ?? ''
      index += 1
      continue
    }

    rest.push(arg)
  }

  return { port, match, rest }
}
