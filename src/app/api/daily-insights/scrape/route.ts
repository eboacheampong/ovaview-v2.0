import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Smart keyword matching against article text + URL.
 * Tiered by keyword length for best precision/recall balance.
 */
function keywordMatchesText(keyword: string, text: string, url: string): boolean {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return false
  const lowerText = text.toLowerCase()
  const lowerUrl = url.toLowerCase()

  // Very short (1-3 chars): strict word boundary
  if (kw.length <= 3) {
    const re = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'i')
    return re.test(lowerText) || re.test(lowerUrl)
  }

  // Medium (4-5 chars): word-start boundary + URL substring
  if (kw.length <= 5) {
    const re = new RegExp('\\b' + escapeRegex(kw), 'i')
    return re.test(lowerText) || lowerUrl.includes(kw)
  }

  // Long (6+ chars): plain substring in text or URL
  if (lowerText.includes(kw) || lowerUrl.includes(kw)) return true

  // Stem matching: strip common suffixes and retry
  const suffixes = [
    'ing', 'tion', 'sion', 'ment', 'ness', 'ity', 'ies',
    'ous', 'ive', 'able', 'ible', 'ful', 'less', 'ence',
    'ance', 'ers', 'est', 'ism', 'ist', 'al', 'ly', 'ed',
    'er', 'es', 's',
  ]
  for (const sfx of suffixes) {
    if (kw.endsWith(sfx) && kw.length - sfx.length >= 4) {
      const stem = kw.slice(0, -sfx.length)
      if (lowerText.includes(stem) || lowerUrl.includes(stem)) return true
    }
  }

  return false
}

interface ClientKeywordEntry {
  clientId: string
  clientName: string
  keywords: string[]
}

/**
 * Fetch fresh client keyword data from DB.
 * Combines: client name + newsKeywords field + linked Keyword records.
 */
async function getClientKeywords(): Promise<ClientKeywordEntry[]> {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    include: { keywords: { include: { keyword: true } } },
  })

  return clients.map(c => {
    const kwSet = new Set<string>()

    // Client name itself
    const name = c.name.toLowerCase().trim()
    if (name) kwSet.add(name)

    // newsKeywords (comma-separated text field)
    if (c.newsKeywords) {
      c.newsKeywords.split(',').forEach(k => {
        const t = k.trim().toLowerCase()
        if (t) kwSet.add(t)
      })
    }

    // Linked Keyword records (from Keywords page / synced)
    c.keywords.forEach(ck => {
      const kn = ck.keyword.name.toLowerCase().trim()
      if (kn) kwSet.add(kn)
    })

    return { clientId: c.id, clientName: c.name, keywords: Array.from(kwSet) }
  })
}

/**
 * Match a single article against all clients.
 * Returns array of { clientId, keyword } for each matched client.
 */
function matchArticleToClients(
  article: { title: string; url: string; description?: string; source?: string },
  clientKeywordData: ClientKeywordEntry[]
): { clientId: string; keyword: string }[] {
  // Build a rich search corpus from all available article fields
  const searchText = [
    article.title || '',
    article.description || '',
    article.source || '',
  ].join(' ')

  const matched: { clientId: string; keyword: string }[] = []

  for (const entry of clientKeywordData) {
    for (const kw of entry.keywords) {
      if (keywordMatchesText(kw, searchText, article.url || '')) {
        matched.push({ clientId: entry.clientId, keyword: kw })
        break // one keyword match is enough per client
      }
    }
  }

  return matched
}

/**
 * Try to fetch the actual article page and extract more text.
 * This gives us much better keyword matching than just title + description.
 * Returns extracted text or empty string on failure.
 */
