export interface UploadResult {
  url: string
  error?: string
}

/**
 * Upload a file to Vercel Blob via the API route.
 * For large files, this may fail due to serverless function limits.
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
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
