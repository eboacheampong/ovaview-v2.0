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
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-white min-h-[520px] flex animate-fadeIn">
      {/* Left side — Login form */}
      <div className="relative z-10 w-full md:w-[440px] shrink-0 flex flex-col justify-center p-8 sm:p-12 bg-white">
        <div className="mb-8">
          <Image
            src="/Ovaview-Media-Monitoring-Logo.png"
            alt="Ovaview"
            width={180}
            height={60}
            className="mb-6"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900">
            Log in <span className="font-normal text-gray-500">to your Account</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-gray-600 text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-400 focus:ring-orange-400/20 transition-colors"
              />
            </div>
            {validationErrors.email && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-gray-600 text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-orange-400 focus:ring-orange-400/20 transition-colors"
              />
            </div>
            {validationErrors.password && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm group shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Login
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-8">
          © {new Date().getFullYear()} Ovaview Media Monitoring
        </p>
      </div>

      {/* Right side — Banner image */}
      <div className="hidden md:block flex-1 relative">
        <Image
          src="/ovaview-login-banner.jpg"
          alt="Ovaview Media Monitoring"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 0vw, 60vw"
        />
        {/* Subtle gradient overlay for polish */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent" />
      </div>
    </div>
  )
}
