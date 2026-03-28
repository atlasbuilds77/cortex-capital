import { useEffect, useRef, useState } from 'react'

interface UseAnimatedNumberOptions {
  duration?: number
  decimals?: number
  easing?: (t: number) => number
}

// Easing functions
const easings = {
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutQuad: (t: number) => t * (2 - t),
  linear: (t: number) => t,
}

export function useAnimatedNumber(
  target: number,
  { duration = 1000, decimals = 2, easing = easings.easeOutExpo }: UseAnimatedNumberOptions = {}
) {
  const [displayValue, setDisplayValue] = useState(target)
  const prevTargetRef = useRef(target)
  const rafRef = useRef<number>()

  useEffect(() => {
    // Only animate if value actually changed
    if (prevTargetRef.current === target) return

    const startValue = displayValue
    const startTime = performance.now()
    const diff = target - startValue

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const easedProgress = easing(progress)
      const newValue = startValue + diff * easedProgress

      setDisplayValue(parseFloat(newValue.toFixed(decimals)))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(target)
        prevTargetRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [target, duration, decimals, easing, displayValue])

  return displayValue
}
