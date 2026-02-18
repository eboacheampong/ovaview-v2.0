import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * POST /api/daily-insights/scrape
 * Trigger the remote Scrapy crawler, auto-match articles to clients by keywords, and save to DB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceClientId = body?.clientId || null

    console.log(`Calling scraper API at ${SCRAPER_API}/api/scrape`)

    // Try POST first, fall back to GET if Method Not Allowed
    let scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (scraperResponse.status === 405) {
      console.log('POST not allowed, trying GET...')
      scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`)
    }

    if (!scraperResponse.ok) {
      const errorText = await scraperResponse.text()
      console.error(`Scraper API error (${scraperResponse.status}):`, errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Scraper returned ${scraperResponse.status}`,
          message: `The scraper at ${SCRAPER_API} returned an error. Ensure the latest code is deployed.`,
        },
        { status: 502 }
      )
    }

    const scraperData = await scraperResponse.json()
    console.log('Scraper response keys:', Object.keys(scraperData))
    console.log('Articles count:', scraperData.articles?.length ?? 'no articles key')

    if (!scraperData.success) {
      return NextResponse.json(
        { success: false, error: scraperData.error || 'Scraper failed' },
        { status: 500 }
      )
    }

    const articlesData: any[] = scraperData.articles || []

    // Load all active clients with their keywords for auto-matching
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: { keywords: { include: { keyword: true } } },
    })

    // Build keyword map: lowercased keyword -> clientId
    const clientKeywordMap: { clientId: string; keywords: string[] }[] = clients.map(c => ({
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

        if (!title || !url) {
          errors.push('Skipping: missing title or url')
          continue
        }

        // Check duplicate by unique url
        const existing = await prisma.dailyInsight.findUnique({ where: { url } })
        if (existing) {
          duplicateCount++
          continue
        }

        // Auto-match to client by keywords (unless a specific clientId was forced)
        let matchedClientId = forceClientId
        if (!matchedClientId) {
          const articleText = `${title} ${description || ''} ${source || ''}`.toLowerCase()
          for (const entry of clientKeywordMap) {
            if (entry.keywords.some(kw => articleText.includes(kw))) {
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
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('Error saving article:', errorMsg)
        errors.push(`Save failed: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${savedCount} articles, skipped ${duplicateCount} duplicates.`,
      stats: {
        scraped: articlesData.length,
        saved: savedCount,
        duplicates: duplicateCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('Error running scraper:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run scraper',
        message: 'Could not reach the scraper service.',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const healthRes = await fetch(`${SCRAPER_API}/health`).catch(() => null)
    return NextResponse.json({
      message: 'Scraper endpoint is active',
      scraperApi: SCRAPER_API,
      scraperHealthy: healthRes?.ok || false,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
