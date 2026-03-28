/**
 * Auto-Publish Service
 * 
 * When auto-publish is ON, this service takes matched articles and:
 * 1. Extracts full content + images directly (no HTTP self-call)
 * 2. Runs AI analysis via OpenRouter (summary, sentiment, keywords, industry)
 * 3. Creates a WebStory record with all fields populated
 * 4. Marks the DailyInsight as accepted
 */
import { prisma } from '@/lib/prisma'

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || ''

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

interface ExtractedData {
  title: string
  content: string
  author: string
  publishDate: string
  images: string[]
}

interface AIAnalysis {
  summary: string
  sentiment: { positive: number; neutral: number; negative: number }
  overallSentiment: string
  suggestedKeywords: string[]
  suggestedIndustry: string | null
  suggestedSubIndustries: string[]
  keyPersonalities: string[]
}


// ─── Direct Article Extraction (no self-fetch) ──────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

async function extractArticleDirect(url: string): Promise<ExtractedData | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: ctrl.signal, redirect: 'follow',
    })
    clearTimeout(t)
    if (!res.ok) return null
    const html = await res.text()
    if (!html || html.length < 500) return null

    // Extract metadata using regex (no cheerio dependency needed)
    const getMeta = (prop: string): string => {
      const re = new RegExp(`<meta[^>]*(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i')
      const alt = new RegExp(`content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
      return (html.match(re)?.[1] || html.match(alt)?.[1] || '').trim()
    }

    const title = getMeta('og:title') || (html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || '').trim() || (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim()
    if (!title || title.length < 5) return null

    const author = getMeta('author') || getMeta('article:author') || ''
    const publishDate = getMeta('article:published_time') || (html.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1] || '')

    // Images
    const images: string[] = []
    const ogImage = getMeta('og:image')
    if (ogImage) images.push(ogImage)

    // Content — extract paragraphs from article/main/body
    let contentHtml = html
    // Try to isolate article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (articleMatch) contentHtml = articleMatch[1]
    else if (mainMatch) contentHtml = mainMatch[1]

    // Remove noise
    contentHtml = contentHtml
      .replace(/<(script|style|nav|footer|aside|header|noscript|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*(?:sidebar|comment|share|social|ad|promo|newsletter|related)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')

    // Extract paragraphs
    const pTags = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    const content = pTags
      .map(p => p.replace(/<[^>]+>/g, '').trim())
      .filter(p => p.length > 30)
      .join('\n\n')
      .substring(0, 8000)

    if (content.length < 100) return null

    return { title, content, author, publishDate, images }
  } catch {
    return null
  }
}


// ─── Direct AI Analysis (no self-fetch) ─────────────────────────────────

async function analyzeWithAI(content: string): Promise<AIAnalysis | null> {
  if (!OPENROUTER_KEY) {
    console.log('[AutoPublish] No OPENROUTER_API_KEY, skipping AI analysis')
    return null
  }

  // Fetch available keywords and industries from DB
  const [keywords, industries] = await Promise.all([
    prisma.keyword.findMany({ select: { name: true }, where: { isActive: true } }),
    prisma.industry.findMany({
      select: { name: true, subIndustries: { select: { name: true } } },
      where: { isActive: true },
    }),
  ])

  const keywordList = keywords.map(k => k.name).join(', ')
  const industryList = industries.map(i => `${i.name} (sub: ${i.subIndustries.map(s => s.name).join(', ')})`).join('; ')

  const truncated = content.substring(0, 3000)

  const prompt = `Analyze this news article and return JSON with:
1. "summary": 2-3 sentence professional summary
2. "sentiment": { "positive": number, "neutral": number, "negative": number } (must sum to 100)
3. "overallSentiment": "positive" | "neutral" | "negative"
4. "suggestedKeywords": select ONLY from: ${keywordList || 'none'}
5. "suggestedIndustry": select from: ${industryList || 'none'} (or null)
6. "suggestedSubIndustries": array of sub-industry names
7. "keyPersonalities": full names of people mentioned

Return ONLY valid JSON. Article:
${truncated}`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!res.ok) {
      console.log(`[AutoPublish] AI API returned ${res.status}`)
      return null
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    if (!text) return null

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    return parsed as AIAnalysis
  } catch (err) {
    console.log(`[AutoPublish] AI analysis failed: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}


// ─── Helper Functions ───────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80).replace(/^-|-$/g, '')
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


// ─── Auto-Publish One Article ───────────────────────────────────────────

async function autoPublishOne(article: ArticleToPublish): Promise<{ published: boolean; reason: string }> {
  console.log(`[AutoPublish] Processing: "${article.title.substring(0, 60)}..." from ${article.source}`)

  // Step 1: Extract full article content + images directly
  const extracted = await extractArticleDirect(article.url)
  if (!extracted) {
    console.log(`[AutoPublish] SKIP: Could not extract content from ${article.url}`)
    return { published: false, reason: 'Could not extract article content' }
  }
  console.log(`[AutoPublish] Extracted: ${extracted.content.length} chars, ${extracted.images.length} images`)

  // Step 2: AI analysis — summary, sentiment, keywords, industry, personalities
  const analysis = await analyzeWithAI(extracted.content)
  if (analysis) {
    console.log(`[AutoPublish] AI: summary=${analysis.summary?.length || 0} chars, sentiment=${analysis.overallSentiment}, keywords=${analysis.suggestedKeywords?.join(',')}`)
  } else {
    console.log(`[AutoPublish] AI analysis failed/skipped, proceeding with basic data`)
  }

  // Step 3: Find publication by domain
  let publicationId: string | null = null
  try {
    const domain = new URL(article.url).hostname
    publicationId = await findPublicationByDomain(domain)
  } catch {}

  // Step 4: Resolve industry and sub-industries
  const industryId = analysis ? await findIndustryId(analysis.suggestedIndustry) : null
  const subIndustryIds = analysis ? await findSubIndustryIds(analysis.suggestedSubIndustries || []) : []

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
  let slug = baseSlug || `article-${Date.now()}`
  let counter = 1
  while (await prisma.webStory.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Step 8: Check for duplicate WebStory by URL
  const existing = await prisma.webStory.findFirst({ where: { sourceUrl: article.url } })
  if (existing) {
    console.log(`[AutoPublish] SKIP: WebStory already exists for ${article.url}`)
    // Still mark insight as accepted
    await prisma.dailyInsight.update({ where: { id: article.insightId }, data: { status: 'accepted' } }).catch(() => {})
    return { published: false, reason: 'WebStory already exists for this URL' }
  }

  // Step 9: Create the WebStory
  try {
    const story = await prisma.webStory.create({
      data: {
        title: (extracted.title || article.title).trim(),
        slug,
        content: extracted.content || null,
        summary: analysis?.summary || article.description || null,
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
        images: extracted.images.length > 0
          ? { create: extracted.images.slice(0, 5).map(url => ({ url })) }
          : undefined,
      },
    })

    // Mark the DailyInsight as accepted
    await prisma.dailyInsight.update({
      where: { id: article.insightId },
      data: { status: 'accepted' },
    }).catch(() => {})

    console.log(`[AutoPublish] SUCCESS: Created WebStory "${story.title}" (${story.slug})`)
    return { published: true, reason: 'Published' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AutoPublish] FAILED to create WebStory: ${msg}`)
    return { published: false, reason: msg }
  }
}


// ─── Main Export ────────────────────────────────────────────────────────

/**
 * Auto-publish multiple articles as WebStories.
 * Processes sequentially to avoid overwhelming the AI API.
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

  console.log(`[AutoPublish] Starting: ${toProcess.length} of ${articles.length} articles`)

  for (const article of toProcess) {
    try {
      const result = await autoPublishOne(article)
      if (result.published) {
        results.published++
      } else {
        results.skipped++
        if (!result.reason.includes('already exists')) {
          results.errors.push(`${article.title.substring(0, 50)}: ${result.reason}`)
        }
      }
    } catch (err) {
      results.skipped++
      results.errors.push(`${article.title.substring(0, 50)}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    // Small delay between articles to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`[AutoPublish] Done: ${results.published} published, ${results.skipped} skipped, ${results.errors.length} errors`)
  return results
}
