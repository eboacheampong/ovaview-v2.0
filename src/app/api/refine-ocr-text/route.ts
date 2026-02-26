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
            content: `You are an advanced OCR text correction system with strong semantic understanding. The following text was extracted from a scanned newspaper or magazine using OCR and contains recognition errors.

CRITICAL PREPROCESSING:
1. Start the article from where actual editorial content begins - SKIP any headers, page numbers, publication info, or preamble text
2. Remove OCR artifacts that are just metadata or page markers
3. The output should be the pure article content, nothing before it starts

AGGRESSIVE SEMANTIC CORRECTION:
Apply strong linguistic knowledge to fix errors. When a word is clearly wrong:
1. Recognize non-existent words and replace with the correct similar word that makes sense in context
2. Example: "breforms" → "reforms" (not real word, but reforms makes semantic sense)
3. Example: "stuation" → "situation" (obvious OCR error, one real word matches)
4. Example: "goverment" → "government" (clear typo, fix it)
5. Example: "reccommend" → "recommend" (extra character, fix it)
6. Example: "per cent" → "percent" (compound word correction)
7. Use context clues to determine the intended word when multiple similar words exist

CHARACTER AND FORMATTING FIXES:
- Character confusion: l/1/I, O/0, rn/m, cl/d, vv/w, fi/fl
- Words split/merged across columns: reconstruct intelligently
- Missing/extra spaces between words
- Repeated characters: "thee" → "the"
- CRITICAL: Do NOT interpret single bolded letters at word starts as intentional formatting
  - These are OCR artifacts from scanning and should be ignored
  - Only preserve formatting that spans multiple characters or full words

LEGITIMATE FORMATTING TO PRESERVE (HTML):
- Actual headers/titles (usually larger text): wrap in <h2> tags
- Actual bullet/numbered lists (with visible bullets/numbers): wrap in <ul><li> or <ol><li> tags
- Extended quotations (block quotes): wrap in <blockquote> tags
- Full words or phrases that are bold: wrap in <strong> tags
- Full words or phrases that are italic: wrap in <em> tags
- Paragraphs: wrap in <p> tags
- Standard punctuation like quotation marks in the text: KEEP THEM
- Important: Only preserve formatting that is clearly intentional, not OCR scanning artifacts

PRESERVATION RULES:
- Do NOT paraphrase or rewrite content
- Do NOT add information that wasn't in the original
- Preserve original tone, style, and journalistic intent
- Keep all quotation marks and attributed speech exactly as they appear
- Only correct clear OCR errors, not stylistic choices

ANALYSIS TASKS:
1. Generate a concise, descriptive title (max 100 characters) capturing the main topic
2. Generate a brief summary (2-3 sentences) capturing the key points
3. Analyze sentiment of the corrected content
4. Select keywords ONLY from this exact list - DO NOT suggest any keyword not in this list:
   Available keywords: ${keywordList || 'None available'}
5. Select the most appropriate industry and sub-industries (STRICT and CONSERVATIVE):
   Available industries: ${industryList || 'None available'}

CRITICAL KEYWORD SELECTION RULES - READ CAREFULLY:
- You can ONLY select keywords from the "Available keywords" list above
- If a keyword is not in that list, DO NOT suggest it under any circumstances
- ONLY select keywords if the article is PRIMARILY and EXPLICITLY about that exact topic
- The keyword must be a CENTRAL THEME of the article, not just mentioned once
- If the article doesn't clearly match any keyword in the list, return an EMPTY array []
- When in doubt, DO NOT include the keyword - prefer fewer keywords over wrong keywords
- Maximum 3 keywords, but 0-1 is often correct
- Do NOT select keywords based on vague associations or tangential mentions
- The article must spend significant paragraphs discussing the keyword topic to qualify

INDUSTRY SELECTION RULES:
- ONLY select industry if the article is PRIMARILY ABOUT that industry's core business/activities
- Be STRICT and CONSERVATIVE - select at most 1 industry
- Do NOT select if the industry is just mentioned in passing or as context
- The industry selected should be the MAIN SECTOR/FOCUS of the article
- If no industry is a clear primary match, return null
- Sub-industries: ONLY select sub-industries under the primary industry if they are explicitly relevant
- Prefer 0-2 sub-industries maximum

OCR text to correct and analyze:
"""
${text}
"""

Respond in this exact JSON format only, no other text:
{
  "text": "the fully corrected and formatted article with HTML markup, starting from actual content",
  "title": "Generated Title Here",
  "summary": "A brief 2-3 sentence summary of the article content",
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

Use aggressive semantic knowledge to fix broken/non-existent words. Sentiment percentages must sum to 100.`
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

    // Filter suggested keywords to only include ones that exist in the database
    const availableKeywordNames = keywords.map((k: { id: string; name: string }) => k.name.toLowerCase())
    const filteredKeywords = (result.suggestedKeywords || []).filter((suggestedKeyword: string) =>
      availableKeywordNames.some((existingKeyword: string) => 
        existingKeyword === suggestedKeyword.toLowerCase()
      )
    )

    return NextResponse.json({
      text: result.text,
      title: result.title,
      summary: result.summary || '',
      sentiment: {
        positive: Math.round(positive),
        neutral: Math.round(neutral),
        negative: Math.round(negative),
      },
      overallSentiment: result.overallSentiment,
      suggestedKeywords: filteredKeywords,
      suggestedIndustryId: industryId,
      suggestedSubIndustryIds: subIndustryIds,
    })

  } catch (error) {
    console.error('Error refining OCR text:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to refine OCR text', details: errorMessage }, { status: 500 })
  }
}
