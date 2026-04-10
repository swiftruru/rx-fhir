import { useEffect, useMemo } from 'react'
import type { FieldValues, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form'
import type { LiveDemoControllerKey } from '../../../demo/types'
import { pressLiveDemoSubmit, revealLiveDemoForm } from '../../../app/lib/liveDemoDom'
import { runWithLiveDemoSubmitContext, waitForLiveDemoRunning } from '../../../app/lib/liveDemoRuntime'
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion'
import { useLiveDemoStore } from '../../../app/stores/liveDemoStore'

export function useLiveDemoFormController<T extends FieldValues>(
  key: LiveDemoControllerKey,
  fillMock: (() => void) | undefined,
  handleSubmit: UseFormHandleSubmit<T>,
  onSubmit: SubmitHandler<T>,
  fillDemo?: (() => Promise<void>) | undefined
): void {
  const registerController = useLiveDemoStore((state) => state.registerController)
  const unregisterController = useLiveDemoStore((state) => state.unregisterController)
  const reducedMotion = useReducedMotion()

  const submit = useMemo(
    () => async () => {
      const runId = useLiveDemoStore.getState().runId
      await waitForLiveDemoRunning(runId)
      const clicked = await pressLiveDemoSubmit(key, reducedMotion)
      if (clicked) {
        await waitForLiveDemoRunning(runId)
        return
      }
      await runWithLiveDemoSubmitContext(runId, async () => {
        await handleSubmit(async (data) => {
          await waitForLiveDemoRunning(runId)
          await onSubmit(data)
          await waitForLiveDemoRunning(runId)
        })()
      })
    },
    [handleSubmit, key, onSubmit, reducedMotion]
  )

  const reveal = useMemo(
    () => async () => {
      const runId = useLiveDemoStore.getState().runId
      await waitForLiveDemoRunning(runId)
      await revealLiveDemoForm(key, reducedMotion)
      await waitForLiveDemoRunning(runId)
    },
    [key, reducedMotion]
  )

  useEffect(() => {
    registerController(key, { fillMock, fillDemo, submit, reveal })
    return () => unregisterController(key)
  }, [fillDemo, fillMock, key, registerController, reveal, submit, unregisterController])
}
