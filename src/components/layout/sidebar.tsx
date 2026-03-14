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
  const [expandedSubSections, setExpandedSubSections] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const toggleSubSection = (title: string) => {
    setExpandedSubSections(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isSubSectionActive = (subSection: NavSubSection) => {
    return subSection.items.some(item => isActive(item.href))
  }

  const isSectionActive = (section: typeof navigationSections[0]) => {
    if (section.items?.some(item => isActive(item.href))) return true
    if (section.subSections?.some(subSection => isSubSectionActive(subSection))) return true
    return false
  }

  const filterItemsByRole = (items: NavItem[]) => {
    return items.filter(item => !item.requiredRole || hasRole(item.requiredRole))
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleNavClick = () => {
    if (!isDesktop) onClose()
  }


  if (!isOpen) return null

  return (
    <aside className={cn(
      "fixed top-0 left-0 z-50 h-screen w-72 bg-[#334851] border-r border-[#2a3d45] flex flex-col shadow-xl lg:shadow-none transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Header with Logo and Close button */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Link href="/dashboard" className="block" onClick={handleNavClick}>
          <Image
            src="/Ovaview-Media-Monitoring-Logo.png"
            alt="Ovaview"
            width={160}
            height={48}
            className="h-10 w-auto brightness-0 invert"
          />
        </Link>
        {!isDesktop && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        )}
      </div>

      {/* Dashboard Link */}
      <div className="px-3 py-3">
        <Link
          href={isClientUser ? '/client-dashboard' : dashboardItem.href}
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
            (isActive(dashboardItem.href) || isActive('/client-dashboard'))
              ? 'gradient-primary text-white shadow-md'
              : 'text-white/70 hover:bg-white/10'
          )}
        >
          <dashboardItem.icon className="h-5 w-5" />
          {dashboardItem.label}
        </Link>
      </div>

      {/* Navigation Sections — hidden for client users */}
      {!isClientUser && (
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navigationSections.map((section) => {
          const filteredItems = section.items ? filterItemsByRole(section.items) : []
          const hasSubSections = section.subSections && section.subSections.length > 0
          const hasItems = filteredItems.length > 0

          if (!hasSubSections && !hasItems) return null

          return (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
              >
                {section.title}
                {(expandedSections[section.title] || isSectionActive(section)) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {(expandedSections[section.title] || isSectionActive(section)) && (
                <div className="mt-1 space-y-1 animate-fadeIn">
                  {section.subSections?.map((subSection) => {
                    const subSectionExpanded = expandedSubSections[subSection.title] || isSubSectionActive(subSection)
                    const SubIcon = subSection.icon
                    
                    return (
                      <div key={subSection.title} className="mb-1">
                        <button
                          onClick={() => toggleSubSection(subSection.title)}
                          className={cn(
                            'flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                            subSectionExpanded ? 'gradient-primary text-white' : 'text-white/70 hover:bg-white/10'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <SubIcon className="h-4 w-4" />
                            {subSection.title}
                          </div>
                          {subSectionExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        
                        {subSectionExpanded && (
                          <div className="mt-1 ml-4 space-y-1 border-l-2 border-white/10 pl-2">
                            {filterItemsByRole(subSection.items).map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleNavClick}
                                className={cn(
                                  'flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-200',
                                  isActive(item.href) ? 'bg-orange-500/20 text-orange-300 font-medium' : 'text-white/70 hover:bg-white/10'
                                )}
                              >
                                <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-400' : 'text-white/40')} />
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {filteredItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                        isActive(item.href) ? 'bg-orange-500/20 text-orange-300 font-medium' : 'text-white/70 hover:bg-white/10'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-400' : 'text-white/40')} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      )}

      {/* Client user navigation */}
      {isClientUser && (
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Main nav items */}
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
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
              isActive(item.href) && pathname === item.href
                ? 'bg-orange-500/20 text-orange-300 font-medium'
                : 'text-white/70 hover:bg-white/10'
            )}
          >
            <item.icon className={cn('h-4 w-4', isActive(item.href) && pathname === item.href ? 'text-orange-400' : 'text-white/40')} />
            {item.label}
          </Link>
        ))}

        {/* Reports section */}
        <div className="pt-4">
          <p className="px-3 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider">AI Insights</p>
          {[
            { label: 'Weekly Insights', href: '/client-dashboard/insights/weekly', icon: CalendarDays },
            { label: 'Monthly Insights', href: '/client-dashboard/insights/monthly', icon: Sparkles },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                isActive(item.href)
                  ? 'bg-orange-500/20 text-orange-300 font-medium'
                  : 'text-white/70 hover:bg-white/10'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-400' : 'text-white/40')} />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Reports section */}
        <div className="pt-4">
          <p className="px-3 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Reports</p>
          {[
            { label: 'Email Reports', href: '/client-dashboard/reports/email', icon: Mail },
            { label: 'PDF Report', href: '/client-dashboard/reports/pdf', icon: FileText },
            { label: 'Excel Report', href: '/client-dashboard/reports/excel', icon: FileSpreadsheet },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                isActive(item.href)
                  ? 'bg-orange-500/20 text-orange-300 font-medium'
                  : 'text-white/70 hover:bg-white/10'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-400' : 'text-white/40')} />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Settings section */}
        <div className="pt-4">
          <p className="px-3 py-2 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Settings</p>
          <Link
            href="/client-dashboard/notifications"
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
              isActive('/client-dashboard/notifications')
                ? 'bg-orange-500/20 text-orange-300 font-medium'
                : 'text-white/70 hover:bg-white/10'
            )}
          >
            <Bell className={cn('h-4 w-4', isActive('/client-dashboard/notifications') ? 'text-orange-400' : 'text-white/40')} />
            Notifications
          </Link>
        </div>
      </nav>
      )}

      {/* Bottom Navigation */}
      <div className="border-t border-white/10 px-3 py-4 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
              isActive(item.href) ? 'bg-orange-500/20 text-orange-300 font-medium' : 'text-white/70 hover:bg-white/10'
            )}
          >
            <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-400' : 'text-white/40')} />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:bg-red-500/20 hover:text-red-300 w-full transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}