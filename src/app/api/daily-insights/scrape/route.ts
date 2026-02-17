import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SCRAPER_API = process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

/**
 * POST /api/daily-insights/scrape
 * Trigger the remote Scrapy crawler to fetch new articles and save them to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const clientId = body?.clientId || null

    console.log(`Calling scraper API at ${SCRAPER_API}/api/scrape`)

    // Call the remote scraper API hosted on Render
    const scraperResponse = await fetch(`${SCRAPER_API}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (!scraperResponse.ok) {
      const errorText = await scraperResponse.text()
      console.error('Scraper API error:', errorText)
      return NextResponse.json(
        { success: false, error: `Scraper API returned ${scraperResponse.status}`, message: errorText },
        { status: scraperResponse.status }
      )
    }

    const scraperData = await scraperResponse.json()

    if (!scraperData.success) {
      return NextResponse.json(
        { success: false, error: scraperData.error || 'Scraper failed', message: scraperData.error },
        { status: 500 }
      )
    }

    // Get articles from the scraper response
    const articlesData: any[] = scraperData.articles || []

    let savedCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    // Save articles to database
    for (const article of articlesData) {
      try {
        const { title, url, description, source, industry, scraped_at } = article

        if (!title || !url) {
          errors.push('Skipping article: missing title or url')
          continue
        }

        // Check if article already exists
        const existing = await prisma.dailyInsight.findFirst({
          where: { url, clientId },
        })

        if (existing) {
          duplicateCount++
          continue
        }

        await prisma.dailyInsight.create({
          data: {
            title: title.substring(0, 255),
            url,
            description: description ? description.substring(0, 1000) : '',
            source: source || '',
            industry: industry || 'general',
            clientId,
            status: 'pending',
            scrapedAt: scraped_at ? new Date(scraped_at) : new Date(),
          },
        })

        savedCount++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('Error saving article:', errorMsg)
        errors.push(`Failed to save article: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scraper completed. Saved ${savedCount} articles, skipped ${duplicateCount} duplicates.`,
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
        message: 'Could not reach the scraper service. Check NEXT_PUBLIC_SCRAPER_API configuration.',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Check if the remote scraper is reachable
    const healthRes = await fetch(`${SCRAPER_API}/health`).catch(() => null)
    const healthy = healthRes?.ok || false

    return NextResponse.json({
      message: 'Scraper endpoint is active',
      scraperApi: SCRAPER_API,
      scraperHealthy: healthy,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
