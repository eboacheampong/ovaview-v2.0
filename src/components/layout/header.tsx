'use client'

import { Menu, Bell, Search, Sun, Moon, Mail, FileText, Sparkles, CalendarDays, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  sentAt: string
  label: string
}

interface HeaderProps {
  onMenuToggle: () => void
  sidebarOpen: boolean
  isDesktop: boolean
}

const TYPE_ICONS: Record<string, typeof Mail> = {
  daily: CalendarDays,
  weekly: FileText,
  monthly: Sparkles,
  custom_ai: Sparkles,
  custom_media: FileText,
}

const TYPE_COLORS: Record<string, string> = {
  daily: 'bg-blue-100 text-blue-600',
  weekly: 'bg-indigo-100 text-indigo-600',
  monthly: 'bg-purple-100 text-purple-600',
  custom_ai: 'bg-amber-100 text-amber-600',
  custom_media: 'bg-emerald-100 text-emerald-600',
}

export function Header({ onMenuToggle, sidebarOpen, isDesktop }: HeaderProps) {
  const { user } = useAuth()
  const [isDark, setIsDark] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isClientUser = user?.role === 'client_user'
  const clientId = user?.clientId

  // Display name: for client users, prefer the username (which should be their name)
  const displayName = user?.username || 'User'
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const fetchNotifications = useCallback(async () => {
    if (!clientId) return
    setNotifLoading(true)
    try {
      const res = await fetch(`/api/client-notifications?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        // Check if there are notifications from the last 24h
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        setHasNew(data.notifications?.some((n: Notification) => new Date(n.sentAt) > dayAgo) || false)
      }
    } catch { /* silent */ }
    finally { setNotifLoading(false) }
  }, [clientId])

  // Fetch notifications on mount for client users
  useEffect(() => {
    if (isClientUser && clientId) fetchNotifications()
  }, [isClientUser, clientId, fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifications])

  const handleBellClick = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications && isClientUser) {
      fetchNotifications()
      setHasNew(false)
    }
  }

  return (
    <header className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-100 transition-all duration-300 ${
      isDesktop && sidebarOpen ? 'left-72' : 'left-0'
    }`}>
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="w-11 h-11 rounded-xl hover:bg-gray-100"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </Button>
          
          {/* Search - hidden on mobile */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="w-48 lg:w-72 pl-11 h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-11 h-11 rounded-xl hover:bg-gray-100 md:hidden"
          >
            <Search className="h-6 w-6 text-gray-500" />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-11 h-11 rounded-xl hover:bg-gray-100 hidden sm:flex"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? <Sun className="h-6 w-6 text-gray-500" /> : <Moon className="h-6 w-6 text-gray-500" />}
          </Button>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              className="w-11 h-11 rounded-xl relative hover:bg-gray-100"
              onClick={handleBellClick}
            >
              <Bell className="h-6 w-6 text-gray-500" />
              {hasNew && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full" />
              )}
            </Button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                  {notifications.length > 0 && (
                    <span className="text-xs text-gray-400">{notifications.length} recent</span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifLoading ? (
                    <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No notifications yet</p>
                      <p className="text-xs text-gray-300 mt-1">Email updates and AI insights will appear here</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = TYPE_ICONS[n.type] || Mail
                      const colorClass = TYPE_COLORS[n.type] || 'bg-gray-100 text-gray-600'
                      const isRecent = new Date(n.sentAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                      return (
                        <div
                          key={n.id}
                          className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isRecent ? 'bg-orange-50/30' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 line-clamp-2">{n.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{n.label}</span>
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar and info */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {initials}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{displayName}</p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
