import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPPORTED_PLATFORMS = ['twitter', 'instagram', 'facebook', 'linkedin', 'tiktok']
const HOURS_CUTOFF = 72 // 3 days — Google News RSS indexes with delay

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getCutoffDate(): Date {
  return new Date(Date.now() - HOURS_CUTOFF * 60 * 60 * 1000)
}

async function fetchWithTimeout(url: string, timeoutMs = 12000, extra: Record<string, string> = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        ...extra,
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}


// ============ PLATFORM DETECTION ============

const PLATFORM_DOMAINS: Record<string, string[]> = {
  TWITTER: ['x.com/', 'twitter.com/'],
  INSTAGRAM: ['instagram.com/'],
  FACEBOOK: ['facebook.com/', 'fb.com/'],
  LINKEDIN: ['linkedin.com/'],
  TIKTOK: ['tiktok.com/'],
}

function detectPlatform(url: string, title: string, filter?: string): string | null {
  const urlLower = url.toLowerCase()
  const titleLower = (title || '').toLowerCase()

  for (const [platform, domains] of Object.entries(PLATFORM_DOMAINS)) {
    if (domains.some(d => urlLower.includes(d))) {
      if (filter && filter.toUpperCase() !== platform) continue
      return platform
    }
  }

  // Title-based hints
  const hints: Record<string, string[]> = {
    TWITTER: ['tweet', 'twitter', 'x.com', 'elon musk'],
    INSTAGRAM: ['instagram', 'insta'],
    FACEBOOK: ['facebook', 'meta'],
    LINKEDIN: ['linkedin'],
    TIKTOK: ['tiktok'],
  }

  if (filter) {
    const pf = filter.toUpperCase()
    for (const hint of hints[pf] || []) {
      if (titleLower.includes(hint)) return pf
    }
  } else {
    for (const [platform, hintList] of Object.entries(hints)) {
      if (hintList.some(h => titleLower.includes(h))) return platform
    }
  }

  return null
}

