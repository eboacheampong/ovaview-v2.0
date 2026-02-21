'use client'

import { useState } from 'react'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { ZoomIn } from 'lucide-react'

interface ImageGalleryProps {
  images: { url: string; caption?: string | null }[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
    setLightboxOpen(true)
  }

  // Filter out any images with empty/invalid URLs
  const validImages = images.filter(img => img.url && img.url.trim() !== '')

  if (validImages.length === 0) return null

  return (
    <>
      {/* Main Image */}
      <div 
        className="relative group cursor-pointer"
        onClick={() => openLightbox(0)}
      >
        <img 
          src={validImages[0].url} 
          alt={validImages[0].caption || title} 
          className="w-full h-48 sm:h-64 md:h-80 object-cover rounded-xl transition-transform group-hover:scale-[1.01]" 
        />
        {/* Zoom overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
            <ZoomIn className="h-6 w-6 text-gray-700" />
          </div>
        </div>
        {validImages[0].caption && (
          <p className="text-sm text-gray-500 mt-2 text-center">{validImages[0].caption}</p>
        )}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            +{validImages.length - 1} more
          </div>
        )}
      </div>

      {/* Thumbnail Strip for multiple images */}
      {validImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {validImages.map((img, index) => (
            <button
              key={index}
              onClick={() => openLightbox(index)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all hover:opacity-100 ${
                index === 0 ? 'border-orange-500 opacity-100' : 'border-gray-200 opacity-70 hover:border-orange-300'
              }`}
            >
              <img
                src={img.url}
                alt={img.caption || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        images={validImages}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
