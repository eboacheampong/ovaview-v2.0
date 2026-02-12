'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Keyword {
  id: string
  name: string
}

interface KeywordInputProps {
  value: string
  onChange: (value: string) => void
  availableKeywords: Keyword[]
  placeholder?: string
  className?: string
}

export function KeywordInput({ value, onChange, availableKeywords, placeholder = 'Type keywords...', className = '' }: KeywordInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse current keywords from comma-separated string
  const currentKeywords = value ? value.split(',').map(k => k.trim()).filter(Boolean) : []

  // Filter suggestions based on input
  const suggestions = inputValue.trim()
    ? availableKeywords.filter(k => 
        k.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !currentKeywords.some(ck => ck.toLowerCase() === k.name.toLowerCase())
      ).slice(0, 8)
    : []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    if (currentKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) return
    
    const newKeywords = [...currentKeywords, trimmed]
    onChange(newKeywords.join(', '))
    setInputValue('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
    // keep focus on the input so typing can continue without interruption
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const removeKeyword = (index: number) => {
    const newKeywords = currentKeywords.filter((_, i) => i !== index)
    onChange(newKeywords.join(', '))
    // keep focus on the input after removing a tag
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addKeyword(suggestions[selectedIndex].name)
      } else if (inputValue.trim()) {
        addKeyword(inputValue)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    } else if (e.key === ',' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault()
        addKeyword(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && currentKeywords.length > 0) {
      removeKeyword(currentKeywords.length - 1)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent">
        {currentKeywords.map((keyword, index) => (
          <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
            {keyword}
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => removeKeyword(index)} className="hover:bg-orange-200 rounded p-0.5">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={currentKeywords.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm"
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addKeyword(suggestion.name)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-orange-50 ${
                index === selectedIndex ? 'bg-orange-100' : ''
              }`}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
