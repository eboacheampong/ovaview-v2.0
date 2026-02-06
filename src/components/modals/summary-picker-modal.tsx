'use client'

import { useState } from 'react'
import { X, Sparkles, Check, FileText, Zap, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SummaryOption {
  id: string
  summary: string
  tone: 'formal' | 'neutral' | 'concise'
  score: number
  reason: string
  wordCount: number
}

interface SummaryPickerModalProps {
  isOpen: boolean
  onClose: () => void
  summaries: SummaryOption[]
  onSelect: (summary: string) => void
}

const toneConfig = {
  formal: {
    icon: FileText,
    label: 'Formal',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    iconBg: 'bg-blue-100',
  },
  neutral: {
    icon: Scale,
    label: 'Neutral',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    iconBg: 'bg-emerald-100',
  },
  concise: {
    icon: Zap,
    label: 'Concise',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    iconBg: 'bg-amber-100',
  },
}

export function SummaryPickerModal({
  isOpen,
  onClose,
  summaries,
  onSelect,
}: SummaryPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelect = (summary: SummaryOption) => {
    setSelectedId(summary.id)
    setTimeout(() => {
      onSelect(summary.summary)
      onClose()
      setSelectedId(null)
    }, 200)
  }

  // Find the recommended one (highest score)
  const recommendedId = summaries.reduce((prev, curr) => 
    curr.score > (summaries.find(s => s.id === prev)?.score || 0) ? curr.id : prev
  , summaries[0]?.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">AI Summary Suggestions</h2>
                <p className="text-xs text-gray-500">Choose the style that fits your needs</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/80 transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {summaries.map((summary) => {
            const config = toneConfig[summary.tone] || toneConfig.neutral
            const Icon = config.icon
            const isRecommended = summary.id === recommendedId
            const isSelected = selectedId === summary.id

            return (
              <div
                key={summary.id}
                onClick={() => handleSelect(summary)}
                className={cn(
                  'relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                  isSelected 
                    ? 'border-orange-500 bg-orange-50 scale-[0.98]' 
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                )}
              >
                {/* Top row: Icon, Label, Badge, Score */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.iconBg)}>
                      <Icon className={cn('h-5 w-5', config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{config.label}</span>
                        {isRecommended && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-medium rounded-full">
                            ✨ Best Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{summary.reason}</p>
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-bold text-gray-800">{summary.score}</span>
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{summary.wordCount} words</span>
                  </div>
                </div>

                {/* Summary text */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-sm leading-relaxed">{summary.summary}</p>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80">
          <p className="text-[11px] text-gray-400 text-center">
            Click any summary to use it • Powered by AI
          </p>
        </div>
      </div>
    </div>
  )
}
