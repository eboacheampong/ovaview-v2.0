import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'OCR text is required' }, { status: 400 })
    }

    if (text.trim().length < 20) {
      return NextResponse.json({ error: 'Text must be at least 20 characters' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OvaView Media Monitoring',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: `You are an OCR text editor and content analyzer. The following text was extracted from a scanned newspaper or magazine image using OCR (Optical Character Recognition) and likely contains recognition errors.

Please:
1. Fix common OCR errors such as:
   - Character confusion: l/1/I, O/0, rn/m, cl/d, vv/w, fi/fl ligatures
   - Broken or split words from column layouts
   - Missing or extra spaces between words
   - Garbled or nonsense characters
   - Incorrect punctuation from scanning artifacts
   - Words incorrectly joined together
   - Line break issues causing word fragments
   
2. Reconstruct proper paragraphs and sentence structure

3. Generate a concise, descriptive title (max 100 characters) that captures the main topic

4. Analyze the sentiment of the content

IMPORTANT: Preserve the original meaning, tone, and journalistic style. Only fix obvious OCR errors, do not rewrite or paraphrase the content.

OCR text to refine:
"""
${text}
"""

Respond in this exact JSON format only, no other text:
{
  "text": "the corrected text here",
  "title": "Generated Title Here",
  "sentiment": {
    "positive": <number 0-100>,
    "neutral": <number 0-100>,
    "negative": <number 0-100>
  },
  "overallSentiment": "positive" | "neutral" | "negative"
}

The sentiment percentages must add up to 100.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', errorText)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const responseText = data.choices?.[0]?.message?.content || ''

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to parse AI response:', responseText)
      throw new Error('Failed to parse AI response')
    }

    const result = JSON.parse(jsonMatch[0])

    // Validate the response structure
    if (!result.text || !result.title || !result.sentiment || !result.overallSentiment) {
      throw new Error('Invalid AI response structure')
    }

    // Ensure sentiment values are valid numbers
    const { positive, neutral, negative } = result.sentiment
    if (typeof positive !== 'number' || typeof neutral !== 'number' || typeof negative !== 'number') {
      throw new Error('Invalid sentiment values')
    }

    return NextResponse.json({
      text: result.text,
      title: result.title,
      sentiment: {
        positive: Math.round(positive),
        neutral: Math.round(neutral),
        negative: Math.round(negative),
      },
      overallSentiment: result.overallSentiment,
    })

  } catch (error) {
    console.error('Error refining OCR text:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to refine OCR text', details: errorMessage }, { status: 500 })
  }
}
