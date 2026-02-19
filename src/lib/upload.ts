export interface UploadResult {
  url: string
  error?: string
}

/**
 * Upload a file to Vercel Blob using streaming.
 * This bypasses serverless function body size limits by streaming
 * the file directly to Vercel Blob storage.
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  try {
    // Use streaming upload for large files (bypasses body size limit)
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        'x-filename': file.name,
        'x-folder': folder,
      },
      body: file, // Stream the file directly
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }
    
    return { url: data.url }
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return { url: '', error: message }
  }
}
