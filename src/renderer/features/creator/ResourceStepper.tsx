import { useEffect, useMemo, useRef, useState } from 'react'
import { Braces, Check, ChevronRight, ChevronsUpDown, Layers3, Loader2, Package, SendHorizontal, Target, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { Badge } from '../../components/ui/badge'
import JsonViewer from '../../components/JsonViewer'
import FhirRequestInspector from '../../components/FhirRequestInspector'
import FeatureShowcaseTarget from '../../components/FeatureShowcaseTarget'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/utils'
import { useCreatorStore } from '../../store/creatorStore'
import { useAppStore } from '../../store/appStore'
import { exportCreatorPostman } from '../../services/bundleFileService'
import { useAccessibilityStore } from '../../store/accessibilityStore'
import { useFhirInspectorStore } from '../../store/fhirInspectorStore'
import { useFeatureShowcaseStore } from '../../store/featureShowcaseStore'
import { useShortcutActionStore } from '../../store/shortcutActionStore'
import { RESOURCE_STEPS } from '../../types/fhir.d'
import type { CreatedResources, ResourceKey } from '../../types/fhir.d'

import OrganizationForm from './forms/OrganizationForm'
import PatientForm from './forms/PatientForm'
import PractitionerForm from './forms/PractitionerForm'
import EncounterForm from './forms/EncounterForm'
import ConditionForm from './forms/ConditionForm'
import ObservationForm from './forms/ObservationForm'
import CoverageForm from './forms/CoverageForm'
import MedicationForm from './forms/MedicationForm'
import MedicationRequestForm from './forms/MedicationRequestForm'
import ExtensionForm from './forms/ExtensionForm'
import CompositionForm from './forms/CompositionForm'

interface ResourceStepperProps {
  onBundleSuccess: (bundleId: string) => void
}

const CREATOR_RIGHT_PANEL_WIDTH_STORAGE_KEY = 'rxfhir.creator.right-panel-width'
const CREATOR_BOTTOM_PANEL_HEIGHT_STORAGE_KEY = 'rxfhir.creator.bottom-panel-height'
const DEFAULT_CREATOR_RIGHT_PANEL_WIDTH = 400
const DEFAULT_CREATOR_BOTTOM_PANEL_HEIGHT = 320
const MIN_CREATOR_RIGHT_PANEL_WIDTH = 240
const MAX_CREATOR_RIGHT_PANEL_WIDTH = 860
const MIN_CREATOR_BOTTOM_PANEL_HEIGHT = 120
const MAX_CREATOR_BOTTOM_PANEL_HEIGHT = 680
const MIN_CREATOR_FORM_WIDTH = 460
const MIN_CREATOR_FORM_HEIGHT = 160
const CREATOR_RIGHT_PANEL_RESIZER_WIDTH = 10
const CREATOR_BOTTOM_PANEL_RESIZER_HEIGHT = 10
const CREATOR_RIGHT_PANEL_KEYBOARD_STEP = 24
const CREATOR_BOTTOM_PANEL_KEYBOARD_STEP = 24

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  )
}

function compactText(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || undefined
}

function joinSummary(...parts: Array<string | undefined>): string | undefined {
  const values = parts.filter((part): part is string => !!compactText(part))
  return values.length ? values.join(' / ') : undefined
}

function formatHumanName(names?: fhir4.HumanName[]): string | undefined {
  const primary = names?.[0]
  if (!primary) return undefined
  return compactText(primary.text) || compactText(`${primary.family ?? ''}${primary.given?.join('') ?? ''}`)
}

function getIdentifierValue(resource?: { identifier?: fhir4.Identifier[] }): string | undefined {
  return resource?.identifier?.find((identifier) => compactText(identifier.value))?.value
}

function getCodeableText(concept?: fhir4.CodeableConcept): string | undefined {
  return compactText(concept?.text) || compactText(concept?.coding?.[0]?.display) || compactText(concept?.coding?.[0]?.code)
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function readCreatorRightPanelWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_CREATOR_RIGHT_PANEL_WIDTH

  try {
    const raw = window.localStorage.getItem(CREATOR_RIGHT_PANEL_WIDTH_STORAGE_KEY)
    if (!raw) return DEFAULT_CREATOR_RIGHT_PANEL_WIDTH

    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return DEFAULT_CREATOR_RIGHT_PANEL_WIDTH

    return clampValue(parsed, MIN_CREATOR_RIGHT_PANEL_WIDTH, MAX_CREATOR_RIGHT_PANEL_WIDTH)
  } catch {
    return DEFAULT_CREATOR_RIGHT_PANEL_WIDTH
  }
}

function readCreatorBottomPanelHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_CREATOR_BOTTOM_PANEL_HEIGHT

  try {
    const raw = window.localStorage.getItem(CREATOR_BOTTOM_PANEL_HEIGHT_STORAGE_KEY)
    if (!raw) return DEFAULT_CREATOR_BOTTOM_PANEL_HEIGHT

    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return DEFAULT_CREATOR_BOTTOM_PANEL_HEIGHT

    return clampValue(parsed, MIN_CREATOR_BOTTOM_PANEL_HEIGHT, MAX_CREATOR_BOTTOM_PANEL_HEIGHT)
  } catch {
    return DEFAULT_CREATOR_BOTTOM_PANEL_HEIGHT
  }
}

