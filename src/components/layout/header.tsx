'use client'

import { Menu, Bell, Search, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'

interface HeaderProps {
  onMenuToggle: () => void
  sidebarOpen: boolean
  isDesktop: boolean
}

export function Header({ onMenuToggle, sidebarOpen, isDesktop }: HeaderProps) {
  const { user } = useAuth()
  const [isDark, setIsDark] = useState(false)

  const initials = user?.username
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <header className={`fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-100 transition-all duration-300 ${
      isDesktop && sidebarOpen ? 'left-72' : 'left-0'
    }`}>
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="w-10 h-10 rounded-xl hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </Button>
          
          {/* Search - hidden on mobile */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="w-48 lg:w-72 pl-11 h-10 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 rounded-xl hover:bg-gray-100 md:hidden"
          >
            <Search className="h-5 w-5 text-gray-500" />
          </Button>

          {/* Theme toggle - hidden on small mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 rounded-xl hover:bg-gray-100 hidden sm:flex"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? <Sun className="h-5 w-5 text-gray-500" /> : <Moon className="h-5 w-5 text-gray-500" />}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 rounded-xl relative hover:bg-gray-100"
          >
            <Bell className="h-5 w-5 text-gray-500" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full" />
          </Button>

          {/* User avatar and info */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {initials}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-400 truncate max-w-[120px]">{user?.email || 'user@email.com'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}