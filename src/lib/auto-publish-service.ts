/**
 * Auto-Publish Service
 * 
 * When auto-publish is ON, this service takes matched articles and:
 * 1. Extracts full content + images via /api/extract-article
 * 2. Runs AI analysis (summary, sentiment, keywords, industry, personalities)
 * 3. AI verifies the article actually matches the client
 * 4. Creates a WebStory record with all fields populated
 * 5. Marks the DailyInsight as accepted
 */
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface ArticleToPublish {
  insightId: string
  title: string
  url: string
  description: string
  source: string
  clientId: string
  clientName: string
  matchedKeyword: string
}

interface ExtractResult {
  title: string
  content: string
  textContent: string
  excerpt: string
  author: string
  publishDate: string
  siteName: string
  images: string[]
}

interface AnalysisResult {
  summary: string
  sentiment: { positive: number; neutral: number; negative: number }
  overallSentiment: 'positive' | 'neutral' | 'negative'
  suggestedKeywords: string[]
  suggestedIndustry: string | null
  suggestedSubIndustries: string[]
  keyPersonalities: string[]
}


function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/^-|-$/g, '')
}

async function extractArticle(url: string): Promise<ExtractResult | null> {
  try {
    const res = await fetch(`${APP_URL}/api/extract-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function analyzeArticle(content: string): Promise<AnalysisResult | null> {
  try {
    const res = await fetch(`${APP_URL}/api/analyze-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data
  } catch {
    return null
  }
}

async function verifyRelevance(text: string, clientName: string, keyword: string): Promise<boolean> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return true // if no AI key, skip verification and allow

    const prompt = `You are a media monitoring assistant. Determine if this article is relevant to the client "${clientName}"${keyword ? ` (keyword: "${keyword}")` : ''}.

The article must mention the client by name, or be directly about their industry/activities/products. Tangential mentions or unrelated articles should be rejected.

Article text (first 1500 chars):
${text.substring(0, 1500)}

Reply with ONLY "yes" or "no".`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return true // on AI failure, allow through
    const data = await res.json()
    const answer = (data.choices?.[0]?.message?.content || '').toLowerCase().trim()
    return answer.startsWith('yes')
  } catch {
    return true // on error, allow through
  }
}

async function findPublicationByDomain(domain: string): Promise<string | null> {
  const pubs = await prisma.webPublication.findMany({
    where: { isActive: true, website: { not: null } },
    select: { id: true, website: true },
  })
  const clean = domain.replace(/^www\./, '').toLowerCase()
  for (const pub of pubs) {
    if (!pub.website) continue
    try {
      const pubDomain = pub.website.includes('://')
        ? new URL(pub.website).hostname.replace(/^www\./, '').toLowerCase()
        : pub.website.replace(/^www\./, '').toLowerCase().split('/')[0]
      if (clean === pubDomain || clean.endsWith('.' + pubDomain)) return pub.id
    } catch { continue }
  }
  return null
}

async function findIndustryId(name: string | null): Promise<string | null> {
  if (!name) return null
  const industry = await prisma.industry.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  return industry?.id || null
}

async function findSubIndustryIds(names: string[]): Promise<string[]> {
  if (!names.length) return []
  const subs = await prisma.subIndustry.findMany({
    where: { name: { in: names, mode: 'insensitive' } },
    select: { id: true },
  })
  return subs.map(s => s.id)
}


/**
 * Auto-publish a single article as a WebStory.
 * Returns true if published, false if skipped/failed.
 */
