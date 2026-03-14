'use client'

import { Menu, Bell, Search, Mail, FileText, Sparkles, CalendarDays, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { navigationSections, bottomNavItems, NavItem } from '@/constants/navigation'

interface Notification {
  id: string
  type: string
  title: string
  sentAt: string
  label: string
}

interface SearchItem {
  label: string
  href: string
  section: string
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
  const { user, hasRole } = useAuth()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const isClientUser = user?.role === 'client_user'
  const clientId = user?.clientId

  const displayName = user?.username || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  // Build searchable items based on role
  const searchItems = useMemo(() => {
    const items: SearchItem[] = []

    if (isClientUser) {
      // Client nav items
      const clientPages = [
        { label: 'Dashboard', href: '/client-dashboard', section: 'Navigation' },
        { label: 'Mentions', href: '/client-dashboard', section: 'Navigation' },
        { label: 'Summary', href: '/client-dashboard/summary', section: 'Navigation' },
        { label: 'Analysis', href: '/client-dashboard/analysis', section: 'Navigation' },
        { label: 'Sources', href: '/client-dashboard/sources', section: 'Navigation' },
        { label: 'Weekly Insights', href: '/client-dashboard/insights/weekly', section: 'AI Insights' },
        { label: 'Monthly Insights', href: '/client-dashboard/insights/monthly', section: 'AI Insights' },
        { label: 'Email Reports', href: '/client-dashboard/reports/email', section: 'Reports' },
        { label: 'PDF Report', href: '/client-dashboard/reports/pdf', section: 'Reports' },
        { label: 'Excel Report', href: '/client-dashboard/reports/excel', section: 'Reports' },
        { label: 'Notifications', href: '/client-dashboard/notifications', section: 'Settings' },
      ]
      items.push(...clientPages)
    } else {
      // Admin nav items from navigation constants
      items.push({ label: 'Dashboard', href: '/dashboard', section: 'Navigation' })
      for (const section of navigationSections) {
        if (section.items) {
          for (const item of section.items) {
            if (!item.requiredRole || hasRole(item.requiredRole)) {
              items.push({ label: item.label, href: item.href, section: section.title })
            }
          }
        }
        if (section.subSections) {
          for (const sub of section.subSections) {
            for (const item of sub.items) {
              if (!item.requiredRole || hasRole(item.requiredRole)) {
                items.push({ label: item.label, href: item.href, section: `${section.title} › ${sub.title}` })
              }
            }
          }
        }
      }
      for (const item of bottomNavItems) {
        items.push({ label: item.label, href: item.href, section: 'Settings' })
      }
    }

    return items
  }, [isClientUser, hasRole])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return searchItems.slice(0, 8)
    const q = searchQuery.toLowerCase()
    return searchItems.filter(item =>
      item.label.toLowerCase().includes(q) || item.section.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [searchQuery, searchItems])

  const handleSearchSelect = (href: string) => {
    setShowSearch(false)
    setSearchQuery('')
    router.push(href)
  }

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(prev => !prev)
      }
      if (e.key === 'Escape') setShowSearch(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when search opens
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [showSearch])

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false)
    }
    if (showSearch) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSearch])

  const fetchNotifications = useCallback(async () => {
    if (!clientId) return
    setNotifLoading(true)
    try {
      const res = await fetch(`/api/client-notifications?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        setHasNew(data.notifications?.some((n: Notification) => new Date(n.sentAt) > dayAgo) || false)
      }
    } catch { /* silent */ }
    finally { setNotifLoading(false) }
  }, [clientId])

  useEffect(() => {
    if (isClientUser && clientId) fetchNotifications()
  }, [isClientUser, clientId, fetchNotifications])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowNotifications(false)
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
      isDesktop && sidebarOpen ? 'left-64' : 'left-0'
    }`}>
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onMenuToggle} className="w-11 h-11 rounded-xl hover:bg-gray-100">
            <Menu className="h-6 w-6 text-gray-600" />
          </Button>

          {/* Search trigger — desktop */}
          <div className="hidden md:block relative" ref={searchRef}>
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 w-48 lg:w-72 h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white text-sm text-gray-400 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono">⌘K</kbd>
            </button>

            {/* Search dropdown */}
            {showSearch && (
              <div className="absolute left-0 top-full mt-2 w-80 lg:w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search pages, settings..."
                    className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && filteredItems.length > 0) handleSearchSelect(filteredItems[0].href)
                    }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="max-h-[320px] overflow-y-auto py-1">
                  {filteredItems.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">No results found</div>
                  ) : (
                    filteredItems.map((item, i) => (
                      <button
                        key={`${item.href}-${i}`}
                        onClick={() => handleSearchSelect(item.href)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-sm text-gray-800">{item.label}</span>
                        <span className="text-[10px] text-gray-400 ml-2 shrink-0">{item.section}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile search button */}
          <Button variant="ghost" size="sm" className="w-11 h-11 rounded-xl hover:bg-gray-100 md:hidden"
            onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-6 w-6 text-gray-500" />
          </Button>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <Button variant="ghost" size="sm" className="w-11 h-11 rounded-xl relative hover:bg-gray-100" onClick={handleBellClick}>
              <Bell className="h-6 w-6 text-gray-500" />
              {hasNew && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full" />}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                  {notifications.length > 0 && <span className="text-xs text-gray-400">{notifications.length} recent</span>}
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
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isRecent ? 'bg-orange-50/30' : ''}`}>
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

      {/* Mobile search overlay */}
      {showSearch && !isDesktop && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-lg z-50 p-3 md:hidden">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="flex-1 text-sm outline-none bg-transparent"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && filteredItems.length > 0) handleSearchSelect(filteredItems[0].href)
              }}
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery('') }}>
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          {searchQuery && (
            <div className="mt-2 max-h-[300px] overflow-y-auto">
              {filteredItems.map((item, i) => (
                <button key={`${item.href}-${i}`} onClick={() => handleSearchSelect(item.href)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left">
                  <span className="text-sm text-gray-800">{item.label}</span>
                  <span className="text-[10px] text-gray-400">{item.section}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
