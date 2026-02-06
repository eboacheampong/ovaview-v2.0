'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  iconColor?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  iconColor = 'text-orange-500',
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl p-6 shadow-soft border border-gray-100 transition-all duration-300 hover:shadow-md',
        className
      )}
    >
      {/* Trend indicator in top right */}
      {trend && (
        <div
          className={cn(
            'absolute top-4 right-4 flex items-center gap-1 text-sm font-medium',
            trend.isPositive ? 'text-emerald-500' : 'text-red-500'
          )}
          data-testid="trend-indicator"
          data-trend-positive={trend.isPositive}
        >
          {trend.isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}

      {/* Icon */}
      <div className="mb-4">
        <div className={cn('inline-flex p-3 rounded-xl bg-orange-50', iconColor.replace('text-', 'bg-').replace('500', '50'))}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-800 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {/* Title */}
      <p className="text-sm font-medium text-gray-500">{title}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}
