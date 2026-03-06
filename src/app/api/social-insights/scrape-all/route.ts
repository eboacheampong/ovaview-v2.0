import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST() {
  try {
    // Get all active clients with keywords
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, newsKeywords: true },
    })

    if (clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients found' })
    }

    let totalSaved = 0
    let totalFound = 0
    const clientResults: Record<string, { found: number; saved: number }> = {}

    for (const client of clients) {
      try {
        // Build keywords from client name + newsKeywords
        const keywords = new Set<string>()
        if (client.name) keywords.add(client.name.toLowerCase().trim())
        if (client.newsKeywords) {
          client.newsKeywords.split(',').forEach(k => {
            const t = k.trim().toLowerCase()
            if (t) keywords.add(t)
          })
        }

        if (keywords.size === 0) continue

        // Call the social scraper for this client
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social-posts/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: client.id,
            platforms: ['youtube', 'twitter', 'tiktok', 'instagram', 'linkedin', 'facebook'],
          }),
        })

        if (res.ok) {
          const data = await res.json()
          totalFound += data.postsFound || 0
          totalSaved += data.postsSaved || 0
          clientResults[client.name] = {
            found: data.postsFound || 0,
            saved: data.postsSaved || 0,
          }
        }
      } catch (err) {
        console.error(`[Social Scraper] Error for ${client.name}:`, err)
        clientResults[client.name] = { found: 0, saved: 0 }
      }
    }

    const message = `Scraped ${clients.length} clients: found ${totalFound} posts, saved ${totalSaved} new`

    return NextResponse.json({
      success: true,
      message,
      totalFound,
      totalSaved,
      clientResults,
    })
  } catch (error) {
    console.error('[Social Scraper] scrape-all error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape' },
      { status: 500 }
    )
  }
}
