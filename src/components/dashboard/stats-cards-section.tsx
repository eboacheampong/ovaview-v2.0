'use client'

import { SummaryCard } from './summary-card'
import { DistributionCard } from './distribution-card'

interface StatsCardsSectionProps {
  totalCoverage: number
  activeClients: number
  todayEntries: number
  tvCount: number
  radioCount: number
  printCount: number
  webCount: number
}

export function StatsCardsSection({
  totalCoverage,
  activeClients,
  todayEntries,
  tvCount,
  radioCount,
  printCount,
  webCount,
}: StatsCardsSectionProps) {
  const total = tvCount + radioCount + printCount + webCount
  
  const distributionItems = [
    { label: 'Web Media', percentage: total > 0 ? (webCount / total) * 100 : 0, count: webCount },
    { label: 'Print Media', percentage: total > 0 ? (printCount / total) * 100 : 0, count: printCount },
    { label: 'Radio', percentage: total > 0 ? (radioCount / total) * 100 : 0, count: radioCount },
    { label: 'Television', percentage: total > 0 ? (tvCount / total) * 100 : 0, count: tvCount },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Quick Overview - summary card on left */}
      <div className="md:col-span-1">
        <SummaryCard
          totalCoverage={totalCoverage}
          activeClients={activeClients}
          todayEntries={todayEntries}
          lastUpdated="5 mins ago"
        />
      </div>

      {/* Media Source Distribution - spans remaining columns on right */}
      <div className="md:col-span-1 lg:col-span-3">
        <DistributionCard items={distributionItems} total={total} />
      </div>
    </div>
  )
}
