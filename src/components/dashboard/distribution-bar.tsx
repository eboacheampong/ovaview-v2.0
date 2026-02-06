'use client'

import { cn } from '@/lib/utils'

interface DistributionBarProps {
  label: string
  percentage: number
  count: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}

const colorStyles: Record<string, { bg: string; text: string; bar: string }> = {
  violet: { bg: 'bg-violet-50', text: 'text-violet-500', bar: 'bg-violet-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', bar: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', bar: 'bg-blue-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-500', bar: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500', bar: 'bg-orange-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-500', bar: 'bg-pink-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500', bar: 'bg-amber-500' },
}

export function DistributionBar({
  label,
  percentage,
  count,
  color,
  icon: Icon,
}: DistributionBarProps) {
  // Clamp percentage to 0-100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))
  const styles = colorStyles[color] || colorStyles.orange

  return (
    <div className="group flex items-center gap-4 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
      {/* Icon */}
      <div className={cn('p-2 rounded-lg', styles.bg)}>
        <Icon className={cn('h-4 w-4', styles.text)} />
      </div>

      {/* Label and Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-semibold text-gray-800">{clampedPercentage.toFixed(0)}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
      </div>

      {/* Count */}
      <div className="text-right min-w-[60px]">
        <span className="text-sm font-medium text-gray-500">{count.toLocaleString()}</span>
      </div>
    </div>
  )
}
