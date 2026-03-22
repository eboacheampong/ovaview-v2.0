/**
 * AI Auto-Publish Service
 * 
 * Takes scraped content (DailyInsight or SocialPost with status=pending),
 * verifies relevance to the client via AI, extracts all required fields
 * (summary, sentiment, keywords, industry, key personalities), and
 * creates the corresponding WebStory or SocialPost (status=accepted).
 * 
 * Uses the same OpenRouter AI models as /api/analyze-article.
 */
import { prisma } from '@/lib/prisma'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || ''
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const MODELS = [
  'meta-llama/llama-3.1-8b-instruct',
  'mistralai/mistral-nemo',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
]

// ─── Types ──────────────────────────────────────────────────────────

interface AIAnalysis {
  isRelevant: boolean
  relevanceReason: string
  summary: string
  sentiment: { positive: number; neutral: number; negative: number }
  overallSentiment: 'positive' | 'neutral' | 'negative'
  suggestedKeywords: string[]
  suggestedIndustryId: string | null
  suggestedSubIndustryIds: string[]
  keyPersonalities: string[]
}

interface PublishResult {
  insightId: string
  action: 'published' | 'skipped' | 'error'
  reason: string
  webStoryId?: string
}

interface SocialPublishResult {
  postId: string
  action: 'published' | 'skipped' | 'error'
  reason: string
}

// ─── AI Call ────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<string | null> {
  if (!OPENROUTER_API_KEY) return null

  for (const model of MODELS) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'OvaView AutoPublish',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.2,
        }),
      })

      if (!res.ok) continue

      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ''
      if (text) return text
    } catch {
      continue
    }
  }
  return null
}

function parseJSON(text: string): Record<string, unknown> | null {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = match ? match[1].trim() : text.trim()
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

// ─── Article Content Extraction ─────────────────────────────────────

async function fetchArticleContent(url: string): Promise<{
  title: string; content: string; author: string; date: string; image: string; publication: string
} | null> {
  try {
    // Try Jina Reader first (best quality)
    const jinaKey = process.env.JINA_API_KEY
    if (jinaKey) {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Authorization': `Bearer ${jinaKey}`,
          'Accept': 'application/json',
          'X-Return-Format': 'json',
        },
        signal: AbortSignal.timeout(15000),
      })
      if (jinaRes.ok) {
        const jina = await jinaRes.json()
        if (jina.data?.content && jina.data.content.length > 100) {
          return {
            title: jina.data.title || '',
            content: jina.data.content.substring(0, 5000),
            author: jina.data.author || '',
            date: jina.data.publishedTime || '',
            image: jina.data.image || '',
            publication: jina.data.siteName || new URL(url).hostname.replace('www.', ''),
          }
        }
      }
    }

    // Fallback: direct fetch + parse
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const html = await res.text()
    const title = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ''
    const image = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''
    const author = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''
    const date = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i)?.[1] || ''
    const siteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1]
      || new URL(url).hostname.replace('www.', '')

    // Extract article text
    let articleHtml = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1]
      || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || ''
    articleHtml = articleHtml
      .replace(/<(nav|footer|aside|script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
    const paragraphs = (articleHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [])
      .map(p => p.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 30)
    const content = paragraphs.join('\n\n').substring(0, 5000)

    return { title, content, author, date, image, publication: siteName }
  } catch {
    return null
  }
}

// ─── AI Analysis ────────────────────────────────────────────────────

