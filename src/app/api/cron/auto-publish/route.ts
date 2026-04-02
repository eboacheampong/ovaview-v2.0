import { NextRequest, NextResponse } from 'next/server'
import { processWebInsights, processSocialPosts } from '@/lib/ai-auto-publish'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET

/**
 * AI Auto-Publish Cron Endpoint
 * 
 * Processes pending DailyInsights and SocialPosts:
 * 1. Fetches article content via direct fetch + Readability
 * 2. AI verifies relevance to client
 * 3. AI extracts all fields (summary, sentiment, keywords, industry, etc.)
 * 4. Creates WebStory or accepts SocialPost automatically
 * 
 * Can be called standalone or as Step 3 of the hourly cron pipeline.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  console.log('[AutoPublish Cron] Starting AI auto-publish cycle...')

  const errors: string[] = []
  let webResults: Awaited<ReturnType<typeof processWebInsights>> = []
  let socialResults: Awaited<ReturnType<typeof processSocialPosts>> = []

  // Step 1: Process pending web insights → WebStories
  try {
    console.log('[AutoPublish Cron] Processing pending web insights...')
    webResults = await processWebInsights(30)
    const published = webResults.filter(r => r.action === 'published').length
    const skipped = webResults.filter(r => r.action === 'skipped').length
    const errored = webResults.filter(r => r.action === 'error').length
    console.log(`[AutoPublish Cron] Web insights: ${published} published, ${skipped} skipped, ${errored} errors`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    errors.push(`Web insights error: ${msg}`)
    console.error(`[AutoPublish Cron] Web insights error: ${msg}`)
  }

  // Step 2: Process pending social posts
  try {
    console.log('[AutoPublish Cron] Processing pending social posts...')
    socialResults = await processSocialPosts(30)
    const published = socialResults.filter(r => r.action === 'published').length
    const skipped = socialResults.filter(r => r.action === 'skipped').length
    const errored = socialResults.filter(r => r.action === 'error').length
    console.log(`[AutoPublish Cron] Social posts: ${published} published, ${skipped} skipped, ${errored} errors`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    errors.push(`Social posts error: ${msg}`)
    console.error(`[AutoPublish Cron] Social posts error: ${msg}`)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  const summary = {
    web: {
      total: webResults.length,
      published: webResults.filter(r => r.action === 'published').length,
      skipped: webResults.filter(r => r.action === 'skipped').length,
      errors: webResults.filter(r => r.action === 'error').length,
    },
    social: {
      total: socialResults.length,
      published: socialResults.filter(r => r.action === 'published').length,
      skipped: socialResults.filter(r => r.action === 'skipped').length,
      errors: socialResults.filter(r => r.action === 'error').length,
    },
  }

  console.log(`[AutoPublish Cron] Completed in ${elapsed}s`)

  return NextResponse.json({
    success: errors.length === 0,
    message: `Auto-publish completed in ${elapsed}s. Web: ${summary.web.published} published, Social: ${summary.social.published} published.`,
    summary,
    details: { web: webResults, social: socialResults },
    errors: errors.length > 0 ? errors : undefined,
    elapsed: `${elapsed}s`,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
