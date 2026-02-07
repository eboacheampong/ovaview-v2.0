'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema } from '@/lib/validations'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationErrors({})

    const result = loginSchema.safeParse(formData)
    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message
        }
      })
      setValidationErrors(errors)
      return
    }

    try {
      await login(formData)
      router.push('/dashboard')
    } catch {
      // Error is handled by the auth store
    }
  }

  return (
    <div className="w-full max-w-md animate-fadeIn">
      {/* Logo */}
      <div className="text-center mb-8">
        <Image
          src="/Ovaview-Media-Monitoring-Logo.png"
          alt="Ovaview - Media Monitoring & Analysis"
          width={280}
          height={100}
          className="mx-auto"
          priority
        />
      </div>

      {/* Login Card */}
      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Welcome back</h2>
          <p className="text-gray-500 mt-1">Sign in to continue to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 animate-fadeIn">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 transition-all"
              />
            </div>
            {validationErrors.email && (
              <p className="text-sm text-red-500">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 transition-all"
              />
            </div>
            {validationErrors.password && (
              <p className="text-sm text-red-500">{validationErrors.password}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl gradient-primary hover:opacity-90 transition-all text-white font-medium text-base group"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-gray-400 text-sm mt-8">
        © {new Date().getFullYear()} Ovaview. All rights reserved.
      </p>
    </div>
  )
}
