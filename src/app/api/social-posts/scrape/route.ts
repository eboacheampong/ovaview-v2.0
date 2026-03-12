import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SUPPORTED_PLATFORMS = ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok']

// Python scraper API URL (scrapy_crawler Flask server)
const SCRAPER_API_URL = process.env.SCRAPER_API_URL || process.env.NEXT_PUBLIC_SCRAPER_API || 'http://localhost:5000'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// ============ HELPERS ============

function detectPlatform(url: string, title: string, filter?: string): string | null {
  const urlLower = url.toLowerCase()
  const titleLower = (title || '').toLowerCase()
  const checks: [string, string[]][] = [
    ['TWITTER', ['x.com/', 'twitter.com/']],
    ['INSTAGRAM', ['instagram.com/']],
    ['FACEBOOK', ['facebook.com/', 'fb.com/']],
    ['LINKEDIN', ['linkedin.com/']],
    ['TIKTOK', ['tiktok.com/']],
  ]
  for (const [platform, domains] of checks) {
    if (domains.some(d => urlLower.includes(d))) {
      if (filter && filter.toUpperCase() !== platform) continue
      return platform
    }
  }
  const hints: Record<string, string[]> = {
    TWITTER: ['tweet', 'twitter', 'x.com'],
    INSTAGRAM: ['instagram', 'insta'],
    FACEBOOK: ['facebook', 'meta'],
    LINKEDIN: ['linkedin'],
    TIKTOK: ['tiktok'],
  }
  if (filter) {
    for (const hint of hints[filter.toUpperCase()] || []) {
      if (titleLower.includes(hint)) return filter.toUpperCase()
    }
  } else {
    for (const [platform, hintList] of Object.entries(hints)) {
      if (hintList.some(h => titleLower.includes(h))) return platform
    }
  }
  return null
}

function extractPostId(url: string, platform: string): string {
  try {
    if (platform === 'TWITTER') { const m = url.match(/\/status\/(\d+)/); if (m) return m[1] }
    if (platform === 'INSTAGRAM') { const m = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/); if (m) return m[1] }
    if (platform === 'TIKTOK') { const m = url.match(/\/video\/(\d+)/); if (m) return m[1] }
    if (platform === 'LINKEDIN') { const m = url.match(/activity-(\d+)/); if (m) return `li_${m[1]}` }
  } catch {}
  return `${platform.toLowerCase().substring(0, 2)}_${Buffer.from(url).toString('base64').substring(0, 16)}`
}

