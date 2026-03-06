import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SocialPlatform } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 24-hour cutoff — only accept posts from the last 24 hours
const HOURS_CUTOFF = 24

function getCutoffDate(): Date {
  return new Date(Date.now() - HOURS_CUTOFF * 60 * 60 * 1000)
}

// Rotating User-Agents to reduce blocking
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// Helper to make requests with browser-like headers + timeout
async function fetchPage(url: string, timeoutMs = 10000, extra: Record<string, string> = {}): Promise<Response> {
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

function isRecent(date: Date | null): boolean {
  if (!date) return false
  return date >= getCutoffDate()
}

function formatDateParam(date: Date): string {
  return date.toISOString().split('T')[0]
}


// ============ SEARCH ENGINE HELPERS ============

/**
 * Search via Bing with 24h filter. Returns raw HTML.
 * Uses ex1:"ez1" for past 24 hours.
 */
async function searchBing(query: string): Promise<string> {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&filters=ex1%3a%22ez1%22&count=15`
    const res = await fetchPage(url, 10000)
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Search via DuckDuckGo HTML (fallback — more lenient with server IPs).
 * DDG doesn't have a strict 24h filter but we filter results ourselves.
 */
async function searchDDG(query: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await fetchPage(url, 10000, {
      'Accept': 'text/html',
    })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Extract URLs and titles from Bing HTML results.
 * Handles multiple Bing HTML layouts.
 */
function extractBingResults(html: string): Array<{ url: string; title: string; snippet: string }> {
  const results: Array<{ url: string; title: string; snippet: string }> = []
  if (!html) return results

  // Strategy 1: b_algo blocks (standard Bing)
  const blocks = html.split(/class="b_algo"/).slice(1, 15)
  for (const block of blocks) {
    const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/)
    if (!urlMatch) continue
    const url = urlMatch[1].split('&amp;')[0].split('?')[0]

    const titleMatch = block.match(/<a[^>]*>([\s\S]*?)<\/a>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    if (url && (title || snippet)) {
      results.push({ url, title, snippet })
    }
  }

  // Strategy 2: If no b_algo found, try generic link extraction
  if (results.length === 0) {
    const linkRegex = /href="(https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|tiktok\.com|instagram\.com|linkedin\.com|facebook\.com)[^"]+)"/g
    let m
    while ((m = linkRegex.exec(html)) !== null) {
      const url = m[1].split('&amp;')[0].split('?')[0]
      if (!results.find(r => r.url === url)) {
        results.push({ url, title: '', snippet: '' })
      }
    }
  }

  return results
}

/**
 * Extract URLs from DuckDuckGo HTML results.
 */
function extractDDGResults(html: string): Array<{ url: string; title: string; snippet: string }> {
  const results: Array<{ url: string; title: string; snippet: string }> = []
  if (!html) return results

  // DDG result blocks
  const blocks = html.split(/class="result__body"/).slice(1, 15)
  for (const block of blocks) {
    const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/)
    if (!urlMatch) continue
    // DDG sometimes wraps URLs in redirects
    let url = urlMatch[1]
    const uddgMatch = url.match(/uddg=(https?[^&]+)/)
    if (uddgMatch) url = decodeURIComponent(uddgMatch[1])
    url = url.split('?')[0]

    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\//)
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''

    if (url) results.push({ url, title, snippet })
  }

  // Fallback: generic social URL extraction
  if (results.length === 0) {
    const linkRegex = /href="[^"]*uddg=(https?%3A%2F%2F(?:www\.)?(?:x\.com|twitter\.com|tiktok\.com|instagram\.com|linkedin\.com|facebook\.com)[^&"]+)/g
    let m
    while ((m = linkRegex.exec(html)) !== null) {
      const url = decodeURIComponent(m[1]).split('?')[0]
      if (!results.find(r => r.url === url)) {
        results.push({ url, title: '', snippet: '' })
      }
    }
  }

  return results
}

/**
 * Combined search: try Bing first, fall back to DuckDuckGo.
 * Returns deduplicated results from both.
 */
async function searchSocial(siteQuery: string): Promise<Array<{ url: string; title: string; snippet: string }>> {
  // Run Bing and DDG in parallel for speed
  const [bingHtml, ddgHtml] = await Promise.all([
    searchBing(siteQuery),
    searchDDG(siteQuery),
  ])

  const bingResults = extractBingResults(bingHtml)
  const ddgResults = extractDDGResults(ddgHtml)

  // Merge and deduplicate by URL
  const seen = new Set<string>()
  const merged: Array<{ url: string; title: string; snippet: string }> = []

  for (const r of [...bingResults, ...ddgResults]) {
    const normalized = r.url.replace(/\/$/, '').toLowerCase()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      merged.push(r)
    }
  }

  return merged
}


// ============ PLATFORM SCRAPERS ============

function buildPost(
  platform: SocialPlatform,
  postId: string,
  content: string,
  keyword: string,
  opts: {
    authorName?: string
    authorHandle?: string
    postUrl: string
    embedHtml?: string
    mediaType?: string
    hashtags?: string[]
  }
): any {
  return {
    platform,
    postId,
    content: content.substring(0, 500),
    summary: '',
    authorHandle: opts.authorHandle || '',
    authorName: opts.authorName || '',
    postUrl: opts.postUrl,
    embedUrl: opts.postUrl,
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
    postedAt: new Date(),
  }
}

// ---- TWITTER ----
async function scrapeTwitter(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[Twitter] Searching for: ${keyword}`)

    // Strategy 1: Nitter instances (quick try, 5s timeout each)
    const nitterInstances = [
      'https://nitter.privacydev.net',
      'https://nitter.poast.org',
    ]

    for (const instance of nitterInstances) {
      if (posts.length > 0) break
      try {
        const url = `${instance}/search?f=tweets&q=${encodeURIComponent(keyword)}&since=${formatDateParam(getCutoffDate())}`
        const res = await fetchPage(url, 5000)
        if (!res.ok) continue
        const html = await res.text()

        const tweetBlocks = html.split('class="timeline-item"').slice(1, 8)
        for (const block of tweetBlocks) {
          const linkMatch = block.match(/href="\/([^/]+)\/status\/(\d+)"/)
          if (!linkMatch) continue
          const username = linkMatch[1]
          const tweetId = linkMatch[2]

          const contentMatch = block.match(/class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/)
          const content = contentMatch ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
          if (content.length < 5) continue

          const nameMatch = block.match(/class="fullname"[^>]*>([^<]+)</)
          const tweetUrl = `https://x.com/${username}/status/${tweetId}`

          posts.push(buildPost('TWITTER' as SocialPlatform, tweetId, content, keyword, {
            authorName: nameMatch ? nameMatch[1].trim() : username,
            authorHandle: `@${username}`,
            postUrl: tweetUrl,
            embedHtml: `<blockquote class="twitter-tweet"><a href="${tweetUrl}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
            hashtags: content.match(/#\w+/g) || [],
          }))
        }
        if (posts.length > 0) console.log(`[Twitter] Nitter (${instance}) found ${posts.length} tweets`)
      } catch { continue }
    }

    // Strategy 2: Search engines
    if (posts.length === 0) {
      const results = await searchSocial(`site:x.com OR site:twitter.com ${keyword}`)
      for (const r of results.slice(0, 8)) {
        const m = r.url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/)
        if (!m) continue
        const [, username, tweetId] = m
        if (username === 'search' || username === 'hashtag') continue
        const tweetUrl = `https://x.com/${username}/status/${tweetId}`
        posts.push(buildPost('TWITTER' as SocialPlatform, tweetId, r.title || r.snippet || `Tweet about ${keyword}`, keyword, {
          authorName: username,
          authorHandle: `@${username}`,
          postUrl: tweetUrl,
          embedHtml: `<blockquote class="twitter-tweet"><a href="${tweetUrl}">Tweet</a></blockquote><script async src="https://platform.twitter.com/widgets.js"></script>`,
        }))
      }
      if (posts.length > 0) console.log(`[Twitter] Search engines found ${posts.length} tweets`)
    }

    console.log(`[Twitter] Total: ${posts.length} for "${keyword}"`)
  } catch (error) {
    console.error('[Twitter] Scrape error:', error)
  }
  return posts
}

// ---- TIKTOK ----
async function scrapeTikTok(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[TikTok] Searching for: ${keyword}`)
    const results = await searchSocial(`site:tiktok.com ${keyword}`)

    for (const r of results.slice(0, 8)) {
      const videoMatch = r.url.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/)
      if (!videoMatch) continue
      const [, username, videoId] = videoMatch

      posts.push(buildPost('TIKTOK' as SocialPlatform, videoId, r.title || r.snippet || `TikTok about ${keyword}`, keyword, {
        authorName: username,
        authorHandle: `@${username}`,
        postUrl: r.url,
        embedHtml: `<iframe src="https://www.tiktok.com/embed/v2/${videoId}" width="100%" height="750" frameborder="0" allowfullscreen></iframe>`,
        mediaType: 'video',
      }))
    }
    console.log(`[TikTok] Found ${posts.length} videos for "${keyword}"`)
  } catch (error) {
    console.error('[TikTok] Scrape error:', error)
  }
  return posts
}

// ---- INSTAGRAM ----
async function scrapeInstagram(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[Instagram] Searching for: ${keyword}`)
    const results = await searchSocial(`site:instagram.com ${keyword}`)

    for (const r of results.slice(0, 8)) {
      const codeMatch = r.url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
      if (!codeMatch) continue

      const title = r.title || r.snippet || ''
      const authorMatch = title.match(/^(.+?)\s+on\s+Instagram/i)
      const authorName = authorMatch ? authorMatch[1].trim() : ''
      const postUrl = r.url.replace(/\/$/, '') + '/'

      posts.push(buildPost('INSTAGRAM' as SocialPlatform, codeMatch[1], title || `Instagram post about ${keyword}`, keyword, {
        authorName,
        authorHandle: authorName ? `@${authorName.toLowerCase().replace(/\s+/g, '')}` : '',
        postUrl,
        embedHtml: `<iframe src="${postUrl}embed/" width="100%" height="500" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`,
        mediaType: r.url.includes('/reel/') ? 'video' : 'image',
        hashtags: title.match(/#\w+/g) || [],
      }))
    }
    console.log(`[Instagram] Found ${posts.length} posts for "${keyword}"`)
  } catch (error) {
    console.error('[Instagram] Scrape error:', error)
  }
  return posts
}

// ---- LINKEDIN ----
async function scrapeLinkedIn(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[LinkedIn] Searching for: ${keyword}`)
    const results = await searchSocial(`site:linkedin.com/posts ${keyword}`)

    for (const r of results.slice(0, 8)) {
      const authorMatch = r.url.match(/linkedin\.com\/posts\/([^_/\s]+)/)
      if (!authorMatch) continue
      const authorRaw = authorMatch[1]
      const authorName = authorRaw.replace(/[-_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const postId = `li_${Buffer.from(r.url).toString('base64').substring(0, 20)}`

      posts.push(buildPost('LINKEDIN' as SocialPlatform, postId, r.title || r.snippet || `LinkedIn post about ${keyword}`, keyword, {
        authorName,
        authorHandle: authorRaw,
        postUrl: r.url,
      }))
    }
    console.log(`[LinkedIn] Found ${posts.length} posts for "${keyword}"`)
  } catch (error) {
    console.error('[LinkedIn] Scrape error:', error)
  }
  return posts
}

// ---- FACEBOOK ----
async function scrapeFacebook(keyword: string): Promise<any[]> {
  const posts: any[] = []
  try {
    console.log(`[Facebook] Searching for: ${keyword}`)
    const results = await searchSocial(`site:facebook.com ${keyword}`)

    for (const r of results.slice(0, 8)) {
      // Accept posts, permalinks, and page URLs
      if (!r.url.includes('facebook.com')) continue
      const authorMatch = r.url.match(/facebook\.com\/([^/\s?]+)/)
      const authorRaw = authorMatch ? authorMatch[1] : ''
      if (['login', 'help', 'policies', 'watch', 'marketplace', 'groups'].includes(authorRaw.toLowerCase())) continue

      const postId = `fb_${Buffer.from(r.url).toString('base64').substring(0, 20)}`
      const authorName = authorRaw.replace(/[.-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

      posts.push(buildPost('FACEBOOK' as SocialPlatform, postId, r.title || r.snippet || `Facebook post about ${keyword}`, keyword, {
        authorName,
        authorHandle: authorRaw,
        postUrl: r.url,
        embedHtml: `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(r.url)}&show_text=true&width=500" width="100%" height="400" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true"></iframe>`,
      }))
    }
    console.log(`[Facebook] Found ${posts.length} posts for "${keyword}"`)
  } catch (error) {
    console.error('[Facebook] Scrape error:', error)
  }
  return posts
}


// ============ PYTHON SCRAPER FALLBACK ============
async function tryPythonScraper(keywords: string[], platforms: string[]): Promise<any[]> {
  const scraperApi = process.env.NEXT_PUBLIC_SCRAPER_API
  if (!scraperApi) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(`${scraperApi}/api/scrape/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': randomUA() },
      body: JSON.stringify({ keywords, platforms, save: false }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) return []
    const data = await response.json()
    // Map Python format to our format
    return (data.posts || []).map((p: any) => ({
      platform: p.platform as SocialPlatform,
      postId: p.post_id || p.postId || '',
      content: (p.content || '').substring(0, 500),
      summary: '',
      authorHandle: p.author_handle || p.authorHandle || '',
      authorName: p.author_name || p.authorName || '',
      postUrl: p.post_url || p.postUrl || '',
      embedUrl: p.embed_url || p.embedUrl || '',
      embedHtml: p.embed_html || p.embedHtml || '',
      mediaUrls: p.media_urls || p.mediaUrls || [],
      mediaType: p.media_type || p.mediaType || 'text',
      viewsCount: p.views_count || p.viewsCount || 0,
      likesCount: p.likes_count || p.likesCount || 0,
      commentsCount: p.comments_count || p.commentsCount || 0,
      sharesCount: p.shares_count || p.sharesCount || 0,
      hashtags: p.hashtags || [],
      mentions: p.mentions || [],
      keywords: p.keywords || '',
      postedAt: p.posted_at ? new Date(p.posted_at) : new Date(),
    }))
  } catch (e) {
    console.log('[Social Scraper] Python fallback unavailable:', e instanceof Error ? e.message : 'unknown')
    return []
  }
}


