import type { LiveDemoControllerKey } from '../../demo/types'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function isVisibleElement(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.getClientRects().length > 0
}

function getFormSelector(key: LiveDemoControllerKey): string {
  return `[data-live-demo-form="${escapeAttrValue(key)}"]`
}

function getSubmitSelector(key: LiveDemoControllerKey): string {
  return `[data-live-demo-submit="${escapeAttrValue(key)}"]`
}

function getFieldSelector(fieldKey: string): string {
  const escaped = escapeAttrValue(fieldKey)
  return `[data-live-demo-field="${escaped}"], [name="${escaped}"]`
}

function focusTarget(target: HTMLElement): void {
  if (typeof target.focus !== 'function') return

  try {
    target.focus({ preventScroll: true })
  } catch {
    target.focus()
  }
}

async function revealElement(
  target: HTMLElement,
  reducedMotion: boolean,
  block: ScrollLogicalPosition = 'center'
): Promise<void> {
  target.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block,
    inline: 'nearest'
  })
  focusTarget(target)
  await sleep(reducedMotion ? 120 : 220)
}

export async function revealLiveDemoForm(
  key: LiveDemoControllerKey,
  reducedMotion: boolean
): Promise<void> {
  const form = document.querySelector(getFormSelector(key))
  if (!(form instanceof HTMLElement) || !isVisibleElement(form)) return
  await revealElement(form, reducedMotion, 'start')
}

export async function revealLiveDemoField(
  resourceKey: LiveDemoControllerKey,
  fieldKey: string,
  reducedMotion: boolean
): Promise<void> {
  const form = document.querySelector(getFormSelector(resourceKey))
  if (!(form instanceof HTMLElement) || !isVisibleElement(form)) return

  const matchingFields = Array.from(form.querySelectorAll(getFieldSelector(fieldKey)))
  const target = matchingFields.find(isVisibleElement) ?? form
  if (!isVisibleElement(target)) return

  await revealElement(target, reducedMotion)
}

export async function pressLiveDemoSubmit(
  key: LiveDemoControllerKey,
  reducedMotion: boolean
): Promise<boolean> {
  const submit = document.querySelector(getSubmitSelector(key))
  if (!(submit instanceof HTMLButtonElement) || submit.disabled) return false

  await revealElement(submit, reducedMotion)

  const previousTransition = submit.style.transition
  const previousTransform = submit.style.transform
  const previousFilter = submit.style.filter

  submit.style.transition = 'transform 120ms ease, filter 120ms ease'
  submit.style.transform = 'scale(0.985)'
  submit.style.filter = 'brightness(0.96)'

  await sleep(reducedMotion ? 70 : 110)
  submit.click()
  await sleep(reducedMotion ? 90 : 160)

  if (submit.isConnected) {
    submit.style.transition = previousTransition
    submit.style.transform = previousTransform
    submit.style.filter = previousFilter
  }

  return true
}

export async function revealLiveDemoInfoPanel(
  reducedMotion: boolean
): Promise<HTMLElement | null> {
  const panel = document.querySelector('[data-live-demo-info-panel-scroll]')
  if (!(panel instanceof HTMLElement) || !isVisibleElement(panel)) return null

  panel.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
    inline: 'nearest'
  })
  await sleep(reducedMotion ? 120 : 220)
  return panel
}
