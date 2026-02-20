'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart3, TrendingUp, TrendingDown, Download, Calendar,
  Newspaper, Radio, Tv, Globe, Users, Eye, Mail, FileText, RefreshCw,
  Search, ArrowUpRight, ArrowDownRight, Minus, PieChart, Presentation,
  Activity, Target, Zap, Award, Clock, MapPin, Hash, Layers, Share2,
  ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, XCircle, Loader2, Layout,
  Edit3, X, FileSpreadsheet, Printer
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts'
import type { AnalyticsData, CompetitorData } from '@/types/analytics'

type DateRange = '7d' | '30d' | '90d' | '12m'
type MediaFilter = 'all' | 'print' | 'radio' | 'tv' | 'web'

interface Client {
  id: string
  name: string
}

export default function AdvancedReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [showExportPanel, setShowExportPanel] = useState(false)

  const coverageTrendRef = useRef<HTMLDivElement>(null)
  const sentimentChartRef = useRef<HTMLDivElement>(null)
  const mediaDistributionRef = useRef<HTMLDivElement>(null)
  const radarChartRef = useRef<HTMLDivElement>(null)
  const hourlyEngagementRef = useRef<HTMLDivElement>(null)
  const shareOfVoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients')
        if (res.ok) { setClients(await res.json()) }
      } catch (error) { console.error('Failed to fetch clients:', error) }
    }
    fetchClients()
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const clientParam = clientFilter !== 'all' ? `&clientId=${clientFilter}` : ''
      const [analyticsRes, competitorRes] = await Promise.all([
    