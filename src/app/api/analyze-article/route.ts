import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Models to try in order (primary + fallbacks)
const MODELS = [
  'meta-llama/llama-3.1-8b-instruct',
  'mistralai/mistral-nemo',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
]

// Response interfaces as defined in design doc
interface AnalysisResponse {
  summary: string;
  sentiment: {
    positive: number;  // 0-100
    neutral: number;   // 0-100
    negative: number;  // 0-100
  };
  overallSentiment: 'positive' | 'neutral' | 'negative';
  suggestedKeywords: string[];
  suggestedIndustryId: string | null;
  suggestedSubIndustryIds: string[];
}

interface AIResponse {
  summary: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  overallSentiment: string;
  suggestedKeywords?: string[];
  suggestedIndustry?: string;
  suggestedSubIndustries?: string[];
}

interface IndustryData {
  id: string;
  name: string;
  subIndustries: { id: string; name: string }[];
}

/**
 * Strips HTML tags and entities from content to get plain text
 */
function stripHtml(content: string): string {
  return content
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
}

/**
 * Parses the AI response and extracts JSON from potential markdown code blocks
 */
function parseAIResponse(responseText: string): AIResponse {
  // Remove markdown code blocks if present
  let jsonText = responseText.trim()
  
  // Handle ```json ... ``` format
  const jsonBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    jsonText = jsonBlockMatch[1].trim()
  }
  
  // Parse the JSON
  const parsed = JSON.parse(jsonText)
  
  return parsed as AIResponse
}

/**
 * Validates that a sentiment percentage is within the valid range (0-100)
 */
function isValidPercentage(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100
}

/**
 * Validates and normalizes sentiment percentages to ensure they sum to 100
 * Returns normalized values or null if validation fails
 */
function validateAndNormalizeSentiment(sentiment: { positive: number; neutral: number; negative: number }): { positive: number; neutral: number; negative: number } | null {
  const { positive, neutral, negative } = sentiment
  
  // Validate each percentage is a valid number
  if (!isValidPercentage(positive) || !isValidPercentage(neutral) || !isValidPercentage(negative)) {
    return null
  }
  
  const sum = positive + neutral + negative
  
  // If sum is 0, we can't normalize - return null
  if (sum === 0) {
    return null
  }
  
  // If percentages already sum to 100 (with small tolerance for floating point), return as-is
  if (Math.abs(sum - 100) < 0.01) {
    return {
      positive: Math.round(positive),
      neutral: Math.round(neutral),
      negative: Math.round(negative),
    }
  }
  
  // Normalize percentages to sum to 100
  const normalizedPositive = Math.round((positive / sum) * 100)
  const normalizedNeutral = Math.round((neutral / sum) * 100)
  // Calculate negative to ensure exact sum of 100 (avoid rounding errors)
  const normalizedNegative = 100 - normalizedPositive - normalizedNeutral
  
  return {
    positive: normalizedPositive,
    neutral: normalizedNeutral,
    negative: normalizedNegative,
  }
}

/**
 * Determines the overall sentiment based on highest percentage
 */