async function fetchArticleFullText(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return ''

    const html = await res.text()

    // Quick extraction: grab text from <p> tags, <article>, <meta description>
    // We don't need perfect HTML parsing — just enough text for keyword matching
    let text = ''

    // Meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (metaMatch) text += ' ' + metaMatch[1]

    // Meta keywords
    const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i)
    if (kwMatch) text += ' ' + kwMatch[1]

    // OG title and description
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    if (ogTitle) text += ' ' + ogTitle[1]
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    if (ogDesc) text += ' ' + ogDesc[1]

    // Strip HTML tags and get raw text from <p> tags (first 3000 chars)
    const pTags = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    const pText = pTags
      .map(p => p.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 20)
      .join(' ')
    text += ' ' + pText.substring(0, 3000)

    return text.trim()
  } catch {
    return ''
  }
}

/**
 * POST /api/daily-insights/scrape
 *
 * Two-pass matching strategy for maximum recall:
 *
 * PASS 1 — Quick match on title + description + URL + source
 *   (fast, catches obvious matches)
 *
 * PASS 2 — For articles that didn't match in Pass 1, fetch the actual
 *   article page and extract full text (meta tags, paragraphs, etc.)
 *   then re-run keyword matching against the richer text.
 *   (slower but catches articles where keywords are in the body, not headline)
 *
 * This way we get the best of both worlds: fast for obvious matches,
 * thorough for the rest.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceClientId = body?.clientId || null

    // 1. Get web publication sources
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true, website: { not: null } },
      select: { website: true },
    })

    // 2. Fetch FRESH keywords from DB
    const clientKeywordData = await getClientKeywords()

    // Collect all keywords for scraper tag
    const allKeywords = new Set<string>()
    clientKeywordData.forEach(e => e.keywords.forEach(k => allKeywords.add(k)))

    // 3. Build sources
    const sources = publications
      .filter(p => p.website)
      .map(p => [p.website!, 'news', Array.from(allKeywords).slice(0, 15).join(',') || 'general'])

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No web publications with URLs configured.',
        stats: { scraped: 0, saved: 0, duplicates: 0 },
      })
    }

    console.log(`[Scraper] ${sources.length} sources, ${clientKeywordData.length} clients, ${allKeywords.size} keywords`)
    clientKeywordData.forEach(c => console.log(`  -> ${c.clientName}: [${c.keywords.join(', ')}]`))

    // 4. Call remote scraper
    let scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources }),
    })

    if (scraperResponse.status === 405) {
      scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`)
    }

    if (!scraperResponse.ok) {
      const errorText = await scraperResponse.text()
      console.error(`Scraper error (${scraperResponse.status}):`, errorText)
      return NextResponse.json(
        { success: false, error: `Scraper returned ${scraperResponse.status}`, message: errorText },
        { status: 502 }
      )
    }

    const scraperData = await scraperResponse.json()
    if (!scraperData.success) {
      return NextResponse.json(
        { success: false, error: scraperData.error || 'Scraper failed' },
        { status: 500 }
      )
    }

    const articlesData: any[] = scraperData.articles || []
    console.log(`[Scraper] Received ${articlesData.length} articles from scraper`)

    // 5. PASS 1 — Quick match on title + description + URL
    let savedCount = 0
    let duplicateCount = 0
    let skippedNoMatch = 0
    const unmatchedArticles: any[] = []

    for (const article of articlesData) {
      try {
        const { title, url, description, source, industry, scraped_at } = article
        if (!title || !url) continue

        // Force-assign mode
        if (forceClientId) {
          const existing = await prisma.dailyInsight.findFirst({
            where: { url, clientId: forceClientId },
          })
          if (existing) { duplicateCount++; continue }
          await prisma.dailyInsight.create({
            data: {
              title: title.substring(0, 255), url,
              description: description ? description.substring(0, 1000) : '',
              source: source || '', industry: industry || 'general',
              clientId: forceClientId, status: 'pending',
              scrapedAt: scraped_at ? new Date(scraped_at) : new Date(),
            },
          })
          savedCount++
          continue
        }

        // Quick match
        const matches = matchArticleToClients(article, clientKeywordData)
        const uniqueClientIds = Array.from(new Set(matches.map(m => m.clientId)))

        if (uniqueClientIds.length === 0) {
          // Save for Pass 2
          unmatchedArticles.push(article)
          continue
        }

        // Save for each matched client
        for (const cid of uniqueClientIds) {
          const existing = await prisma.dailyInsight.findFirst({ where: { url, clientId: cid } })
          if (existing) { duplicateCount++; continue }

          const matchedKw = matches.find(m => m.clientId === cid)?.keyword || ''
          await prisma.dailyInsight.create({
            data: {
              title: title.substring(0, 255), url,
              description: description ? description.substring(0, 1000) : '',
              source: source || '',
              industry: matchedKw || industry || 'general',
              clientId: cid, status: 'pending',
              scrapedAt: scraped_at ? new Date(scraped_at) : new Date(),
            },
          })
          savedCount++
        }
      } catch (error) {
        console.error('Pass 1 error:', error)
      }
    }

    console.log(`[Scraper] Pass 1 done: saved=${savedCount}, unmatched=${unmatchedArticles.length} (will deep-scan)`)

    // 6. PASS 2 — Deep scan unmatched articles by fetching full page text
    // Process in batches of 5 to avoid overwhelming the server
    let deepMatched = 0
    const BATCH_SIZE = 5

    for (let i = 0; i < unmatchedArticles.length; i += BATCH_SIZE) {
      const batch = unmatchedArticles.slice(i, i + BATCH_SIZE)

      // Fetch full text for each article in parallel
      const fullTexts = await Promise.all(
        batch.map(a => fetchArticleFullText(a.url))
      )

      for (let j = 0; j < batch.length; j++) {
        const article = batch[j]
        const fullText = fullTexts[j]

        if (!fullText) {
          skippedNoMatch++
          continue
        }

        // Re-run matching with enriched text
        const enrichedArticle = {
          ...article,
          description: `${article.description || ''} ${fullText}`,
        }

        const matches = matchArticleToClients(enrichedArticle, clientKeywordData)
        const uniqueClientIds = Array.from(new Set(matches.map(m => m.clientId)))

        if (uniqueClientIds.length === 0) {
          skippedNoMatch++
          continue
        }

        for (const cid of uniqueClientIds) {
          try {
            const existing = await prisma.dailyInsight.findFirst({
              where: { url: article.url, clientId: cid },
            })
            if (existing) { duplicateCount++; continue }

            const matchedKw = matches.find(m => m.clientId === cid)?.keyword || ''
            await prisma.dailyInsight.create({
              data: {
                title: (article.title || '').substring(0, 255),
                url: article.url,
                description: (article.description || '').substring(0, 1000),
                source: article.source || '',
                industry: matchedKw || article.industry || 'general',
                clientId: cid, status: 'pending',
                scrapedAt: article.scraped_at ? new Date(article.scraped_at) : new Date(),
              },
            })
            savedCount++
            deepMatched++
          } catch (error) {
            console.error('Pass 2 save error:', error)
          }
        }
      }
    }

    console.log(`[Scraper] Pass 2 done: deep-matched=${deepMatched}, final unmatched=${skippedNoMatch}`)
    console.log(`[Scraper] TOTAL: saved=${savedCount}, dupes=${duplicateCount}, unmatched=${skippedNoMatch}`)

    return NextResponse.json({
      success: true,
      message: `Scraped ${sources.length} sources. Saved ${savedCount} articles (${deepMatched} from deep scan), skipped ${duplicateCount} duplicates, ${skippedNoMatch} unmatched.`,
      stats: {
        scraped: articlesData.length,
        saved: savedCount,
        deepMatched,
        duplicates: duplicateCount,
        skippedNoMatch,
        sources: sources.length,
      },
    })
  } catch (error) {
    console.error('Scraper error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run scraper' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const healthRes = await fetch(`${SCRAPER_API}/health`).catch(() => null)
    return NextResponse.json({ scraperApi: SCRAPER_API, scraperHealthy: healthRes?.ok || false })
  } catch {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
