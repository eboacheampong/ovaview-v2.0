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

  if (images.length === 0) return null

  return (
    <>
      {/* Main Image */}
      <div 
        className="relative group cursor-pointer"
        onClick={() => openLightbox(0)}
      >
        <img 
          src={images[0].url} 
          alt={images[0].caption || title} 
          className="w-full h-48 sm:h-64 md:h-80 object-cover rounded-xl transition-transform group-hover:scale-[1.01]" 
        />
        {/* Zoom overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
            <ZoomIn className="h-6 w-6 text-gray-700" />
          </div>
        </div>
        {images[0].caption && (
          <p className="text-sm text-gray-500 mt-2 text-center">{images[0].caption}</p>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            +{images.length - 1} more
          </div>
        )}
      </div>

      {/* Thumbnail Strip for multiple images */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
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
        images={images}
        initialIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
