'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  FileBarChart, BarChart3, Brain, Calendar, ArrowRight, Newspaper,
  Eye, RefreshCw, Loader2, Clock
} from 'lucide-react'

const reportTypes = [
  {
    title: 'Advanced Analytics',
    description: 'Comprehensive media monitoring insights with interactive charts and KPIs',
    icon: BarChart3,
    href: '/reports/advanced',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-500',
    features: ['Coverage Trends', 'Sentiment Analysis', 'Share of Voice', 'Competitor Comparison'],
  },
  {
    title: 'AI Insights',
    description: 'AI-powered analysis with detailed insights, trends, and strategic recommendations',
    icon: Brain,
    href: '/reports/ai-insights',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    features: ['AI Analysis', 'Trend Detection', 'Recommendations', 'Custom Date Range'],
  },
  {
    title: 'Media Insights',
    description: 'Detailed media coverage breakdown with stats, sentiment, sources, and top mentions',
    icon: Newspaper,
    href: '/reports/media-insights',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Media Breakdown', 'Sentiment Score', 'Source Distribution', 'Custom Date Range'],
  },
  {
    title: 'Scheduled Reports',
    description: 'View and manage automated daily, weekly, and monthly report schedules for all clients',
    icon: Calendar,
    href: '/reports/scheduled',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Daily Updates', 'Weekly Media & AI', 'Monthly AI Insights', 'Email Delivery'],
  },
]

interface SentReport {
  id: string
  clientId: string
  clientName: string
  reportType: string
  subject: string
  recipients: string
  dateRangeStart: string | null
  dateRangeEnd: string | null
  emailsSent: number
  sentAt: string
  expiresAt: string
}

const typeLabels: Record<string, { label: string; color: string }> = {
  daily: { label: 'Daily Update', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  weekly: { label: 'Weekly Media & AI', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  monthly: { label: 'Monthly AI Insights', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  custom_ai: { label: 'AI Insights (Custom)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  custom_media: { label: 'Media Insights (Custom)', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hrs > 0) return `${hrs}h ${mins}m left`
  return `${mins}m left`
}

export default function ReportsPage() {
  const [sentReports, setSentReports] = useState<SentReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [resendingId, setResendingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSentReports()
    // Refresh every 60s to update time-ago and expiry
    const interval = setInterval(fetchSentReports, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchSentReports = async () => {
    try {
      const res = await fetch('/api/reports/sent')
      if (res.ok) setSentReports(await res.json())
    } catch {}
    finally { setLoadingReports(false) }
  }

  const handleResend = async (id: string) => {
    setResendingId(id)
    try {
      const res = await fetch(`/api/reports/sent/${id}/resend`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`Report resent to ${data.emailsSent} recipient(s)`)
        fetchSentReports()
      } else {
        alert(`Failed: ${data.error || 'Unknown error'}`)
      }
    } catch { alert('Network error') }
    finally { setResendingId(null) }
  }

  const getViewUrl = (report: SentReport) => {
    if (report.reportType === 'monthly' || report.reportType === 'custom_ai') {
      return `/reports/ai-insights?view=${report.id}`
    }
    if (report.reportType === 'weekly' || report.reportType === 'custom_media') {
      return `/reports/media-insights?view=${report.id}`
    }
    return null // daily reports don't have a view page
  }

  return (
    <div className="p-4 sm:p-6 animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <FileBarChart className="h-6 w-6" />
            </div>
            Reports
          </h1>
          <p className="text-gray-500 mt-1">Generate, schedule, and manage media monitoring reports</p>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {reportTypes.map((report, index) => (
          <Card key={index} className="glass-card hover-lift group overflow-hidden">
            <CardContent className="p-0">
              <div className={`h-2 bg-gradient-to-r ${report.gradient}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-${report.color}-100 group-hover:bg-${report.color}-200 transition-colors`}>
                    <report.icon className={`h-6 w-6 text-${report.color}-600`} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{report.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{report.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {report.features.map((feature, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
                <Link href={report.href}>
                  <Button className={`w-full bg-gradient-to-r ${report.gradient} hover:opacity-90 gap-2 text-white`}>
                    Open <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sent Reports Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recently Sent Reports</CardTitle>
              <CardDescription>Reports sent in the last 24 hours — view or resend without regenerating</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchSentReports} className="gap-1">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : sentReports.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No reports sent in the last 24 hours
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Client</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Sent</th>
                    <th className="pb-3 pr-4">Expires</th>
                    <th className="pb-3 pr-4">Recipients</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sentReports.map(report => {
                    const typeInfo = typeLabels[report.reportType] || { label: report.reportType, color: 'bg-gray-100 text-gray-600 border-gray-200' }
                    const viewUrl = getViewUrl(report)
                    const expired = new Date(report.expiresAt) <= new Date()

                    return (
                      <tr key={report.id} className={`border-b last:border-0 ${expired ? 'opacity-50' : ''}`}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-orange-600 font-bold text-xs">{report.clientName.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[150px]">{report.clientName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                          {timeAgo(report.sentAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs flex items-center gap-1 ${expired ? 'text-red-400' : 'text-gray-400'}`}>
                            <Clock className="h-3 w-3" />
                            {timeLeft(report.expiresAt)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500 text-xs truncate max-w-[180px]">
                          {report.emailsSent} sent · {report.recipients}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {viewUrl && !expired && (
                              <Link href={viewUrl}>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            )}
                            {!expired && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleResend(report.id)}
                                disabled={resendingId === report.id}
                              >
                                {resendingId === report.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <RefreshCw className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