function determineOverallSentiment(sentiment: { positive: number; neutral: number; negative: number }): 'positive' | 'neutral' | 'negative' {
  const { positive, neutral, negative } = sentiment
  
  if (positive >= neutral && positive >= negative) {
    return 'positive'
  } else if (negative >= positive && negative >= neutral) {
    return 'negative'
  } else {
    return 'neutral'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, existingKeywords } = await request.json()

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
    const plainText = stripHtml(content)

    // Limit content length for API
    const truncatedContent = plainText.slice(0, 3000)

    if (truncatedContent.length < 50) {
      return NextResponse.json(
        { error: 'Article content is too short to analyze' },
        { status: 400 }
      )
    }

    // Fetch available keywords and industries from database
    const [keywords, industries] = await Promise.all([
      prisma.keyword.findMany({ select: { id: true, name: true }, where: { isActive: true } }),
      prisma.industry.findMany({ 
        select: { id: true, name: true, subIndustries: { select: { id: true, name: true } } },
        where: { isActive: true }
      }),
    ])

    // Use existing keywords if provided, otherwise use all keywords from DB
    const keywordList = existingKeywords && existingKeywords.length > 0 
      ? existingKeywords.join(', ')
      : keywords.map((k: { id: string; name: string }) => k.name).join(', ')
    const industryList = industries.map((i: IndustryData) => `${i.name} (sub: ${i.subIndustries.map((s: { id: string; name: string }) => s.name).join(', ')})`).join('; ')

    // Prompt designed to request JSON output with summary and sentiment
    const prompt = `You are a professional news analyst. Analyze this article and return a JSON response with:
1. A professional summary in 2-4 sentences
2. Sentiment breakdown as percentages (must sum to 100)
3. Overall sentiment (the category with highest percentage)
4. Select keywords ONLY from this exact list - DO NOT suggest any keyword not in this list:
   Available keywords: ${keywordList || 'None available'}
5. Select the most appropriate industry and sub-industries from: ${industryList || 'None available'}

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

Return ONLY valid JSON in this exact format:
{
  "summary": "...",
  "sentiment": {
    "positive": <number>,
    "neutral": <number>,
    "negative": <number>
  },
  "overallSentiment": "positive" | "neutral" | "negative",
  "suggestedKeywords": ["keyword1", "keyword2"],
  "suggestedIndustry": "Industry Name or null",
  "suggestedSubIndustries": ["SubIndustry1", "SubIndustry2"]
}

Article:
${truncatedContent}`

    // Store industries for later ID lookup
    const industriesData: IndustryData[] = industries

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
            max_tokens: 800,
            temperature: 0.3, // Lower temperature for more consistent JSON output
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Model ${model} failed:`, response.status, errorText)
          lastError = `${model}: ${response.status}`
          continue
        }

        const data = await response.json()
        
        let responseText = ''
        if (data.choices && data.choices[0]) {
          responseText = data.choices[0].message?.content || data.choices[0].text || ''
        }

        if (!responseText) {
          lastError = `${model}: empty response`
          continue
        }

        try {
          // Parse the AI response as JSON
          const aiResponse = parseAIResponse(responseText)
          
          // Validate required fields exist
          if (!aiResponse.summary || typeof aiResponse.summary !== 'string') {
            lastError = `${model}: missing or invalid summary`
            continue
          }
          
          if (!aiResponse.sentiment || 
              typeof aiResponse.sentiment.positive !== 'number' ||
              typeof aiResponse.sentiment.neutral !== 'number' ||
              typeof aiResponse.sentiment.negative !== 'number') {
            lastError = `${model}: missing or invalid sentiment data`
            continue
          }

          // Validate and normalize sentiment percentages (Requirement 1.2)
          const normalizedSentiment = validateAndNormalizeSentiment(aiResponse.sentiment)
          
          if (!normalizedSentiment) {
            lastError = `${model}: sentiment percentages are invalid or cannot be normalized`
            continue
          }

          // Clean up the summary (remove any markdown formatting)
          const cleanSummary = aiResponse.summary
            .replace(/\*\*/g, '')      // Remove bold **text**
            .replace(/\*/g, '')        // Remove italic *text*
            .replace(/^#+\s*/gm, '')   // Remove headers # ## ###
            .replace(/^[-•]\s*/gm, '') // Remove bullet points
            .replace(/`/g, '')         // Remove code backticks
            .replace(/\n+/g, ' ')      // Replace newlines with spaces
            .trim()

          // Determine overall sentiment from highest percentage (Requirement 1.3)
          const overallSentiment = determineOverallSentiment(normalizedSentiment)

          // Filter suggested keywords to only include existing ones
          let filteredKeywords: string[] = []
          if (aiResponse.suggestedKeywords && Array.isArray(aiResponse.suggestedKeywords)) {
            const availableKeywordNames = existingKeywords && existingKeywords.length > 0
              ? existingKeywords.map((k: string) => k.toLowerCase())
              : keywords.map((k: { id: string; name: string }) => k.name.toLowerCase())
            
            filteredKeywords = aiResponse.suggestedKeywords.filter((suggestedKeyword: string) =>
              availableKeywordNames.some((existingKeyword: string) => 
                existingKeyword === suggestedKeyword.toLowerCase()
              )
            )
          }

          // Find industry ID from name
          let industryId: string | null = null
          let subIndustryIds: string[] = []
          if (aiResponse.suggestedIndustry) {
            const matchedIndustry = industriesData.find(
              (i: IndustryData) => i.name.toLowerCase() === aiResponse.suggestedIndustry?.toLowerCase()
            )
            if (matchedIndustry) {
              industryId = matchedIndustry.id
              if (aiResponse.suggestedSubIndustries && Array.isArray(aiResponse.suggestedSubIndustries)) {
                subIndustryIds = matchedIndustry.subIndustries
                  .filter((s: { id: string; name: string }) => 
                    aiResponse.suggestedSubIndustries!.some((ss: string) => ss.toLowerCase() === s.name.toLowerCase())
                  )
                  .map((s: { id: string; name: string }) => s.id)
              }
            }
          }

          const analysisResponse: AnalysisResponse = {
            summary: cleanSummary,
            sentiment: normalizedSentiment,
            overallSentiment,
            suggestedKeywords: filteredKeywords,
            suggestedIndustryId: industryId,
            suggestedSubIndustryIds: subIndustryIds,
          }

          console.log(`Successfully generated analysis using ${model}`)
          return NextResponse.json(analysisResponse)
          
        } catch (parseError) {
          console.error(`Failed to parse JSON from ${model}:`, parseError)
          lastError = `${model}: invalid JSON response`
          continue
        }
        
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError)
        lastError = `${model}: ${modelError}`
        continue
      }
    }

    console.error('All models failed. Last error:', lastError)
    return NextResponse.json(
      { error: 'Failed to analyze article. Please try again.' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze article. Please try again.' },
      { status: 500 }
    )
  }
}
