'use client'

import { Menu, Bell, Search, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'

interface HeaderProps {
  onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuth()
  const [isDark, setIsDark] = useState(false)

  const initials = user?.username
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <header className="fixed top-0 right-0 left-72 z-30 h-16 bg-white">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Search */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Search - separated with rounded corners */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search here..."
                className="w-72 pl-11 h-11 rounded-2xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right side - User info */}
        <div className="flex items-center gap-4">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 rounded-xl hover:bg-gray-100"
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-800">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-400">{user?.email || 'user@email.com'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
