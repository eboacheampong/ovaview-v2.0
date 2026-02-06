'use client'

import { useState, useCallback, useEffect } from 'react'
import Tesseract from 'tesseract.js'

interface OCRProgress {
  status: 'idle' | 'loading' | 'processing' | 'complete' | 'error'
  progress: number
  message: string
}

interface UseOCRReturn {
  extractText: (file: File) => Promise<string>
  progress: OCRProgress
  error: string | null
}

export function useOCR(): UseOCRReturn {
  const [progress, setProgress] = useState<OCRProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const extractText = useCallback(async (file: File): Promise<string> => {
    if (!isMounted) {
      throw new Error('Not mounted')
    }

    setError(null)
    setProgress({
      status: 'loading',
      progress: 0,
      message: 'Initializing OCR...',
    })

    try {
      // Create image URL from file
      const imageUrl = URL.createObjectURL(file)

      const result = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'loading tesseract core') {
              setProgress({
                status: 'loading',
                progress: 10,
                message: 'Loading OCR engine...',
              })
            } else if (m.status === 'initializing tesseract') {
              setProgress({
                status: 'loading',
                progress: 20,
                message: 'Initializing...',
              })
            } else if (m.status === 'loading language traineddata') {
              setProgress({
                status: 'loading',
                progress: 30,
                message: 'Loading language data...',
              })
            } else if (m.status === 'initializing api') {
              setProgress({
                status: 'processing',
                progress: 40,
                message: 'Preparing image...',
              })
            } else if (m.status === 'recognizing text') {
              const pct = Math.round(40 + (m.progress * 60))
              setProgress({
                status: 'processing',
                progress: pct,
                message: `Extracting text: ${Math.round(m.progress * 100)}%`,
              })
            }
          },
        }
      )

      // Clean up
      URL.revokeObjectURL(imageUrl)

      const extractedText = result.data.text.trim()

      setProgress({
        status: 'complete',
        progress: 100,
        message: 'Text extracted!',
      })

      if (!extractedText) {
        throw new Error('No text could be extracted from this image')
      }

      return extractedText
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR failed'
      setError(errorMessage)
      setProgress({
        status: 'error',
        progress: 0,
        message: errorMessage,
      })
      throw err
    }
  }, [isMounted])

  return {
    extractText,
    progress,
    error,
  }
}