async function analyzeForClient(
  content: string,
  clientName: string,
  clientKeywords: string[],
  availableKeywords: string[],
  industries: { id: string; name: string; subs: { id: string; name: string }[] }[],
): Promise<AIAnalysis | null> {
  const industryList = industries.map(i =>
    `${i.name} (ID: ${i.id}, subs: ${i.subs.map(s => `${s.name}[${s.id}]`).join(', ')})`
  ).join('; ')

  const prompt = `You are a media monitoring AI. Analyze this article for client "${clientName}".
Client keywords: ${clientKeywords.join(', ')}

TASK:
1. Determine if this article is RELEVANT to the client "${clientName}" — it must mention the client, their industry, or their keywords substantially (not just in passing).
2. If relevant, provide a professional summary (2-4 sentences), sentiment analysis, keywords, industry classification, and key personalities.

Available keywords to choose from (ONLY use these): ${availableKeywords.join(', ') || 'None'}
Available industries: ${industryList || 'None'}

Return ONLY valid JSON:
{
  "isRelevant": true/false,
  "relevanceReason": "why relevant or not",
  "summary": "2-4 sentence professional summary",
  "sentiment": { "positive": <0-100>, "neutral": <0-100>, "negative": <0-100> },
  "overallSentiment": "positive" | "neutral" | "negative",
  "suggestedKeywords": ["keyword1"],
  "suggestedIndustryId": "industry ID or null",
  "suggestedSubIndustryIds": ["sub ID 1"],
  "keyPersonalities": ["Full Name 1"]
}

Article content:
${content.substring(0, 3000)}`

  const response = await callAI(prompt)
  if (!response) return null

  const parsed = parseJSON(response)
  if (!parsed) return null

  // Normalize sentiment
  const sent = parsed.sentiment as { positive: number; neutral: number; negative: number } | undefined
  if (sent) {
    const sum = (sent.positive || 0) + (sent.neutral || 0) + (sent.negative || 0)
    if (sum > 0 && Math.abs(sum - 100) > 1) {
      sent.positive = Math.round(((sent.positive || 0) / sum) * 100)
      sent.neutral = Math.round(((sent.neutral || 0) / sum) * 100)
      sent.negative = 100 - sent.positive - sent.neutral
    }
  }

  // Filter keywords to only available ones
  const filteredKw = Array.isArray(parsed.suggestedKeywords)
    ? (parsed.suggestedKeywords as string[]).filter(k =>
        availableKeywords.some(ak => ak.toLowerCase() === (k as string).toLowerCase())
      )
    : []

  return {
    isRelevant: parsed.isRelevant === true,
    relevanceReason: (parsed.relevanceReason as string) || '',
    summary: (parsed.summary as string) || '',
    sentiment: sent || { positive: 33, neutral: 34, negative: 33 },
    overallSentiment: (['positive', 'neutral', 'negative'].includes(parsed.overallSentiment as string)
      ? parsed.overallSentiment : 'neutral') as 'positive' | 'neutral' | 'negative',
    suggestedKeywords: filteredKw,
    suggestedIndustryId: (parsed.suggestedIndustryId as string) || null,
    suggestedSubIndustryIds: Array.isArray(parsed.suggestedSubIndustryIds)
      ? (parsed.suggestedSubIndustryIds as string[]) : [],
    keyPersonalities: Array.isArray(parsed.keyPersonalities)
      ? (parsed.keyPersonalities as string[]).filter(p => typeof p === 'string' && p.length > 0) : [],
  }
}

// ─── Slug Generation ────────────────────────────────────────────────

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/^-|-$/g, '')
}

async function uniqueSlug(base: string, model: 'webStory' | 'socialPost'): Promise<string> {
  let slug = generateSlug(base)
  let counter = 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any
  while (await db[model].findUnique({ where: { slug } })) {
    slug = `${generateSlug(base)}-${counter}`
    counter++
  }
  return slug
}

// ─── Main: Process Pending Web Insights ─────────────────────────────

