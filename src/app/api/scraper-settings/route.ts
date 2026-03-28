/**
 * GET/PUT /api/scraper-settings
 * 
 * Manages scraper settings stored in CrawlerConfig table.
 * Key settings:
 *   - auto_publish_scrapes: boolean (default: false)
 *     When ON, scraped articles are saved with status 'accepted' (auto-published).
 *     When OFF (default), saved as 'pending' for manual review.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  auto_publish_scrapes: 'false',
}

export async function GET() {
  try {
    const configs = await prisma.crawlerConfig.findMany({
      where: { category: 'scraper' },
    })

    const settings: Record<string, string> = { ...DEFAULTS }
    for (const c of configs) {
      settings[c.key] = c.value
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body as { key: string; value: string }

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'key and value required' }, { status: 400 })
    }

    await prisma.crawlerConfig.upsert({
      where: { key },
      update: { value: String(value), category: 'scraper' },
      create: { key, value: String(value), category: 'scraper', description: `Scraper setting: ${key}` },
    })

    return NextResponse.json({ success: true, key, value: String(value) })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save setting' },
      { status: 500 }
    )
  }
}
