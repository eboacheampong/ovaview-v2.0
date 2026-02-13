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
            content: `You are an advanced OCR text correction system with semantic understanding. The following text was extracted from a scanned newspaper or magazine using OCR and contains recognition errors.

CORRECTION STRATEGY:
Use contextual and linguistic knowledge to fix errors intelligently. When you encounter a word that seems incorrect:
1. Check if it's a real word in context
2. If not, find the closest matching real word that makes semantic sense
3. Apply character-level and contextual fixes simultaneously

SPECIFIC ERROR TYPES TO FIX:
- Broken words: "breforms" → "reforms", "stuation" → "situation", "goverment" → "government"
- Character substitutions: "l/1/I", "O/0", "rn/m", "cl/d", "vv/w", "fi/fl"
- Words split across columns: merge fragments back together using context
- Garbled words: replace with semantically appropriate real words
- Repeated or missing characters: "reccommend" → "recommend", "siad" → "said"
- Words that don't fit context: replace with similar words that do

PRESERVATION RULES:
- Do NOT paraphrase or rewrite content
- Do NOT add information that wasn't there
- Preserve original tone, style, and journalistic intent
- Only correct words that are clearly errors (not stylistic choices)

FORMATTING:
Detect and preserve formatting as HTML:
- Headers/titles: wrap in <h2> tags
- Bullet lists: wrap in <ul><li> tags
- Numbered lists: wrap in <ol><li> tags
- Quotations: wrap in <blockquote> or preserve with quotation marks
- Bold emphasis: wrap in <strong> tags
- Italics: wrap in <em> tags
- Paragraphs: wrap in <p> tags
- Important: Do NOT add formatting that wasn't in the original text

ANALYSIS TASKS:
1. Generate a concise, descriptive title (max 100 characters) capturing the main topic
2. Analyze sentiment of the corrected content
3. Select ONLY keywords directly relevant to the main topic from this list (STRICT and CONSERVATIVE):
   Available keywords: ${keywordList || 'None available'}
4. Select the most appropriate industry and sub-industries from this list:
   Available industries: ${industryList || 'None available'}

KEYWORD SELECTION RULES:
- ONLY keywords that are the CORE TOPIC or PRIMARY FOCUS
- Be STRICT - when in doubt, exclude it
- Do NOT select tangentially mentioned topics
- Prefer 0-3 highly relevant keywords over many loose ones
- Article must be PRIMARILY ABOUT the keyword, not just mention it in passing

OCR text to correct and analyze:
"""
${text}
"""

Respond in this exact JSON format only, no other text:
{
  "text": "the fully corrected and formatted text with HTML markup",
  "title": "Generated Title Here",
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

Sentiment percentages must sum to 100. Use semantic knowledge to fix broken words intelligently.`
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
      text: result.text,
      title: result.title,
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
    console.error('Error refining OCR text:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to refine OCR text', details: errorMessage }, { status: 500 })
  }
}
