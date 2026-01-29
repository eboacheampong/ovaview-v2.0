'use client'

import { Menu, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { User } from '@/types/user'

interface HeaderProps {
  user: User | null
  onMenuToggle: () => void
}

export function Header({ user, onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        
        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-gray-700">{user.username}</span>
          </div>
        )}
      </div>
    </header>
  )
}