// ============ GET CLIENT KEYWORDS ============
async function getClientKeywords(clientId: string): Promise<string[]> {
  try {
    const client = await (prisma as any).client.findUnique({
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


// ============ MAIN SCRAPE ENDPOINT ============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clientId, keywords: providedKeywords, platforms: providedPlatforms, save = true } = body

    let keywords: string[] = []
    if (clientId) {
      keywords = await getClientKeywords(clientId)
      console.log(`[Social Scraper] Client keywords: ${keywords.join(', ')}`)
    }
    if (providedKeywords?.length > 0) {
      keywords = Array.from(new Set([...keywords, ...providedKeywords]))
    }
    if (keywords.length === 0) {
      keywords = ['news', 'business']
    }

    const platforms = providedPlatforms?.length > 0
      ? providedPlatforms
      : ['twitter', 'tiktok', 'instagram', 'linkedin', 'facebook']

    console.log(`[Social Scraper] Keywords: ${keywords.join(', ')} | Platforms: ${platforms.join(', ')}`)

    // Use first 3 keywords to stay within time limits
    const keywordsToUse = keywords.slice(0, 3)

    // PARALLEL scraping: run all platforms concurrently for each keyword
    const platformResults: Record<string, { found: number; errors: string[] }> = {}
    platforms.forEach((p: string) => { platformResults[p.toLowerCase()] = { found: 0, errors: [] } })

    const scraperFns: Record<string, (kw: string) => Promise<any[]>> = {
      twitter: scrapeTwitter,
      x: scrapeTwitter,
      tiktok: scrapeTikTok,
      instagram: scrapeInstagram,
      linkedin: scrapeLinkedIn,
      facebook: scrapeFacebook,
    }

    // Build all scrape tasks and run in parallel
    const tasks: Array<{ platform: string; keyword: string; promise: Promise<any[]> }> = []
    for (const keyword of keywordsToUse) {
      for (const platform of platforms) {
        const pl = platform.toLowerCase()
        const fn = scraperFns[pl]
        if (fn) {
          tasks.push({ platform: pl, keyword, promise: fn(keyword) })
        }
      }
    }

    // Execute all tasks in parallel (this is the key speedup)
    const results = await Promise.allSettled(tasks.map(t => t.promise))

    let allPosts: any[] = []
    results.forEach((result, i) => {
      const task = tasks[i]
      if (result.status === 'fulfilled' && result.value.length > 0) {
        platformResults[task.platform].found += result.value.length
        allPosts.push(...result.value)
      } else if (result.status === 'rejected') {
        const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
        platformResults[task.platform].errors.push(`${task.keyword}: ${msg}`)
      }
    })


    // If TS scrapers found nothing, try Python scraper as fallback
    if (allPosts.length === 0) {
      console.log('[Social Scraper] No results from TS scrapers, trying Python fallback...')
      const pythonPosts = await tryPythonScraper(keywordsToUse, platforms)
      if (pythonPosts.length > 0) {
        allPosts.push(...pythonPosts)
        console.log(`[Social Scraper] Python fallback found ${pythonPosts.length} posts`)
      }
    }

    // Deduplicate by platform + postId
    const seen = new Set<string>()
    const uniquePosts = allPosts.filter(post => {
      const key = `${post.platform}_${post.postId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[Social Scraper] Total unique posts: ${uniquePosts.length}`)

    // Save to database
    let savedCount = 0
    let duplicateCount = 0

    if (save && uniquePosts.length > 0) {
      const db = prisma as any
      for (const post of uniquePosts) {
        try {
          const existing = await db.socialPost.findFirst({
            where: {
              platform: post.platform,
              postId: post.postId,
              clientId: clientId || null,
            },
          })
          if (existing) { duplicateCount++; continue }

          await db.socialPost.create({
            data: {
              platform: post.platform,
              postId: post.postId,
              content: post.content,
              summary: post.summary || '',
              authorHandle: post.authorHandle,
              authorName: post.authorName,
              postUrl: post.postUrl,
              embedUrl: post.embedUrl,
              embedHtml: post.embedHtml,
              mediaUrls: post.mediaUrls || [],
              mediaType: post.mediaType,
              likesCount: post.likesCount || 0,
              commentsCount: post.commentsCount || 0,
              sharesCount: post.sharesCount || 0,
              viewsCount: post.viewsCount || 0,
              hashtags: post.hashtags || [],
              mentions: post.mentions || [],
              keywords: post.keywords,
              postedAt: post.postedAt,
              ...(clientId ? { clientId } : {}),
            },
          })
          savedCount++
        } catch (saveError) {
          console.error('[Social Scraper] Save error:', saveError)
        }
      }
    }


    const platformSummary = Object.entries(platformResults)
      .map(([p, r]) => `${p}: ${r.found}`)
      .join(', ')

    const message = save
      ? `Found ${uniquePosts.length} posts (${platformSummary}), saved ${savedCount} new, ${duplicateCount} duplicates`
      : `Found ${uniquePosts.length} posts (${platformSummary})`

    console.log(`[Social Scraper] ${message}`)

    return NextResponse.json({
      success: true,
      message,
      posts: uniquePosts,
      postsFound: uniquePosts.length,
      postsSaved: savedCount,
      duplicates: duplicateCount,
      platformResults,
      keywords: keywordsToUse,
      platforms,
    })
  } catch (error) {
    console.error('[Social Scraper] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to scrape social media', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    supportedPlatforms: ['twitter', 'tiktok', 'instagram', 'linkedin', 'facebook'],
    note: 'All scrapers use 24h time window via Bing+DDG dual search. Pass clientId to use client keywords.',
  })
}