function extractAuthor(url: string, platform: string, title = ''): string {
  try {
    if (platform === 'TWITTER') {
      const m = url.match(/(?:x\.com|twitter\.com)\/([\w]+)/)
      if (m && !['search', 'hashtag', 'i', 'intent', 'home'].includes(m[1].toLowerCase())) return m[1]
    } else if (platform === 'INSTAGRAM') {
      const m = title.match(/^(.+?)\s+on\s+Instagram/i)
      if (m) return m[1].trim()
      const m2 = url.match(/instagram\.com\/([^/?#]+)/)
      if (m2 && !['p', 'reel', 'explore', 'accounts'].includes(m2[1].toLowerCase())) return m2[1]
    } else if (platform === 'FACEBOOK') {
      const m = url.match(/facebook\.com\/([^/?#]+)/)
      if (m && !['login', 'help', 'policies', 'watch', 'marketplace', 'groups'].includes(m[1].toLowerCase())) return m[1].replace(/[.-]/g, ' ')
    } else if (platform === 'LINKEDIN') {
      const m = url.match(/linkedin\.com\/posts\/([^_/?#\s]+)/)
      if (m) return m[1].replace(/[-_]/g, ' ')
    } else if (platform === 'TIKTOK') {
      const m = url.match(/tiktok\.com\/@([^/?#]+)/)
      if (m) return m[1]
    }
  } catch {}
  return ''
}

function buildEmbed(url: string, platform: string): string {
  if (platform === 'TWITTER') return `<blockquote class="twitter-tweet"><a href="${url}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`
  if (platform === 'INSTAGRAM') return `<iframe src="${url.replace(/\/$/, '')}/embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`
  if (platform === 'FACEBOOK') return `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" width="100%" height="400" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>`
  if (platform === 'TIKTOK') { const m = url.match(/\/video\/(\d+)/); if (m) return `<iframe src="https://www.tiktok.com/embed/v2/${m[1]}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>` }
  if (platform === 'LINKEDIN') return `<a href="${url}" target="_blank" rel="noopener">View on LinkedIn</a>`
  return ''
}

// ============ SOURCE: Python Scraper API (PRIMARY — twscrape, facebook-scraper, instaloader, etc.) ============

interface ScrapedPost {
  platform: SocialPlatform
  postId: string
  content: string
  summary: string
  authorHandle: string
  authorName: string
  postUrl: string
  embedUrl: string
  embedHtml: string
  mediaUrls: string[]
  mediaType: string
  viewsCount: number
  likesCount: number
  commentsCount: number
  sharesCount: number
  hashtags: string[]
  mentions: string[]
  keywords: string
  postedAt: Date
}

async function scrapePythonAPI(keywords: string[], platforms: string[]): Promise<{ posts: ScrapedPost[]; error?: string }> {
  const posts: ScrapedPost[] = []
  try {
    console.log(`[Python Scraper] Calling ${SCRAPER_API_URL}/api/scrape/social with keywords: ${keywords.join(', ')}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 80000) // 80s — generous timeout

    const res = await fetch(`${SCRAPER_API_URL}/api/scrape/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, platforms, save: false }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const msg = `HTTP ${res.status}: ${errText.substring(0, 200)}`
      console.error(`[Python Scraper] Failed: ${msg}`)
      return { posts, error: msg }
    }

    const data = await res.json()
    if (!data.success) {
      return { posts, error: data.error || 'Unknown error from Python scraper' }
    }

    if (!data.posts || data.posts.length === 0) {
      console.log(`[Python Scraper] Returned 0 posts (scrapers may not have found anything for these keywords)`)
      return { posts, error: undefined }
    }

    for (const p of data.posts) {
      const platform = (p.platform || '').toUpperCase()
      if (!['TWITTER', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK'].includes(platform)) continue

      posts.push({
        platform: platform as SocialPlatform,
        postId: p.post_id || '',
        content: (p.content || '').substring(0, 500),
        summary: '',
        authorHandle: p.author_handle || '',
        authorName: p.author_name || '',
        postUrl: p.post_url || '',
        embedUrl: p.embed_url || p.post_url || '',
        embedHtml: p.embed_html || buildEmbed(p.post_url || '', platform),
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
      })
    }

    console.log(`[Python Scraper] ✓ Got ${posts.length} posts from dedicated scrapers (twscrape/facebook-scraper/instaloader/linkedin-api/TikTokApi/reddit/bing)`)
    return { posts }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error(`[Python Scraper] Connection failed: ${msg}`)
    return { posts, error: `Python scraper unreachable: ${msg}` }
  }
}

// ============ FALLBACK: Bing Search (runs in Next.js when Python scraper is down) ============

async function scrapeBingFallback(keyword: string, platform: string): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = []
  const siteMap: Record<string, string> = {
    twitter: 'site:x.com OR site:twitter.com',
    instagram: 'site:instagram.com/p/ OR site:instagram.com/reel/',
    facebook: 'site:facebook.com',
    linkedin: 'site:linkedin.com/posts/',
    tiktok: 'site:tiktok.com/@',
  }
  const siteQ = siteMap[platform]
  if (!siteQ) return posts

  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(`${siteQ} ${keyword}`)}&filters=ex1%3a%22ez1%22&count=12`
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': randomUA(), 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return posts
    const html = await res.text()
    if (html.toLowerCase().includes('captcha') || html.length < 2000) return posts

    const blocks = html.split('class="b_algo"').slice(1, 12)
    for (const block of blocks) {
      const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/)
      if (!urlMatch) continue
      const resultUrl = urlMatch[1].split('&amp;')[0].split('?')[0]
      const detected = detectPlatform(resultUrl, '', platform)
      if (!detected) continue

      const titleMatch = block.match(/<a[^>]*>([\s\S]*?)<\/a>/)
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''
      const content = title || snippet || `${platform} post about ${keyword}`
      if (content.length < 5) continue

      posts.push({
        platform: detected as SocialPlatform,
        postId: extractPostId(resultUrl, detected),
        content: content.substring(0, 500),
        summary: '',
        authorHandle: extractAuthor(resultUrl, detected, title),
        authorName: extractAuthor(resultUrl, detected, title),
        postUrl: resultUrl,
        embedUrl: resultUrl,
        embedHtml: buildEmbed(resultUrl, detected),
        mediaUrls: [],
        mediaType: detected === 'TIKTOK' || resultUrl.includes('/reel/') ? 'video' : 'text',
        viewsCount: 0, likesCount: 0, commentsCount: 0, sharesCount: 0,
        hashtags: [], mentions: [],
        keywords: keyword,
        postedAt: new Date(),
      })
    }
    if (posts.length > 0) console.log(`[Bing Fallback] Found ${posts.length} ${platform} posts for "${keyword}"`)
  } catch (e) {
    // Bing is best-effort
  }
  return posts
}

// ============ CLIENT KEYWORDS ============

async function getClientKeywords(clientId: string): Promise<string[]> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, newsKeywords: true },
    })
    if (!client) return []
    const kws = new Set<string>()
    if (client.name) kws.add(client.name.toLowerCase().trim())
    if (client.newsKeywords) {
      client.newsKeywords.split(',').forEach((k: string) => {
        const t = k.trim().toLowerCase()
        if (t) kws.add(t)
      })
    }
    return Array.from(kws)
  } catch (error) {
    console.error('Error fetching client keywords:', error)
    return []
  }
}

// ============ MAIN POST HANDLER ============

// ============ SCRAPE COOLDOWN (prevents burning credits on repeated clicks) ============
// Tracks last scrape time per client. Minimum 30 minutes between scrapes for the same client.
const SCRAPE_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const lastScrapeMap = new Map<string, number>()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const sourceReport: Record<string, string> = {}

  try {
    const body = await request.json()
    const { clientId, platforms: requestedPlatforms, force } = body

    // Cooldown check — skip if force=true (manual override)
    if (clientId && !force) {
      const lastScrape = lastScrapeMap.get(clientId)
      if (lastScrape && (Date.now() - lastScrape) < SCRAPE_COOLDOWN_MS) {
        const minutesLeft = Math.ceil((SCRAPE_COOLDOWN_MS - (Date.now() - lastScrape)) / 60000)
        return NextResponse.json({
          success: true,
          message: `Scrape cooldown active — last scraped ${Math.floor((Date.now() - lastScrape) / 60000)} minutes ago. Try again in ${minutesLeft} min, or pass force=true to override.`,
          postsFound: 0,
          postsSaved: 0,
          duplicates: 0,
          cooldown: true,
          cooldownMinutesLeft: minutesLeft,
        })
      }
    }

    let keywords: string[] = []
    if (clientId) {
      keywords = await getClientKeywords(clientId)
    }
    if (keywords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No keywords configured for this client',
        postsFound: 0,
        postsSaved: 0,
        duplicates: 0,
      })
    }

    const platforms = (requestedPlatforms || SUPPORTED_PLATFORMS)
      .map((p: string) => p.toLowerCase())
      .filter((p: string) => SUPPORTED_PLATFORMS.includes(p))

    console.log(`[Social Scraper] Client: ${clientId} | Keywords: ${keywords.join(', ')} | Platforms: ${platforms.join(', ')}`)
    console.log(`[Social Scraper] Python scraper URL: ${SCRAPER_API_URL}`)

    let allPosts: ScrapedPost[] = []

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Call Python scraper (PRIMARY source — runs twscrape,
    //         facebook-scraper, instaloader, linkedin-api, TikTokApi,
    //         Reddit JSON, and Bing search all in one call)
    // ═══════════════════════════════════════════════════════════════════
    const pythonResult = await scrapePythonAPI(keywords, platforms)

    if (pythonResult.posts.length > 0) {
      allPosts.push(...pythonResult.posts)
      sourceReport['python_scraper'] = `✓ ${pythonResult.posts.length} posts`
    } else if (pythonResult.error) {
      sourceReport['python_scraper'] = `✗ ${pythonResult.error}`
    } else {
      sourceReport['python_scraper'] = '⚠ 0 posts (no matches for keywords)'
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: If Python scraper returned nothing or failed, run Bing
    //         search fallback directly from Next.js
    // ═══════════════════════════════════════════════════════════════════
    if (allPosts.length === 0) {
      console.log(`[Social Scraper] Python scraper returned 0 posts — running Bing fallback`)
      const bingPromises: Promise<ScrapedPost[]>[] = []
      for (const keyword of keywords.slice(0, 3)) {
        for (const plat of platforms) {
          bingPromises.push(scrapeBingFallback(keyword, plat))
        }
      }
      const bingResults = await Promise.allSettled(bingPromises)
      let bingCount = 0
      for (const r of bingResults) {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          allPosts.push(...r.value)
          bingCount += r.value.length
        }
      }
      sourceReport['bing_fallback'] = bingCount > 0 ? `✓ ${bingCount} posts` : '✗ 0 posts'
    } else {
      sourceReport['bing_fallback'] = 'skipped (Python scraper had results)'
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Deduplicate
    // ═══════════════════════════════════════════════════════════════════
    const seen = new Set<string>()
    const uniquePosts = allPosts.filter(post => {
      const key = `${post.platform}_${post.postId}`
      if (seen.has(key)) return false
      seen.add(key)
      return platforms.includes(post.platform.toLowerCase())
    })

    console.log(`[Social Scraper] ${uniquePosts.length} unique posts (from ${allPosts.length} raw)`)

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Save to database
    // ═══════════════════════════════════════════════════════════════════
    let savedCount = 0
    let duplicateCount = 0

    for (const post of uniquePosts) {
      try {
        const existing = await prisma.socialPost.findFirst({
          where: {
            platform: post.platform,
            postId: post.postId,
            clientId: clientId || null,
          },
        })
        if (existing) {
          duplicateCount++
          continue
        }

        await prisma.socialPost.create({
          data: {
            ...post,
            clientId: clientId || null,
          },
        })
        savedCount++
      } catch (error) {
        console.log(`[Social Scraper] Save error:`, error instanceof Error ? error.message : 'unknown')
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const message = `Found ${uniquePosts.length} posts, saved ${savedCount} new, ${duplicateCount} duplicates (${elapsed}s)`
    console.log(`[Social Scraper] ${message}`)
    console.log(`[Social Scraper] Sources:`, JSON.stringify(sourceReport))

    // Mark cooldown timestamp for this client
    if (clientId) {
      lastScrapeMap.set(clientId, Date.now())
    }

    return NextResponse.json({
      success: true,
      message,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      duplicates: duplicateCount,
      keywords,
      platforms,
      sources: sourceReport,
      elapsed: `${elapsed}s`,
    })
  } catch (error) {
    console.error('[Social Scraper] Fatal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scrape social media' },
      { status: 500 }
    )
  }
}
