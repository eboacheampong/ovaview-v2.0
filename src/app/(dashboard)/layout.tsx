'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthProvider } from '@/components/auth/auth-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  // Handle responsive detection
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }
    
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => {
    if (!isDesktop) setSidebarOpen(false)
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile overlay */}
        {sidebarOpen && !isDesktop && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeSidebar}
          />
        )}
        
        <Sidebar 
          isOpen={sidebarOpen}
          isDesktop={isDesktop}
          onClose={closeSidebar}
        />
        
        <div className={`transition-all duration-300 ${isDesktop && sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
          <Header 
            onMenuToggle={toggleSidebar} 
            sidebarOpen={sidebarOpen}
            isDesktop={isDesktop}
          />
          <main className="pt-16 min-h-screen">
            <div className="p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}