'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MediaTypeCardProps {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  accentColor: string
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-500', border: 'border-violet-100' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-500', border: 'border-cyan-100' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-500', border: 'border-pink-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100' },
}

export function MediaTypeCard({
  id,
  title,
  icon: Icon,
  href,
  accentColor,
}: MediaTypeCardProps) {
  const router = useRouter()
  const colors = colorMap[accentColor] || colorMap.orange

  return (
    <div
      className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-gray-100 flex flex-col items-center justify-center aspect-square"
      onClick={() => router.push(href)}
      data-testid={`media-type-card-${id}`}
    >
      {/* Centered circle with icon */}
      <div className={cn('w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-2 sm:mb-4 border-2', colors.bg, colors.border)}>
        <Icon className={cn('h-5 w-5 sm:h-7 sm:w-7', colors.text)} />
      </div>

      {/* Title */}
      <h3 className="text-gray-700 text-xs sm:text-sm font-medium text-center">{title}</h3>
    </div>
  )
}
