import { useEffect, useMemo } from 'react'
import type { FieldValues, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form'
import type { LiveDemoControllerKey } from '../demo/types'
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

  const submit = useMemo(
    () => async () => {
      await handleSubmit(onSubmit)()
    },
    [handleSubmit, onSubmit]
  )

  useEffect(() => {
    registerController(key, { fillMock, fillDemo, submit })
    return () => unregisterController(key)
  }, [fillDemo, fillMock, key, registerController, submit, unregisterController])
}
