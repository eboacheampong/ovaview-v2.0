import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * POST /api/daily-insights/scrape
 * 
 * Scraping strategy:
 * 1. Fetch all web publications (sources to scrape)
 * 2. Fetch all active clients with their newsKeywords + linked Keywords
 * 3. Send sources to remote scraper
 * 4. For each returned article, match to clients using keyword relevance:
 *    - Build a keyword→client map from each client's newsKeywords + Keyword relations
 *    - Score each article against every client's keywords
 *    - If a keyword is unique to one client → strong match
 *    - If a keyword is shared by multiple clients → weak match (only counts if other unique keywords also match)
 *    - Assign to the client with the highest relevance score
 *    - Only mark as unassigned if no keywords match at all
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceClientId = body?.clientId || null

    // 1. Get web publication URLs (scraping sources)
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true, website: { not: null } },
      select: { website: true },
    })

    // 2. Get all active clients with their keywords
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { keywords: { include: { keyword: true } } },
    })

    // 3. Build per-client keyword lists (newsKeywords + linked Keywords)
    const clientKeywordData = clients.map(c => {
      const kwSet = new Set<string>()

      // Add client name as implicit keyword
      kwSet.add(c.name.toLowerCase().trim())

      // Add newsKeywords (comma-separated string from client config)
      if (c.newsKeywords) {
        c.newsKeywords.split(',').forEach(k => {
          const trimmed = k.trim().toLowerCase()
          if (trimmed) kwSet.add(trimmed)
        })
      }

      // Add linked Keywords from the keyword management system
      c.keywords.forEach(ck => {
        kwSet.add(ck.keyword.name.toLowerCase().trim())
      })

      return {
        clientId: c.id,
        clientName: c.name,
        keywords: Array.from(kwSet),
      }
    })

    // 4. Build keyword→clients ownership map to detect shared vs unique keywords
    const keywordOwnership = new Map<string, string[]>()
    for (const entry of clientKeywordData) {
      for (const kw of entry.keywords) {
        const owners = keywordOwnership.get(kw) || []
        owners.push(entry.clientId)
        keywordOwnership.set(kw, owners)
      }
    }

    // Collect all unique keywords across all clients for the scraper's industry tag
    const allKeywords = Array.from(keywordOwnership.keys())

    // 5. Build sources array for the remote scraper
    const sources = publications
      .filter(p => p.website)
      .map(p => [p.website!, 'news', allKeywords.slice(0, 10).join(',') || 'general'])

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No web publications with URLs configured. Add URLs to your web publications first.',
        stats: { scraped: 0, saved: 0, duplicates: 0 },
      })
    }

    console.log(`Scraping ${sources.length} sources, matching against ${clientKeywordData.length} clients with ${allKeywords.length} total keywords`)

    // 6. Call remote scraper
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

    // 7. Match articles to clients using intelligent keyword scoring
    let savedCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    for (const article of articlesData) {
      try {
        const { title, url, description, source, industry, scraped_at } = article
        if (!title || !url) continue

        const existing = await prisma.dailyInsight.findUnique({ where: { url } })
        if (existing) { duplicateCount++; continue }

        // Determine client assignment
        let matchedClientId = forceClientId
        let matchedIndustry = industry || 'general'

        if (!matchedClientId) {
          const articleText = `${title} ${description || ''}`.toLowerCase()

          // Score each client based on keyword matches
          let bestClientId: string | null = null
          let bestScore = 0
          let bestKeywordsMatched: string[] = []

          for (const entry of clientKeywordData) {
            let score = 0
            const matched: string[] = []

            for (const kw of entry.keywords) {
              // Check if keyword appears in article text
              // Use word boundary-aware matching for short keywords (<=4 chars)
              // and substring matching for longer keywords
              let found = false
              if (kw.length <= 4) {
                // For short keywords, require word boundary to avoid false positives
                // e.g. "AI" shouldn't match "said", "oil" shouldn't match "soil"
                const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
                found = regex.test(articleText)
              } else {
                found = articleText.includes(kw)
              }

              if (found) {
                matched.push(kw)
                const owners = keywordOwnership.get(kw) || []
                if (owners.length === 1) {
                  // Unique keyword — strong signal, worth more
                  score += 3
                } else {
                  // Shared keyword — weaker signal
                  score += 1
                }
              }
            }

            if (score > bestScore) {
              bestScore = score
              bestClientId = entry.clientId
              bestKeywordsMatched = matched
            }
          }

          // Only assign if we have a meaningful match (at least one keyword hit)
          if (bestScore > 0 && bestClientId) {
            matchedClientId = bestClientId
            // Use the matched keywords as the industry tag for context
            matchedIndustry = bestKeywordsMatched.slice(0, 3).join(', ') || matchedIndustry
          }
          // If bestScore is 0, matchedClientId stays null → unassigned
        }

        await prisma.dailyInsight.create({
          data: {
            title: title.substring(0, 255),
            url,
            description: description ? description.substring(0, 1000) : '',
            source: source || '',
            industry: matchedIndustry,
            clientId: matchedClientId,
            status: 'pending',
            scrapedAt: scraped_at ? new Date(scraped_at) : new Date(),
          },
        })
        savedCount++
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    }

    const assignedCount = savedCount - errors.length
    return NextResponse.json({
      success: true,
      message: `Scraped ${sources.length} sources. Saved ${savedCount} articles, skipped ${duplicateCount} duplicates.`,
      stats: {
        scraped: articlesData.length,
        saved: savedCount,
        duplicates: duplicateCount,
        sources: sources.length,
        clients: clientKeywordData.length,
        keywords: allKeywords.length,
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
    return NextResponse.json({
      scraperApi: SCRAPER_API,
      scraperHealthy: healthRes?.ok || false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