function extractAuthor(url: string, platform: string, title: string = ''): string {
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
      if (m && !['login', 'help', 'policies', 'watch', 'marketplace', 'groups'].includes(m[1].toLowerCase())) {
        return m[1].replace(/[.-]/g, ' ')
      }
    } else if (platform === 'LINKEDIN') {
      const m = url.match(/linkedin\.com\/posts\/([^_/?#\s]+)/)
      if (m) return m[1].replace(/[-_]/g, ' ')
      const m2 = url.match(/linkedin\.com\/in\/([^/?#]+)/)
      if (m2) return m2[1].replace(/[-_]/g, ' ')
    } else if (platform === 'TIKTOK') {
      const m = url.match(/tiktok\.com\/@([^/?#]+)/)
      if (m) return m[1]
    }
  } catch {}
  return ''
}

function extractPostId(url: string, platform: string): string {
  try {
    if (platform === 'TWITTER') {
      const m = url.match(/\/status\/(\d+)/)
      if (m) return m[1]
    } else if (platform === 'INSTAGRAM') {
      const m = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
      if (m) return m[1]
    } else if (platform === 'TIKTOK') {
      const m = url.match(/\/video\/(\d+)/)
      if (m) return m[1]
    } else if (platform === 'LINKEDIN') {
      const m = url.match(/activity-(\d+)/)
      if (m) return `li_${m[1]}`
    }
  } catch {}
  return `${platform.toLowerCase().substring(0, 2)}_${Buffer.from(url).toString('base64').substring(0, 16)}`
}

function buildEmbed(url: string, platform: string): string {
  if (platform === 'TWITTER') {
    return `<blockquote class="twitter-tweet"><a href="${url}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`
  } else if (platform === 'INSTAGRAM') {
    const clean = url.replace(/\/$/, '') + '/'
    return `<iframe src="${clean}embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`
  } else if (platform === 'FACEBOOK') {
    return `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500" width="100%" height="400" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>`
  } else if (platform === 'TIKTOK') {
    const m = url.match(/\/video\/(\d+)/)
    if (m) return `<iframe src="https://www.tiktok.com/embed/v2/${m[1]}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`
  }
  return ''
}

function buildPost(platform: string, postId: string, content: string, keyword: string, postUrl: string, opts: {
  authorName?: string; authorHandle?: string; embedHtml?: string; mediaType?: string; hashtags?: string[]; postedAt?: Date
} = {}) {
  return {
    platform: platform as SocialPlatform,
    postId,
    content: content.substring(0, 500),
    summary: '',
    authorHandle: opts.authorHandle || '',
    authorName: opts.authorName || '',
    postUrl,
    embedUrl: postUrl,
    embedHtml: opts.embedHtml || '',
    mediaUrls: [],
    mediaType: opts.mediaType || 'text',
    viewsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    hashtags: opts.hashtags || [],
    mentions: [],
    keywords: keyword,
    postedAt: opts.postedAt || new Date(),
  }
}


// ============ URL RESOLUTION ============

/** Follow Google News redirect to get the real article/social URL */
async function resolveGoogleNewsUrl(gnUrl: string): Promise<string> {
  // If it's already a direct URL (not Google News), return as-is
  if (!gnUrl.includes('news.google.com')) return gnUrl

  try {
    // Use redirect: 'manual' to catch the 302/303 Location header without following
    const res = await fetch(gnUrl, {
      method: 'GET',
      headers: { 'User-Agent': randomUA() },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    })

    // Check Location header for redirect
    const location = res.headers.get('location')
    if (location && !location.includes('news.google.com')) {
      return location
    }

    // Some Google News URLs do a JS/meta redirect — try following with redirect: 'follow'
    const res2 = await fetch(gnUrl, {
      method: 'GET',
      headers: { 'User-Agent': randomUA() },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    const finalUrl = res2.url
    if (finalUrl && finalUrl !== gnUrl && !finalUrl.includes('news.google.com')) {
      return finalUrl
    }

    // Last resort: parse the HTML for meta refresh or canonical URL
    const html = await res2.text()
    const metaRefresh = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i)
    if (metaRefresh) return metaRefresh[1]

    const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    if (canonical && !canonical[1].includes('news.google.com')) return canonical[1]

    const dataUrl = html.match(/data-url=["']([^"']+)["']/i)
    if (dataUrl && !dataUrl[1].includes('news.google.com')) return dataUrl[1]
  } catch (e) {
    console.log(`[URL Resolve] Failed for ${gnUrl.substring(0, 60)}:`, e instanceof Error ? e.message : 'timeout')
  }

  return gnUrl // Fallback to original
}

/** Resolve multiple URLs in parallel with concurrency limit */
async function resolveUrls(items: Array<{ title: string; link: string; pubDate: string }>): Promise<Array<{ title: string; link: string; resolvedLink: string; pubDate: string }>> {
  const BATCH_SIZE = 5
  const results: Array<{ title: string; link: string; resolvedLink: string; pubDate: string }> = []

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const resolved = await Promise.allSettled(
      batch.map(async (item) => ({
        ...item,
        resolvedLink: await resolveGoogleNewsUrl(item.link),
      }))
    )
    for (const r of resolved) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        // If resolution failed, keep original link
        results.push({ ...batch[resolved.indexOf(r)], resolvedLink: batch[resolved.indexOf(r)].link })
      }
    }
  }
  return results
}


// ============ RSS PARSING ============

function parseRSSItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = []
  const itemBlocks = xml.split('<item>').slice(1)
  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/)
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
    if (titleMatch && linkMatch) {
      items.push({
        title: titleMatch[1].trim(),
        link: linkMatch[1].trim(),
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
      })
    }
  }
  return items
}

function isWithinCutoff(dateStr: string): boolean {
  if (!dateStr) return true // No date = assume recent
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return true
    return d >= getCutoffDate()
  } catch {
    return true
  }
}

// ============ SOURCE 1: Google News RSS (per-platform, site-filtered) ============

async function scrapeGoogleNewsRSS(keyword: string, platformFilter: string): Promise<any[]> {
  const posts: any[] = []
  const siteMap: Record<string, string> = {
    twitter: 'site:x.com OR site:twitter.com',
    instagram: 'site:instagram.com',
    facebook: 'site:facebook.com',
    linkedin: 'site:linkedin.com',
    tiktok: 'site:tiktok.com',
  }
  const siteQ = siteMap[platformFilter] || ''
  const query = `${keyword} ${siteQ}`.trim()

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`
    const res = await fetchWithTimeout(url, 12000)
    if (!res.ok) return posts
    const xml = await res.text()
    const items = parseRSSItems(xml)

    // Resolve Google News redirect URLs to real social media URLs
    const resolved = await resolveUrls(items.slice(0, 15).filter(i => isWithinCutoff(i.pubDate)))

    for (const item of resolved) {
      const realUrl = item.resolvedLink
      const platform = detectPlatform(realUrl, item.title, platformFilter)
      if (!platform) continue

      const postId = extractPostId(realUrl, platform)
      const author = extractAuthor(realUrl, platform, item.title)

      posts.push(buildPost(platform, postId, item.title, keyword, realUrl, {
        authorName: author,
        embedHtml: buildEmbed(realUrl, platform),
        postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      }))
    }
    if (posts.length > 0) console.log(`[Google News RSS] Found ${posts.length} ${platformFilter} posts for "${keyword}"`)
  } catch (e) {
    console.log(`[Google News RSS] Error for "${keyword}":`, e instanceof Error ? e.message : 'unknown')
  }
  return posts
}

// ============ SOURCE 2: Google News RSS (general — no site filter) ============

async function scrapeGoogleNewsGeneral(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}+when:3d&hl=en&gl=US&ceid=US:en`
    const res = await fetchWithTimeout(url, 12000)
    if (!res.ok) return posts
    const xml = await res.text()
    const items = parseRSSItems(xml)

    // Resolve Google News redirect URLs to real social media URLs
    const resolved = await resolveUrls(items.slice(0, 25).filter(i => isWithinCutoff(i.pubDate)))

    for (const item of resolved) {
      const realUrl = item.resolvedLink
      let platform = detectPlatform(realUrl, item.title)
      if (!platform) continue

      const postId = extractPostId(realUrl, platform)
      const author = extractAuthor(realUrl, platform, item.title)

      posts.push(buildPost(platform, postId, item.title, keyword, realUrl, {
        authorName: author,
        embedHtml: buildEmbed(realUrl, platform),
        postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      }))
    }
    if (posts.length > 0) console.log(`[Google News General] Found ${posts.length} social posts for "${keyword}"`)
  } catch (e) {
    console.log(`[Google News General] Error:`, e instanceof Error ? e.message : 'unknown')
  }
  return posts
}

