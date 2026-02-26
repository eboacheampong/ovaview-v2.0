import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Convert image to base64
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mediaType = file.type || 'image/jpeg'
    const imageDataUrl = `data:${mediaType};base64,${base64}`

    // Send to Llama 3.1 8B model for faster extraction
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OvaView Media Monitoring',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-11b-vision-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract ALL text from this newspaper/magazine article image. Include headers, body text, bylines, and publication details. Preserve paragraph structure. Skip ads and page numbers. Return only the extracted text, nothing else.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Vision API error:', errorText)
      throw new Error(`Vision API error: ${response.status}`)
    }

    const data = await response.json()
    const extractedText = data.choices?.[0]?.message?.content || ''

    if (!extractedText) {
      return NextResponse.json({ error: 'Failed to extract text from image' }, { status: 500 })
    }

    return NextResponse.json({ text: extractedText.trim() })
  } catch (error) {
    console.error('Error extracting article with AI:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to extract article', details: errorMessage }, { status: 500 })
  }
}
