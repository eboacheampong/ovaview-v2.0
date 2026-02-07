'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { navigationSections, bottomNavItems, dashboardItem, NavItem, NavSubSection } from '@/constants/navigation'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { logout, hasRole } = useAuth()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [expandedSubSections, setExpandedSubSections] = useState<Record<string, boolean>>({})

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const toggleSubSection = (title: string) => {
    setExpandedSubSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isSubSectionActive = (subSection: NavSubSection) => {
    return subSection.items.some(item => isActive(item.href))
  }

  const isSectionActive = (section: typeof navigationSections[0]) => {
    // Check if any direct items are active
    if (section.items?.some(item => isActive(item.href))) return true
    // Check if any sub-section items are active
    if (section.subSections?.some(subSection => isSubSectionActive(subSection))) return true
    return false
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
      <aside className="fixed left-0 top-0 z-40 h-screen w-20 bg-white flex flex-col">
        <div className="p-4 flex justify-center">
          <button onClick={onToggle} className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg">
            O
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 bg-white flex flex-col">
      {/* Logo */}
      <div className="p-4 bg-gray-900 rounded-b-2xl mx-2">
        <Link href="/dashboard" className="block">
          <Image
            src="/Ovaview-Media-Monitoring-Logo.png"
            alt="Ovaview"
            width={220}
            height={70}
            className="mx-auto"
            priority
          />
        </Link>
      </div>

      {/* Dashboard Link */}
      <div className="px-4 py-3">
        <Link
          href={dashboardItem.href}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
            isActive(dashboardItem.href)
              ? 'gradient-primary text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <dashboardItem.icon className="h-5 w-5" />
          {dashboardItem.label}
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {navigationSections.map((section) => {
          const filteredItems = section.items ? filterItemsByRole(section.items) : []
          const hasSubSections = section.subSections && section.subSections.length > 0
          const hasItems = filteredItems.length > 0

          if (!hasSubSections && !hasItems) return null

          return (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
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
                  {/* Render sub-sections (collapsible groups like Media types) */}
                  {section.subSections?.map((subSection) => {
                    const subSectionExpanded = expandedSubSections[subSection.title] || isSubSectionActive(subSection)
                    const SubIcon = subSection.icon
                    
                    return (
                      <div key={subSection.title} className="mb-1">
                        <button
                          onClick={() => toggleSubSection(subSection.title)}
                          className={cn(
                            'flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                            subSectionExpanded
                              ? 'gradient-primary text-white'
                              : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <SubIcon className="h-4 w-4" />
                            {subSection.title}
                          </div>
                          {subSectionExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        
                        {subSectionExpanded && (
                          <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                            {filterItemsByRole(subSection.items).map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  'flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-200',
                                  isActive(item.href)
                                    ? 'bg-orange-50 text-orange-600 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                <item.icon className={cn(
                                  'h-4 w-4',
                                  isActive(item.href) ? 'text-orange-500' : 'text-gray-400'
                                )} />
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Render regular items */}
                  {filteredItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                        isActive(item.href)
                          ? 'bg-orange-50 text-orange-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <item.icon className={cn(
                        'h-4 w-4',
                        isActive(item.href) ? 'text-orange-500' : 'text-gray-400'
                      )} />
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
      <div className="border-t border-gray-100 px-4 py-4 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
              isActive(item.href)
                ? 'bg-orange-50 text-orange-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <item.icon className={cn(
              'h-4 w-4',
              isActive(item.href) ? 'text-orange-500' : 'text-gray-400'
            )} />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