// ============ SOURCE 3: Google News RSS (social media keyword boost) ============

async function scrapeGoogleNewsSocialBoost(keyword: string): Promise<any[]> {
  const posts: any[] = []
  const boostQueries = [
    `"${keyword}" (twitter OR "x.com" OR tweet)`,
    `"${keyword}" (instagram OR facebook OR tiktok OR linkedin)`,
  ]

  for (const query of boostQueries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`
      const res = await fetchWithTimeout(url, 10000)
      if (!res.ok) continue
      const xml = await res.text()
      const items = parseRSSItems(xml)

      // Resolve Google News redirect URLs to real social media URLs
      const resolved = await resolveUrls(items.slice(0, 10).filter(i => isWithinCutoff(i.pubDate)))

      for (const item of resolved) {
        const realUrl = item.resolvedLink
        let platform = detectPlatform(realUrl, item.title)
        if (!platform) continue

        const postId = extractPostId(realUrl, platform)
        const author = extractAuthor(realUrl, platform, item.title)

        posts.push(buildPost(platform, postId, item.title, keyword, realUrl, {
          authorName: author,
          embedHtml: buildEmbed(realUrl, platform),
          postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        }))
      }
    } catch {}
  }
  if (posts.length > 0) console.log(`[Google News Boost] Found ${posts.length} social posts for "${keyword}"`)
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

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { clientId, platforms: requestedPlatforms } = body

    // Get keywords for this client
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

    // Run all Google News RSS queries in parallel
    const scrapePromises: Promise<any[]>[] = []

    for (const keyword of keywords.slice(0, 5)) {
      // Per-platform site-filtered searches
      for (const plat of platforms) {
        scrapePromises.push(scrapeGoogleNewsRSS(keyword, plat))
      }
      // General search (catches cross-platform mentions)
      scrapePromises.push(scrapeGoogleNewsGeneral(keyword))
      // Social boost search (catches news articles mentioning social platforms)
      scrapePromises.push(scrapeGoogleNewsSocialBoost(keyword))
    }

    const results = await Promise.allSettled(scrapePromises)
    const allPosts: any[] = []
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allPosts.push(...result.value)
      }
    }

    // Deduplicate by platform + postId
    const seen = new Set<string>()
    const uniquePosts = allPosts.filter(post => {
      const key = `${post.platform}_${post.postId}`
      if (seen.has(key)) return false
      seen.add(key)
      // Only keep posts for requested platforms
      return platforms.includes(post.platform.toLowerCase())
    })

    console.log(`[Social Scraper] Found ${uniquePosts.length} unique posts (from ${allPosts.length} raw)`)

    // Save to database
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
        // Skip individual save errors (e.g. unique constraint violations)
        console.log(`[Social Scraper] Save error:`, error instanceof Error ? error.message : 'unknown')
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const message = `Found ${uniquePosts.length} posts, saved ${savedCount} new, ${duplicateCount} duplicates (${elapsed}s)`
    console.log(`[Social Scraper] ${message}`)

    return NextResponse.json({
      success: true,
      message,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      duplicates: duplicateCount,
      keywords,
      platforms,
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