export async function processWebInsights(limit = 20): Promise<PublishResult[]> {
  const results: PublishResult[] = []

  // Fetch pending insights with their client info
  const insights = await prisma.dailyInsight.findMany({
    where: { status: 'pending' },
    include: {
      client: {
        select: {
          id: true, name: true, newsKeywords: true,
          industries: { select: { industryId: true } },
          keywords: { include: { keyword: true } },
        },
      },
    },
    orderBy: { scrapedAt: 'desc' },
    take: limit,
  })

  if (insights.length === 0) return results

  // Load available keywords and industries for AI
  const [dbKeywords, dbIndustries] = await Promise.all([
    prisma.keyword.findMany({ where: { isActive: true }, select: { name: true } }),
    prisma.industry.findMany({
      where: { isActive: true },
      select: { id: true, name: true, subIndustries: { select: { id: true, name: true } } },
    }),
  ])
  const availableKeywords = dbKeywords.map(k => k.name)
  const industries = dbIndustries.map(i => ({
    id: i.id, name: i.name,
    subs: i.subIndustries.map(s => ({ id: s.id, name: s.name })),
  }))

  for (const insight of insights) {
    try {
      if (!insight.client) {
        results.push({ insightId: insight.id, action: 'skipped', reason: 'No client linked' })
        continue
      }

      // 1. Extract full article content
      const article = await fetchArticleContent(insight.url)
      if (!article || article.content.length < 100) {
        results.push({ insightId: insight.id, action: 'skipped', reason: 'Could not extract article content' })
        continue
      }

      // 2. Build client keywords
      const clientKws: string[] = []
      if (insight.client.name) clientKws.push(insight.client.name.toLowerCase())
      if (insight.client.newsKeywords) {
        insight.client.newsKeywords.split(',').forEach(k => {
          const t = k.trim().toLowerCase()
          if (t) clientKws.push(t)
        })
      }

      // 3. AI analysis — verify relevance + extract all fields
      const analysis = await analyzeForClient(
        `Title: ${article.title || insight.title}\n\n${article.content}`,
        insight.client.name,
        clientKws,
        availableKeywords,
        industries,
      )

      if (!analysis) {
        results.push({ insightId: insight.id, action: 'error', reason: 'AI analysis failed' })
        continue
      }

      if (!analysis.isRelevant) {
        // Mark as archived — AI says not relevant
        await prisma.dailyInsight.update({
          where: { id: insight.id },
          data: { status: 'archived' },
        })
        results.push({ insightId: insight.id, action: 'skipped', reason: `AI: ${analysis.relevanceReason}` })
        continue
      }

      // 4. Find or create publication
      const pubName = article.publication || insight.source || 'Unknown'
      let publication = await prisma.webPublication.findFirst({
        where: { name: { equals: pubName, mode: 'insensitive' } },
      })
      if (!publication) {
        try {
          publication = await prisma.webPublication.create({
            data: { name: pubName, website: new URL(insight.url).origin, isActive: true },
          })
        } catch {
          publication = await prisma.webPublication.findFirst({
            where: { name: { equals: pubName, mode: 'insensitive' } },
          })
        }
      }

      // 5. Check for duplicate WebStory
      const existingStory = await prisma.webStory.findFirst({
        where: { sourceUrl: insight.url },
      })
      if (existingStory) {
        await prisma.dailyInsight.update({
          where: { id: insight.id },
          data: { status: 'accepted' },
        })
        results.push({ insightId: insight.id, action: 'skipped', reason: 'WebStory already exists', webStoryId: existingStory.id })
        continue
      }

      // 6. Create WebStory with all AI-generated fields
      const slug = await uniqueSlug(article.title || insight.title, 'webStory')
      const pubDate = article.date ? new Date(article.date) : new Date(insight.scrapedAt)

      const story = await prisma.webStory.create({
        data: {
          title: (article.title || insight.title).substring(0, 255),
          slug,
          content: article.content || null,
          summary: analysis.summary || null,
          author: article.author || null,
          sourceUrl: insight.url,
          keywords: analysis.suggestedKeywords.join(', ') || null,
          date: isNaN(pubDate.getTime()) ? new Date() : pubDate,
          publicationId: publication?.id || null,
          industryId: analysis.suggestedIndustryId || null,
          sentimentPositive: analysis.sentiment.positive,
          sentimentNeutral: analysis.sentiment.neutral,
          sentimentNegative: analysis.sentiment.negative,
          overallSentiment: analysis.overallSentiment,
          keyPersonalities: analysis.keyPersonalities.join(', ') || null,
          subIndustries: analysis.suggestedSubIndustryIds.length > 0
            ? { create: analysis.suggestedSubIndustryIds.map(id => ({ subIndustryId: id })) }
            : undefined,
          images: article.image
            ? { create: [{ url: article.image, caption: null }] }
            : undefined,
        },
      })

      // 7. Mark insight as accepted
      await prisma.dailyInsight.update({
        where: { id: insight.id },
        data: { status: 'accepted' },
      })

      results.push({ insightId: insight.id, action: 'published', reason: analysis.relevanceReason, webStoryId: story.id })
      console.log(`[AutoPublish] Created WebStory "${story.title}" for ${insight.client.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ insightId: insight.id, action: 'error', reason: msg })
      console.error(`[AutoPublish] Error processing insight ${insight.id}:`, msg)
    }
  }

  return results
}

// ─── Main: Process Pending Social Posts ─────────────────────────────

export async function processSocialPosts(limit = 20): Promise<SocialPublishResult[]> {
  const results: SocialPublishResult[] = []

  // Fetch pending social posts with client info
  const posts = await prisma.socialPost.findMany({
    where: { status: 'pending' },
    include: {
      client: {
        select: {
          id: true, name: true, newsKeywords: true,
          keywords: { include: { keyword: true } },
        },
      },
    },
    orderBy: { postedAt: 'desc' },
    take: limit,
  })

  if (posts.length === 0) return results

  const [dbKeywords, dbIndustries] = await Promise.all([
    prisma.keyword.findMany({ where: { isActive: true }, select: { name: true } }),
    prisma.industry.findMany({
      where: { isActive: true },
      select: { id: true, name: true, subIndustries: { select: { id: true, name: true } } },
    }),
  ])
  const availableKeywords = dbKeywords.map(k => k.name)
  const industries = dbIndustries.map(i => ({
    id: i.id, name: i.name,
    subs: i.subIndustries.map(s => ({ id: s.id, name: s.name })),
  }))

  for (const post of posts) {
    try {
      if (!post.client) {
        results.push({ postId: post.id, action: 'skipped', reason: 'No client linked' })
        continue
      }

      if (!post.content || post.content.length < 20) {
        results.push({ postId: post.id, action: 'skipped', reason: 'Content too short for analysis' })
        continue
      }

      // Build client keywords
      const clientKws: string[] = []
      if (post.client.name) clientKws.push(post.client.name.toLowerCase())
      if (post.client.newsKeywords) {
        post.client.newsKeywords.split(',').forEach(k => {
          const t = k.trim().toLowerCase()
          if (t) clientKws.push(t)
        })
      }

      // AI analysis
      const analysis = await analyzeForClient(
        `[${post.platform} post by @${post.authorHandle || 'unknown'}]\n\n${post.content}`,
        post.client.name,
        clientKws,
        availableKeywords,
        industries,
      )

      if (!analysis) {
        results.push({ postId: post.id, action: 'error', reason: 'AI analysis failed' })
        continue
      }

      if (!analysis.isRelevant) {
        await prisma.socialPost.update({
          where: { id: post.id },
          data: { status: 'archived' },
        })
        results.push({ postId: post.id, action: 'skipped', reason: `AI: ${analysis.relevanceReason}` })
        continue
      }

      // Generate slug for accepted post
      const slug = post.slug || await uniqueSlug(
        `${post.platform.toLowerCase()}-${post.authorName || post.authorHandle || ''}-${(post.content || '').substring(0, 60)}`,
        'socialPost'
      )

      // Update post with AI-generated fields and accept it
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: 'accepted',
          title: post.title || (post.content || 'Social Post').substring(0, 120),
          slug,
          summary: analysis.summary || null,
          keywords: analysis.suggestedKeywords.join(', ') || post.keywords || null,
          industryId: analysis.suggestedIndustryId || null,
          sentimentPositive: analysis.sentiment.positive,
          sentimentNeutral: analysis.sentiment.neutral,
          sentimentNegative: analysis.sentiment.negative,
          overallSentiment: analysis.overallSentiment,
          keyPersonalities: analysis.keyPersonalities.join(', ') || null,
          subIndustries: analysis.suggestedSubIndustryIds.length > 0
            ? {
                deleteMany: {},
                create: analysis.suggestedSubIndustryIds.map(id => ({ subIndustryId: id })),
              }
            : undefined,
        },
      })

      results.push({ postId: post.id, action: 'published', reason: analysis.relevanceReason })
      console.log(`[AutoPublish] Accepted SocialPost "${post.platform}" by @${post.authorHandle} for ${post.client.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results.push({ postId: post.id, action: 'error', reason: msg })
      console.error(`[AutoPublish] Error processing social post ${post.id}:`, msg)
    }
  }

  return results
}
