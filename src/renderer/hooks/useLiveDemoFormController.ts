import { useEffect, useMemo } from 'react'
import type { FieldValues, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form'
import type { LiveDemoControllerKey } from '../demo/types'
import { pressLiveDemoSubmit, revealLiveDemoForm } from '../lib/liveDemoDom'
import { useReducedMotion } from './useReducedMotion'
import { useLiveDemoStore } from '../store/liveDemoStore'

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
      const clicked = await pressLiveDemoSubmit(key, reducedMotion)
      if (clicked) return
      await handleSubmit(onSubmit)()
    },
    [handleSubmit, key, onSubmit, reducedMotion]
  )

  const reveal = useMemo(
    () => async () => {
      await revealLiveDemoForm(key, reducedMotion)
    },
    [key, reducedMotion]
  )

  useEffect(() => {
    registerController(key, { fillMock, fillDemo, submit, reveal })
    return () => unregisterController(key)
  }, [fillDemo, fillMock, key, registerController, reveal, submit, unregisterController])
}
