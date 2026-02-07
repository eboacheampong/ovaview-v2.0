'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, LogOut, X } from 'lucide-react'
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
  const { logout, hasRole } = useAuth()
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
      "fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-100 flex flex-col shadow-xl lg:shadow-none transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Header with Logo and Close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Link href="/dashboard" className="block" onClick={handleNavClick}>
          <Image
            src="/Ovaview-Media-Monitoring-Logo.png"
            alt="Ovaview"
            width={160}
            height={48}
            className="h-10 w-auto"
          />
        </Link>
        {!isDesktop && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Dashboard Link */}
      <div className="px-3 py-3">
        <Link
          href={dashboardItem.href}
          onClick={handleNavClick}
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
                  {section.subSections?.map((subSection) => {
                    const subSectionExpanded = expandedSubSections[subSection.title] || isSubSectionActive(subSection)
                    const SubIcon = subSection.icon
                    
                    return (
                      <div key={subSection.title} className="mb-1">
                        <button
                          onClick={() => toggleSubSection(subSection.title)}
                          className={cn(
                            'flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                            subSectionExpanded ? 'gradient-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <SubIcon className="h-4 w-4" />
                            {subSection.title}
                          </div>
                          {subSectionExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        
                        {subSectionExpanded && (
                          <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                            {filterItemsByRole(subSection.items).map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={handleNavClick}
                                className={cn(
                                  'flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-200',
                                  isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
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
                        isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
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
      <div className="border-t border-gray-100 px-3 py-4 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
              isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <item.icon className={cn('h-4 w-4', isActive(item.href) ? 'text-orange-500' : 'text-gray-400')} />
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