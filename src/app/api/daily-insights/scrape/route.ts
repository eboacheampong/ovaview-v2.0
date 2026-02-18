import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * Escape special regex characters properly
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Check if a keyword matches anywhere in the article text or URL.
 * - Keywords <= 3 chars: word-boundary match only
 * - Keywords 4-5 chars: word-boundary start match + URL substring
 * - Keywords 6+ chars: plain substring match + stem variants
 */
function keywordMatchesText(keyword: string, text: string, url: string): boolean {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return false
  const lowerText = text.toLowerCase()
  const lowerUrl = url.toLowerCase()

  if (kw.length <= 3) {
    const pattern = new RegExp('\\b' + escapeRegex(kw) + '\\b', 'i')
    return pattern.test(lowerText) || pattern.test(lowerUrl)
  }

  if (kw.length <= 5) {
    const pattern = new RegExp('\\b' + escapeRegex(kw), 'i')
    return pattern.test(lowerText) || lowerUrl.includes(kw)
  }

  // 6+ chars: substring match
  if (lowerText.includes(kw) || lowerUrl.includes(kw)) return true

  // Try stem matching: strip common suffixes and check
  const suffixes = ['ing', 'tion', 'sion', 'ment', 'ness', 'ity', 'ies', 'ous', 'ive', 'able', 'ible', 'ful', 'less', 'ence', 'ance', 'ers', 'est', 'ism', 'ist', 'al', 'ly', 'ed', 'er', 'es', 's']
  for (const suffix of suffixes) {
    if (kw.endsWith(suffix) && kw.length - suffix.length >= 4) {
      const stem = kw.slice(0, -suffix.length)
      if (lowerText.includes(stem)) return true
    }
  }

  return false
}

/**
 * POST /api/daily-insights/scrape
 *
 * 1. Fetch FRESH client keywords from DB every time
 * 2. Scrape articles from web publication URLs
 * 3. Match each article against title + description + URL + source
 * 4. Multi-client: same article can appear under multiple clients
 * 5. No "unassigned" — unmatched articles are discarded
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceClientId = body?.clientId || null

    // 1. Get sources from web publications
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true, website: { not: null } },
      select: { website: true },
    })

    // 2. ALWAYS fetch fresh client keywords from DB
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { keywords: { include: { keyword: true } } },
    })

    // 3. Build per-client keyword lists
    const clientKeywordData = clients.map(c => {
      const kwSet = new Set<string>()

      // Client name
      const name = c.name.toLowerCase().trim()
      if (name) kwSet.add(name)

      // newsKeywords field (comma-separated)
      if (c.newsKeywords) {
        c.newsKeywords.split(',').forEach(k => {
          const t = k.trim().toLowerCase()
          if (t) kwSet.add(t)
        })
      }

      // Linked Keyword records
      c.keywords.forEach(ck => {
        const kn = ck.keyword.name.toLowerCase().trim()
        if (kn) kwSet.add(kn)
      })

      return { clientId: c.id, clientName: c.name, keywords: Array.from(kwSet) }
    })

    const allKeywords = new Set<string>()
    clientKeywordData.forEach(e => e.keywords.forEach(k => allKeywords.add(k)))

    // 4. Build sources
    const sources = publications
      .filter(p => p.website)
      .map(p => [p.website!, 'news', Array.from(allKeywords).slice(0, 15).join(',') || 'general'])

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No web publications with URLs configured. Add URLs to your web publications first.',
        stats: { scraped: 0, saved: 0, duplicates: 0 },
      })
    }

    console.log(`[Scraper] ${sources.length} sources, ${clientKeywordData.length} clients, ${allKeywords.size} keywords`)
    clientKeywordData.forEach(c => console.log(`  -> ${c.clientName}: [${c.keywords.join(', ')}]`))

    // 5. Call remote scraper
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
    console.log(`[Scraper] Received ${articlesData.length} articles`)

    // 6. Match & save
    let savedCount = 0
    let duplicateCount = 0
    let skippedNoMatch = 0

    for (const article of articlesData) {
      try {
        const { title, url, description, source, industry, scraped_at } = article
        if (!title || !url) continue

        // Force-assign to a specific client
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

        // Match against all clients using title + description + source + url
        const searchText = `${title} ${description || ''} ${source || ''}`
        const matchedClients: { clientId: string; keyword: string }[] = []

        for (const entry of clientKeywordData) {
          for (const kw of entry.keywords) {
            if (keywordMatchesText(kw, searchText, url)) {
              matchedClients.push({ clientId: entry.clientId, keyword: kw })
              break // one match per client is enough
            }
          }
        }

        const uniqueClientIds = Array.from(new Set(matchedClients.map(m => m.clientId)))

        if (uniqueClientIds.length === 0) {
          skippedNoMatch++
          continue
        }

        for (const cid of uniqueClientIds) {
          const existing = await prisma.dailyInsight.findFirst({
            where: { url, clientId: cid },
          })
          if (existing) { duplicateCount++; continue }

          const matchedKw = matchedClients.find(m => m.clientId === cid)?.keyword || ''
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
        console.error('Error saving article:', error)
      }
    }

    console.log(`[Scraper] Done: saved=${savedCount}, dupes=${duplicateCount}, unmatched=${skippedNoMatch}`)

    return NextResponse.json({
      success: true,
      message: `Scraped ${sources.length} sources. Saved ${savedCount} articles, skipped ${duplicateCount} duplicates, ${skippedNoMatch} unmatched.`,
      stats: { scraped: articlesData.length, saved: savedCount, duplicates: duplicateCount, skippedNoMatch, sources: sources.length },
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
