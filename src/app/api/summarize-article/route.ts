import { NextRequest, NextResponse } from 'next/server'

// Models to try in order (primary + fallbacks)
const MODELS = [
  'google/gemma-3-27b-it:free',
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Article content is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    // Strip HTML tags to get plain text
    const plainText = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    // Limit content length for API
    const truncatedContent = plainText.slice(0, 3000)

    if (truncatedContent.length < 50) {
      return NextResponse.json(
        { error: 'Article content is too short to summarize' },
        { status: 400 }
      )
    }

    const prompt = `You are a professional news editor. Write a formal, professional, summary of this article in 2-4 sentences. Be factual and objective. Return ONLY the summary text, nothing else.

Article:
${truncatedContent}`

    // Try each model until one succeeds
    let lastError = ''
    for (const model of MODELS) {
      try {
        console.log(`Trying model: ${model}`)
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'OvaView',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.5,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Model ${model} failed:`, response.status, errorText)
          lastError = `${model}: ${response.status}`
          continue
        }

        const data = await response.json()
        
        let summary = ''
        if (data.choices && data.choices[0]) {
          summary = data.choices[0].message?.content || data.choices[0].text || ''
        }

        // Clean up markdown formatting from AI output
        summary = summary
          .replace(/\*\*/g, '')      // Remove bold **text**
          .replace(/\*/g, '')        // Remove italic *text*
          .replace(/^#+\s*/gm, '')   // Remove headers # ## ###
          .replace(/^[-•]\s*/gm, '') // Remove bullet points
          .replace(/`/g, '')         // Remove code backticks
          .replace(/\n+/g, ' ')      // Replace newlines with spaces
          .trim()

        if (summary) {
          console.log(`Successfully generated summary using ${model}`)
          return NextResponse.json({ summary })
        }
        
        lastError = `${model}: empty response`
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError)
        lastError = `${model}: ${modelError}`
        continue
      }
    }

    console.error('All models failed. Last error:', lastError)
    return NextResponse.json(
      { error: 'Failed to generate summary. Please try again.' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Summarization error:', error)
    return NextResponse.json(
      { error: 'Failed to summarize. Please try again.' },
      { status: 500 }
    )
  }
}
