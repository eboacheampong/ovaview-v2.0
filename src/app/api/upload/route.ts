import { put } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

// Increase timeout for large uploads
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    // Handle client-upload token request (JSON body)
    if (contentType.includes('application/json')) {
      const body = await request.json() as HandleUploadBody
      
      try {
        const jsonResponse = await handleUpload({
          body,
          request,
          onBeforeGenerateToken: async (pathname) => {
            return {
              allowedContentTypes: [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
                'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
              ],
              maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
            }
          },
          onUploadCompleted: async ({ blob }) => {
            console.log('Upload completed:', blob.url)
          },
        })
        return NextResponse.json(jsonResponse)
      } catch (error) {
        console.error('handleUpload error:', error)
        return NextResponse.json({ error: 'Upload token generation failed' }, { status: 500 })
      }
    }
    
    // Handle traditional form data upload (for smaller files only)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const blob = await put(filename, file, {
      access: 'public',
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Upload from URL (for web article images)
export async function PUT(request: NextRequest) {
  try {
    const { url, folder = 'web-images' } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Fetch the image from the URL
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 })
    }

    const buffer = await response.arrayBuffer()
    
    // Max 10MB
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 400 })
    }

    // Generate filename from URL or random
    const timestamp = Date.now()
    const ext = contentType.split('/')[1] || 'jpg'
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    })

    return NextResponse.json({ url: blob.url, originalUrl: url })
  } catch (error) {
    console.error('URL upload error:', error)
    return NextResponse.json({ error: 'Failed to upload from URL' }, { status: 500 })
  }
}
