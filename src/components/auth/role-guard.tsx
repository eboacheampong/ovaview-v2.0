'use client'

import { useAuth } from '@/hooks/use-auth'
import { UserRole } from '@/types/user'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!user) {
    return fallback
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return <>{children}</>
  }

  // Check if user's role is in allowed roles
  if (allowedRoles.includes(user.role)) {
    return <>{children}</>
  }

  return fallback
}

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}