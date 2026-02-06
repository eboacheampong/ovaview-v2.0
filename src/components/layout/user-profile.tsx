'use client'

import { User } from '@/types/user'
import { Badge } from '@/components/ui/badge'

interface UserProfileProps {
  user: User
}

export function UserProfile({ user }: UserProfileProps) {
  const initials = user.username
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{user.username}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <Badge 
          variant="outline" 
          className={`text-[10px] px-2 py-0.5 ${
            user.role === 'admin' 
              ? 'border-orange-200 bg-orange-50 text-orange-600' 
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          {user.role === 'admin' ? 'Admin' : 'Client'}
        </Badge>
      </div>
    </div>
  )
}
