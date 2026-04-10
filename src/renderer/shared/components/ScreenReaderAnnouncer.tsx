import { useEffect, useState } from 'react'
import { useAccessibilityStore } from '../stores/accessibilityStore'

export default function ScreenReaderAnnouncer(): React.JSX.Element {
  const politeAnnouncement = useAccessibilityStore((state) => state.politeAnnouncement)
  const assertiveAnnouncement = useAccessibilityStore((state) => state.assertiveAnnouncement)
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  useEffect(() => {
    if (!politeAnnouncement) return

    setPoliteMessage('')
    const timeoutId = window.setTimeout(() => {
      setPoliteMessage(politeAnnouncement.message)
    }, 20)

    return () => window.clearTimeout(timeoutId)
  }, [politeAnnouncement])

  useEffect(() => {
    if (!assertiveAnnouncement) return

    setAssertiveMessage('')
    const timeoutId = window.setTimeout(() => {
      setAssertiveMessage(assertiveAnnouncement.message)
    }, 20)

    return () => window.clearTimeout(timeoutId)
  }, [assertiveAnnouncement])

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </>
  )
}
