'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  ChevronDown, ChevronRight, LogOut, X,
  MessageCircle, BarChart3, PieChart, Globe, Mail, FileText, FileSpreadsheet, Bell,
  Sparkles, CalendarDays
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [expandedSubs, setExpandedSubs] = useState<Record<string, boolean>>({})

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }
  const toggleSub = (key: string) => {
    setExpandedSubs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isSubActive = (sub: NavSubSection) => sub.items.some(i => isActive(i.href))

  const isSectionActive = (section: typeof navigationSections[0]) => {
    if (section.items?.some(i => isActive(i.href))) return true
    if (section.subSections?.some(s => isSubActive(s))) return true
    return false
  }

  const filterByRole = (items: NavItem[]) =>
    items.filter(item => !item.requiredRole || hasRole(item.requiredRole))

  const handleLogout = async () => { await logout() }
  const handleNavClick = () => { if (!isDesktop) onClose() }

  if (!isOpen) return null

  // Shared link component
  const NavLink = ({ item, indent = false }: { item: NavItem; indent?: boolean }) => (
    <Link
      href={item.href}
      onClick={handleNavClick}
      className={cn(
        'flex items-center gap-2.5 py-1.5 rounded-md text-[13px] transition-colors duration-150',
        indent ? 'px-3 ml-5' : 'px-3',
        isActive(item.href)
          ? 'bg-orange-50 text-orange-600 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
      )}
    >
      <item.icon className={cn('h-3.5 w-3.5 shrink-0', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
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

      {/* Admin navigation */}
      {!isClientUser && (
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {navigationSections.map((section) => {
          const directItems = section.items ? filterByRole(section.items) : []
          const hasSubs = section.subSections && section.subSections.length > 0
          if (!hasSubs && directItems.length === 0) return null

          const sectionOpen = expandedSections[section.title] ?? isSectionActive(section)

          return (
            <div key={section.title} className="mt-2 first:mt-0">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-500 transition-colors"
              >
                {section.title}
                {sectionOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {sectionOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {/* Subsections with their own toggle */}
                  {section.subSections?.map((sub) => {
                    const subItems = filterByRole(sub.items)
                    if (subItems.length === 0) return null
                    const subOpen = expandedSubs[sub.title] ?? isSubActive(sub)
                    const SubIcon = sub.icon

                    return (
                      <div key={sub.title}>
                        <button
                          onClick={() => toggleSub(sub.title)}
                          className={cn(
                            'flex items-center justify-between w-full px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150',
                            subOpen
                              ? 'bg-gray-100 text-gray-800 font-medium'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <SubIcon className={cn('h-3.5 w-3.5', subOpen ? 'text-orange-500' : 'text-gray-400')} />
                            {sub.title}
                          </div>
                          {subOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                        {subOpen && (
                          <div className="mt-0.5 space-y-0.5 border-l-2 border-gray-100 ml-4 pl-0">
                            {subItems.map(item => <NavLink key={item.href} item={item} indent />)}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Direct items (no subsection) */}
                  {directItems.map(item => <NavLink key={item.href} item={item} />)}
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
          <Link key={item.href} href={item.href} onClick={handleNavClick}
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150',
              isActive(item.href) && pathname === item.href
                ? 'bg-orange-50 text-orange-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            )}>
            <item.icon className={cn('h-3.5 w-3.5', isActive(item.href) && pathname === item.href ? 'text-orange-500' : 'text-gray-400')} />
            {item.label}
          </Link>
        ))}

        <div className="pt-3">
          <p className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Insights</p>
          {[
            { label: 'Weekly Insights', href: '/client-dashboard/insights/weekly', icon: CalendarDays },
            { label: 'Monthly Insights', href: '/client-dashboard/insights/monthly', icon: Sparkles },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={handleNavClick}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150',
                isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}>
              <item.icon className={cn('h-3.5 w-3.5', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="pt-3">
          <p className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reports</p>
          {[
            { label: 'Email Reports', href: '/client-dashboard/reports/email', icon: Mail },
            { label: 'PDF Report', href: '/client-dashboard/reports/pdf', icon: FileText },
            { label: 'Excel Report', href: '/client-dashboard/reports/excel', icon: FileSpreadsheet },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={handleNavClick}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150',
                isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}>
              <item.icon className={cn('h-3.5 w-3.5', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="pt-3">
          <p className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings</p>
          <Link href="/client-dashboard/notifications" onClick={handleNavClick}
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150',
              isActive('/client-dashboard/notifications') ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
            )}>
            <Bell className={cn('h-3.5 w-3.5', isActive('/client-dashboard/notifications') ? 'text-orange-500' : 'text-gray-400')} />
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
              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors duration-150',
              isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
            )}>
            <item.icon className={cn('h-3.5 w-3.5', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
            {item.label}
          </Link>
        ))}
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-colors duration-150">
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </aside>
  )
}
