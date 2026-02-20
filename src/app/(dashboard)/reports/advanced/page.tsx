'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3, TrendingUp, TrendingDown, Download, Newspaper, Radio, Tv, Globe,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Presentation, Loader2, Layout, X, Eye
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import type { AnalyticsData, CompetitorData } from '@/types/analytics'

type DateRange = '7d' | '30d' | '90d' | '12m'
type MediaFilter = 'all' | 'print' | 'radio' | 'tv' | 'web'

interface Client {
  id: string
  name: string
}

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899']

export default function AdvancedReportsPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [showExportPanel, setShowExportPanel] = useState(false)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients')
        if (res.ok) setClients(await res.json())
      } catch (error) { console.error('Failed to fetch clients:', error) }
    }
    fetchClients()
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const clientParam = clientFilter !== 'all' ? `&clientId=${clientFilter}` : ''
      const res = await fetch(`/api/reports/analytics?dateRange=${dateRange}&mediaFilter=${mediaFilter}${clientParam}`)
      if (res.ok) setAnalyticsData(await res.json())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }, [dateRange, mediaFilter, clientFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const kpi = analyticsData?.kpiData

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) return <span className="flex items-center text-xs text-green-600"><ArrowUpRight className="h-3 w-3" />{value}%</span>
    if (value < 0) return <span className="flex items-center text-xs text-red-600"><ArrowDownRight className="h-3 w-3" />{Math.abs(value)}%</span>
    return <span className="flex items-center text-xs text-gray-400"><Minus className="h-3 w-3" />0%</span>
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            Advanced Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white">
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)} className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">Last 12 Months</option>
          </select>
          <select value={mediaFilter} onChange={e => setMediaFilter(e.target.value as MediaFilter)} className="h-9 text-sm rounded-lg border border-gray-200 px-3 bg-white">
            <option value="all">All Media</option>
            <option value="web">Web</option>
            <option value="print">Print</option>
            <option value="radio">Radio</option>
            <option value="tv">TV</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/reports/builder')}>
              <Layout className="h-4 w-4 mr-1.5" />Report Builder
            </Button>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowExportPanel(true)}>
              <Download className="h-4 w-4 mr-1.5" />Export
            </Button>
          </div>
        </div>
      </div>

      {/* Export Panel */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowExportPanel(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Export</h2>
              <button onClick={() => setShowExportPanel(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => { setShowExportPanel(false); router.push('/reports/builder') }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all text-left"
              >
                <div className="p-2 bg-orange-100 rounded-lg"><Layout className="h-5 w-5 text-orange-600" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Report Builder</p>
                  <p className="text-xs text-gray-400">Custom slide-based report</p>
                </div>
              </button>
              {clientFilter !== 'all' && (
                <button
                  onClick={() => { setShowExportPanel(false); router.push(`/reports/pr-preview?clientId=${clientFilter}&dateRange=${dateRange}`) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-50 transition-all text-left"
                >
                  <div className="p-2 bg-orange-100 rounded-lg"><Eye className="h-5 w-5 text-orange-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">PR Presence Report</p>
                    <p className="text-xs text-gray-400">Preview & download PPTX/PDF</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Coverage', value: kpi?.totalCoverage?.toLocaleString() || '0', change: kpi?.coverageChange || 0, icon: BarChart3, color: 'orange' },
              { label: 'Media Reach', value: kpi?.totalReach || '0', change: kpi?.reachChange || 0, icon: Globe, color: 'blue' },
              { label: 'Avg Sentiment', value: `${kpi?.avgSentiment || 0}%`, change: kpi?.sentimentChange || 0, icon: TrendingUp, color: 'emerald' },
              { label: 'Active Clients', value: kpi?.activeClients?.toString() || '0', change: 0, icon: Newspaper, color: 'violet' },
            ].map((item, i) => (
              <Card key={i} className="bg-white border border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">{item.value}</p>
                      <ChangeIndicator value={item.change} />
                    </div>
                    <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                      <item.icon className={`h-5 w-5 text-${item.color}-600`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Media Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Web', count: kpi?.webCount || 0, icon: Globe, color: '#06b6d4' },
              { label: 'Print', count: kpi?.printCount || 0, icon: Newspaper, color: '#3b82f6' },
              { label: 'Radio', count: kpi?.radioCount || 0, icon: Radio, color: '#10b981' },
              { label: 'TV', count: kpi?.tvCount || 0, icon: Tv, color: '#8b5cf6' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800">{item.count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coverage Trend */}
            <Card className="lg:col-span-2 bg-white border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Coverage Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData?.coverageTrendData || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" fontSize={11} tick={{ fill: '#6b7280' }} />
                      <YAxis fontSize={11} tick={{ fill: '#6b7280' }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="web" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="Web" />
                      <Area type="monotone" dataKey="print" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Print" />
                      <Area type="monotone" dataKey="radio" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Radio" />
                      <Area type="monotone" dataKey="tv" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="TV" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment */}
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={analyticsData?.sentimentData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, value }) => `${name} ${value}%`} fontSize={11}>
                        {(analyticsData?.sentimentData || []).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Media Distribution */}
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Media Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.mediaDistributionData || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" fontSize={11} tick={{ fill: '#6b7280' }} />
                      <YAxis fontSize={11} tick={{ fill: '#6b7280' }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50} label={{ position: 'top', fontSize: 10, fill: '#374151' }}>
                        {(analyticsData?.mediaDistributionData || []).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Publications */}
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Top Publications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData?.topPublicationsData || []).slice(0, 5).map((pub, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{pub.name}</p>
                        <p className="text-xs text-gray-400">{pub.type} · Reach: {pub.reach}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{pub.stories}</span>
                    </div>
                  ))}
                  {(!analyticsData?.topPublicationsData?.length) && (
                    <p className="text-sm text-gray-400 text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Keywords & Journalists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Trending Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(analyticsData?.topKeywordsData || []).map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700">
                      {kw.keyword}
                      <span className="text-xs font-bold text-orange-500">{kw.count}</span>
                    </span>
                  ))}
                  {(!analyticsData?.topKeywordsData?.length) && (
                    <p className="text-sm text-gray-400">No keywords data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Top Journalists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData?.journalistData || []).map((j, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{j.name}</p>
                        <p className="text-xs text-gray-400">{j.outlet}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{j.articles}</span>
                    </div>
                  ))}
                  {(!analyticsData?.journalistData?.length) && (
                    <p className="text-sm text-gray-400 text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
