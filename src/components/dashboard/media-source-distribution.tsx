'use client'

import { Tv, Radio, Newspaper, Globe } from 'lucide-react'
import { DistributionBar } from './distribution-bar'

interface MediaSource {
  id: 'tv' | 'radio' | 'print' | 'web'
  label: string
  count: number
  color: string
  icon: React.ComponentType<{ className?: string }>
}

interface MediaSourceDistributionProps {
  tvCount: number
  radioCount: number
  printCount: number
  webCount: number
}

const sourceConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  tv: { label: 'Television', color: 'violet', icon: Tv },
  radio: { label: 'Radio', color: 'emerald', icon: Radio },
  print: { label: 'Print Media', color: 'blue', icon: Newspaper },
  web: { label: 'Web Media', color: 'cyan', icon: Globe },
}

export function MediaSourceDistribution({
  tvCount,
  radioCount,
  printCount,
  webCount,
}: MediaSourceDistributionProps) {
  const total = tvCount + radioCount + printCount + webCount

  // Build sources array with percentages
  const sources: MediaSource[] = [
    { id: 'tv', count: tvCount, ...sourceConfig.tv },
    { id: 'radio', count: radioCount, ...sourceConfig.radio },
    { id: 'print', count: printCount, ...sourceConfig.print },
    { id: 'web', count: webCount, ...sourceConfig.web },
  ]

  // Sort by percentage (count) descending
  const sortedSources = [...sources].sort((a, b) => b.count - a.count)

  // Calculate percentages
  const sourcesWithPercentage = sortedSources.map(source => ({
    ...source,
    percentage: total > 0 ? (source.count / total) * 100 : 0,
  }))

  return (
    <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Media Source Distribution</h3>
      
      <div className="space-y-1">
        {sourcesWithPercentage.map(source => (
          <DistributionBar
            key={source.id}
            label={source.label}
            percentage={source.percentage}
            count={source.count}
            color={source.color}
            icon={source.icon}
          />
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Total Coverage</span>
        <span className="text-lg font-bold text-gray-800">{total.toLocaleString()}</span>
      </div>
    </div>
  )
}
