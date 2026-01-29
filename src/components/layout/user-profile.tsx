import { User } from '@/types/user'
import { User as UserIcon } from 'lucide-react'

interface UserProfileProps {
  user: User
}

export function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user.username}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {user.role === 'admin' ? 'Admin' : 'Client User'}
          </p>
        </div>
      </div>
    </div>
  )
}