'use client'

import { 
  Newspaper, 
  Radio, 
  Tv, 
  Globe, 
  Megaphone, 
  FileText,
} from 'lucide-react'
import { StatsCardsSection } from '@/components/dashboard/stats-cards-section'
import { MediaTypeCard } from '@/components/dashboard/media-type-card'

interface MediaTypeConfig {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  href: string
  accentColor: string
}

// Mock data - will be replaced with API calls
const mediaTypes: MediaTypeConfig[] = [
  {
    id: 'print',
    title: 'Print Media',
    icon: Newspaper,
    count: 245,
    href: '/media/print',
    accentColor: 'blue',
  },
  {
    id: 'radio',
    title: 'Radio',
    icon: Radio,
    count: 128,
    href: '/media/radio',
    accentColor: 'emerald',
  },
  {
    id: 'tv',
    title: 'Television',
    icon: Tv,
    count: 89,
    href: '/media/tv',
    accentColor: 'violet',
  },
  {
    id: 'web',
    title: 'Web Media',
    icon: Globe,
    count: 312,
    href: '/media/web',
    accentColor: 'cyan',
  },
  {
    id: 'ads',
    title: 'Advertisements',
    icon: Megaphone,
    count: 56,
    href: '/ads',
    accentColor: 'pink',
  },
  {
    id: 'tenders',
    title: 'Tenders',
    icon: FileText,
    count: 34,
    href: '/tenders',
    accentColor: 'amber',
  },
]

export default function DashboardPage() {
  // Get counts for distribution (only TV, Radio, Print, Web)
  const tvCount = mediaTypes.find(m => m.id === 'tv')?.count || 0
  const radioCount = mediaTypes.find(m => m.id === 'radio')?.count || 0
  const printCount = mediaTypes.find(m => m.id === 'print')?.count || 0
  const webCount = mediaTypes.find(m => m.id === 'web')?.count || 0
  const totalCoverage = mediaTypes.reduce((acc, m) => acc + m.count, 0)

  return (
    <div className="p-4 sm:p-5 lg:p-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>

      {/* Media Type Cards - moved to top */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-4 lg:mb-6">
        {mediaTypes.map((card) => (
          <MediaTypeCard
            key={card.id}
            id={card.id}
            title={card.title}
            icon={card.icon}
            href={card.href}
            accentColor={card.accentColor}
          />
        ))}
      </div>

      {/* Stats Cards Section */}
      <StatsCardsSection
        totalCoverage={totalCoverage}
        activeClients={24}
        todayEntries={47}
        tvCount={tvCount}
        radioCount={radioCount}
        printCount={printCount}
        webCount={webCount}
      />
    </div>
  )
}
