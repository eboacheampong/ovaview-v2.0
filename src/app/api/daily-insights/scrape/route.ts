import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
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
 * Uses ONLY the newsKeywords text field (source of truth edited by user).
 * If specificClientId is provided, only fetch keywords for that client.
 */
async function getClientKeywords(specificClientId?: string | null): Promise<ClientKeywordEntry[]> {
  const whereClause: { isActive?: boolean; id?: string } = {}
  
  if (specificClientId) {
    // For single-client scrape, fetch that client regardless of active status
    whereClause.id = specificClientId
  } else {
    // For global scrape, only active clients
    whereClause.isActive = true
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      newsKeywords: true,
    },
  })

  return clients.map(c => {
    const kwSet = new Set<string>()

    // Client name itself as a keyword
    const name = c.name.toLowerCase().trim()
    if (name) kwSet.add(name)

    // newsKeywords (comma-separated text field) - THIS IS THE SOURCE OF TRUTH
    if (c.newsKeywords) {
      c.newsKeywords.split(',').forEach(k => {
        const t = k.trim().toLowerCase()
        if (t) kwSet.add(t)
      })
    }

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
 * Extract ONLY the main article content from a webpage.
 * Focuses on: title, meta tags, and the first ~1500 chars of actual article body.
 * Excludes: footers, sidebars, nav, related articles, comments, ads.
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
    let text = ''

    // 1. Meta tags (these are reliable and specific to the article)
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (metaDesc) text += ' ' + metaDesc[1]

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    if (ogTitle) text += ' ' + ogTitle[1]

    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    if (ogDesc) text += ' ' + ogDesc[1]

    // 2. Page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) text += ' ' + titleMatch[1]

    // 3. Main headline (h1)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) text += ' ' + h1Match[1]

    // 4. Try to find the main article content area
    // Look for <article>, <main>, or common content class patterns
    let articleHtml = ''
    
    // Try <article> tag first
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    if (articleMatch) {
      articleHtml = articleMatch[1]
    } else {
      // Try <main> tag
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      if (mainMatch) {
        articleHtml = mainMatch[1]
      } else {
        // Try common content div patterns
        const contentMatch = html.match(/<div[^>]*class=["'][^"']*(?:article|content|post|entry|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
        if (contentMatch) {
          articleHtml = contentMatch[1]
        }
      }
    }

    // 5. If we found article content, extract paragraphs from it
    // Otherwise fall back to first few <p> tags from the page (but limit strictly)
    if (articleHtml) {
      // Remove noise sections from article HTML
      articleHtml = articleHtml
        .replace(/<(nav|footer|aside|header|script|style|noscript|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<div[^>]*class=["'][^"']*(?:related|sidebar|comment|share|social|ad|promo|newsletter|footer|nav)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')

      // Extract paragraphs from cleaned article
      const pTags = articleHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
      const pText = pTags
        .slice(0, 8) // Only first 8 paragraphs (the actual article intro)
        .map(p => p.replace(/<[^>]+>/g, '').trim())
        .filter(t => t.length > 30) // Skip very short paragraphs
        .join(' ')
      text += ' ' + pText.substring(0, 1500)
    } else {
      // Fallback: just get first 3 substantial paragraphs
      const pTags = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
      const pText = pTags
        .slice(0, 5)
        .map(p => p.replace(/<[^>]+>/g, '').trim())
        .filter(t => t.length > 50)
        .join(' ')
      text += ' ' + pText.substring(0, 800)
    }

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
    // If clientId is provided, only get that client's keywords
    const clientKeywordData = await getClientKeywords(forceClientId)

    // If single-client mode and client has no keywords, return early
    if (forceClientId && clientKeywordData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Client not found',
        message: 'The specified client does not exist.',
      }, { status: 404 })
    }

    if (forceClientId && clientKeywordData[0]?.keywords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No keywords configured for this client. Add keywords to enable scraping.',
        stats: { scraped: 0, saved: 0, duplicates: 0 },
      })
    }

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

    const clientInfo = forceClientId 
      ? `single client (${clientKeywordData[0]?.clientName})` 
      : `${clientKeywordData.length} clients`
    console.log(`[Scraper] ${sources.length} sources, ${clientInfo}, ${allKeywords.size} keywords`)
    clientKeywordData.forEach(c => console.log(`  -> ${c.clientName}: [${c.keywords.join(', ')}]`))

    // 4. Call remote scraper with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

    let scraperResponse: Response
    try {
      scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
        signal: controller.signal,
      })
    } catch (fetchError) {
      clearTimeout(timeout)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Scraper timeout', message: 'The scraper took too long to respond. Try again or reduce the number of sources.' },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Scraper unreachable', message: `Could not connect to scraper at ${SCRAPER_API}` },
        { status: 502 }
      )
    }
    clearTimeout(timeout)

    if (scraperResponse.status === 405) {
      scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`)
    }

    // Get response text first, then try to parse as JSON
    const responseText = await scraperResponse.text()
    
    if (!scraperResponse.ok) {
      console.error(`Scraper error (${scraperResponse.status}):`, responseText)
      return NextResponse.json(
        { success: false, error: `Scraper returned ${scraperResponse.status}`, message: responseText.substring(0, 200) },
        { status: 502 }
      )
    }

    // Try to parse JSON safely
    let scraperData: { success: boolean; articles?: unknown[]; error?: string }
    try {
      scraperData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse scraper response:', responseText.substring(0, 500))
      return NextResponse.json(
        { success: false, error: 'Invalid scraper response', message: 'The scraper returned an invalid response. It may have crashed or timed out.' },
        { status: 502 }
      )
    }

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

        // Quick match against client keywords (works for both single and multi-client)
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
