'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthProvider } from '@/components/auth/auth-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
          <Header onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
          <main className="pt-20 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}
