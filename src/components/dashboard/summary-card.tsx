'use client'

import { TrendingUp, Users, FileText, Clock, Loader2 } from 'lucide-react'

interface SummaryCardProps {
  totalCoverage: number
  activeClients: number
  todayEntries: number
  lastUpdated: string
  isLoading?: boolean
  hideClients?: boolean
  statsLabel?: string
}

export function SummaryCard({
  totalCoverage,
  activeClients,
  todayEntries,
  lastUpdated,
  isLoading = false,
  hideClients = false,
  statsLabel,
}: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft border border-gray-100 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-medium text-gray-500">
          {statsLabel ? `${statsLabel} Overview` : 'Quick Overview'}
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3 sm:space-y-4 flex-1">
        {/* Total Coverage */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-50 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
            </div>
            <span className="text-xs sm:text-sm text-gray-500">
              {statsLabel ? `Total ${statsLabel}` : 'Total Coverage'}
            </span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <span className="text-base sm:text-lg font-bold text-gray-800">{totalCoverage.toLocaleString()}</span>
          )}
        </div>

        {/* Active Clients - hidden for data entry users */}
        {!hideClients && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500">Active Clients</span>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <span className="text-base sm:text-lg font-bold text-gray-800">{activeClients}</span>
            )}
          </div>
        )}

        {/* Today's Entries */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </div>
            <span className="text-xs sm:text-sm text-gray-500">Today's Entries</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <span className="text-base sm:text-lg font-bold text-gray-800">+{todayEntries}</span>
          )}
        </div>
      </div>

      {/* Footer - Last Updated */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 flex items-center gap-2 text-[10px] sm:text-xs text-gray-400">
        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        <span>Updated {lastUpdated}</span>
      </div>
    </div>
  )
}
