'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

interface AuthProviderProps {
  children: React.ReactNode
}

const publicPaths = ['/login']

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
      
      if (!isAuthenticated && !isPublicPath) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
      } else if (isAuthenticated && pathname === '/login') {
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  return <>{children}</>
}