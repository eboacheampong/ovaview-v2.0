import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST() {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, newsKeywords: true },
    })

    if (clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients found' })
    }

    let totalSaved = 0
    let totalFound = 0
    const clientResults: Record<string, { found: number; saved: number; error?: string }> = {}

    // Build the internal URL for the scraper
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    for (const client of clients) {
      try {
        const keywords = new Set<string>()
        if (client.name) keywords.add(client.name.toLowerCase().trim())
        if (client.newsKeywords) {
          client.newsKeywords.split(',').forEach(k => {
            const t = k.trim().toLowerCase()
            if (t) keywords.add(t)
          })
        }
        if (keywords.size === 0) continue

        console.log(`[Scrape-All] Scraping for ${client.name} (keywords: ${Array.from(keywords).join(', ')})`)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 50000) // 50s per client max

        const res = await fetch(`${baseUrl}/api/social-posts/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client.id,
            platforms: ['youtube', 'twitter', 'tiktok', 'instagram', 'linkedin', 'facebook'],
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (res.ok) {
          const data = await res.json()
          totalFound += data.postsFound || 0
          totalSaved += data.postsSaved || 0
          clientResults[client.name] = {
            found: data.postsFound || 0,
            saved: data.postsSaved || 0,
          }
          console.log(`[Scrape-All] ${client.name}: found ${data.postsFound}, saved ${data.postsSaved}`)
        } else {
          const errText = await res.text().catch(() => 'Unknown error')
          console.error(`[Scrape-All] ${client.name} failed: ${res.status} ${errText}`)
          clientResults[client.name] = { found: 0, saved: 0, error: `HTTP ${res.status}` }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Scrape-All] Error for ${client.name}:`, msg)
        clientResults[client.name] = { found: 0, saved: 0, error: msg.includes('abort') ? 'Timeout' : msg }
      }
    }

    const message = `Scraped ${clients.length} clients: found ${totalFound} posts, saved ${totalSaved} new`
    console.log(`[Scrape-All] Done: ${message}`)

    return NextResponse.json({
      success: true,
      message,
      totalFound,
      totalSaved,
      clientResults,
    })
  } catch (error) {
    console.error('[Scrape-All] Fatal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape' },
      { status: 500 }
    )
  }
}
