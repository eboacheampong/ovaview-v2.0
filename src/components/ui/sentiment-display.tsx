'use client'

import * as React from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Button } from './button'
import { Pencil } from 'lucide-react'

export interface SentimentDisplayProps {
  positive: number | null
  neutral: number | null
  negative: number | null
  overallSentiment: 'positive' | 'neutral' | 'negative' | null
  isLoading?: boolean
  onSentimentChange?: (data: {
    positive: number
    neutral: number
    negative: number
    overallSentiment: 'positive' | 'neutral' | 'negative'
  }) => void
}

interface SentimentBarProps {
  label: string
  percentage: number | null
  color: 'green' | 'gray' | 'red'
  isHighlighted?: boolean
}

interface EditableSentimentBarProps {
  label: string
  percentage: number
  color: 'green' | 'gray' | 'red'
  isHighlighted?: boolean
  onChange: (value: number) => void
}

const colorStyles = {
  green: {
    bar: 'bg-green-500',
    text: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    slider: 'accent-green-500',
  },
  gray: {
    bar: 'bg-gray-400',
    text: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    slider: 'accent-gray-500',
  },
  red: {
    bar: 'bg-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    slider: 'accent-red-500',
  },
}


function SentimentBar({ label, percentage, color, isHighlighted }: SentimentBarProps) {
  const styles = colorStyles[color]
  const displayPercentage = percentage ?? 0
  const clampedPercentage = Math.max(0, Math.min(100, displayPercentage))

  return (
    <div
      className={cn(
        'p-3 rounded-lg transition-all duration-200',
        isHighlighted ? styles.bg : 'bg-transparent',
        isHighlighted && `border ${styles.border}`
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'text-sm font-medium',
            isHighlighted ? styles.text : 'text-gray-600'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'text-sm font-semibold',
            isHighlighted ? styles.text : 'text-gray-700'
          )}
        >
          {percentage !== null ? `${clampedPercentage.toFixed(0)}%` : '—'}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
          style={{ width: percentage !== null ? `${clampedPercentage}%` : '0%' }}
        />
      </div>
    </div>
  )
}

function EditableSentimentBar({ label, percentage, color, isHighlighted, onChange }: EditableSentimentBarProps) {
  const styles = colorStyles[color]
  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  const thumbColors = {
    green: 'bg-green-500',
    gray: 'bg-gray-400',
    red: 'bg-red-500',
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg transition-all duration-200',
        isHighlighted ? styles.bg : 'bg-transparent',
        isHighlighted && `border ${styles.border}`
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            'text-sm font-medium',
            isHighlighted ? styles.text : 'text-gray-600'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'text-sm font-semibold',
            isHighlighted ? styles.text : 'text-gray-700'
          )}
        >
          {clampedPercentage.toFixed(0)}%
        </span>
      </div>
      <div className="relative h-2 w-full">
        {/* Track background */}
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        {/* Filled track */}
        <div 
          className={cn('absolute h-full rounded-full', styles.bar)}
          style={{ width: `${clampedPercentage}%` }}
        />
        {/* Invisible range input for interaction */}
        <input
          type="range"
          min="0"
          max="100"
          value={clampedPercentage}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* Custom thumb */}
        <div 
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-sm pointer-events-none',
            thumbColors[color]
          )}
          style={{ left: `calc(${clampedPercentage}% - 8px)` }}
        />
      </div>
    </div>
  )
}


function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-10 bg-gray-200 rounded" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onStartEdit }: { onStartEdit?: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-500">No sentiment data yet</p>
      <p className="text-xs text-gray-400 mt-1">
        Use &quot;Analyze with AI&quot; or add manually
      </p>
      {onStartEdit && (
        <Button type="button" variant="outline" size="sm" onClick={onStartEdit} className="mt-3 flex items-center gap-1.5 mx-auto">
          <Pencil className="h-3.5 w-3.5" />
          Add Manually
        </Button>
      )}
    </div>
  )
}

const sentimentBadgeConfig = {
  positive: {
    label: 'Positive',
    className: 'bg-green-500 text-white hover:bg-green-500/80',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-gray-500 text-white hover:bg-gray-500/80',
  },
  negative: {
    label: 'Negative',
    className: 'bg-red-500 text-white hover:bg-red-500/80',
  },
}

function determineOverallSentiment(positive: number, neutral: number, negative: number): 'positive' | 'neutral' | 'negative' {
  if (positive >= neutral && positive >= negative) return 'positive'
  if (neutral >= positive && neutral >= negative) return 'neutral'
  return 'negative'
}


