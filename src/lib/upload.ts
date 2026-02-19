import { upload } from '@vercel/blob/client'

export interface UploadResult {
  url: string
  error?: string
}

/**
 * Upload a file directly to Vercel Blob from the client.
 * This bypasses serverless function body size limits.
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads',
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    // Generate a unique filename
    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const blob = await upload(filename, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
    })

    return { url: blob.url }
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return { url: '', error: message }
  }
}
