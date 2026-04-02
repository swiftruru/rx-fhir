import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useFeatureShowcaseStore } from '../store/featureShowcaseStore'

const SPOTLIGHT_VIGNETTE_PADDING = 220
const SPOTLIGHT_OUTER_VIGNETTE = 360

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

export default function FeatureShowcaseOverlay(): React.JSX.Element | null {
  const reducedMotion = useReducedMotion()
  const status = useFeatureShowcaseStore((state) => state.status)
  const currentTargetId = useFeatureShowcaseStore((state) => state.currentTargetId)
  const targets = useFeatureShowcaseStore((state) => state.targets)
  const highlightStyle = useFeatureShowcaseStore((state) => state.currentHighlightStyle)
  const padding = useFeatureShowcaseStore((state) => state.currentSpotlightPadding)
  const [ringAnimationKey, setRingAnimationKey] = useState(0)

  const active = status === 'running' || status === 'paused' || status === 'completed'
  const target = currentTargetId ? targets[currentTargetId] : undefined

  const spotlight = useMemo(() => {
    if (!target) return undefined

    const inset = padding ?? 16
    const top = clamp(target.top - inset, 0, window.innerHeight)
    const left = clamp(target.left - inset, 0, window.innerWidth)
    const width = clamp(target.width + inset * 2, 0, window.innerWidth - left)
    const height = clamp(target.height + inset * 2, 0, window.innerHeight - top)

    return { top, left, width, height }
  }, [padding, target])

  useEffect(() => {
    if (!active || !currentTargetId || reducedMotion) return
    setRingAnimationKey((value) => value + 1)
  }, [active, currentTargetId, reducedMotion, spotlight?.top, spotlight?.left, spotlight?.width, spotlight?.height])

  if (!active || !spotlight) return null

  const ringClass =
    highlightStyle === 'pulse'
      ? `border-primary/80 shadow-[0_0_0_1px_rgba(244,114,182,0.22),0_0_32px_rgba(244,114,182,0.28)] ${reducedMotion ? '' : 'animate-pulse'}`
      : highlightStyle === 'focus'
        ? 'border-primary/90 shadow-[0_0_0_1px_rgba(244,114,182,0.26),0_0_40px_rgba(244,114,182,0.34)]'
        : 'border-primary/75 shadow-[0_0_0_1px_rgba(244,114,182,0.18),0_0_28px_rgba(244,114,182,0.24)]'

  const spotlightCenterX = spotlight.left + spotlight.width / 2
  const spotlightCenterY = spotlight.top + spotlight.height / 2
  const spotlightRadius = Math.max(spotlight.width, spotlight.height) / 2
  const innerVignetteRadius = spotlightRadius + SPOTLIGHT_VIGNETTE_PADDING
  const outerVignetteRadius = innerVignetteRadius + SPOTLIGHT_OUTER_VIGNETTE

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      <div
        className={`absolute rounded-2xl ${
          reducedMotion
            ? 'transition-[top,left,width,height,opacity] duration-200 ease-out'
            : 'transition-all duration-500 ease-out'
        }`}
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.56)'
        }}
      />

      <div
        className={`absolute inset-0 ${reducedMotion ? 'transition-opacity duration-200 ease-out' : 'transition-all duration-500 ease-out'}`}
        style={{
          background: `radial-gradient(circle at ${spotlightCenterX}px ${spotlightCenterY}px, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${innerVignetteRadius}px, rgba(0,0,0,0.08) ${innerVignetteRadius + 60}px, rgba(0,0,0,0.18) ${innerVignetteRadius + 140}px, rgba(0,0,0,0.30) ${innerVignetteRadius + 240}px, rgba(0,0,0,0.40) ${outerVignetteRadius}px, rgba(0,0,0,0.44) ${outerVignetteRadius + 80}px)`
        }}
      />

      <div
        key={reducedMotion ? 'feature-showcase-ring-static' : ringAnimationKey}
        className={`absolute rounded-2xl border-2 bg-white/4 ${
          reducedMotion
            ? 'transition-[top,left,width,height,opacity,box-shadow] duration-200 ease-out'
            : 'transition-all duration-500 ease-out'
        } ${ringClass}`}
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          ...(reducedMotion
            ? {}
            : { animation: 'feature-showcase-spotlight-shift 620ms cubic-bezier(0.22, 1, 0.36, 1)' })
        }}
      />
    </div>
  )
}
