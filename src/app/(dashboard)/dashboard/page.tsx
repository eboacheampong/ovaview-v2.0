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
import { useAuth } from '@/hooks/use-auth'

interface DashboardStats {
  totalCoverage: number
  activeClients: number
  todayEntries: number
  webCount: number
  printCount: number
  radioCount: number
  tvCount: number
  isDataEntryView?: boolean
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const isDataEntry = user?.role === 'data_entry'
  
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
        const params = new URLSearchParams()
        if (user?.id) params.set('userId', user.id)
        if (user?.role) params.set('role', user.role)
        
        const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
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
    if (user) fetchStats()
  }, [user])

  // Media types available for data entry users (no ads/tenders)
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
    ...(isAdmin ? [
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
    ] : []),
  ]

  return (
    <div className="p-4 sm:p-5 lg:p-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
          {isDataEntry ? 'My Dashboard' : 'Dashboard'}
        </h1>
        {isDataEntry && (
          <p className="text-sm text-gray-500 mt-1">Your media entry statistics</p>
        )}
      </div>

      {/* Media Type Cards - moved to top */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${isAdmin ? 'md:grid-cols-6' : 'md:grid-cols-4'} gap-3 sm:gap-4 mb-4 lg:mb-6`}>
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
        hideClients={isDataEntry}
        statsLabel={isDataEntry ? 'My Entries' : undefined}
      />
    </div>
  )
}
