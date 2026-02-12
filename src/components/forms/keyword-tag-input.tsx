'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'

interface KeywordTagInputProps {
  keywords: string[]
  onChange: (keywords: string[]) => void
  placeholder?: string
}

export function KeywordTagInput({
  keywords,
  onChange,
  placeholder = 'Type a keyword and press Enter or comma...',
}: KeywordTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault()
      addKeyword(inputValue.trim())
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text/plain')
    const newKeywords = pastedText
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    newKeywords.forEach((kw) => {
      if (!keywords.includes(kw)) {
        keywords.push(kw)
      }
    })

    onChange([...keywords])
    setInputValue('')
  }

  const addKeyword = (keyword: string) => {
    if (!keywords.includes(keyword)) {
      onChange([...keywords, keyword])
    }
    setInputValue('')
  }

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index))
  }

  return (
    <div className="w-full">
      <div className="min-h-[44px] flex flex-wrap gap-2 items-start content-start p-3 border border-gray-300 rounded-md bg-white focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
        {keywords.map((keyword, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-medium group"
          >
            <span>{keyword}</span>
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              className="ml-1 text-blue-500 hover:text-blue-700 hidden group-hover:inline-block"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onPaste={handlePaste}
          placeholder={keywords.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[150px] border-0 outline-none bg-transparent focus:outline-none text-sm"
        />
      </div>
      {keywords.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">{keywords.length} keyword{keywords.length !== 1 ? 's' : ''} added</p>
      )}
    </div>
  )
}
