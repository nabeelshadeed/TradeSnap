'use client'
import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  targetDate: string | Date
  expiredText?: string
  className?: string
}

export function CountdownTimer({ targetDate, expiredText = 'Expired', className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setTimeLeft(expiredText)
        return
      }
      const days = Math.floor(diff / 86_400_000)
      const hours = Math.floor((diff % 86_400_000) / 3_600_000)
      if (days > 0) setTimeLeft(`${days} day${days !== 1 ? 's' : ''} left`)
      else if (hours > 0) setTimeLeft(`${hours} hour${hours !== 1 ? 's' : ''} left`)
      else setTimeLeft('Less than 1 hour left')
    }

    tick()
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [targetDate, expiredText])

  return <span className={className}>{timeLeft}</span>
}
