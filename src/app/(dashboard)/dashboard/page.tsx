'use client'

import { useState, useEffect } from 'react'
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

interface DashboardStats {
  totalCoverage: number
  activeClients: number
  todayEntries: number
  webCount: number
  printCount: number
  radioCount: number
  tvCount: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCoverage: 0,
    activeClients: 0,
    todayEntries: 0,
    webCount: 0,
    printCount: 0,
    radioCount: 0,
    tvCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const mediaTypes = [
    {
      id: 'print',
      title: 'Print Media',
      icon: Newspaper,
      href: '/media/print',
      accentColor: 'blue',
    },
    {
      id: 'radio',
      title: 'Radio',
      icon: Radio,
      href: '/media/radio',
      accentColor: 'emerald',
    },
    {
      id: 'tv',
      title: 'Television',
      icon: Tv,
      href: '/media/tv',
      accentColor: 'violet',
    },
    {
      id: 'web',
      title: 'Web Media',
      icon: Globe,
      href: '/media/web',
      accentColor: 'cyan',
    },
    {
      id: 'ads',
      title: 'Advertisements',
      icon: Megaphone,
      href: '/ads',
      accentColor: 'pink',
    },
    {
      id: 'tenders',
      title: 'Tenders',
      icon: FileText,
      href: '/tenders',
      accentColor: 'amber',
    },
  ]

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
        totalCoverage={stats.totalCoverage}
        activeClients={stats.activeClients}
        todayEntries={stats.todayEntries}
        tvCount={stats.tvCount}
        radioCount={stats.radioCount}
        printCount={stats.printCount}
        webCount={stats.webCount}
        isLoading={isLoading}
      />
    </div>
  )
}
