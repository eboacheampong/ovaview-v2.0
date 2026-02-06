'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Loader2, ShieldCheck } from 'lucide-react'

interface PasswordConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
  title?: string
  description?: string
  actionLabel?: string
}

export function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Please enter your password to authorize this action.',
  actionLabel = 'Confirm',
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm(password)
      setPassword('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <ShieldCheck className="h-7 w-7 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-gray-500 text-sm">{description}</p>
          </div>

          {/* Content */}
          <div className="px-8 pb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-gray-700 font-medium text-sm">
                Your Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  disabled={isSubmitting}
                  className="pl-10 h-11 rounded-lg bg-gray-50 border-gray-200 focus-visible:ring-orange-500/20 focus-visible:ring-offset-0"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <p className="text-xs text-gray-400">
                Validate this action by entering your password.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-lg px-5 h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg px-5 h-10 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                actionLabel
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
