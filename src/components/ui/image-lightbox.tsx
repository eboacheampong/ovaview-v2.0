'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download } from 'lucide-react'

interface ImageLightboxProps {
  images: { url: string; caption?: string | null }[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex = 0, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setScale(1)
    setRotation(0)
  }, [initialIndex, isOpen])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
        setScale(1)
        setRotation(0)
        break
      case 'ArrowRight':
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
        setScale(1)
        setRotation(0)
        break
      case '+':
      case '=':
        setScale(prev => Math.min(prev + 0.25, 5))
        break
      case '-':
        setScale(prev => Math.max(prev - 0.25, 0.5))
        break
    }
  }, [isOpen, images.length, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
    setScale(1)
    setRotation(0)
  }
  const handleNext = () => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
    setScale(1)
    setRotation(0)
  }
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = currentImage.url
    link.download = `image-${currentIndex + 1}`
    link.target = '_blank'
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-white/70 text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Rotate"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        <div 
          className="max-w-full max-h-full overflow-auto flex items-center justify-center"
          style={{ cursor: scale > 1 ? 'grab' : 'default' }}
        >
          <img
            src={currentImage.url}
            alt={currentImage.caption || 'Image'}
            className="max-w-none transition-transform duration-200"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              maxHeight: scale === 1 ? '85vh' : 'none',
              maxWidth: scale === 1 ? '90vw' : 'none',
            }}
            draggable={false}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Caption */}
      {currentImage.caption && (
        <div className="p-4 bg-black/50 text-center">
          <p className="text-white/80 text-sm">{currentImage.caption}</p>
        </div>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="p-4 bg-black/50 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setScale(1)
                  setRotation(0)
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-orange-500 opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-75'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.caption || `Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
