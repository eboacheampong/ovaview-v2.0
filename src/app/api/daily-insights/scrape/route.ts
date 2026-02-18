import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * POST /api/daily-insights/scrape
 * Build sources from web publications + client keywords, call remote scraper, save results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceClientId = body?.clientId || null

    // Build sources from web publications that have a website URL
    const publications = await prisma.webPublication.findMany({
      where: { isActive: true, website: { not: null } },
      select: { website: true },
    })

    // Get client keywords for industry tagging
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { keywords: { include: { keyword: true } } },
    })

    // Collect unique industry keywords from clients
    const industryKeywords = new Set<string>()
    clients.forEach(c => {
      if (c.newsKeywords) {
        c.newsKeywords.split(',').forEach(k => {
          const trimmed = k.trim().toLowerCase()
          if (trimmed) industryKeywords.add(trimmed)
        })
      }
      c.keywords.forEach(ck => industryKeywords.add(ck.keyword.name.toLowerCase()))
    })

    // Build sources array: [url, spider_type, industry]
    const sources = publications
      .filter(p => p.website)
      .map(p => [p.website!, 'news', Array.from(industryKeywords).slice(0, 3).join(',') || 'general'])

    if (sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No web publications with URLs configured. Add URLs to your web publications first.',
        stats: { scraped: 0, saved: 0, duplicates: 0 },
      })
    }

    console.log(`Calling scraper with ${sources.length} sources from web publications`)

    // Call remote scraper with our sources
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

    // Build client keyword map for auto-matching
    const clientKeywordMap = clients.map(c => ({
      clientId: c.id,
      keywords: [
        c.name.toLowerCase(),
        ...(c.newsKeywords?.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) || []),
        ...c.keywords.map(ck => ck.keyword.name.toLowerCase()),
      ].filter(Boolean),
    }))

    let savedCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    for (const article of articlesData) {
      try {
        const { title, url, description, source, industry, scraped_at } = article
        if (!title || !url) continue

        const existing = await prisma.dailyInsight.findUnique({ where: { url } })
        if (existing) { duplicateCount++; continue }

        // Auto-match to client
        let matchedClientId = forceClientId
        if (!matchedClientId) {
          const text = `${title} ${description || ''} ${source || ''}`.toLowerCase()
          for (const entry of clientKeywordMap) {
            if (entry.keywords.some(kw => text.includes(kw))) {
              matchedClientId = entry.clientId
              break
            }
          }
        }

        await prisma.dailyInsight.create({
          data: {
            title: title.substring(0, 255),
            url,
            description: description ? description.substring(0, 1000) : '',
            source: source || '',
            industry: industry || 'general',
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

    return NextResponse.json({
      success: true,
      message: `Scraped ${sources.length} sources. Saved ${savedCount}, skipped ${duplicateCount} duplicates.`,
      stats: { scraped: articlesData.length, saved: savedCount, duplicates: duplicateCount, sources: sources.length },
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
