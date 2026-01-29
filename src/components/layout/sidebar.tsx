'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { navigationSections, bottomNavItems, dashboardItem, NavSection, NavItem } from '@/constants/navigation'
import { UserProfile } from './user-profile'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, hasRole } = useAuth()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'USER MANAGEMENT': true,
    'MANAGEMENT': true,
    'LOG MANAGEMENT': false,
    'MEDIA': true,
    'BUSINESS': true,
  })

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const filterItemsByRole = (items: NavItem[]) => {
    return items.filter(item => {
      if (!item.requiredRole) return true
      return hasRole(item.requiredRole)
    })
  }

  const handleLogout = async () => {
    await logout()
  }

  if (isCollapsed) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-16 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button onClick={onToggle} className="text-orange-500 font-bold text-xl">
            O
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Link href="/dashboard" className="text-orange-500 font-bold text-2xl">
          OVAVIEW
        </Link>
        <p className="text-xs text-gray-500 mt-1">MEDIA MONITORING & ANALYSIS</p>
      </div>

      {/* User Profile */}
      {user && <UserProfile user={user} />}

      {/* Dashboard Link */}
      <div className="px-2 py-2">
        <Link
          href={dashboardItem.href}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            isActive(dashboardItem.href)
              ? 'bg-orange-500 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <dashboardItem.icon className="h-4 w-4" />
          {dashboardItem.label}
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navigationSections.map((section) => {
          const filteredItems = filterItemsByRole(section.items)
          if (filteredItems.length === 0) return null

          return (
            <div key={section.title} className="mb-2">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-md"
              >
                {section.title}
                {expandedSections[section.title] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {expandedSections[section.title] && (
                <div className="mt-1 space-y-1">
                  {filteredItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive(item.href)
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 px-2 py-2">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive(item.href)
                ? 'bg-orange-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 w-full"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}