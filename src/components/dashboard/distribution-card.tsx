'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface DistributionItem {
  label: string
  percentage: number
  count: number
}

interface DistributionCardProps {
  items: DistributionItem[]
  total: number
  isLoading?: boolean
  title?: string
}

type FilterOption = 'all' | 'today' | 'week' | 'month'

export function DistributionCard({ items, total, isLoading = false, title }: DistributionCardProps) {
  const [filter, setFilter] = useState<FilterOption>('all')
  
  // Sort by percentage descending
  const sortedItems = [...items].sort((a, b) => b.percentage - a.percentage)
  const maxPercentage = Math.max(...sortedItems.map(i => i.percentage), 1)
  
  // Round up to nearest 10 for clean scale
  const scaleMax = Math.ceil(maxPercentage / 10) * 10 || 100

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft border border-gray-100 h-full">
      {/* Header with title, total, and filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">{title || 'Media Source Distribution'}</h3>
          {isLoading ? (
            <div className="flex items-center gap-2 mt-1">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Loading...</span>
            </div>
          ) : (
            <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{total.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-gray-400">total</span></p>
          )}
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterOption)}
          className="text-xs sm:text-sm border border-gray-200 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-fit"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      
      {/* Chart area */}
      <div className="space-y-3 sm:space-y-4">
        {sortedItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-600 w-20 sm:w-24 shrink-0">{item.label}</span>
            <div className="flex-1 h-5 sm:h-7 bg-gray-100 rounded-full overflow-hidden">
              {isLoading ? (
                <div className="h-full bg-gray-200 rounded-full animate-pulse" style={{ width: '60%' }} />
              ) : (
                <div
                  className="h-full bg-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${(item.percentage / scaleMax) * 100}%` }}
                />
              )}
            </div>
            {!isLoading && (
              <span className="text-xs text-gray-500 w-10 text-right">{item.count}</span>
            )}
          </div>
        ))}
      </div>

      {/* Scale - aligned with bars */}
      <div className="flex mt-3 sm:mt-4 pl-[88px] sm:pl-28">
        <div className="flex-1 flex justify-between text-[10px] sm:text-xs text-gray-400 pr-12">
          <span>0%</span>
          <span>{Math.round(scaleMax / 4)}%</span>
          <span>{Math.round(scaleMax / 2)}%</span>
          <span>{Math.round((scaleMax * 3) / 4)}%</span>
          <span>{scaleMax}%</span>
        </div>
      </div>
    </div>
  )
}
