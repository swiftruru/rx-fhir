import { useEffect, useState } from 'react'
import { useAppStore } from '../../app/stores/appStore'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getInitialValue(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

export function useReducedMotion(): boolean {
  const motionPreference = useAppStore((state) => state.motionPreference)
  const [systemReducedMotion, setSystemReducedMotion] = useState(getInitialValue)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const updatePreference = (event?: MediaQueryListEvent): void => {
      setSystemReducedMotion(event?.matches ?? mediaQuery.matches)
    }

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)

    return () => {
      mediaQuery.removeEventListener('change', updatePreference)
    }
  }, [])

  if (motionPreference === 'reduced') return true
  if (motionPreference === 'full') return false
  return systemReducedMotion
}
