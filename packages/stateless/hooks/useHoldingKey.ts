import { useEffect, useRef, useState } from 'react'

export type UseHoldingKeyOptions = {
  /**
   * The key to check.
   */
  key: 'alt' | 'shift' | 'ctrl' | 'meta'
}

/**
 * A hook that returns a boolean whether or not a key is being held.
 */
export const useHoldingKey = ({ key }: UseHoldingKeyOptions): boolean => {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Detect key.
  useEffect(() => {
    const handleEvent = (event: MouseEvent | KeyboardEvent | TouchEvent) => {
      // Cancel active timer, potentially restarting it below.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }

      const holding =
        key === 'alt'
          ? event.altKey
          : key === 'shift'
            ? event.shiftKey
            : key === 'ctrl'
              ? event.ctrlKey
              : key === 'meta'
                ? event.metaKey
                : false

      setHolding(holding)

      // Start timer to unset holding after 10 seconds. This will restart each
      // time one of the events are triggered if the key is still held, which is
      // hopefully often enough to prevent false positives. False positives
      // occur when window switching or other behavior disrupts the expected
      // ordering/execution of events.
      if (holding) {
        timerRef.current = window.setTimeout(() => {
          setHolding(false)
          timerRef.current = null
        }, 10 * 1000)
      }
    }

    // Listen on mouse and touch events since sometimes
    document.addEventListener('keydown', handleEvent)
    document.addEventListener('keyup', handleEvent)
    document.addEventListener('mousemove', handleEvent)
    document.addEventListener('touchmove', handleEvent)
    return () => {
      document.removeEventListener('keydown', handleEvent)
      document.removeEventListener('keyup', handleEvent)
      document.removeEventListener('mousemove', handleEvent)
      document.removeEventListener('touchmove', handleEvent)
    }
  }, [key])

  return holding
}