function formatQuantity(quantity?: fhir4.Quantity): string | undefined {
  if (quantity?.value === undefined || quantity?.value === null) return undefined
  return compactText(`${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ''}`)
}

function formatShortDateTime(value?: string): string | undefined {
  const normalized = compactText(value)
  if (!normalized) return undefined

  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/)
  if (matched) {
    const [, date, time] = matched
    return `${date.replace(/-/g, '/')}${time ? ` ${time}` : ''}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const pad = (part: number) => String(part).padStart(2, '0')
  return `${parsed.getFullYear()}/${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function getEncounterTypeLabel(code: string | undefined, t: (key: string) => string): string | undefined {
  switch (code) {
    case 'AMB':
      return t('forms.encounter.type.options.ambulatory')
    case 'EMER':
      return t('forms.encounter.type.options.emergency')
    case 'IMP':
      return t('forms.encounter.type.options.inpatient')
    default:
      return undefined
  }
}

function getCoverageTypeLabel(code: string | undefined, t: (key: string) => string): string | undefined {
  switch (code) {
    case 'EHCPOL':
      return t('forms.coverage.type.options.EHCPOL')
    case 'PAY':
      return t('forms.coverage.type.options.PAY')
    case 'PUBLICPOL':
      return t('forms.coverage.type.options.PUBLICPOL')
    default:
      return undefined
  }
}

function getMedicationRequestFrequency(resource?: fhir4.MedicationRequest): string | undefined {
  return compactText(resource?.dosageInstruction?.[0]?.timing?.code?.text)
    || compactText(resource?.dosageInstruction?.[0]?.timing?.code?.coding?.[0]?.display)
    || compactText(resource?.dosageInstruction?.[0]?.timing?.code?.coding?.[0]?.code)
}

function getStepSummary(
  key: ResourceKey,
  resources: CreatedResources,
  bundleId: string | undefined,
  t: (key: string) => string
): string | undefined {
  switch (key) {
    case 'organization':
      return joinSummary(resources.organization?.name, getIdentifierValue(resources.organization))
    case 'patient':
      return joinSummary(formatHumanName(resources.patient?.name), getIdentifierValue(resources.patient))
    case 'practitioner':
      return joinSummary(formatHumanName(resources.practitioner?.name), getIdentifierValue(resources.practitioner))
    case 'encounter':
      return joinSummary(
        getEncounterTypeLabel(resources.encounter?.class?.code, t) || compactText(resources.encounter?.class?.display),
        formatShortDateTime(resources.encounter?.period?.start)
      )
    case 'condition':
      return joinSummary(getCodeableText(resources.condition?.code), compactText(resources.condition?.code?.coding?.[0]?.code))
    case 'observation':
      return joinSummary(getCodeableText(resources.observation?.code), formatQuantity(resources.observation?.valueQuantity))
    case 'coverage':
      return joinSummary(
        getCoverageTypeLabel(resources.coverage?.type?.coding?.[0]?.code, t) || getCodeableText(resources.coverage?.type),
        getIdentifierValue(resources.coverage)
      )
    case 'medication':
      return joinSummary(
        compactText(resources.medication?.code?.text) || compactText(resources.medication?.code?.coding?.[0]?.display),
        compactText(resources.medication?.code?.coding?.[0]?.code)
      )
    case 'medicationRequest': {
      const medicationName =
        compactText(resources.medicationRequest?.medicationReference?.display)
        || compactText(resources.medication?.code?.text)
        || compactText(resources.medication?.code?.coding?.[0]?.display)
      const dose = formatQuantity(resources.medicationRequest?.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity)
      const frequency = getMedicationRequestFrequency(resources.medicationRequest)
      const dosageSummary = [dose, frequency].filter((part): part is string => !!part).join(' · ')
      return joinSummary(medicationName, dosageSummary || undefined)
    }
    case 'extension':
      return joinSummary(
        getCodeableText(resources.extension?.code),
        compactText(resources.extension?.extension?.[0]?.valueString)
      )
    case 'composition':
      return joinSummary(resources.composition?.title, bundleId)
    default:
      return undefined
  }
}

export default function ResourceStepper({ onBundleSuccess }: ResourceStepperProps): React.JSX.Element {
  const contentAreaRef = useRef<HTMLDivElement | null>(null)
  const resizeMoveHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const resizeUpHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(DEFAULT_CREATOR_RIGHT_PANEL_WIDTH)
  const bottomResizeMoveHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const bottomResizeUpHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const bottomResizeStartYRef = useRef(0)
  const bottomResizeStartHeightRef = useRef(DEFAULT_CREATOR_BOTTOM_PANEL_HEIGHT)
  const {
    currentStep,
    setStep,
    resources,
    nextStep,
    prevStep,
    bundleId,
    submittingBundle,
    draftRevision,
    clearDraft,
    lastUpdatedResourceKey
  } = useCreatorStore()
  const latestRequest = useFhirInspectorStore((state) => state.latest)
  const requestHistory = useFhirInspectorStore((state) => state.history)
  const serverUrl = useAppStore((state) => state.serverUrl)
  const announcePolite = useAccessibilityStore((state) => state.announcePolite)
  const showcaseStatus = useFeatureShowcaseStore((state) => state.status)
  const showcaseUi = useFeatureShowcaseStore((state) => state.ui)
  const setCreatorActions = useShortcutActionStore((state) => state.setCreatorActions)
  const clearCreatorActions = useShortcutActionStore((state) => state.clearCreatorActions)
  const reducedMotion = useReducedMotion()
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [rightPanelMode, setRightPanelMode] = useState<'json' | 'request'>('json')
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => readCreatorRightPanelWidth())
  const [bottomPanelHeight, setBottomPanelHeight] = useState<number>(() => readCreatorBottomPanelHeight())
  const [expandSeq, setExpandSeq] = useState(0)
  const [jsonFontSize, setJsonFontSize] = useState<'sm' | 'md' | 'lg'>('sm')
  const [showOnlyLastResource, setShowOnlyLastResource] = useState(false)
  const [collapseSyncToken, setCollapseSyncToken] = useState(0)
  const [collapseAll, setCollapseAll] = useState(false)
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const shouldFocusCurrentStepRef = useRef(false)
  const previousStepRef = useRef(currentStep)
  const showcaseBackupRef = useRef<{ showRightPanel: boolean; rightPanelMode: 'json' | 'request' }>()
  const showcaseActive = showcaseStatus === 'running' || showcaseStatus === 'paused'

  function onResourceSuccess(key: string, resource: fhir4.Resource): void {
    useCreatorStore.getState().setResource(key as never, resource as never)
    clearDraft(key as keyof typeof resources)
    setExpandSeq(s => s + 1)
    setCollapseAll(false)
    setShowRightPanel(true)
  }
  const { t } = useTranslation('creator')
  const { t: tc } = useTranslation('common')

  useEffect(() => {
    if (!latestRequest?.id) return
    setShowRightPanel(true)
    setRightPanelMode('request')
  }, [latestRequest?.id])

  useEffect(() => {
    if (showcaseActive && !showcaseBackupRef.current) {
      showcaseBackupRef.current = { showRightPanel, rightPanelMode }
      return
    }

    if (!showcaseActive && showcaseBackupRef.current) {
      setShowRightPanel(showcaseBackupRef.current.showRightPanel)
      setRightPanelMode(showcaseBackupRef.current.rightPanelMode)
      showcaseBackupRef.current = undefined
    }
  }, [rightPanelMode, showRightPanel, showcaseActive])

  useEffect(() => {
    if (!showcaseActive) return

    const creatorUi = showcaseUi.creator
    if (!creatorUi) return

    if (creatorUi.showRightPanel !== undefined) {
      setShowRightPanel(creatorUi.showRightPanel)
    }
    if (creatorUi.rightPanelMode) {
      setRightPanelMode(creatorUi.rightPanelMode)
    }
  }, [showcaseActive, showcaseUi.creator])

  useEffect(() => {
    setCreatorActions({
      toggleRightPanel: () => setShowRightPanel((current) => !current),
      toggleRightPanelMode: () => setRightPanelMode((current) => current === 'json' ? 'request' : 'json'),
      showInfoPanel: () => setShowRightPanel(true),
      setInfoPanelMode: (mode) => {
        setShowRightPanel(true)
        setRightPanelMode(mode)
      }
    })

    return () => {
      clearCreatorActions(['toggleRightPanel', 'toggleRightPanelMode', 'showInfoPanel', 'setInfoPanelMode'])
    }
  }, [clearCreatorActions, setCreatorActions])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const currentButton = stepButtonRefs.current[currentStep]
      if (!currentButton) return

      currentButton.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: reducedMotion ? 'auto' : 'smooth'
      })

      if (shouldFocusCurrentStepRef.current) {
        currentButton.focus()
        shouldFocusCurrentStepRef.current = false
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [currentStep, reducedMotion])

  const stepSummaries = useMemo(
    () =>
      RESOURCE_STEPS.reduce<Partial<Record<ResourceKey, string>>>((acc, step) => {
        const summary = getStepSummary(step.key, resources, bundleId, t)
        if (summary) acc[step.key] = summary
        return acc
      }, {}),
    [bundleId, resources, t]
  )

  function isStepComplete(index: number): boolean {
    const step = RESOURCE_STEPS[index]
    if (step.key === 'composition') return !!bundleId
    return !!resources[step.key]
  }

  function renderForm(): React.JSX.Element {
    const step = RESOURCE_STEPS[currentStep]
    const formKey = `${step.key}-${draftRevision}`

    switch (step.key) {
      case 'organization':
        return <OrganizationForm key={formKey} onSuccess={(r) => onResourceSuccess('organization', r)} />
      case 'patient':
        return <PatientForm key={formKey} onSuccess={(r) => onResourceSuccess('patient', r)} />
      case 'practitioner':
        return <PractitionerForm key={formKey} onSuccess={(r) => onResourceSuccess('practitioner', r)} />
      case 'encounter':
        return <EncounterForm key={formKey} onSuccess={(r) => onResourceSuccess('encounter', r)} />
      case 'condition':
        return <ConditionForm key={formKey} onSuccess={(r) => onResourceSuccess('condition', r)} />
      case 'observation':
        return <ObservationForm key={formKey} onSuccess={(r) => onResourceSuccess('observation', r)} />
      case 'coverage':
        return <CoverageForm key={formKey} onSuccess={(r) => onResourceSuccess('coverage', r)} />
      case 'medication':
        return <MedicationForm key={formKey} onSuccess={(r) => onResourceSuccess('medication', r)} />
      case 'medicationRequest':
        return <MedicationRequestForm key={formKey} onSuccess={(r) => onResourceSuccess('medicationRequest', r)} />
      case 'extension':
        return <ExtensionForm key={formKey} onSuccess={(r) => onResourceSuccess('extension', r)} />
      case 'composition':
        return <CompositionForm key={formKey} onBundleSuccess={onBundleSuccess} />
      default:
        return <div>{t('stepper.unknownStep')}</div>
    }
  }

  const currentStepKey = RESOURCE_STEPS[currentStep].key
  const completedCount = RESOURCE_STEPS.filter((_, i) => isStepComplete(i)).length
  const [contentAreaWidth, setContentAreaWidth] = useState<number>(0)
  const [contentAreaHeight, setContentAreaHeight] = useState<number>(0)

  useEffect(() => {
    const element = contentAreaRef.current
    if (!element) return

    const updateSize = (): void => {
      const rect = element.getBoundingClientRect()
      const nextWidth = Math.round(rect.width)
      const nextHeight = Math.round(rect.height)
      setContentAreaWidth((prev) => (prev === nextWidth ? prev : nextWidth))
      setContentAreaHeight((prev) => (prev === nextHeight ? prev : nextHeight))
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }

    const observer = new ResizeObserver(() => updateSize())
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(CREATOR_RIGHT_PANEL_WIDTH_STORAGE_KEY, String(rightPanelWidth))
    } catch {
      // Ignore localStorage write failures and keep the in-memory width.
    }
  }, [rightPanelWidth])

  useEffect(() => {
    try {
      window.localStorage.setItem(CREATOR_BOTTOM_PANEL_HEIGHT_STORAGE_KEY, String(bottomPanelHeight))
    } catch {
      // Ignore localStorage write failures and keep the in-memory height.
    }
  }, [bottomPanelHeight])

  const maxRightPanelWidth = Math.max(
    MIN_CREATOR_RIGHT_PANEL_WIDTH,
    Math.min(
      MAX_CREATOR_RIGHT_PANEL_WIDTH,
      contentAreaWidth - MIN_CREATOR_FORM_WIDTH - CREATOR_RIGHT_PANEL_RESIZER_WIDTH
    )
  )
  const isRightPanelSideBySide =
    contentAreaWidth >=
    MIN_CREATOR_FORM_WIDTH + MIN_CREATOR_RIGHT_PANEL_WIDTH + CREATOR_RIGHT_PANEL_RESIZER_WIDTH
  const effectiveRightPanelWidth = clampValue(
    rightPanelWidth,
    MIN_CREATOR_RIGHT_PANEL_WIDTH,
    maxRightPanelWidth
  )
  const maxBottomPanelHeight = Math.max(
    MIN_CREATOR_BOTTOM_PANEL_HEIGHT,
    Math.min(
      MAX_CREATOR_BOTTOM_PANEL_HEIGHT,
      contentAreaHeight - MIN_CREATOR_FORM_HEIGHT - CREATOR_BOTTOM_PANEL_RESIZER_HEIGHT
    )
  )
  const effectiveBottomPanelHeight = clampValue(
    bottomPanelHeight,
    MIN_CREATOR_BOTTOM_PANEL_HEIGHT,
    maxBottomPanelHeight
  )

  function updateRightPanelWidth(nextWidth: number): void {
    setRightPanelWidth(clampValue(nextWidth, MIN_CREATOR_RIGHT_PANEL_WIDTH, maxRightPanelWidth))
  }

  function updateBottomPanelHeight(nextHeight: number): void {
    setBottomPanelHeight(clampValue(nextHeight, MIN_CREATOR_BOTTOM_PANEL_HEIGHT, maxBottomPanelHeight))
  }

  function cleanupResizeListeners(): void {
    if (resizeMoveHandlerRef.current) {
      window.removeEventListener('mousemove', resizeMoveHandlerRef.current)
      resizeMoveHandlerRef.current = null
    }
    if (resizeUpHandlerRef.current) {
      window.removeEventListener('mouseup', resizeUpHandlerRef.current)
      resizeUpHandlerRef.current = null
    }

    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }

  function cleanupBottomResizeListeners(): void {
    if (bottomResizeMoveHandlerRef.current) {
      window.removeEventListener('mousemove', bottomResizeMoveHandlerRef.current)
      bottomResizeMoveHandlerRef.current = null
    }
    if (bottomResizeUpHandlerRef.current) {
      window.removeEventListener('mouseup', bottomResizeUpHandlerRef.current)
      bottomResizeUpHandlerRef.current = null
    }

    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }

  function handleRightPanelResizeMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
    if (!showRightPanel || !isRightPanelSideBySide) return

    event.preventDefault()
    resizeStartXRef.current = event.clientX
    resizeStartWidthRef.current = effectiveRightPanelWidth

    document.body.style.setProperty('cursor', 'col-resize')
    document.body.style.setProperty('user-select', 'none')

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      const delta = resizeStartXRef.current - moveEvent.clientX
      updateRightPanelWidth(resizeStartWidthRef.current + delta)
    }

    const handleMouseUp = (): void => {
      cleanupResizeListeners()
    }

    resizeMoveHandlerRef.current = handleMouseMove
    resizeUpHandlerRef.current = handleMouseUp

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleRightPanelResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!showRightPanel || !isRightPanelSideBySide) return

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      updateRightPanelWidth(effectiveRightPanelWidth + CREATOR_RIGHT_PANEL_KEYBOARD_STEP)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      updateRightPanelWidth(effectiveRightPanelWidth - CREATOR_RIGHT_PANEL_KEYBOARD_STEP)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      updateRightPanelWidth(MIN_CREATOR_RIGHT_PANEL_WIDTH)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      updateRightPanelWidth(maxRightPanelWidth)
    }
  }

  function handleBottomPanelResizeMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
    if (!showRightPanel || isRightPanelSideBySide) return

    event.preventDefault()
    bottomResizeStartYRef.current = event.clientY
    bottomResizeStartHeightRef.current = effectiveBottomPanelHeight

    document.body.style.setProperty('cursor', 'row-resize')
    document.body.style.setProperty('user-select', 'none')

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      const delta = bottomResizeStartYRef.current - moveEvent.clientY
      updateBottomPanelHeight(bottomResizeStartHeightRef.current + delta)
    }

    const handleMouseUp = (): void => {
      cleanupBottomResizeListeners()
    }

    bottomResizeMoveHandlerRef.current = handleMouseMove
    bottomResizeUpHandlerRef.current = handleMouseUp

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function handleBottomPanelResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (!showRightPanel || isRightPanelSideBySide) return

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      updateBottomPanelHeight(effectiveBottomPanelHeight + CREATOR_BOTTOM_PANEL_KEYBOARD_STEP)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      updateBottomPanelHeight(effectiveBottomPanelHeight - CREATOR_BOTTOM_PANEL_KEYBOARD_STEP)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      updateBottomPanelHeight(MIN_CREATOR_BOTTOM_PANEL_HEIGHT)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      updateBottomPanelHeight(maxBottomPanelHeight)
    }
  }

  useEffect(() => cleanupResizeListeners, [])
  useEffect(() => cleanupBottomResizeListeners, [])

  function handleStepperKeyboardNavigation(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey) return
    if (isEditableTarget(event.target)) return

    let nextStepIndex: number | null = null

    if (event.key === 'ArrowUp') {
      nextStepIndex = Math.max(0, currentStep - 1)
    } else if (event.key === 'ArrowDown') {
      nextStepIndex = Math.min(RESOURCE_STEPS.length - 1, currentStep + 1)
    } else if (event.key === 'Home' && !event.shiftKey) {
      nextStepIndex = 0
    } else if (event.key === 'End' && !event.shiftKey) {
      nextStepIndex = RESOURCE_STEPS.length - 1
    }

    if (nextStepIndex === null || nextStepIndex === currentStep) return

    event.preventDefault()
    shouldFocusCurrentStepRef.current = true
    setStep(nextStepIndex)
  }
  const currentStepSummary = stepSummaries[currentStepKey]

  useEffect(() => {
    if (previousStepRef.current === currentStep) return

    announcePolite(
      currentStepSummary
        ? t('stepper.currentStepAnnouncementWithSummary', {
            current: currentStep + 1,
            total: RESOURCE_STEPS.length,
            label: t(`steps.${currentStepKey}.label`),
            summary: currentStepSummary
          })
        : t('stepper.currentStepAnnouncement', {
            current: currentStep + 1,
            total: RESOURCE_STEPS.length,
            label: t(`steps.${currentStepKey}.label`)
          })
    )
    previousStepRef.current = currentStep
  }, [announcePolite, currentStep, currentStepKey, currentStepSummary, t])

  const jsonEntries = useMemo(
    () => Object.entries(resources).filter((entry): entry is [ResourceKey, NonNullable<CreatedResources[ResourceKey]>] => Boolean(entry[1])),
    [resources]
  )
  const effectiveLatestResourceKey = useMemo(() => {
    if (lastUpdatedResourceKey && resources[lastUpdatedResourceKey]) return lastUpdatedResourceKey
    if (resources[currentStepKey]) return currentStepKey

    for (let index = RESOURCE_STEPS.length - 1; index >= 0; index -= 1) {
      const key = RESOURCE_STEPS[index].key
      if (resources[key]) return key
    }

    return undefined
  }, [currentStepKey, lastUpdatedResourceKey, resources])
  const visibleJsonEntries = useMemo(() => {
    if (showOnlyLastResource && effectiveLatestResourceKey && resources[effectiveLatestResourceKey]) {
      return [[effectiveLatestResourceKey, resources[effectiveLatestResourceKey]!]] as Array<[ResourceKey, NonNullable<CreatedResources[ResourceKey]>]>
    }
    return jsonEntries
  }, [effectiveLatestResourceKey, jsonEntries, resources, showOnlyLastResource])
  const jsonStatusLabel =
    showOnlyLastResource && effectiveLatestResourceKey
      ? t('stepper.jsonStatusLatest', { resource: t(`steps.${effectiveLatestResourceKey}.label`) })
      : t('stepper.jsonStatusAll', { count: visibleJsonEntries.length })

  function handleCollapseAll(): void {
    setCollapseAll(true)
    setCollapseSyncToken((token) => token + 1)
  }

  function handleSelectJsonMode(mode: 'all' | 'latest'): void {
    const next = mode === 'latest'
    if (next === showOnlyLastResource) return

    setShowOnlyLastResource(next)
    if (next) {
      setCollapseAll(false)
      setCollapseSyncToken((token) => token + 1)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-row gap-0">
      {/* Left: Step indicator */}
      <FeatureShowcaseTarget
        id="creator.stepper"
        className="flex h-full min-h-0 w-40 shrink-0 flex-col border-r bg-muted/30 xl:w-44 2xl:w-48"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b px-3 py-3 sm:px-4">
            <div className="flex flex-col gap-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('stepper.progress')}</div>
                <div id="creator-stepper-progress" role="status" aria-live="polite" className="text-sm font-semibold">
                  {t('stepper.progressCount', { completed: completedCount, total: RESOURCE_STEPS.length })}
                </div>
              </div>
              <p
                id="creator-stepper-shortcuts"
                className="text-[10px] leading-relaxed text-muted-foreground/80"
              >
                {t('stepper.shortcuts')}
              </p>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <nav
              className="p-2"
              data-stepper-nav="true"
              aria-label={t('stepper.progress')}
              aria-describedby="creator-stepper-progress creator-stepper-shortcuts"
              onKeyDown={handleStepperKeyboardNavigation}
            >
              <ol className="grid gap-1">
                {RESOURCE_STEPS.map((step, index) => {
                  const complete = isStepComplete(index)
                  const active = index === currentStep
                  return (
                    <li key={step.key}>
                      <button
                        ref={(element) => {
                          stepButtonRefs.current[index] = element
                        }}
                        onClick={() => setStep(index)}
                        aria-current={active ? 'step' : undefined}
                        aria-controls="creator-step-panel"
                        aria-label={t('stepper.stepButtonAriaLabel', {
                          step: index + 1,
                          total: RESOURCE_STEPS.length,
                          label: t(`steps.${step.key}.label`)
                        })}
                        className={cn(
                          'h-full min-h-[4.25rem] w-full rounded-md px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                          'flex items-start gap-2',
                          active
                            ? 'bg-primary text-primary-foreground focus-visible:ring-primary'
                            : complete
                            ? 'text-emerald-800 hover:bg-emerald-50 focus-visible:ring-emerald-600'
                            : 'text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          complete ? 'bg-emerald-600 text-white' : active ? 'bg-white/20 text-inherit' : 'bg-muted text-muted-foreground'
                        }`}>
                          {complete ? <Check className="h-3 w-3" /> : index + 1}
                        </span>
                        <div className="min-w-0">
                          {(() => {
                            const label = t(`steps.${step.key}.label`)
                            const labelEn = t(`steps.${step.key}.labelEn`)
                            const summary = complete ? stepSummaries[step.key] : undefined
                            return (
                              <>
                                <div className="font-medium truncate">{label}</div>
                                {label !== labelEn && <div className="text-[10px] opacity-60 truncate">{labelEn}</div>}
                                {summary && (
                                  <div
                                    className={`mt-0.5 text-[10px] truncate ${
                                      active
                                        ? 'text-primary-foreground/80'
                                        : complete
                                        ? 'opacity-70'
                                        : 'text-muted-foreground'
                                    }`}
                                    title={summary}
                                  >
                                    {summary}
                                  </div>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </button>
                    </li>
                    )
                  })}
              </ol>
            </nav>
          </ScrollArea>
        </div>
      </FeatureShowcaseTarget>

      {/* Right: Form area */}
      <div className="flex-1 flex min-w-0 flex-col">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b bg-background px-4 py-3 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {t('stepper.stepBadge', { current: currentStep + 1, total: RESOURCE_STEPS.length })}
              </Badge>
              <h2 id="creator-current-step-heading" className="text-base font-semibold break-words">{t(`steps.${currentStepKey}.label`)}</h2>
              {t(`steps.${currentStepKey}.label`) !== t(`steps.${currentStepKey}.labelEn`) && (
                <span className="text-sm text-muted-foreground break-words">{t(`steps.${currentStepKey}.labelEn`)}</span>
              )}
            </div>
            {currentStepSummary && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:truncate" title={currentStepSummary}>
                {currentStepSummary}
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
            <button
              type="button"
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="inline-flex w-full items-center justify-center rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
            >
              {showRightPanel ? t('stepper.hidePanel') : t('stepper.showPanel')}
            </button>
          </div>
        </div>

        {/* Content area */}
        <div ref={contentAreaRef} className="flex-1 min-h-0 overflow-hidden">
          <div
            className={
              showRightPanel
                ? cn(
                  'h-full min-h-0',
                  isRightPanelSideBySide
                    ? 'flex flex-row'
                    : 'flex flex-col'
                )
                : 'h-full min-h-0'
            }
          >
            {/* Form */}
            <FeatureShowcaseTarget id="creator.form" className="h-full min-h-0 flex-1">
              <div id="creator-step-panel" className="flex flex-col h-full min-h-0" aria-labelledby="creator-current-step-heading">
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 sm:p-5">
                    {renderForm()}
                  </div>
                </ScrollArea>
                {currentStepKey === 'composition' && (
                  <FeatureShowcaseTarget id="creator.bundleSubmit">
                    <div className="p-4 pt-2 border-t bg-background shrink-0">
                      <Button
                        data-live-demo-submit="composition"
                        type="submit"
                        form="composition-form"
                        disabled={submittingBundle || !resources.patient}
                        className="w-full"
                        size="lg"
                      >
                        {submittingBundle && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Package className="h-4 w-4" />
                        {bundleId
                          ? t('forms.composition.resubmitButton')
                          : t('forms.composition.submitButton')}
                      </Button>
                    </div>
                  </FeatureShowcaseTarget>
                )}
              </div>
            </FeatureShowcaseTarget>

            {/* JSON Preview panel */}
            {showRightPanel && isRightPanelSideBySide && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={t('stepper.resizePanel')}
                tabIndex={0}
                onMouseDown={handleRightPanelResizeMouseDown}
                onKeyDown={handleRightPanelResizeKeyDown}
                className="group relative z-10 h-full shrink-0 cursor-col-resize outline-none"
                style={{ width: `${CREATOR_RIGHT_PANEL_RESIZER_WIDTH}px` }}
              >
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80 transition-colors group-hover:bg-primary/40 group-focus-visible:bg-primary/50" />
                <div className="absolute left-1/2 top-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/15 transition-colors group-hover:bg-primary/25 group-focus-visible:bg-primary/30" />
              </div>
            )}

            {showRightPanel && !isRightPanelSideBySide && (
              <div
                role="separator"
                aria-orientation="horizontal"
                aria-label={t('stepper.resizeBottomPanel')}
                tabIndex={0}
                onMouseDown={handleBottomPanelResizeMouseDown}
                onKeyDown={handleBottomPanelResizeKeyDown}
                className="group relative z-10 w-full shrink-0 cursor-row-resize outline-none"
                style={{ height: `${CREATOR_BOTTOM_PANEL_RESIZER_HEIGHT}px` }}
              >
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/80 transition-colors group-hover:bg-primary/40 group-focus-visible:bg-primary/50" />
                <div className="absolute left-1/2 top-1/2 h-1.5 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/15 transition-colors group-hover:bg-primary/25 group-focus-visible:bg-primary/30" />
              </div>
            )}

            {showRightPanel && (
              <FeatureShowcaseTarget
                id="creator.rightPanel"
                className={cn(
                  'min-h-0 shrink-0',
                  isRightPanelSideBySide ? 'h-full' : 'w-full'
                )}
                style={
                  isRightPanelSideBySide
                    ? { width: `${effectiveRightPanelWidth}px` }
                    : { height: `${effectiveBottomPanelHeight}px` }
                }
              >
                <div
                  data-live-demo-info-panel-scroll="true"
                  className={cn(
                    'h-full overflow-auto border-t bg-muted/35 p-4 transition-colors',
                    isRightPanelSideBySide && 'border-l border-t-0'
                  )}
                >
                  <div className="mb-3 space-y-2">
                    <div
                      className={cn(
                        'flex flex-col gap-2',
                        !isRightPanelSideBySide && 'sm:flex-row sm:items-start sm:justify-between'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="inline-flex items-center rounded-lg border border-border/70 bg-background/90 p-1 shadow-sm">
                          <Button
                            type="button"
                            variant={rightPanelMode === 'json' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 gap-1.5 px-3 text-[11px]"
                            onClick={() => setRightPanelMode('json')}
                          >
                            <Layers3 className="h-3.5 w-3.5" />
                            {t('stepper.panelModeJson')}
                          </Button>
                          <Button
                            type="button"
                            variant={rightPanelMode === 'request' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 gap-1.5 px-3 text-[11px]"
                            onClick={() => setRightPanelMode('request')}
                          >
                            <SendHorizontal className="h-3.5 w-3.5" />
                            {t('stepper.panelModeRequest')}
                          </Button>
                        </div>
                        {rightPanelMode === 'request' && requestHistory.some((e) => e.reasonCode === 'create' || e.reasonCode === 'update') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 px-3 text-[11px] shrink-0"
                            onClick={() => void exportCreatorPostman(requestHistory, serverUrl)}
                          >
                            <Braces className="h-3.5 w-3.5" />
                            {t('stepper.exportPostman')}
                          </Button>
                        )}
                      </div>
                      {rightPanelMode === 'json' && (
                        <div className="flex justify-stretch sm:justify-end">
                          <div
                            className={cn(
                              'w-full max-w-full rounded-xl border border-border/80 bg-background/90 p-2 shadow-sm backdrop-blur-sm',
                              !isRightPanelSideBySide && 'sm:max-w-sm'
                            )}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-end gap-2">
                                <div className="inline-flex h-8 min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-muted/30 px-1">
                                  <span className="px-1 text-[10px] font-medium text-muted-foreground">
                                    <Type className="h-3.5 w-3.5" />
                                  </span>
                                  {(['sm', 'md', 'lg'] as const).map((size) => (
                                    <Button
                                      key={size}
                                      type="button"
                                      variant={jsonFontSize === size ? 'secondary' : 'ghost'}
                                      size="sm"
                                      className={cn(
                                        'h-6 min-w-8 rounded-md px-2 text-[10px]',
                                        jsonFontSize === size ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                      )}
                                      onClick={() => setJsonFontSize(size)}
                                    >
                                      {t(`stepper.jsonFontSizes.${size}`)}
                                    </Button>
                                  ))}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-[5.5rem] shrink-0 rounded-lg border-border/70 bg-muted/30 px-3 text-[10px] shadow-none hover:bg-accent/60"
                                  onClick={handleCollapseAll}
                                  disabled={visibleJsonEntries.length === 0}
                                >
                                  <ChevronsUpDown className="h-3.5 w-3.5" />
                                  {t('stepper.jsonCollapseAll')}
                                </Button>
                              </div>

                              <div className="grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_8.5rem]">
                                <div className="min-w-0 rounded-md border border-border/60 bg-muted/35 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">
                                  <span className="block truncate" title={jsonStatusLabel}>{jsonStatusLabel}</span>
                                </div>
                                <div className="inline-flex h-8 w-full shrink-0 items-center rounded-lg border border-border/70 bg-muted/30 p-1 md:w-[8.5rem]">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={!showOnlyLastResource}
                                    className={cn(
                                      'h-6 w-full rounded-md px-2 text-[10px] font-medium',
                                      !showOnlyLastResource
                                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    onClick={() => handleSelectJsonMode('all')}
                                    title={t('stepper.jsonShowAllHint')}
                                  >
                                    <Layers3 className="h-3.5 w-3.5" />
                                    {t('stepper.jsonModeAll')}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={showOnlyLastResource}
                                    className={cn(
                                      'h-6 w-full rounded-md px-2 text-[10px] font-medium',
                                      showOnlyLastResource
                                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    onClick={() => handleSelectJsonMode('latest')}
                                    disabled={!effectiveLatestResourceKey || !resources[effectiveLatestResourceKey]}
                                    title={
                                      effectiveLatestResourceKey
                                        ? t('stepper.jsonShowLatestHint', { resource: t(`steps.${effectiveLatestResourceKey}.label`) })
                                        : t('stepper.jsonShowLatestUnavailable')
                                    }
                                  >
                                    <Target className="h-3.5 w-3.5" />
                                    {t('stepper.jsonModeLatest')}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {rightPanelMode === 'json' ? (
                    <>
                      {visibleJsonEntries.map(([key, resource]) =>
                        resource ? (
                          <div key={key} className="mb-3">
                            <JsonViewer
                              key={key === effectiveLatestResourceKey ? `${key}-${expandSeq}` : key}
                              data={resource}
                              title={key}
                              defaultCollapsed={collapseAll || key !== effectiveLatestResourceKey}
                              collapseSync={{ value: collapseAll, token: collapseSyncToken }}
                              fontSize={jsonFontSize}
                            />
                          </div>
                        ) : null
                      )}
                      {visibleJsonEntries.length === 0 && (
                        <p className="text-muted-foreground text-xs">{t('stepper.jsonEmpty')}</p>
                      )}
                    </>
                  ) : (
                    <FhirRequestInspector request={latestRequest} history={requestHistory} />
                  )}
                </div>
              </FeatureShowcaseTarget>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            {tc('buttons.prev')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextStep}
            disabled={currentStep === RESOURCE_STEPS.length - 1}
          >
            {tc('buttons.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
