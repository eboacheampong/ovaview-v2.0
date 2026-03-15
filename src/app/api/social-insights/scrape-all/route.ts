import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'
const SUPPORTED_PLATFORMS = ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok']

// ── helpers (duplicated from scrape route to avoid self-HTTP calls) ──

function extractPostId(url: string, platform: string): string {
  try {
    if (platform === 'TWITTER') { const m = url.match(/\/status\/(\d+)/); if (m) return m[1] }
    if (platform === 'INSTAGRAM') { const m = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/); if (m) return m[1] }
    if (platform === 'TIKTOK') { const m = url.match(/\/video\/(\d+)/); if (m) return m[1] }
    if (platform === 'LINKEDIN') { const m = url.match(/activity-(\d+)/); if (m) return `li_${m[1]}` }
  } catch {}
  return `${platform.toLowerCase().substring(0, 2)}_${Buffer.from(url).toString('base64').substring(0, 16)}`
}

function buildEmbed(url: string, platform: string): string {
  if (platform === 'TWITTER') return `<blockquote class="twitter-tweet"><a href="${url}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`
  if (platform === 'INSTAGRAM') return `<iframe src="${url.replace(/\/$/, '')}/embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`
  if (platform === 'FACEBOOK') return `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" width="100%" height="400" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>`
  if (platform === 'TIKTOK') { const m = url.match(/\/video\/(\d+)/); if (m) return `<iframe src="https://www.tiktok.com/embed/v2/${m[1]}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>` }
  if (platform === 'LINKEDIN') return `<a href="${url}" target="_blank" rel="noopener">View on LinkedIn</a>`
  return ''
}

interface RawPost {
  platform: string
  post_id?: string
  content?: string
  author_handle?: string
  author_name?: string
  post_url?: string
  embed_url?: string
  embed_html?: string
  media_urls?: string[]
  media_type?: string
  views_count?: number
  likes_count?: number
  comments_count?: number
  shares_count?: number
  hashtags?: string[]
  mentions?: string[]
  keywords?: string
  posted_at?: string
}

// ── scrape one client directly via Python API ──

async function scrapeClient(client: { id: string; name: string; newsKeywords: string | null }): Promise<{
  name: string
  found: number
  saved: number
  error?: string
}> {
  // Build keywords
  const keywords = new Set<string>()
  if (client.name) keywords.add(client.name.toLowerCase().trim())
  if (client.newsKeywords) {
    client.newsKeywords.split(',').forEach(k => {
      const t = k.trim().toLowerCase()
      if (t) keywords.add(t)
    })
  }
  if (keywords.size === 0) return { name: client.name, found: 0, saved: 0 }

  const kwArray = Array.from(keywords)
  console.log(`[Scrape-All] ${client.name}: keywords=${kwArray.join(', ')}`)

  // Call Python scraper directly (NOT via self-HTTP)
  let rawPosts: RawPost[] = []
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000) // 90s

    console.log(`[Scrape-All] ${client.name}: calling ${SCRAPER_API_URL}/api/scrape/social`)
    const res = await fetch(`${SCRAPER_API_URL}/api/scrape/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: kwArray, platforms: SUPPORTED_PLATFORMS, save: false }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    console.log(`[Scrape-All] ${client.name}: Python scraper responded HTTP ${res.status}`)

    if (res.ok) {
      const data = await res.json()
      console.log(`[Scrape-All] ${client.name}: success=${data.success}, posts=${data.posts?.length ?? 0}, total_count=${data.total_count ?? 'N/A'}`)
      if (data.success && data.posts) rawPosts = data.posts
    } else {
      const errText = await res.text().catch(() => '')
      console.error(`[Scrape-All] ${client.name}: HTTP ${res.status} — ${errText.substring(0, 300)}`)
      return { name: client.name, found: 0, saved: 0, error: `HTTP ${res.status}` }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error(`[Scrape-All] Python scraper failed for ${client.name}: ${msg}`)
    return { name: client.name, found: 0, saved: 0, error: msg.includes('abort') ? 'Timeout (90s)' : msg }
  }

  // Transform and save
  let saved = 0
  let skippedPlatform = 0
  let duplicates = 0
  let saveErrors = 0
  const validPlatforms = ['TWITTER', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK']

  console.log(`[Scrape-All] ${client.name}: processing ${rawPosts.length} raw posts`)

  for (const p of rawPosts) {
    const platform = (p.platform || '').toUpperCase()
    if (!validPlatforms.includes(platform)) {
      skippedPlatform++
      continue
    }

    const postId = p.post_id || extractPostId(p.post_url || '', platform)
    const postUrl = p.post_url || ''

    try {
      const existing = await prisma.socialPost.findFirst({
        where: { platform: platform as SocialPlatform, postId, clientId: client.id },
      })
      if (existing) {
        duplicates++
        continue
      }

      await prisma.socialPost.create({
        data: {
          platform: platform as SocialPlatform,
          postId,
          content: (p.content || '').substring(0, 500),
          summary: '',
          authorHandle: p.author_handle || '',
          authorName: p.author_name || '',
          postUrl,
          embedUrl: p.embed_url || postUrl,
          embedHtml: p.embed_html || buildEmbed(postUrl, platform),
          mediaUrls: p.media_urls || [],
          mediaType: p.media_type || 'text',
          viewsCount: p.views_count || 0,
          likesCount: p.likes_count || 0,
          commentsCount: p.comments_count || 0,
          sharesCount: p.shares_count || 0,
          hashtags: p.hashtags || [],
          mentions: p.mentions || [],
          keywords: p.keywords || '',
          postedAt: p.posted_at ? new Date(p.posted_at) : new Date(),
          clientId: client.id,
        },
      })
      saved++
    } catch (err) {
      saveErrors++
      console.error(`[Scrape-All] Save error for ${client.name}/${platform}/${postId}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`[Scrape-All] ${client.name}: found ${rawPosts.length}, saved ${saved}, duplicates ${duplicates}, skippedPlatform ${skippedPlatform}, saveErrors ${saveErrors}`)
  return { name: client.name, found: rawPosts.length, saved }
}

// ── POST handler ──

export async function POST() {
  try {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true, newsKeywords: true },
    })

    if (clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients found', totalFound: 0, totalSaved: 0 })
    }

    // Scrape all clients in parallel (max 3 concurrent to be nice to the Python API)
    const results: Awaited<ReturnType<typeof scrapeClient>>[] = []
    const batchSize = 3
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize)
      const batchResults = await Promise.allSettled(batch.map(c => scrapeClient(c)))
      for (const r of batchResults) {
        results.push(r.status === 'fulfilled' ? r.value : { name: 'unknown', found: 0, saved: 0, error: 'Promise rejected' })
      }
    }

    const totalFound = results.reduce((s, r) => s + r.found, 0)
    const totalSaved = results.reduce((s, r) => s + r.saved, 0)
    const clientResults: Record<string, { found: number; saved: number; error?: string }> = {}
    for (const r of results) clientResults[r.name] = { found: r.found, saved: r.saved, error: r.error }

    const message = `Scraped ${clients.length} clients: found ${totalFound} posts, saved ${totalSaved} new`
    console.log(`[Scrape-All] Done: ${message}`)

    return NextResponse.json({ success: true, message, totalFound, totalSaved, clientResults })
  } catch (error) {
    console.error('[Scrape-All] Fatal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape' },
      { status: 500 }
    )
  }
}
