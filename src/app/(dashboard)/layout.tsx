'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthProvider } from '@/components/auth/auth-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile unless menu is open */}
        <div className={`
          fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
          md:translate-x-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main content */}
        <div className={`
          transition-all duration-200
          ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}
        `}>
          <Header
            user={user}
            onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
          <main className="p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}