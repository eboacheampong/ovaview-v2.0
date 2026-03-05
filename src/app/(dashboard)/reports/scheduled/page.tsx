'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Mail, ArrowLeft, Bell, Send, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Client { id: string; name: string; email: string | null }

interface NotificationSetting {
  id: string
  clientId: string
  notificationTime: string
  timezone: string
  isActive: boolean
  emailEnabled: boolean
  lastSentAt: string | null
  client: Client
}

export default function ScheduledReportsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendType, setSendType] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/notification-settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSendReport = async (settingId: string, reportType: 'weekly' | 'monthly') => {
    setSendingId(settingId)
    setSendType(reportType)
    try {
      const res = await fetch(`/api/notification-settings/${settingId}/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType }),
      })
      const data = await res.json()
      if (data.success && data.emailsSent > 0) {
        alert(`${reportType === 'weekly' ? 'Weekly Media & AI' : 'Monthly AI Insights'} report sent successfully!`)
      } else {
        alert(`Failed: ${data.error || 'Unknown error'}`)
      }
    } catch {
      alert('Network error sending report')
    } finally {
      setSendingId(null)
      setSendType(null)
    }
  }

  const activeSettings = settings.filter(s => s.isActive)
  const inactiveSettings = settings.filter(s => !s.isActive)

  return (
    <div className="p-4 sm:p-6 animate-fadeIn max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Reports</Button></Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Scheduled Reports</h1>
            <p className="text-gray-500 text-sm">View and manage automated report schedules for all clients</p>
          </div>
        </div>
        <Link href="/notifications">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bell className="h-4 w-4" /> Manage Notifications <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Schedule Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Daily Updates</div>
            <p className="text-sm text-gray-600">Media updates sent at each client&apos;s configured notification time</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" /> Per client schedule
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Weekly Media & AI</div>
            <p className="text-sm text-gray-600">Comprehensive weekly report with stats, sentiment, and AI summary</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" /> Sundays at 6 PM
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1">Monthly AI Insights</div>
            <p className="text-sm text-gray-600">AI-focused report with insights, trends, and strategic recommendations</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" /> 1st of month at 6 PM
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No notification schedules configured yet.</p>
            <Link href="/notifications">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                <Bell className="h-4 w-4" /> Set Up Notifications
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Schedules */}
          {activeSettings.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Active Schedules ({activeSettings.length})
              </h2>
              <div className="space-y-3">
                {activeSettings.map(s => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-600 font-bold text-sm">{s.client.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{s.client.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.notificationTime} {s.timezone}</span>
                              {s.emailEnabled && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>}
                              {s.lastSentAt && <span>Last: {new Date(s.lastSentAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 text-xs">Active</Badge>
                          <Button size="sm" variant="outline"
                            disabled={sendingId === s.id && sendType === 'weekly'}
                            onClick={() => handleSendReport(s.id, 'weekly')}
                            className="text-xs gap-1 h-8">
                            {sendingId === s.id && sendType === 'weekly' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Weekly
                          </Button>
                          <Button size="sm" variant="outline"
                            disabled={sendingId === s.id && sendType === 'monthly'}
                            onClick={() => handleSendReport(s.id, 'monthly')}
                            className="text-xs gap-1 h-8">
                            {sendingId === s.id && sendType === 'monthly' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Monthly
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Schedules */}
          {inactiveSettings.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Inactive Schedules ({inactiveSettings.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {inactiveSettings.map(s => (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 font-bold text-sm">{s.client.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-600">{s.client.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.notificationTime} {s.timezone}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-500 text-xs">Inactive</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
