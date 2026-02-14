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

    // Send to Gemma 3 4B IT model for extraction
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OvaView Media Monitoring',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-4b-it',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a newspaper and magazine article extraction specialist. Carefully examine this image and extract the complete article text exactly as it appears.

EXTRACTION RULES:
1. Extract ALL text from the article including headers, body, bylines, and publication details
2. Preserve the original formatting structure (paragraphs, line breaks)
3. Include quotations exactly as they appear
4. If there are multiple articles visible, extract the MAIN/PRIMARY article
5. Skip any advertisements, page numbers, or non-article text
6. Fix obvious OCR scanning artifacts if the source appears to be pre-OCR'd
7. Return only the extracted text, nothing else

Return the extracted article text:`,
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
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemma API error:', errorText)
      throw new Error(`Gemma API error: ${response.status}`)
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
