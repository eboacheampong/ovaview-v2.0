import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for Vercel Pro

const CRON_SECRET = process.env.CRON_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Hourly Automated Scrape Cron
 * 
 * Runs every hour and:
 * 1. Triggers web article scraping (all active clients' keywords against all publications)
 * 2. Triggers social media scraping for each active client
 * 3. Logs results to CrawlerLog table
 * 
 * This replaces manual "Scrape" button clicks on the daily-insights page.
 * Articles land as DailyInsight (status: pending) for admin review.
 * Social posts land as SocialPost for admin review.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, unknown> = {}
  const errors: string[] = []

  console.log('[Hourly Cron] Starting automated scrape cycle...')

  // ═══════════════════════════════════════════════════════════════════
  // STEP 1: Web Article Scraping (all clients at once)
  // Calls the existing /api/daily-insights/scrape endpoint which:
  //   - Fetches all active clients + their keywords
  //   - Scrapes all web publications via the Flask scraper
  //   - Matches articles to clients using smart keyword matching
  //   - Saves as DailyInsight (status: pending)
  // ═══════════════════════════════════════════════════════════════════
  try {
    console.log('[Hourly Cron] Step 1: Triggering web article scrape...')
    const webRes = await fetch(`${APP_URL}/api/daily-insights/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // no clientId = scrape for ALL clients
      signal: AbortSignal.timeout(150000), // 2.5 min timeout
    })

    if (webRes.ok) {
      const webData = await webRes.json()
      results.webScrape = {
        success: true,
        saved: webData.stats?.saved || 0,
        deepMatched: webData.stats?.deepMatched || 0,
        duplicates: webData.stats?.duplicates || 0,
        sources: webData.stats?.sources || 0,
        message: webData.message,
      }
      console.log(`[Hourly Cron] Web scrape: ${webData.stats?.saved || 0} articles saved`)
    } else {
      const errText = await webRes.text().catch(() => '')
      results.webScrape = { success: false, error: `HTTP ${webRes.status}: ${errText.substring(0, 200)}` }
      errors.push(`Web scrape failed: HTTP ${webRes.status}`)
      console.error(`[Hourly Cron] Web scrape failed: ${webRes.status}`)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    results.webScrape = { success: false, error: msg }
    errors.push(`Web scrape error: ${msg}`)
    console.error(`[Hourly Cron] Web scrape error: ${msg}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 2: Social Media Scraping (per client)
  // For each active client with keywords, call /api/social-posts/scrape
  // which runs the Python scraper (twscrape, facebook-scraper, etc.)
  // with Bing fallback. Results saved as SocialPost.
  // ═══════════════════════════════════════════════════════════════════
  try {
    console.log('[Hourly Cron] Step 2: Triggering social media scrape...')

    const activeClients = await prisma.client.findMany({
      where: { isActive: true, newsKeywords: { not: null } },
      select: { id: true, name: true, newsKeywords: true },
    })

    // Filter to clients that actually have keywords
    const clientsWithKeywords = activeClients.filter(c => 
      c.newsKeywords && c.newsKeywords.trim().length > 0
    )

    console.log(`[Hourly Cron] Found ${clientsWithKeywords.length} clients with keywords for social scrape`)

    const socialResults: Record<string, unknown> = {}
    let totalSocialSaved = 0
    let totalSocialFound = 0

    // Process clients sequentially to avoid overwhelming the scraper
    for (const client of clientsWithKeywords) {
      try {
        const socialRes = await fetch(`${APP_URL}/api/social-posts/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client.id,
            force: true, // bypass cooldown for cron
          }),
          signal: AbortSignal.timeout(90000), // 90s per client
        })

        if (socialRes.ok) {
          const socialData = await socialRes.json()
          socialResults[client.name] = {
            found: socialData.postsFound || 0,
            saved: socialData.postsSaved || 0,
            duplicates: socialData.duplicates || 0,
          }
          totalSocialFound += socialData.postsFound || 0
          totalSocialSaved += socialData.postsSaved || 0
        } else {
          socialResults[client.name] = { error: `HTTP ${socialRes.status}` }
          errors.push(`Social scrape failed for ${client.name}: HTTP ${socialRes.status}`)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown'
        socialResults[client.name] = { error: msg }
        errors.push(`Social scrape error for ${client.name}: ${msg}`)
      }
    }

    results.socialScrape = {
      success: true,
      clientsProcessed: clientsWithKeywords.length,
      totalFound: totalSocialFound,
      totalSaved: totalSocialSaved,
      perClient: socialResults,
    }
    console.log(`[Hourly Cron] Social scrape: ${totalSocialSaved} posts saved across ${clientsWithKeywords.length} clients`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    results.socialScrape = { success: false, error: msg }
    errors.push(`Social scrape error: ${msg}`)
    console.error(`[Hourly Cron] Social scrape error: ${msg}`)
  }

  // ═══════════════════════════════════════════════════════════════════
  // STEP 3: Log the cron run
  // ═══════════════════════════════════════════════════════════════════
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  try {
    // Log to CrawlerLog if the table exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any
    if (db.crawlerLog) {
      await db.crawlerLog.create({
        data: {
          type: 'hourly-cron',
          status: errors.length === 0 ? 'success' : 'partial',
          message: `Hourly scrape completed in ${elapsed}s. Web: ${(results.webScrape as any)?.saved || 0} articles, Social: ${(results.socialScrape as any)?.totalSaved || 0} posts. Errors: ${errors.length}`,
          metadata: JSON.stringify({ results, errors }),
        },
      })
    }
  } catch {
    // CrawlerLog table may not exist yet — that's fine
  }

  console.log(`[Hourly Cron] Completed in ${elapsed}s. Errors: ${errors.length}`)

  return NextResponse.json({
    success: errors.length === 0,
    message: `Hourly scrape completed in ${elapsed}s`,
    results,
    errors: errors.length > 0 ? errors : undefined,
    elapsed: `${elapsed}s`,
    timestamp: new Date().toISOString(),
  })
}

// Support POST too for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
