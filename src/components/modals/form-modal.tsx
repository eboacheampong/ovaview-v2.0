'use client'

import { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, X } from 'lucide-react'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  submitLabel?: string
  cancelLabel?: string
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  icon,
  size = 'lg',
}: FormModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit()
  }

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${sizeClasses[size]} p-0 max-h-[85vh] overflow-hidden`}>
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header - Clean white with subtle border */}
          <div className="px-8 py-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {icon && <div className="text-orange-500">{icon}</div>}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                  {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 -mr-2 -mt-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Content - Scrollable with good padding */}
          <div className="px-8 py-6 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
          
          {/* Footer - Clean with proper button placement */}
          <div className="px-8 py-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 h-10"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 h-10"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
