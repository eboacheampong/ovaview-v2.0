import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface IndustryData {
  id: string;
  name: string;
  subIndustries: { id: string; name: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const { transcription } = await request.json()

    if (!transcription || typeof transcription !== 'string') {
      return NextResponse.json({ error: 'Transcription text is required' }, { status: 400 })
    }

    if (transcription.trim().length < 20) {
      return NextResponse.json({ error: 'Transcription must be at least 20 characters' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    // Fetch available keywords and industries from database
    const [keywords, industries] = await Promise.all([
      prisma.keyword.findMany({ select: { id: true, name: true }, where: { isActive: true } }),
      prisma.industry.findMany({ 
        select: { id: true, name: true, subIndustries: { select: { id: true, name: true } } },
        where: { isActive: true }
      }),
    ])

    const keywordList = keywords.map((k: { id: string; name: string }) => k.name).join(', ')
    const industryList = industries.map((i: IndustryData) => `${i.name} (sub: ${i.subIndustries.map((s: { id: string; name: string }) => s.name).join(', ')})`).join('; ')

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'OvaView Media Monitoring',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'user',
            content: `You are a transcription editor and content analyzer. The following text is a transcription from an audio/video recording that may have errors from the speech-to-text process.

Please:
1. Fix any transcription errors such as:
   - Misspelled words
   - Incomplete or cut-off words (e.g., "gover-" should be "government")
   - Grammar issues
   - Missing punctuation
   - Words that sound similar but are wrong (homophones)
   - Gaps or unclear sections - fill in what makes sense contextually
   
2. Generate a concise, descriptive title (max 100 characters) that captures the main topic

3. Generate a brief summary (2-3 sentences) that captures the key points

4. Analyze the sentiment of the content

5. Select relevant keywords from this list that match the content (pick only those that are truly relevant):
   Available keywords: ${keywordList || 'None available'}

6. Select the most appropriate industry and sub-industries from this list:
   Available industries: ${industryList || 'None available'}

IMPORTANT: Preserve the original meaning, tone, and style. Only fix obvious transcription errors.

Transcription to refine:
"""
${transcription}
"""

Respond in this exact JSON format only, no other text:
{
  "transcription": "the corrected transcription text here",
  "title": "Generated Title Here",
  "summary": "A brief 2-3 sentence summary of the content",
  "sentiment": {
    "positive": <number 0-100>,
    "neutral": <number 0-100>,
    "negative": <number 0-100>
  },
  "overallSentiment": "positive" | "neutral" | "negative",
  "suggestedKeywords": ["keyword1", "keyword2"],
  "suggestedIndustry": "Industry Name or null if none match",
  "suggestedSubIndustries": ["SubIndustry1", "SubIndustry2"]
}

The sentiment percentages must add up to 100. Only include keywords and industries from the provided lists that are truly relevant.`
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
    if (!result.transcription || !result.title || !result.sentiment || !result.overallSentiment) {
      throw new Error('Invalid AI response structure')
    }

    // Ensure sentiment values are valid numbers
    const { positive, neutral, negative } = result.sentiment
    if (typeof positive !== 'number' || typeof neutral !== 'number' || typeof negative !== 'number') {
      throw new Error('Invalid sentiment values')
    }

    // Find industry ID from name
    let industryId: string | null = null
    let subIndustryIds: string[] = []
    if (result.suggestedIndustry) {
      const matchedIndustry = industries.find((i: IndustryData) => i.name.toLowerCase() === result.suggestedIndustry?.toLowerCase())
      if (matchedIndustry) {
        industryId = matchedIndustry.id
        if (result.suggestedSubIndustries && Array.isArray(result.suggestedSubIndustries)) {
          subIndustryIds = matchedIndustry.subIndustries
            .filter((s: { id: string; name: string }) => result.suggestedSubIndustries.some((ss: string) => ss.toLowerCase() === s.name.toLowerCase()))
            .map((s: { id: string; name: string }) => s.id)
        }
      }
    }

    return NextResponse.json({
      transcription: result.transcription,
      title: result.title,
      summary: result.summary || '',
      sentiment: {
        positive: Math.round(positive),
        neutral: Math.round(neutral),
        negative: Math.round(negative),
      },
      overallSentiment: result.overallSentiment,
      suggestedKeywords: result.suggestedKeywords || [],
      suggestedIndustryId: industryId,
      suggestedSubIndustryIds: subIndustryIds,
    })

  } catch (error) {
    console.error('Error refining transcription:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to refine transcription', details: errorMessage }, { status: 500 })
  }
}
