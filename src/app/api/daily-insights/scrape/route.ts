import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * POST /api/daily-insights/scrape
 *
 * Strategy:
 * 1. Scrape articles from web publication URLs
 * 2. Match each article to clients using their newsKeywords + linked Keywords
 * 3. If an article matches multiple clients, create a row for EACH client
 *    (same url, different clientId — composite unique on [url, clientId])
 * 4. Articles that match zero clients are discarded (no "unassigned")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceClientId = body?.clientId || null

    // 1. Get sources
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true, website: { not: null } },
      select: { website: true },
    })

    // 2. Get clients with keywords
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { keywords: { include: { keyword: true } } },
    })

    // 3. Build per-client keyword lists
    const clientKeywordData = clients.map(c => {
      const kwSet = new Set<string>()
      kwSet.add(c.name.toLowerCase().trim())
      if (c.newsKeywords) {
        c.newsKeywords.split(',').forEach(k => {
          const t = k.trim().toLowerCase()
          if (t) kwSet.add(t)
        })
      }
      c.keywords.forEach(ck => kwSet.add(ck.keyword.name.toLowerCase().trim()))
      return { clientId: c.id, clientName: c.name, keywords: Array.from(kwSet) }
    })

    // Collect all keywords for the scraper tag
    const allKeywords = new Set<string>()
    clientKeywordData.forEach(e => e.keywords.forEach(k => allKeywords.add(k)))

    // 4. Build sources
    const sources = publications
      .filter(p => p.website)
      .map(p => [p.website!, 'news', Array.from(allKeywords).slice(0, 10).join(',') || 'general'])

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No web publications with URLs configured. Add URLs to your web publications first.',
        stats: { scraped: 0, saved: 0, duplicates: 0 },
      })
    }

    console.log(`Scraping ${sources.length} sources, matching against ${clientKeywordData.length} clients`)

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

    // 6. Match & save — each article can go to multiple clients
    let savedCount = 0
    let duplicateCount = 0
    let skippedNoMatch = 0

    for (const article of articlesData) {
      try {
        const { title, url, description, source, industry, scraped_at } = article
        if (!title || !url) continue

        // If forceClientId, just save for that client
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

        // Score each client
        const articleText = `${title} ${description || ''}`.toLowerCase()
        const matchedClients: { clientId: string; keyword: string }[] = []

        for (const entry of clientKeywordData) {
          for (const kw of entry.keywords) {
            let found = false
            if (kw.length <= 4) {
              const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              found = new RegExp(`\\b${escaped}\\b`, 'i').test(articleText)
            } else {
              found = articleText.includes(kw)
            }
            if (found) {
              matchedClients.push({ clientId: entry.clientId, keyword: kw })
              break // one keyword match is enough to assign to this client
            }
          }
        }

        // Deduplicate client IDs
        const uniqueClientIds = Array.from(new Set(matchedClients.map(m => m.clientId)))

        if (uniqueClientIds.length === 0) {
          skippedNoMatch++
          continue // no match = don't save at all
        }

        // Create a row for each matched client
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
