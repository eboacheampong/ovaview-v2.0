'use client'

import { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ViewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  actions?: ReactNode
}

export function ViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  icon,
  size = 'lg',
  actions,
}: ViewModalProps) {
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
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {icon && <div className="text-orange-500">{icon}</div>}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                  {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
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
          
          {/* Content - Scrollable */}
          <div className="px-8 py-6 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
          
          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 flex justify-between items-center flex-shrink-0 bg-gray-50/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6 h-10"
            >
              Close
            </Button>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
