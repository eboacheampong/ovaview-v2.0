'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  ChevronDown, ChevronRight, LogOut, X,
  MessageCircle, BarChart3, PieChart, Globe, Mail, FileText, FileSpreadsheet, Bell,
  Sparkles, CalendarDays, LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { navigationSections, bottomNavItems, dashboardItem, NavItem, NavSubSection } from '@/constants/navigation'

interface SidebarProps {
  isOpen: boolean
  isDesktop: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, isDesktop, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { logout, hasRole, user } = useAuth()
  const isClientUser = user?.role === 'client_user'
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const filterItemsByRole = (items: NavItem[]) => {
    return items.filter(item => !item.requiredRole || hasRole(item.requiredRole))
  }

  const handleLogout = async () => { await logout() }
  const handleNavClick = () => { if (!isDesktop) onClose() }

  if (!isOpen) return null

  // Flatten admin nav: collect all items from sections/subsections into grouped flat list
  const adminGroups: { label: string; items: NavItem[] }[] = []
  for (const section of navigationSections) {
    // Direct items
    const directItems = section.items ? filterItemsByRole(section.items) : []
    // SubSection items flattened
    const subItems: NavItem[] = []
    if (section.subSections) {
      for (const sub of section.subSections) {
        const filtered = filterItemsByRole(sub.items)
        subItems.push(...filtered)
      }
    }
    const allItems = [...subItems, ...directItems]
    if (allItems.length > 0) {
      adminGroups.push({ label: section.title, items: allItems })
    }
  }

  // Check if any item in a group is active (for auto-expand)
  const isGroupActive = (items: NavItem[]) => items.some(item => isActive(item.href))

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={item.href}
      onClick={handleNavClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
        isActive(item.href)
          ? 'bg-orange-50 text-orange-600 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
      )}
    >
      <item.icon className={cn('h-4 w-4 shrink-0', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
      <span className="truncate">{item.label}</span>
    </Link>
  )

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-100 flex flex-col shadow-xl lg:shadow-none transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <Link href="/dashboard" className="block" onClick={handleNavClick}>
          <Image src="/Ovaview-Media-Monitoring-Logo.png" alt="Ovaview" width={140} height={42} className="h-9 w-auto" />
        </Link>
        {!isDesktop && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 lg:hidden">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href={isClientUser ? '/client-dashboard' : dashboardItem.href}
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            (isActive(dashboardItem.href) || isActive('/client-dashboard'))
              ? 'gradient-primary text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <dashboardItem.icon className="h-5 w-5" />
          Dashboard
        </Link>
      </div>

      {/* Admin navigation — flat grouped list with collapsible sections */}
      {!isClientUser && (
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin">
        {adminGroups.map((group) => {
          const active = isGroupActive(group.items)
          const expanded = expandedGroups[group.label] ?? active

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors mt-3 first:mt-0"
              >
                {group.label}
                {expanded
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />
                }
              </button>
              {expanded && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map(item => <NavLink key={item.href} item={item} />)}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      )}

      {/* Client user navigation */}
      {isClientUser && (
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {[
          { label: 'Mentions', href: '/client-dashboard', icon: MessageCircle },
          { label: 'Summary', href: '/client-dashboard/summary', icon: BarChart3 },
          { label: 'Analysis', href: '/client-dashboard/analysis', icon: PieChart },
          { label: 'Sources', href: '/client-dashboard/sources', icon: Globe },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
              isActive(item.href) && pathname === item.href
                ? 'bg-orange-50 text-orange-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <item.icon className={cn('h-4 w-4', isActive(item.href) && pathname === item.href ? 'text-orange-500' : 'text-gray-400')} />
            {item.label}
          </Link>
        ))}

        <div className="pt-3">
          <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Insights</p>
          {[
            { label: 'Weekly Insights', href: '/client-dashboard/insights/weekly', icon: CalendarDays },
            { label: 'Monthly Insights', href: '/client-dashboard/insights/monthly', icon: Sparkles },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
                isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}>
              <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="pt-3">
          <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reports</p>
          {[
            { label: 'Email Reports', href: '/client-dashboard/reports/email', icon: Mail },
            { label: 'PDF Report', href: '/client-dashboard/reports/pdf', icon: FileText },
            { label: 'Excel Report', href: '/client-dashboard/reports/excel', icon: FileSpreadsheet },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
                isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}>
              <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="pt-3">
          <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings</p>
          <Link href="/client-dashboard/notifications" onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
              isActive('/client-dashboard/notifications') ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
            )}>
            <Bell className={cn('h-4 w-4', isActive('/client-dashboard/notifications') ? 'text-orange-500' : 'text-gray-400')} />
            Notifications
          </Link>
        </div>
      </nav>
      )}

      {/* Bottom */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-0.5">
        {bottomNavItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
              isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
            )}>
            <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
            {item.label}
          </Link>
        ))}
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-all duration-150">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
