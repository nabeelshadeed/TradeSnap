interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  colour?: string
  className?: string
}

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  colour = '#f97316',
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className={className}>
      <circle
        stroke="#e5e7eb"
        fill="none"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={colour}
        fill="none"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}
