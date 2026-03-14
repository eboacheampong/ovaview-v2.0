'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'

export interface Mention {
  id: string
  type: string
  title: string
  source: string
  sourceUrl?: string
  slug?: string
  author: string
  date: string
  summary: string
  sentiment: string
  reach: number
  platform?: string
  engagement?: number
  keywords?: string
  keyPersonalities?: string
}

export interface DashboardSummary {
  totalMentions: number
  positive: number
  negative: number
  neutral: number
  totalReach: number
  totalInteractions: number
}

export interface ChartPoint {
  date: string
  mentions: number
  reach: number
}

export interface ClientDashboardData {
  client: { name: string; logoUrl: string | null }
  summary: DashboardSummary
  sourceCounts: Record<string, number>
  chart: ChartPoint[]
  mentions: Mention[]
}

export function useClientDashboard(days: number = 30) {
  const { user, isLoading: authLoading } = useAuth()
  const clientId = user?.clientId
  const [data, setData] = useState<ClientDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!clientId) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/client-dashboard?clientId=${clientId}&days=${days}`)
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error('Failed to fetch client dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }, [clientId, days])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, isLoading: authLoading || isLoading, clientId, user }
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export const SOURCE_LABELS: Record<string, string> = {
  Web: 'News', Tv: 'Television', Radio: 'Radio', Print: 'Print',
  TWITTER: 'Twitter/X', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn', TIKTOK: 'TikTok',
}

export const SENTIMENT_COLORS = {
  positive: { bg: 'bg-emerald-100', text: 'text-emerald-700', hex: '#10b981' },
  negative: { bg: 'bg-red-100', text: 'text-red-700', hex: '#ef4444' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-600', hex: '#6b7280' },
}
