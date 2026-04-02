import { useEffect, useLayoutEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useFeatureShowcaseStore } from '../store/featureShowcaseStore'
import type { FeatureShowcaseTargetId } from '../showcase/types'
import { cn } from '../lib/utils'

interface FeatureShowcaseTargetProps {
  id: FeatureShowcaseTargetId
  className?: string
  children: React.ReactNode
}

export default function FeatureShowcaseTarget({
  id,
  className,
  children
}: FeatureShowcaseTargetProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  const reducedMotion = useReducedMotion()
  const status = useFeatureShowcaseStore((state) => state.status)
  const currentTargetId = useFeatureShowcaseStore((state) => state.currentTargetId)
  const registerTarget = useFeatureShowcaseStore((state) => state.registerTarget)
  const unregisterTarget = useFeatureShowcaseStore((state) => state.unregisterTarget)
  const isActiveTarget =
    (status === 'running' || status === 'paused' || status === 'completed') &&
    currentTargetId === id

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const updateRect = (): void => {
      const rect = element.getBoundingClientRect()
      registerTarget(id, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      })
    }

    updateRect()

    const observer = new ResizeObserver(() => updateRect())
    observer.observe(element)

    const handleWindowUpdate = (): void => updateRect()
    window.addEventListener('resize', handleWindowUpdate)
    window.addEventListener('scroll', handleWindowUpdate, true)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleWindowUpdate)
      window.removeEventListener('scroll', handleWindowUpdate, true)
      unregisterTarget(id)
    }
  }, [id, registerTarget, unregisterTarget])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const element = ref.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      registerTarget(id, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  })

  return (
    <div
      ref={ref}
      data-feature-showcase-target={id}
      className={cn(
        reducedMotion
          ? 'transition-[box-shadow,filter,border-radius] duration-200 ease-out will-change-auto'
          : 'transition-[transform,filter,box-shadow,border-radius] duration-500 ease-out will-change-transform',
        isActiveTarget &&
          (reducedMotion
            ? 'relative z-[45] rounded-[1.15rem] brightness-[1.03] saturate-[1.03] shadow-[0_12px_32px_rgba(15,23,42,0.14)]'
            : 'relative z-[45] -translate-y-0.5 rounded-[1.15rem] brightness-[1.03] saturate-[1.03] shadow-[0_18px_42px_rgba(15,23,42,0.16)]'),
        className
      )}
    >
      {children}
    </div>
  )
}