export function SentimentDisplay({
  positive,
  neutral,
  negative,
  overallSentiment,
  isLoading = false,
  onSentimentChange,
}: SentimentDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    positive: positive ?? 33,
    neutral: neutral ?? 34,
    negative: negative ?? 33,
  })

  // Check if we have any sentiment data
  const hasData = positive !== null || neutral !== null || negative !== null

  const handleStartEdit = () => {
    setEditValues({
      positive: positive ?? 33,
      neutral: neutral ?? 34,
      negative: negative ?? 33,
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    // Normalize to 100%
    const total = editValues.positive + editValues.neutral + editValues.negative
    let normalizedPositive = editValues.positive
    let normalizedNeutral = editValues.neutral
    let normalizedNegative = editValues.negative

    if (total > 0) {
      normalizedPositive = Math.round((editValues.positive / total) * 100)
      normalizedNeutral = Math.round((editValues.neutral / total) * 100)
      normalizedNegative = 100 - normalizedPositive - normalizedNeutral
    }

    const newOverall = determineOverallSentiment(normalizedPositive, normalizedNeutral, normalizedNegative)

    if (onSentimentChange) {
      onSentimentChange({
        positive: normalizedPositive,
        neutral: normalizedNeutral,
        negative: normalizedNegative,
        overallSentiment: newOverall,
      })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValues({
      positive: positive ?? 33,
      neutral: neutral ?? 34,
      negative: negative ?? 33,
    })
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <LoadingSkeleton />
      </div>
    )
  }

  // Show empty state with option to add manually when no data and not editing
  if (!hasData && !isEditing) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <EmptyState onStartEdit={onSentimentChange ? handleStartEdit : undefined} />
      </div>
    )
  }

  const currentOverall = isEditing 
    ? determineOverallSentiment(editValues.positive, editValues.neutral, editValues.negative)
    : overallSentiment

  const badgeConfig = currentOverall ? sentimentBadgeConfig[currentOverall] : null

  // Calculate normalized preview when editing
  const total = editValues.positive + editValues.neutral + editValues.negative
  const previewValues = total > 0 ? {
    positive: Math.round((editValues.positive / total) * 100),
    neutral: Math.round((editValues.neutral / total) * 100),
    negative: 100 - Math.round((editValues.positive / total) * 100) - Math.round((editValues.neutral / total) * 100),
  } : editValues


  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      {/* Header with overall sentiment badge */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Sentiment Analysis</h4>
        <div className="flex items-center gap-2">
          {badgeConfig && (
            <Badge className={badgeConfig.className}>{badgeConfig.label}</Badge>
          )}
        </div>
      </div>

      {/* Sentiment bars */}
      <div className="space-y-2">
        {isEditing ? (
          <>
            <EditableSentimentBar
              label="Positive"
              percentage={editValues.positive}
              color="green"
              isHighlighted={currentOverall === 'positive'}
              onChange={(value) => setEditValues(prev => ({ ...prev, positive: value }))}
            />
            <EditableSentimentBar
              label="Neutral"
              percentage={editValues.neutral}
              color="gray"
              isHighlighted={currentOverall === 'neutral'}
              onChange={(value) => setEditValues(prev => ({ ...prev, neutral: value }))}
            />
            <EditableSentimentBar
              label="Negative"
              percentage={editValues.negative}
              color="red"
              isHighlighted={currentOverall === 'negative'}
              onChange={(value) => setEditValues(prev => ({ ...prev, negative: value }))}
            />
            {total > 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Will normalize to: {previewValues.positive}% / {previewValues.neutral}% / {previewValues.negative}%
              </p>
            )}
          </>
        ) : (
          <>
            <SentimentBar
              label="Positive"
              percentage={positive}
              color="green"
              isHighlighted={overallSentiment === 'positive'}
            />
            <SentimentBar
              label="Neutral"
              percentage={neutral}
              color="gray"
              isHighlighted={overallSentiment === 'neutral'}
            />
            <SentimentBar
              label="Negative"
              percentage={negative}
              color="red"
              isHighlighted={overallSentiment === 'negative'}
            />
          </>
        )}
      </div>

      {/* Edit/Save button */}
      {onSentimentChange && (
        <div className="mt-4 flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">
                Save
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={handleStartEdit} className="flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit Sentiment
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
