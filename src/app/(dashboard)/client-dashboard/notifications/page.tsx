'use client'

import { useState, useEffect } from 'react'
import { Bell, Clock, Calendar, Save, Loader2, Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'

const TIMEZONES = [
  { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
  { value: 'Africa/Harare', label: 'Africa/Harare (CAT, GMT+2)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST, GMT+2)' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT, GMT+1)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT, GMT+3)' },
  { value: 'UTC', label: 'UTC' },
]

const QUICK_TIMES = [
  { value: '06:00', label: '6 AM' },
  { value: '08:00', label: '8 AM' },
  { value: '09:00', label: '9 AM' },
  { value: '12:00', label: '12 PM' },
  { value: '14:00', label: '2 PM' },
  { value: '17:00', label: '5 PM' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface NotificationSettings {
  exists: boolean
  notificationTime?: string
  timezone?: string
  weeklyDay?: number
  weeklyTime?: string
  monthlyDay?: number
  monthlyTime?: string
  weeklyEnabled?: boolean
  monthlyEnabled?: boolean
  isActive?: boolean
  emailEnabled?: boolean
}

export default function ClientNotificationsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [dailyTimes, setDailyTimes] = useState<string[]>(['08:00'])
  const [timezone, setTimezone] = useState('GMT')
  const [weeklyDay, setWeeklyDay] = useState(0)
  const [weeklyTime, setWeeklyTime] = useState('18:00')
  const [monthlyDay, setMonthlyDay] = useState(31)
  const [monthlyTime, setMonthlyTime] = useState('18:00')
  const [weeklyEnabled, setWeeklyEnabled] = useState(true)
  const [monthlyEnabled, setMonthlyEnabled] = useState(true)

  useEffect(() => {
    if (!user?.clientId) return
    fetchSettings()
  }, [user?.clientId])

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/client-notification-settings?clientId=${user?.clientId}`)
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        if (data.exists) {
          const times = (data.notificationTime || '08:00').split(',').map((t: string) => t.trim()).filter(Boolean)
          setDailyTimes(times.length > 0 ? times : ['08:00'])
          setTimezone(data.timezone || 'GMT')
          setWeeklyDay(data.weeklyDay ?? 0)
          setWeeklyTime(data.weeklyTime || '18:00')
          setMonthlyDay(data.monthlyDay ?? 31)
          setMonthlyTime(data.monthlyTime || '18:00')
          setWeeklyEnabled(data.weeklyEnabled ?? true)
          setMonthlyEnabled(data.monthlyEnabled ?? true)
        }
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.clientId) return
    setIsSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/client-notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user.clientId,
          notificationTime: dailyTimes.filter(Boolean).join(','),
          timezone,
          weeklyDay,
          weeklyTime,
          monthlyDay,
          monthlyTime,
          weeklyEnabled,
          monthlyEnabled,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const addDailyTime = () => {
    setDailyTimes(prev => [...prev, '12:00'])
  }

  const removeDailyTime = (index: number) => {
    if (dailyTimes.length <= 1) return
    setDailyTimes(prev => prev.filter((_, i) => i !== index))
  }

  const updateDailyTime = (index: number, value: string) => {
    setDailyTimes(prev => prev.map((t, i) => i === index ? value : t))
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!settings?.exists) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No Notification Settings</h2>
          <p className="text-gray-500">
            Notification settings have not been configured for your account yet. Please contact your administrator to set up notifications.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Bell className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Notification Preferences</h1>
            <p className="text-gray-500 text-sm">Customize when you receive media monitoring updates</p>
          </div>
        </div>

        {/* Status badges */}
        {!settings.isActive && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            Notifications are currently paused by your administrator.
          </div>
        )}
        {!settings.emailEnabled && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-sm">
            Email notifications are disabled. Contact your administrator to enable them.
          </div>
        )}

        <div className="space-y-6">
          {/* Daily Notifications */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-800">Daily Notifications</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Set one or more times to receive your daily media digest.</p>

            <div className="space-y-3">
              {dailyTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => updateDailyTime(index, e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {QUICK_TIMES.map((qt) => (
                        <button
                          key={qt.value}
                          type="button"
                          onClick={() => updateDailyTime(index, qt.value)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            time === qt.value
                              ? 'bg-orange-100 border-orange-300 text-orange-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {qt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {dailyTimes.length > 1 && (
                    <button
                      onClick={() => removeDailyTime(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove this time"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addDailyTime}
                className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 py-2"
              >
                <Plus className="h-4 w-4" /> Add another notification time
              </button>
            </div>
          </div>

          {/* Timezone */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <Label className="text-gray-700 font-medium">Timezone</Label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 mt-2 rounded-md border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {/* Weekly Report */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-800">Weekly Report</h2>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">AI</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyEnabled}
                  onChange={(e) => setWeeklyEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-600">Enabled</span>
              </label>
            </div>
            {weeklyEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Day of Week</Label>
                  <select
                    value={weeklyDay}
                    onChange={(e) => setWeeklyDay(parseInt(e.target.value))}
                    className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Time</Label>
                  <Input
                    type="time"
                    value={weeklyTime}
                    onChange={(e) => setWeeklyTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Monthly Report */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-800">Monthly Report</h2>
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">AI</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={monthlyEnabled}
                  onChange={(e) => setMonthlyEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-600">Enabled</span>
              </label>
            </div>
            {monthlyEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Day of Month</Label>
                  <select
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value))}
                    className="w-full h-10 mt-1 rounded-md border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d === 31 ? '31 (Last day)' : d}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Day 31 = last day of the month</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Time</Label>
                  <Input
                    type="time"
                    value={monthlyTime}
                    onChange={(e) => setMonthlyTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving || !settings.isActive}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : saved ? (
                <><Check className="h-4 w-4 mr-2" /> Saved</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Preferences</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