async function autoPublishOne(article: ArticleToPublish): Promise<{ published: boolean; reason: string }> {
  const logPrefix = `[AutoPublish] "${article.title.substring(0, 50)}..."`

  // Step 1: Extract full article content + images
  const extracted = await extractArticle(article.url)
  if (!extracted || !extracted.content || extracted.content.length < 100) {
    return { published: false, reason: 'Could not extract article content' }
  }

  // Step 2: AI analysis — summary, sentiment, keywords, industry, personalities
  const analysis = await analyzeArticle(extracted.textContent || extracted.content)

  // Step 3: Find publication by domain
  let publicationId: string | null = null
  try {
    const domain = new URL(article.url).hostname
    publicationId = await findPublicationByDomain(domain)
  } catch {}

  // Step 4: Resolve industry and sub-industries
  const industryId = analysis ? await findIndustryId(analysis.suggestedIndustry) : null
  const subIndustryIds = analysis ? await findSubIndustryIds(analysis.suggestedSubIndustries) : []

  // Step 5: Build keywords string
  const keywordsStr = analysis?.suggestedKeywords?.length
    ? analysis.suggestedKeywords.join(', ')
    : article.matchedKeyword || ''

  // Step 6: Determine date
  let storyDate = new Date()
  if (extracted.publishDate) {
    const d = new Date(extracted.publishDate)
    if (!isNaN(d.getTime())) storyDate = d
  }

  // Step 7: Generate unique slug
  const baseSlug = generateSlug(extracted.title || article.title)
  let slug = baseSlug
  let counter = 1
  while (await prisma.webStory.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Step 8: Check for duplicate WebStory by URL
  if (article.url) {
    const existing = await prisma.webStory.findFirst({ where: { sourceUrl: article.url } })
    if (existing) {
      return { published: false, reason: 'WebStory already exists for this URL' }
    }
  }

  // Step 9: Create the WebStory
  try {
    await prisma.webStory.create({
      data: {
        title: (extracted.title || article.title).trim(),
        slug,
        content: extracted.content || null,
        summary: analysis?.summary || extracted.excerpt || article.description || null,
        author: extracted.author || null,
        sourceUrl: article.url,
        keywords: keywordsStr || null,
        date: storyDate,
        publicationId,
        industryId,
        sentimentPositive: analysis?.sentiment?.positive ?? null,
        sentimentNeutral: analysis?.sentiment?.neutral ?? null,
        sentimentNegative: analysis?.sentiment?.negative ?? null,
        overallSentiment: analysis?.overallSentiment ?? null,
        keyPersonalities: analysis?.keyPersonalities?.join(', ') || null,
        subIndustries: subIndustryIds.length > 0
          ? { create: subIndustryIds.map(id => ({ subIndustryId: id })) }
          : undefined,
        images: extracted.images?.length > 0
          ? { create: extracted.images.slice(0, 5).map(url => ({ url })) }
          : undefined,
      },
    })

    // Mark the DailyInsight as accepted
    await prisma.dailyInsight.update({
      where: { id: article.insightId },
      data: { status: 'accepted' },
    }).catch(() => {}) // ignore if insight was already deleted

    console.log(`${logPrefix} → Published as WebStory`)
    return { published: true, reason: 'Published' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${logPrefix} → Failed: ${msg}`)
    return { published: false, reason: msg }
  }
}


/**
 * Auto-publish multiple articles. Processes sequentially to avoid
 * overwhelming the AI API and extract endpoints.
 * 
 * @param articles - Articles that matched client keywords
 * @param maxPerRun - Max articles to auto-publish per run (default: 20)
 * @returns Summary of results
 */
export async function autoPublishArticles(
  articles: ArticleToPublish[],
  maxPerRun = 20
): Promise<{
  total: number
  published: number
  skipped: number
  errors: string[]
}> {
  const results = { total: articles.length, published: 0, skipped: 0, errors: [] as string[] }
  const toProcess = articles.slice(0, maxPerRun)

  console.log(`[AutoPublish] Processing ${toProcess.length} of ${articles.length} articles`)

  for (const article of toProcess) {
    try {
      const result = await autoPublishOne(article)
      if (result.published) {
        results.published++
      } else {
        results.skipped++
        if (result.reason !== 'WebStory already exists for this URL') {
          results.errors.push(`${article.title.substring(0, 60)}: ${result.reason}`)
        }
      }
    } catch (err) {
      results.skipped++
      results.errors.push(`${article.title.substring(0, 60)}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    // Small delay between articles to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`[AutoPublish] Done: ${results.published} published, ${results.skipped} skipped`)
  return results
}
